// ==========================================
// ADMINISTRAÇÃO DE PRODUTOS (SUPABASE + CLOUDINARY)
// ==========================================
// Nota: A configuração do banco (supabaseClient) vive no ficheiro dados.js!

// Configurações do Cloudinary para upload de fotos dos produtos
const CLOUD_NAME = "dxyz12345"; // Mantenha aqui o seu Cloud Name do Cloudinary
const UPLOAD_PRESET = "pdv_produtos"; // Mantenha aqui o seu Upload Preset do Cloudinary

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const icon = (name, size = 24, stroke = 1.5) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

const navigation = [
  ["Home", "bag", "index.html"],
  ["Produtos", "box", "produtos.html"],
  ["Dashboard", "dashboard", "dashboard.html"],
  ["Messages", "message", "messages.html"],
  ["Bills", "receipt", "bills.html"],
  ["Setting", "settings", "settings.html"]
];

let query = "";
let filterCat = "Todas";
let editingId = null;
let photoData = "";
let selectedFile = null;

// ==========================================
// ESTILOS DA CHAVE SELETORA (ATIVO / INATIVO) E ALINHAMENTO DA LINHA
// ==========================================
function garantirEstilosStatusProduto() {
  if (document.getElementById("product-status-toggle-styles")) return;

  const style = document.createElement("style");
  style.id = "product-status-toggle-styles";
  style.textContent = `
    /* Ajusta a grade de 5 para 6 colunas para acomodar o botão entre o preço e as ações */
    .admin-row {
      grid-template-columns: 56px minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.8fr) auto auto !important;
    }

    .product-status-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      min-width: 96px;
      margin-right: 8px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .product-status-label {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--muted-foreground, #71717a);
      transition: color 0.15s ease;
    }

    .product-status-toggle.is-active .product-status-label {
      color: var(--foreground, #18181b);
    }

    .product-status-switch {
      position: relative;
      width: 40px;
      height: 22px;
      border-radius: 999px;
      background: #8e9297;
      transition: background-color 0.2s ease, opacity 0.2s ease;
      flex-shrink: 0;
    }

    .product-status-toggle.is-active .product-status-switch {
      background: #84cc16;
    }

    .product-status-switch::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .product-status-toggle.is-active .product-status-switch::after {
      transform: translateX(18px);
    }

    .product-status-toggle.is-loading {
      opacity: 0.6;
      pointer-events: none;
    }

    @media (max-width: 720px) {
      .admin-row {
        grid-template-columns: 48px 1fr auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// ==========================================
// MÁSCARAS DE MOEDA E CÓDIGO DE BARRAS (EAN-13)
// ==========================================
function formatCurrencyInput(value) {
  let v = String(value).replace(/\D/g, "");
  if (!v) return "";
  v = (parseInt(v, 10) / 100).toFixed(2);
  v = v.replace(".", ",");
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return v;
}

function formatBarcodeInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 13);
  if (!digits) return "";
  if (digits.length <= 1) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 1)} ${digits.slice(1)}`;
  return `${digits.slice(0, 1)} ${digits.slice(1, 7)} ${digits.slice(7, 13)}`;
}

// ==========================================
// UPLOAD DE IMAGEM PARA O CLOUDINARY
// ==========================================
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Falha ao enviar a imagem para o Cloudinary.");
  }

  const data = await response.json();
  return data.secure_url;
}

// ==========================================
// NAVEGAÇÃO E FILTROS
// ==========================================
function renderNav() {
  $("nav").innerHTML = navigation
    .map(
      ([name, ic, href]) =>
        `<a class="nav-button ${name === "Produtos" ? "nav-button-active" : ""}" href="${href}" title="${name}">
          ${icon(ic)}<span>${name}</span>
        </a>`
    )
    .join("");
}

