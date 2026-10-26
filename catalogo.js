// ==========================================
// CATÁLOGO PÚBLICO (GRAVA EM PEDIDOS / MESSAGES)
// ==========================================

const catImages = { 
  Caixaria: "icons/caixaria.svg", Chiclete: "icons/chicletes.svg", 
  Doces: "icons/doces.svg", Embalagem: "icons/embalagens.svg", Salgadinho: "icons/salgadinho.svg" 
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
  sort: "Ordem Alfabética", 
  placed: false, 
  mobileCart: false, 
  paymentDetail: null,
  cart: {}, 
  cartOrder: [],
};

const $ = (id) => document.getElementById(id);

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (n) => moneyFormatter.format(n);

const icon = (name, size = 24, stroke = 1.5) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

function getTotals() {
  const items = state.cartOrder
    .map((id) => products.find((p) => String(p.id) === String(id)))
    .filter((p) => p && (state.cart[p.id] || 0) > 0);

  const subtotal = items.reduce((s, p) => s + p.price * state.cart[p.id], 0);
  return { items, subtotal, total: subtotal };
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// ==========================================
// FUNÇÕES DE RENDERIZAÇÃO E SUPABASE
// ==========================================

async function saveCompletedOrder(method, clientName) {
  if (state.placed) return false;
  const { items, subtotal, total } = getTotals();
  if (!items.length || !method || !clientName) return false;
  
  const pedidoId = window.crypto ? window.crypto.randomUUID() : generateUUID();
  const agora = new Date().toISOString();

  const orderData = {
    id: pedidoId,
    nome_cliente: clientName,
    data_venda: agora,
    subtotal: roundMoney(subtotal),
    desconto: 0,
    total: roundMoney(total),
    metodo_pagamento: method,
    valor_recebido: null,
    troco: null
  };

  const itemsData = items.map(product => ({
    id: window.crypto ? window.crypto.randomUUID() : generateUUID(),
    pedido_id: pedidoId,
    produto_id: product.id,
    nome_produto: product.name,
    quantidade: state.cart[product.id],
    preco_unitario: product.price,
    total: roundMoney(product.price * state.cart[product.id])
  }));
  
  try {
    const { error: orderError } = await supabaseClient
      .from('pedidos')
      .insert([orderData]);

    if (orderError) throw orderError;

    const { error: itemsError } = await supabaseClient
      .from('itens_pedido')
      .insert(itemsData);

    if (itemsError) throw itemsError;

    localStorage.setItem("pdv:newOrderTrigger", Date.now().toString());
    return true;
  } catch (error) {
    console.error("Erro ao guardar o pedido no Supabase:", error);
    alert("Ocorreu um erro ao registar o pedido. Verifique a consola.");
    return false;
  }
}

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

// Filtra e ordena instantaneamente na memória (sem consultar o banco a cada clique)
function renderProducts() {
  $("clear").classList.toggle("hidden", !state.query);
  const q = state.query.trim().toLowerCase();
  
  let visible = products.filter((p) => 
    (state.category === "Todas" || p.category === state.category) && 
    (!q || p.name.toLowerCase().includes(q) || String(p.barcode || "").includes(q))
  );
  
  if (state.sort === "Ordem Alfabética") {
    visible.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } else if (state.sort === "Preço: Menor para o Maior") {
    visible.sort((a, b) => a.price - b.price);
  } else if (state.sort === "Preço: Maior para o Menor") {
    visible.sort((a, b) => b.price - a.price);
  }

  $("products").innerHTML = visible.length ? visible.map((p) =>
    `<button class="product-card" data-add="${p.id}" title="Adicionar ${escapeHtml(p.name)} ao pedido">
      <span class="product-image-wrap">${productThumb(p, "food-emoji")}${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : ""}</span>
      <span class="product-name">${escapeHtml(p.name)}</span><span class="product-price">${money(p.price)}</span>
    </button>`).join("") : `<p class="empty-products">Nenhum item encontrado nesta pesquisa.</p>`;
}

// Carrega do cache imediatamente e sincroniza com o Supabase em segundo plano
async function loadProductsFromDB() {
  if (!products.length) {
    $("products").innerHTML = '<p class="empty-products">A carregar produtos...</p>';
  }

  try {
    await carregarProdutosComSeguranca(() => {
      renderProducts();
      renderCart();
    });
  } catch (error) {
    $("products").innerHTML = `
      <div class="empty-products">
        <p>Erro ao carregar o catálogo. Verifique a ligação.</p>
        <button type="button" class="btn-outline" id="retry-load-btn" style="margin-top:10px; padding:6px 14px; cursor:pointer;">Tentar novamente</button>
      </div>`;
  }
}

function renderCart() {
  const { items, subtotal, total } = getTotals();
  const count = items.reduce((s, p) => s + state.cart[p.id], 0);

  $("order-items").innerHTML = items.length ? items.map((p) =>
    `<div class="order-item">
      <div class="order-thumbnail">${productThumb(p, "food-emoji food-emoji-small")}</div>
      <div class="order-details"><span class="order-name">${escapeHtml(p.name)}</span><span class="order-unit">${money(p.price)}</span></div>
      <div class="order-quantity">
        <button data-dec="${p.id}" title="Remover um">${icon("minus", 12, 2)}</button>
        <span>×${state.cart[p.id]}</span>
        <button data-add="${p.id}" title="Adicionar mais um">${icon("plus", 12, 2)}</button>
      </div>
      <span class="order-price">${money(p.price * state.cart[p.id])}</span>
    </div>`).join("")
    : `<div class="empty-cart">${icon("bag", 28, 1.2)}<p>O carrinho está vazio</p><span>Escolha algo do menu.</span></div>`;

  $("subtotal").textContent = money(subtotal);
  
  $("success").textContent = `Pedido Finalizado!${state.paymentDetail ? ` — ${state.paymentDetail}` : ""}`;
  $("success").classList.toggle("hidden", !state.placed);
  
  $("charge").textContent = state.placed ? "Pedido Finalizado!" : `Finalizar ${money(total)}`;
  $("charge").disabled = !count || state.placed;
  
  $("order-panel").classList.toggle("mobile-cart-open", state.mobileCart);
  $("mobile-trigger").innerHTML = `${icon("bag", 18)} Pedido (${count}) · ${money(total)} ${icon(state.mobileCart ? "x" : "menu", 16)}`;
}

function initStaticIcons() {
  $("title").innerHTML = "Menu <span>Categorias</span>";
  $("search-icon").innerHTML = icon("search", 17, 1.7);
  $("clear").innerHTML = icon("x", 14);
  $("chevron").innerHTML = icon("chevron", 14);
}

function renderAll() {
  renderCategories();
  renderCart();
  loadProductsFromDB();
}

// ==========================================
// LÓGICA DE NEGÓCIO E EVENTOS
// ==========================================

function updateCart(id, amount, fromCartEdit = false) {
  if (state.placed) {
    state.cart = {};
    state.cartOrder = [];
  }

  const newQty = Math.max(0, (state.cart[id] || 0) + amount);
  state.cart[id] = newQty;

  if (newQty <= 0) {
    delete state.cart[id];
    state.cartOrder = state.cartOrder.filter((itemId) => String(itemId) !== String(id));
  } else if (amount > 0) {
    const exists = state.cartOrder.some((itemId) => String(itemId) === String(id));
    if (!fromCartEdit || !exists) {
      state.cartOrder = [id, ...state.cartOrder.filter((itemId) => String(itemId) !== String(id))];
    }
  }

  state.placed = false;
  state.paymentDetail = null;
  renderCart();

  if (amount > 0 && !fromCartEdit && $("order-items")) {
    $("order-items").scrollTop = 0;
  }
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  
  if (t.id === "retry-load-btn") {
    loadProductsFromDB();
  } else if (t.dataset.cat) { 
    state.category = state.category === t.dataset.cat ? "Todas" : t.dataset.cat; 
    renderCategories();
    renderProducts(); 
  } else if (t.dataset.add) {
    const isInsideCart = Boolean(t.closest("#order-items"));
    updateCart(t.dataset.add, 1, isInsideCart);
  } else if (t.dataset.dec) {
    updateCart(t.dataset.dec, -1, true);
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

  renderProducts();
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#sort-wrapper") && $("sort-options")) {
    $("sort-options").classList.add("hidden");
  }
});

