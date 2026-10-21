// ==========================================
// PÁGINA PÚBLICA DE CATÁLOGO (SOMENTE VISUALIZAÇÃO)
// ==========================================
// Nota: A configuração do banco (supabaseClient) vive no ficheiro dados.js

const catImages = { 
  Caixaria: "icons/Caixaria.svg", Chiclete: "icons/Chicletes.svg", 
  Doces: "icons/Doces.svg", Embalagem: "icons/Embalagens.svg", Salgadinho: "icons/Salgadinho.svg" 
};

const catEmojis = {
  Bala: "🍬",
  Chocolate: "🍫",
  Pirulito: "🍭",
  Pote: "🫙"
};

const state = {
  category: "Todas", 
  query: "", 
  sort: "Ordem Alfabética"
};

const $ = (id) => document.getElementById(id);

const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (n) => moneyFormatter.format(n);

const icon = (name, size = 24, stroke = 1.5) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

function renderCategories() {
  const btnTodas = `
    <button class="category-button ${state.category === "Todas" ? "category-active" : ""}" data-cat="Todas">
      <span class="category-icon">${icon("dashboard", 24)}</span>
      <span>Todas</span>
    </button>`;

  const btnCategorias = categories.map(([name, ic]) => {
    let iconeVisual = "";
    
    if (catEmojis[name]) {
      iconeVisual = `<span style="font-size: 32px;">${catEmojis[name]}</span>`;
    } else if (catImages[name]) {
      iconeVisual = `<img src="${catImages[name]}" alt="" draggable="false">`;
    } else {
      iconeVisual = icon(ic, 22, 1.35);
    }

    return `<button class="category-button ${state.category === name ? "category-active" : ""}" data-cat="${name}">
      <span class="category-icon">${iconeVisual}</span>
      <span>${name}</span>
    </button>`;
  }).join("");

  $("categories").innerHTML = btnTodas + btnCategorias;
}

// Busca os produtos do Supabase e renderiza na tela
async function loadAndRenderProducts() {
  $("products").innerHTML = '<p class="empty-products">A carregar produtos...</p>';
  
  try {
    const { data, error } = await supabaseClient
      .from("produtos")
      .select("*");

    if (error) throw error;
    
    products = (data || []).map(p => ({
      id: p.id,
      name: p.nome,
      price: parseFloat(p.preco),
      category: p.categoria,
      barcode: p.codigo_barras,
      photo: p.foto_url,
      badge: p.badge
    }));

    renderProductsList();
  } catch (error) {
    console.error("Erro ao carregar produtos do Supabase:", error);
    $("products").innerHTML = '<p class="empty-products">Erro ao carregar o catálogo. Verifique a ligação.</p>';
  }
}

function renderProductsList() {
  $("clear").classList.toggle("hidden", !state.query);
  const q = state.query.trim().toLowerCase();
  
  let visible = products.filter((p) => 
    (state.category === "Todas" || p.category === state.category) && 
    (!q || p.name.toLowerCase().includes(q) || (p.barcode || "").includes(q))
  );
  
  if (state.sort === "Ordem Alfabética") {
    visible.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } else if (state.sort === "Preço: Menor para o Maior") {
    visible.sort((a, b) => a.price - b.price);
  } else if (state.sort === "Preço: Maior para o Menor") {
    visible.sort((a, b) => b.price - a.price);
  }

  $("products").innerHTML = visible.length ? visible.map((p) =>
    `<div class="product-card" title="${escapeHtml(p.name)}">
      <span class="product-image-wrap">${productThumb(p, "food-emoji")}${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : ""}</span>
      <span class="product-name">${escapeHtml(p.name)}</span>
      <span class="product-price">${money(p.price)}</span>
    </div>`).join("") : `<p class="empty-products">Nenhum item encontrado nesta pesquisa.</p>`;
}

function initStaticIcons() {
  $("search-icon").innerHTML = icon("search", 17, 1.7);
  $("clear").innerHTML = icon("x", 14);
  $("chevron").innerHTML = icon("chevron", 14);
}

// ==========================================
// EVENTOS DE FILTRO E PESQUISA
// ==========================================

document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  
  if (t.dataset.cat) { 
    state.category = state.category === t.dataset.cat ? "Todas" : t.dataset.cat; 
    renderCategories();
    renderProductsList(); 
  }
});

$("sort-trigger").addEventListener("click", (e) => {
  e.stopPropagation();
  $("sort-options").classList.toggle("hidden");
});

$("sort-options").addEventListener("click", (e) => {
  const opt = e.target.closest(".custom-select-option");
  if (!opt) return;

  state.sort = opt.dataset.val;
  $("sort").value = opt.dataset.val;

  document.querySelectorAll("#sort-options .custom-select-option").forEach(el => el.classList.remove("selected"));
  opt.classList.add("selected");
  $("sort-options").classList.add("hidden");

  renderProductsList();
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#sort-wrapper") && $("sort-options")) {
    $("sort-options").classList.add("hidden");
  }
});

$("search").addEventListener("input", (e) => { 
  state.query = e.target.value; 
  renderProductsList(); 
});

$("clear").addEventListener("click", () => { 
  state.query = ""; 
  $("search").value = ""; 
  renderProductsList(); 
});

// Atualiza automaticamente caso algum produto seja alterado noutra aba
window.addEventListener("storage", (e) => {
  if (e.key === "pdv:updateTrigger") {
    loadAndRenderProducts();
  }
});

initStaticIcons();
renderCategories();
loadAndRenderProducts();
