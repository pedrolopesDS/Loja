// ==========================================
// PÁGINA DE CADASTRO DE PRODUTOS (SUPABASE + CLOUDINARY)
// ==========================================
// Nota: A configuração do banco (supabaseClient) agora vive no dados.js

// 1. CONFIGURAÇÃO DO CLOUDINARY
// -----------------------------------------------------------
const CLOUD_NAME = "dh548byjf"; 
const UPLOAD_PRESET = "pdv_uploads"; 
// -----------------------------------------------------------

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const icon = (name, size = 24, stroke = 1.5) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

const page = { query: "", filter: "Todas", editingId: null, removingId: null, form: null };

// ---------- Barra lateral ----------
function renderNav() {
  const navigation = [
    ["Home", "bag", "index.html"], 
    ["Produtos", "box", "produtos.html"], 
    ["Dashboard", "dashboard", "dashboard.html"], 
    ["Messages", "message", "messages.html"], 
    ["Bills", "receipt", "bills.html"], 
    ["Setting", "settings", "settings.html"]
  ];

  $("nav").innerHTML = navigation.map(([name, ic, href]) =>
    `<a class="nav-button ${name === "Produtos" ? "nav-button-active" : ""}" href="${href}" title="${name}">
      ${icon(ic)}<span>${name}</span>
    </a>`
  ).join("");
}

// ---------- Lista (Supabase) ----------
async function renderList() {
  $("list").innerHTML = '<p class="admin-empty">A carregar catálogo...</p>';
  
  try {
    const { data, error } = await supabaseClient.from('produtos').select('*');
    if (error) throw error;
    
    // Transforma as colunas do Supabase (Português) no formato que o seu JS já usa (Inglês)
    products = (data || []).map(p => ({
      id: p.id,
      name: p.nome,
      price: parseFloat(p.preco),
      category: p.categoria,
      barcode: p.codigo_barras,
      photo: p.foto_url,
      badge: p.badge
    }));

    $("clear").classList.toggle("hidden", !page.query);
    const q = page.query.trim().toLowerCase();
    
    const visible = products
      .filter((p) => page.filter === "Todas" || p.category === page.filter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.barcode || "").includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    $("list").innerHTML = visible.length ? visible.map((p) => `
      <div class="admin-row">
        ${productThumb(p, "admin-thumb")}
        <span class="admin-title">
          <strong>${escapeHtml(p.name)}</strong>
          <span>${icon("barcode", 12)} ${p.barcode ? formatBarcodeInput(p.barcode) : "sem código de barras"}</span>
        </span>
        <span class="admin-cat">${escapeHtml(p.category)}</span>
        <span class="admin-price">${money(p.price)}</span>
        <span class="admin-actions">
          <button title="Editar produto" data-edit="${p.id}">${icon("pencil", 15)}</button>
          <button class="danger" title="Excluir produto" data-del="${p.id}">${icon("trash", 15)}</button>
        </span>
      </div>`).join("") : `<p class="admin-empty">Nenhum produto encontrado.</p>`;
      
  } catch (error) {
    console.error("Erro ao carregar os produtos:", error);
    $("list").innerHTML = '<p class="admin-empty" role="alert">Erro ao carregar o catálogo.</p>';
  }
}

// ---------- Formulário ----------
function renderPhoto() {
  const f = page.form;
  $("photo-preview").innerHTML = f.photo
    ? `<img src="${f.photo}" alt="Foto do produto">`
    : icon("box", 32);
  
  $("photo-pick").classList.toggle("hidden", Boolean(f.photo));
  $("photo-remove").classList.toggle("hidden", !f.photo);
}

function showError(msg) {
  $("form-error").textContent = msg;
  $("form-error").classList.toggle("hidden", !msg);
}

function formatCurrencyInput(value) {
  let v = value.replace(/\D/g, ""); 
  if (!v) return "";
  v = (parseInt(v, 10) / 100).toFixed(2); 
  v = v.replace(".", ","); 
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); 
  return v;
}

function formatBarcodeInput(value) {
  let v = value.replace(/\D/g, ""); 
  v = v.replace(/^(\d)(\d)/, "$1 $2"); 
  v = v.replace(/^(\d) (\d{6})(\d)/, "$1 $2 $3"); 
  return v;
}