function renderFilterCategories() {
  const all = ["Todas", ...categories.map(([name]) => name)];
  if ($("cat-filter")) {
    $("cat-filter").innerHTML = all
      .map(
        (c) =>
          `<button class="filter-chip ${filterCat === c ? "filter-chip-active" : ""}" data-fcat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
      )
      .join("");
  }

  if ($("p-category")) {
    $("p-category").innerHTML = categories
      .map(([name]) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join("");
  }

  if ($("cat-options")) {
    $("cat-options").innerHTML = categories
      .map(
        ([name], idx) =>
          `<div class="custom-select-option ${idx === 0 ? "selected" : ""}" data-val="${escapeHtml(name)}">${escapeHtml(name)}</div>`
      )
      .join("");
  }
}

// ==========================================
// LISTAGEM E ALTERNÂNCIA ATIVO / INATIVO NO SUPABASE
// ==========================================
function renderRows() {
  if ($("clear")) $("clear").classList.toggle("hidden", !query);
  const q = query.trim().toLowerCase();

  const visible = products
    .filter(
      (p) =>
        (filterCat === "Todas" || p.category === filterCat) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          String(p.barcode || "").includes(q))
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  if ($("product-count")) {
    $("product-count").textContent = `${visible.length} ${visible.length === 1 ? "item" : "itens"}`;
  }

  $("admin-list").innerHTML = visible.length
    ? visible
        .map((p) => {
          const isAtivo = p.active !== false;
          return `
        <div class="admin-row">
          <div class="admin-thumb">${productThumb(p, "food-emoji food-emoji-small")}</div>
          <div class="admin-main">
            <strong class="admin-name">${escapeHtml(p.name)}${p.badge ? ` <span class="badge-inline">${escapeHtml(p.badge)}</span>` : ""}</strong>
            <span class="admin-barcode">${icon("barcode", 13)} ${p.barcode ? escapeHtml(formatBarcodeInput(p.barcode)) : "Sem código de barras"}</span>
          </div>
          <div><span class="admin-cat">${escapeHtml(p.category)}</span></div>
          <strong class="admin-price">${money(p.price)}</strong>
          <div
            class="product-status-toggle ${isAtivo ? "is-active" : ""}"
            data-toggle-active="${escapeHtml(p.id)}"
            role="switch"
            aria-checked="${isAtivo}"
            title="Controlar se este produto aparece no catálogo público"
          >
            <span class="product-status-label">${isAtivo ? "Ativo" : "Inativo"}</span>
            <span class="product-status-switch"></span>
          </div>
          <div class="admin-actions">
            <button class="icon-btn" data-edit="${escapeHtml(p.id)}" title="Editar produto">${icon("pencil", 16)}</button>
            <button class="icon-btn icon-btn-danger" data-del="${escapeHtml(p.id)}" title="Excluir produto">${icon("trash", 16)}</button>
          </div>
        </div>`;
        })
        .join("")
    : `<p class="empty-products">Nenhum produto encontrado.</p>`;
}

async function renderList() {
  garantirEstilosStatusProduto();

  if (!products.length && $("admin-list")) {
    $("admin-list").innerHTML = '<p class="empty-products">A carregar produtos...</p>';
  }

  try {
    if (typeof window.carregarProdutosComSeguranca === "function") {
      await window.carregarProdutosComSeguranca(() => {
        renderRows();
      });
    } else {
      const { data, error } = await supabaseClient.from("produtos").select("*");
      if (error) throw error;

      products = (data || []).map((p) => ({
        id: p.id,
        name: p.nome,
        price: parseFloat(p.preco),
        category: p.categoria,
        barcode: p.codigo_barras,
        photo: p.foto_url,
        badge: p.badge,
        active: p.ativo !== false
      }));
      renderRows();
    }
  } catch (error) {
    console.error("Erro ao carregar produtos do Supabase:", error);
    if ($("admin-list")) {
      $("admin-list").innerHTML = '<p class="empty-products">Erro ao carregar produtos. Verifique a ligação.</p>';
    }
  }
}

async function alternarStatusProduto(productId, toggleEl) {
  const prod = products.find((p) => String(p.id) === String(productId));
  if (!prod) return;

  const novoStatus = !(prod.active !== false);
  if (toggleEl) toggleEl.classList.add("is-loading");

  try {
    const { error } = await supabaseClient
      .from("produtos")
      .update({ ativo: novoStatus })
      .eq("id", prod.id);

    if (error) throw error;

    prod.active = novoStatus;

    // Atualiza o cache local e notifica o catalogo.html e o index.html
    try {
      localStorage.setItem("pdv:produtosCacheV1", JSON.stringify(products));
      localStorage.setItem("pdv:updateTrigger", Date.now().toString());
    } catch (_) {}

    if (toggleEl) {
      toggleEl.classList.toggle("is-active", novoStatus);
      toggleEl.setAttribute("aria-checked", String(novoStatus));
      const label = toggleEl.querySelector(".product-status-label");
      if (label) label.textContent = novoStatus ? "Ativo" : "Inativo";
    }
  } catch (error) {
    console.error("Erro ao atualizar status do produto:", error);
    alert("Não foi possível alterar o status do produto. Verifique se você executou o comando SQL para criar a coluna 'ativo' no Supabase.");
  } finally {
    if (toggleEl) toggleEl.classList.remove("is-loading");
  }
}

// ==========================================
// MODAL DE CADASTRO E EDIÇÃO DE PRODUTO
// ==========================================
function updatePreview() {
  if (!$("photo-preview")) return;
  const fallbackIcon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--muted-foreground);">${paths.box}</svg>`;
  $("photo-preview").innerHTML = photoData ? `<img src="${photoData}" alt="Preview">` : fallbackIcon;
  if ($("clear-photo")) $("clear-photo").classList.toggle("hidden", !photoData);
}

function setCategoryDropdownValue(catName) {
  const val = catName || categories[0][0];
  const inputCat = $("p-category");
  if (inputCat) inputCat.value = val;

  document.querySelectorAll("#cat-options .custom-select-option").forEach((el) => {
    el.classList.toggle("selected", el.dataset.val === val);
  });
}

function openForm(prod = null) {
  editingId = prod ? prod.id : null;
  photoData = prod && prod.photo ? prod.photo : "";
  selectedFile = null;

  if ($("form-title")) $("form-title").textContent = prod ? "Editar Produto" : "Novo Produto";
  if ($("p-name")) $("p-name").value = prod ? prod.name : "";
  if ($("p-price")) $("p-price").value = prod ? formatCurrencyInput((prod.price * 100).toFixed(0)) : "";
  setCategoryDropdownValue(prod ? prod.category : categories[0][0]);
  if ($("p-barcode")) $("p-barcode").value = prod && prod.barcode ? formatBarcodeInput(prod.barcode) : "";
  if ($("p-badge")) $("p-badge").value = prod && prod.badge ? prod.badge : "";
  if ($("p-photo")) $("p-photo").value = "";
  if ($("form-error")) $("form-error").classList.add("hidden");

  updatePreview();
  $("form-modal").classList.remove("hidden");
  if ($("p-name")) $("p-name").focus();
}

function closeForm() {
  $("form-modal").classList.add("hidden");
  editingId = null;
  photoData = "";
  selectedFile = null;
}

if ($("p-photo")) {
  $("p-photo").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      photoData = String(reader.result || "");
      updatePreview();
    };
    reader.readAsDataURL(file);
  });
}