$("search").addEventListener("input", (e) => { 
  state.query = e.target.value; 
  renderProducts(); 
});

$("clear").addEventListener("click", () => { 
  state.query = ""; 
  $("search").value = ""; 
  renderProducts(); 
});

$("mobile-trigger").addEventListener("click", () => { 
  state.mobileCart = !state.mobileCart; 
  renderCart(); 
});

// ==========================================
// SISTEMA DE PAGAMENTO E IDENTIFICAÇÃO DO CLIENTE
// ==========================================

const payModal = $("payment-modal");
const payBody = $("payment-body");
let payStep = { type: "method" };

function renderPayment() {
  const { total } = getTotals();
  $("payment-total").textContent = money(total);
  
  if (payStep.type === "method") {
    $("payment-title").textContent = "Pagamento";
    payBody.innerHTML = `
      <div class="pay-options">
        <button class="pay-option" data-pay="pix">${icon("pix", 26)}<span>Pix</span></button>
        <button class="pay-option" data-pay="card">${icon("card", 26)}<span>Cartão</span></button>
        <button class="pay-option" data-pay="cash">${icon("cash", 26)}<span>Dinheiro</span></button>
      </div>`;
  } else if (payStep.type === "card") {
    $("payment-title").textContent = "Cartão";
    payBody.innerHTML = `
      <button class="pay-back" data-pay-back>${icon("back", 15)} Voltar</button>
      <div class="pay-options pay-options-two">
        <button class="pay-option" data-card="Débito">${icon("card", 26)}<span>Débito</span></button>
        <button class="pay-option" data-card="Crédito">${icon("card", 26)}<span>Crédito</span></button>
      </div>`;
  } else if (payStep.type === "customer") {
    $("payment-title").textContent = `Pagamento: ${payStep.method}`;
    payBody.innerHTML = `
      <button class="pay-back" data-pay-back>${icon("back", 15)} Voltar</button>
      <label class="pay-cash-label" for="client-name-input">Qual é o seu nome?</label>
      <div class="modal-input-wrap" style="margin-bottom: 16px;">
        <input id="client-name-input" type="text" placeholder="Digite seu nome" autocomplete="name" />
      </div>
      <button class="charge-button pay-finish" id="pay-confirm-order" disabled>${icon("check", 17)} Concluir pedido</button>`;

    const nameInput = $("client-name-input");
    const confirmBtn = $("pay-confirm-order");
    setTimeout(() => nameInput.focus(), 10);

    nameInput.addEventListener("input", (e) => {
      confirmBtn.disabled = e.target.value.trim().length < 2;
    });

    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !confirmBtn.disabled) {
        confirmBtn.click();
      }
    });
  }
}