function openForm(p) {
  page.editingId = p ? p.id : null;
  page.form = { photo: p ? p.photo || "" : "" };
  $("form-title").textContent = p ? "Editar Produto" : "Novo Produto";
  $("form-save").textContent = p ? "Salvar" : "Cadastrar";
  $("p-name").value = p ? p.name : "";
  $("p-price").value = p ? formatCurrencyInput(Math.round(p.price * 100).toString()) : "";
  
  const cat = p ? p.category : categories[0][0];
  $("p-category").value = cat;
  
  document.querySelectorAll(".custom-select-option").forEach(el => {
    el.classList.toggle("selected", el.dataset.val === cat);
  });

  $("p-barcode").value = p ? (p.barcode ? formatBarcodeInput(p.barcode) : "") : "";
  $("p-badge").value = p ? p.badge || "" : "";
  showError("");
  renderPhoto();
  $("cat-options").classList.add("hidden");
  $("form-modal").classList.remove("hidden");
  $("p-name").focus();
}

const closeForm = () => {
  $("form-modal").classList.add("hidden");
  $("form-save").disabled = false;
  $("form-save").textContent = page.editingId ? "Salvar" : "Cadastrar";
};

// Upload para o Cloudinary (Mantido intacto)
async function uploadToCloudinary(base64Image) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append("file", base64Image);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  if (!response.ok) throw new Error("Falha ao enviar imagem para o Cloudinary");

  const data = await response.json();
  return data.secure_url; 
}

// Salvar no Supabase
async function saveForm() {
  const name = $("p-name").value.trim();
  const priceRaw = $("p-price").value.replace(/\./g, "").replace(",", "."); 
  const price = parseFloat(priceRaw);
  const category = $("p-category").value; 
  const barcode = $("p-barcode").value.replace(/\D/g, ""); 
  const badge = $("p-badge").value.trim();

  if (name.length < 2) return showError("Informe o nome do produto");
  if (isNaN(price) || price <= 0) return showError("Informe um preço maior que zero");
  if (price > 99999) return showError("Preço muito alto");
  if (!categories.some(([c]) => c === category)) return showError("Escolha uma categoria");
  if (!/^[0-9]*$/.test(barcode)) return showError("O código de barras deve conter apenas números");
  if (barcode && products.some((p) => p.barcode === barcode && p.id !== page.editingId))
    return showError("Já existe um produto com esse código de barras");

  const btn = $("form-save");
  btn.disabled = true;

  try {
    let finalPhotoUrl = page.form.photo;

    // Se há foto e é nova (Base64), manda para o Cloudinary
    if (finalPhotoUrl && finalPhotoUrl.startsWith("data:image")) {
      btn.textContent = "Armazenando imagem...";
      finalPhotoUrl = await uploadToCloudinary(finalPhotoUrl);
    }

    btn.textContent = "Armazenando produto...";

    // Prepara o objeto com os nomes exatos das colunas do Supabase (sem emoji)
    const dbData = { 
      nome: name, 
      preco: Math.round(price * 100) / 100, 
      categoria: category,
      codigo_barras: barcode || null,
      badge: badge || null,
      foto_url: finalPhotoUrl || null
    };

    if (page.editingId) {
      // Atualiza produto existente
      const { error } = await supabaseClient.from('produtos').update(dbData).eq('id', page.editingId);
      if (error) throw error;
    } else {
      // Insere novo produto
      const { error } = await supabaseClient.from('produtos').insert([dbData]);
      if (error) throw error;
    }
    
    closeForm();
    await renderList(); 
    localStorage.setItem("pdv:updateTrigger", Date.now().toString());
    
  } catch (error) {
    console.error("Erro ao guardar o produto:", error);
    showError("Erro na ligação ao banco de dados.");
    btn.disabled = false;
    btn.textContent = page.editingId ? "Salvar" : "Cadastrar";
  }
}