if ($("clear-photo")) {
  $("clear-photo").addEventListener("click", () => {
    photoData = "";
    selectedFile = null;
    if ($("p-photo")) $("p-photo").value = "";
    updatePreview();
  });
}

if ($("p-price")) {
  $("p-price").addEventListener("input", (e) => {
    e.target.value = formatCurrencyInput(e.target.value);
  });
}

if ($("p-barcode")) {
  $("p-barcode").addEventListener("input", (e) => {
    e.target.value = formatBarcodeInput(e.target.value);
  });
}

// Eventos do Dropdown Customizado de Categorias no Modal
if ($("cat-trigger") && $("cat-options")) {
  $("cat-trigger").addEventListener("click", (e) => {
    e.stopPropagation();
    $("cat-options").classList.toggle("hidden");
  });

  $("cat-options").addEventListener("click", (e) => {
    const opt = e.target.closest(".custom-select-option");
    if (!opt) return;
    setCategoryDropdownValue(opt.dataset.val);
    $("cat-options").classList.add("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#cat-wrapper") && $("cat-options")) {
      $("cat-options").classList.add("hidden");
    }
  });
}

if ($("product-form")) {
  $("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("p-name").value.trim();
    const rawPrice = $("p-price").value.replace(/\./g, "").replace(",", ".");
    const price = parseFloat(rawPrice);
    const category = $("p-category").value;
    const barcode = $("p-barcode").value.replace(/\D/g, "");
    const badge = $("p-badge") ? $("p-badge").value.trim() : "";

    const showError = (msg) => {
      if ($("form-error")) {
        $("form-error").textContent = msg;
        $("form-error").classList.remove("hidden");
      } else {
        alert(msg);
      }
    };

    if (!name) return showError("Informe o nome do produto.");
    if (!Number.isFinite(price) || price <= 0) return showError("Informe um preço válido maior que zero.");

    const submitBtn = $("product-form").querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "Salvar";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "A guardar...";
    }

    try {
      let finalPhotoUrl = photoData || null;
      if (selectedFile) {
        finalPhotoUrl = await uploadToCloudinary(selectedFile);
      }

      // Mantém o status atual ao editar ou cria como Ativo (true) ao cadastrar novo
      const existingProd = editingId ? products.find((p) => String(p.id) === String(editingId)) : null;
      const isAtivo = existingProd ? existingProd.active !== false : true;

      const payload = {
        nome: name,
        preco: price,
        categoria: category,
        codigo_barras: barcode || null,
        foto_url: finalPhotoUrl,
        badge: badge || null,
        ativo: isAtivo
      };

      if (editingId) {
        const { error } = await supabaseClient.from("produtos").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.id = window.crypto ? window.crypto.randomUUID() : generateUUID();
        const { error } = await supabaseClient.from("produtos").insert([payload]);
        if (error) throw error;
      }

      closeForm();
      await renderList();
      localStorage.setItem("pdv:updateTrigger", Date.now().toString());
    } catch (error) {
      console.error("Erro ao guardar produto:", error);
      showError("Erro ao guardar o produto. Verifique a consola.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
}

// ==========================================
// EVENTOS GERAIS DA PÁGINA
// ==========================================
document.addEventListener("click", async (e) => {
  const toggleBtn = e.target.closest("[data-toggle-active]");
  if (toggleBtn) {
    alternarStatusProduto(toggleBtn.dataset.toggleActive, toggleBtn);
    return;
  }

  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.fcat) {
    filterCat = filterCat === btn.dataset.fcat ? "Todas" : btn.dataset.fcat;
    renderFilterCategories();
    renderRows();
  } else if (btn.dataset.edit) {
    const prod = products.find((p) => String(p.id) === String(btn.dataset.edit));
    if (prod) openForm(prod);
  } else if (btn.dataset.del) {
    const prod = products.find((p) => String(p.id) === String(btn.dataset.del));
    if (!prod) return;
    if (!confirm(`Tem a certeza que deseja eliminar "${prod.name}"?`)) return;

    try {
      const { error } = await supabaseClient.from("produtos").delete().eq("id", prod.id);
      if (error) throw error;

      products = products.filter((p) => String(p.id) !== String(prod.id));
      try {
        localStorage.setItem("pdv:produtosCacheV1", JSON.stringify(products));
        localStorage.setItem("pdv:updateTrigger", Date.now().toString());
      } catch (_) {}
      renderRows();
    } catch (error) {
      console.error("Erro ao eliminar produto:", error);
      alert("Não foi possível eliminar o produto.");
    }
  }
});

if ($("new-product")) $("new-product").addEventListener("click", () => openForm());
if ($("form-cancel")) $("form-cancel").addEventListener("click", closeForm);
if ($("form-modal")) {
  $("form-modal").addEventListener("click", (e) => {
    if (e.target === $("form-modal")) closeForm();
  });
}

if ($("search")) {
  $("search").addEventListener("input", (e) => {
    query = e.target.value;
    renderRows();
  });
}

if ($("clear")) {
  $("clear").addEventListener("click", () => {
    query = "";
    if ($("search")) $("search").value = "";
    renderRows();
  });
}

// Inicialização dos ícones estáticos
if ($("search-icon")) $("search-icon").innerHTML = icon("search", 17, 1.7);
if ($("clear")) $("clear").innerHTML = icon("x", 14);
if ($("cat-chevron")) $("cat-chevron").innerHTML = icon("chevron", 14);
if ($("new-product-icon")) $("new-product-icon").innerHTML = icon("plus", 16, 2);
if ($("logout")) $("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;

renderNav();
renderFilterCategories();
renderList();