$("charge").addEventListener("click", () => { 
  if (!state.placed) {
    payStep = { type: "method" };
    renderPayment();
    payModal.classList.remove("hidden");
  }
});

const closePayment = () => payModal.classList.add("hidden");
$("payment-cancel").addEventListener("click", closePayment);
payModal.addEventListener("click", (e) => { if (e.target === payModal) closePayment(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !payModal.classList.contains("hidden")) closePayment(); });

payBody.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  
  if (t.dataset.pay === "pix") { 
    payStep = { type: "customer", method: "Pix" }; 
    renderPayment(); 
  }
  else if (t.dataset.pay === "card") { 
    payStep = { type: "card" }; 
    renderPayment(); 
  }
  else if (t.dataset.pay === "cash") { 
    payStep = { type: "customer", method: "Dinheiro" }; 
    renderPayment(); 
  }
  else if (t.dataset.card) { 
    payStep = { type: "customer", method: `Cartão (${t.dataset.card})` }; 
    renderPayment(); 
  }
  else if ("payBack" in t.dataset) { 
    if (payStep.type === "customer" && payStep.method && payStep.method.startsWith("Cartão")) {
      payStep = { type: "card" };
    } else {
      payStep = { type: "method" };
    }
    renderPayment(); 
  }
  else if (t.id === "pay-confirm-order") {
    if (state.placed) return;
    const { items } = getTotals();
    const clientName = ($("client-name-input") ? $("client-name-input").value : "").trim();
    if (!items.length || !payStep.method || clientName.length < 2) return;

    t.disabled = true;
    t.textContent = "Enviando...";

    const pedidoSalvo = await saveCompletedOrder(payStep.method, clientName);
    if (!pedidoSalvo) {
      t.disabled = false;
      t.innerHTML = `${icon("check", 17)} Concluir pedido`;
      return;
    }
    
    state.placed = true;
    state.mobileCart = false;
    state.paymentDetail = `${clientName} · ${payStep.method}`;
    closePayment();
    renderCart();
  }
});

initStaticIcons();
renderAll();

window.addEventListener("storage", (e) => {
  if (e.key === 'pdv:updateTrigger') { loadProductsFromDB(); }
});

// ==========================================
// SUPORTE GLOBAL PARA LEITOR DE CÓDIGO DE BARRAS
// ==========================================
let barcodeBuffer = "";
let barcodeTimer = null;

document.addEventListener("keydown", (e) => {
  const activeId = document.activeElement ? document.activeElement.id : "";
  if (activeId === "client-name-input") {
    return;
  }

  if (["Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock", "Unidentified"].includes(e.key)) {
    return;
  }

  if (e.key === "Enter" || e.key === "Tab") {
    const code = barcodeBuffer.trim();

    if (code.length >= 4) {
      e.preventDefault();
      e.stopPropagation();

      const product = products.find(
        (p) => String(p.barcode || "").trim() === code
      );

      if (product) {
        updateCart(product.id, 1);

        const orderPanel = $("order-panel");
        orderPanel.style.transform = "scale(1.02)";
        setTimeout(() => (orderPanel.style.transform = "scale(1)"), 150);

        if (activeId === "search" || $("search").value) {
          $("search").value = "";
          state.query = "";
          renderProducts();
          $("search").blur();
        }
      } else {
        alert("Produto não encontrado: " + code);
      }

      barcodeBuffer = "";
      clearTimeout(barcodeTimer);
      return;
    }

    barcodeBuffer = "";
    clearTimeout(barcodeTimer);
    return;
  }

  if (/^[0-9a-zA-Z]$/.test(e.key)) {
    barcodeBuffer += e.key;

    clearTimeout(barcodeTimer);
    barcodeTimer = setTimeout(() => {
      barcodeBuffer = "";
    }, 200); 
  } else {
    barcodeBuffer = "";
  }
}, true);