function resizeImage(file, max = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Eventos ----------
$("new-product").addEventListener("click", () => openForm(null));

$("p-price").addEventListener("input", (e) => { e.target.value = formatCurrencyInput(e.target.value); });
$("p-barcode").addEventListener("input", (e) => { e.target.value = formatBarcodeInput(e.target.value); });

$("search").addEventListener("input", (e) => { page.query = e.target.value; renderList(); });
$("clear").addEventListener("click", () => { page.query = ""; $("search").value = ""; renderList(); });

$("list").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.edit) openForm(products.find((p) => p.id === b.dataset.edit));
  if (b.dataset.del) {
    const p = products.find((x) => x.id === b.dataset.del);
    page.removingId = p.id;
    $("delete-name").textContent = p.name;
    $("delete-modal").classList.remove("hidden");
  }
});

$("photo-pick").addEventListener("click", () => $("p-photo").click());
$("photo-remove").addEventListener("click", () => { page.form.photo = ""; renderPhoto(); });
$("p-photo").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    page.form.photo = await resizeImage(file);
    showError("");
    renderPhoto();
  } catch (err) {
    showError(err.message);
  }
});

$("form-cancel").addEventListener("click", closeForm);
$("form-save").addEventListener("click", saveForm);
$("form-modal").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeForm(); });
$("form-modal").addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.id !== "p-category") saveForm(); });

const closeDelete = () => $("delete-modal").classList.add("hidden");
$("delete-cancel").addEventListener("click", closeDelete);

// Apagar no Supabase
$("delete-confirm").addEventListener("click", async () => {
  const btn = $("delete-confirm");
  btn.disabled = true;
  btn.textContent = "A apagar...";
  
  try {
    const { error } = await supabaseClient.from('produtos').delete().eq('id', page.removingId);
    if (error) throw error;
    
    closeDelete();
    await renderList();
    localStorage.setItem("pdv:updateTrigger", Date.now().toString());
  } catch (error) {
    console.error("Erro ao apagar:", error);
    alert("Não foi possível apagar o produto.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Excluir";
  }
});

// ---------- Início ----------
$("search-icon").innerHTML = icon("search", 17, 1.7);
$("clear").innerHTML = icon("x", 14);
$("barcode-icon").innerHTML = icon("barcode", 16);
$("new-product").innerHTML = `${icon("plus", 17, 2)} Novo Produto`;

$("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;
$("logout").addEventListener("click", () => window.location.href = "index.html");

// Inicializa o Dropdown Customizado do MODAL DE NOVO PRODUTO
$("cat-chevron").innerHTML = icon("chevron", 18);
$("cat-options").innerHTML = categories.map(([c]) => `<div class="custom-select-option" data-val="${c}">${c}</div>`).join("");

$("cat-trigger").addEventListener("click", (e) => {
  e.stopPropagation();
  $("cat-options").classList.toggle("hidden");
});

$("cat-options").addEventListener("click", (e) => {
  const opt = e.target.closest(".custom-select-option");
  if (!opt) return;
  $("p-category").value = opt.dataset.val;
  
  document.querySelectorAll("#cat-options .custom-select-option").forEach(el => el.classList.remove("selected"));
  opt.classList.add("selected");
  $("cat-options").classList.add("hidden");
});

// Inicializa o Dropdown Customizado do FILTRO (Barra Superior)
$("filter-chevron").innerHTML = icon("chevron", 14);
const filterCatOptions = categories.map(([c]) => `<div class="custom-select-option" data-val="${c}">${c}</div>`).join("");
$("filter-options").innerHTML = `<div class="custom-select-option selected" data-val="Todas">Todas</div>${filterCatOptions}`;

$("filter-wrapper").addEventListener("click", (e) => {
  e.stopPropagation();
  $("filter-options").classList.toggle("hidden");
});

$("filter-options").addEventListener("click", (e) => {
  const opt = e.target.closest(".custom-select-option");
  if (!opt) return;

  page.filter = opt.dataset.val;
  $("filter").value = opt.dataset.val;

  document.querySelectorAll("#filter-options .custom-select-option").forEach(el => el.classList.remove("selected"));
  opt.classList.add("selected");
  $("filter-options").classList.add("hidden");

  renderList();
});

// Fecha os menus dropdown
document.addEventListener("click", (e) => {
  if (!e.target.closest("#cat-wrapper") && $("cat-options")) {
    $("cat-options").classList.add("hidden");
  }
  if (!e.target.closest("#filter-wrapper") && $("filter-options")) {
    $("filter-options").classList.add("hidden");
  }
});

renderNav();
renderList();
