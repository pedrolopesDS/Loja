// ==========================================
// 1. DADOS E CONFIGURAÇÕES
// ==========================================
const paths = {
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6"/><path d="M16 12h-6"/><path d="M16 16h-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  candy: '<path d="m9.5 7.5-2 2a4.95 4.95 0 1 0 7 7l2-2a4.95 4.95 0 1 0-7-7Z"/><path d="M14 6.5v10"/><path d="M10 7.5v10"/><path d="m16 7 1-5 1.37.68A3 3 0 0 0 19.7 3H21v1.3c0 .46.1.92.32 1.33L22 7l-5 1"/><path d="m8 17-1 5-1.37-.68A3 3 0 0 0 4.3 21H3v-1.3a3 3 0 0 0-.32-1.33L2 17l5-1"/>',
  boxes: '<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/>',
  chiclete: '<circle cx="14.5" cy="8.5" r="5.5"/><path d="M10.8 12.6c-.9.6-1.5 1.1-2.1 1.9"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/>',
  chocolate: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M12 3v18"/><path d="M4 9h16"/><path d="M4 15h16"/>',
  dessert: '<circle cx="12" cy="4" r="2"/><path d="M10.2 3.2C5.5 4 2 8.1 2 13a2 2 0 0 0 4 0v-1a2 2 0 0 1 4 0v4a2 2 0 0 0 4 0v-4a2 2 0 0 1 4 0v1a2 2 0 0 0 4 0c0-4.9-3.5-9-8.2-9.8"/><path d="M3.2 14.8a9 9 0 0 0 17.6 0"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  lollipop: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 11a2 2 0 0 0 4 0 4 4 0 0 0-8 0 6 6 0 0 0 12 0"/>',
  pote: '<rect x="7" y="2.5" width="10" height="4" rx="1.5"/><rect x="5.5" y="6.5" width="13" height="15" rx="4"/>',
  popcorn: '<path d="M18 8a2 2 0 0 0 0-4 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0 0 4"/><path d="M10 22 9 8"/><path d="m14 22 1-14"/><path d="M20 8c.5 0 .9.4.8 1l-2.6 12c-.1.5-.7 1-1.2 1H7c-.6 0-1.1-.4-1.2-1L3.2 9c-.1-.6.3-1 .8-1Z"/>',
  pix: '<path d="M13.2 2.8a2.5 2.5 0 0 0-3.5 0L2.8 9.7a2.5 2.5 0 0 0 0 3.5l6.9 6.9a2.5 2.5 0 0 0 3.5 0l6.9-6.9a2.5 2.5 0 0 0 0-3.5Z"/><circle cx="12" cy="12" r="2.5"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
};

const products = [
  { id: "bala-morango", name: "Bala de Morango", price: 0.5, category: "Bala", emoji: "🍬" },
  { id: "bala-menta", name: "Bala de Menta", price: 0.5, category: "Bala", emoji: "🍬" },
  { id: "bala-acida", name: "Bala Ácida", price: 0.75, category: "Bala", emoji: "🍬", badge: "Novo" },
  { id: "caixa-sortida", name: "Caixa Sortida", price: 15.9, category: "Caixaria", emoji: "📦" },
  { id: "caixa-trufas", name: "Caixa de Trufas", price: 24.9, category: "Caixaria", emoji: "📦", badge: "Novo" },
  { id: "chiclete-morango", name: "Chiclete Morango", price: 0.75, category: "Chiclete", emoji: "🫧" },
  { id: "chiclete-menta", name: "Chiclete Menta", price: 0.75, category: "Chiclete", emoji: "🫧" },
  { id: "barra-leite", name: "Barra Ao Leite", price: 7.9, category: "Chocolate", emoji: "🍫" },
  { id: "barra-amargo", name: "Barra Meio Amargo", price: 8.5, category: "Chocolate", emoji: "🍫" },
  { id: "trufa-belga", name: "Trufa Belga", price: 4.5, category: "Chocolate", emoji: "🍫" },
  { id: "brigadeiro", name: "Brigadeiro Gourmet", price: 3.5, category: "Doces", emoji: "🍮" },
  { id: "doce-leite", name: "Doce de Leite", price: 3.0, category: "Doces", emoji: "🍮" },
  { id: "sacola-kraft", name: "Sacola Kraft", price: 1.5, category: "Embalagem", emoji: "🛍️️" },
  { id: "caixa-presente", name: "Caixa de Presente", price: 5.0, category: "Embalagem", emoji: "🎁" },
  { id: "pirulito-colorido", name: "Pirulito Colorido", price: 1.0, category: "Pirulito", emoji: "🍭" },
  { id: "pirulito-gigante", name: "Pirulito Gigante", price: 3.5, category: "Pirulito", emoji: "🍭", badge: "Novo" },
  { id: "pote-brigadeiro", name: "Pote de Brigadeiro", price: 12.9, category: "Pote", emoji: "🫙" },
  { id: "pote-doce-leite", name: "Pote de Doce de Leite", price: 14.9, category: "Pote", emoji: "🫙" },
  { id: "salgadinho-queijo", name: "Salgadinho de Queijo", price: 6.9, category: "Salgadinho", emoji: "🧀" },
  { id: "chips-milho", name: "Chips de Milho", price: 5.9, category: "Salgadinho", emoji: "🌽" },
];

const categories = [
  ["Bala", "candy"], ["Caixaria", "boxes"], ["Chiclete", "chiclete"], ["Chocolate", "chocolate"],
  ["Doces", "dessert"], ["Embalagem", "gift"], ["Pirulito", "lollipop"], ["Pote", "pote"], ["Salgadinho", "popcorn"],
];

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

const navigation = [
  ["Home", "bag"], ["Dashboard", "dashboard"], ["Messages", "message"], 
  ["Bills", "receipt"], ["Setting", "settings"]
];

const altIcons = { Dashboard: "dashboard", Messages: "message", Bills: "receipt", Setting: "settings" };

// ESTADO GLOBAL DA APLICAÇÃO
const state = {
  category: "Bala", 
  query: "", 
  sort: "Popular", 
  activeNav: "Home",
  editing: false, 
  placed: false, 
  mobileCart: false, 
  discount: 0, 
  paymentDetail: null,
  cart: { "barra-leite": 2, "trufa-belga": 1, "pote-brigadeiro": 3, "pirulito-colorido": 2 },
};

// ==========================================
// 2. UTILITÁRIOS
// ==========================================
const $ = (id) => document.getElementById(id);

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (n) => moneyFormatter.format(n);

const icon = (name, size = 24, stroke = 1.5) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

function getTotals() {
  const items = products.filter((p) => (state.cart[p.id] || 0) > 0);
  const subtotal = items.reduce((s, p) => s + p.price * state.cart[p.id], 0);
  const discount = Math.min(state.discount, subtotal);
  return { items, subtotal, discount, total: Math.max(subtotal - discount, 0) };
}

// ==========================================
// 3. FUNÇÕES DE RENDERIZAÇÃO
// ==========================================

function renderNavigation() {
  $("nav").innerHTML = navigation.map(([name, ic]) =>
    `<button class="nav-button ${state.activeNav === name ? "nav-button-active" : ""}" data-nav="${name}" title="${name}">
      ${icon(ic)}<span>${name}</span>
    </button>`).join("");

  const home = state.activeNav === "Home";
  $("title").innerHTML = home ? "Menu <span>Categorias</span>" : state.activeNav;
  $("home-view").classList.toggle("hidden", !home);
  $("alt-view").classList.toggle("hidden", home);
  
  if (!home) {
    $("alt-icon").innerHTML = icon(altIcons[state.activeNav] || "settings");
    $("alt-title").textContent = state.activeNav;
    $("alt-text").textContent = state.activeNav === "Bills" ? "Your current order is ready on the right." : "Your menu and current order are just a click away.";
  }
}

function renderCategories() {
  $("categories").innerHTML = categories.map(([name, ic]) => {
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
}

function renderProducts() {
  $("clear").classList.toggle("hidden", !state.query);

  let visible = products.filter((p) => p.category === state.category && p.name.toLowerCase().includes(state.query.toLowerCase()));
  
  if (state.sort === "Price: low to high") visible.sort((a, b) => a.price - b.price);
  else if (state.sort === "Price: high to low") visible.sort((a, b) => b.price - a.price);

  $("products").innerHTML = visible.length ? visible.map((p) =>
    `<button class="product-card" data-add="${p.id}" title="Add ${p.name} to order">
      <span class="product-image-wrap"><span class="food-emoji">${p.emoji}</span>${p.badge ? `<span class="badge">${p.badge}</span>` : ""}</span>
      <span class="product-name">${p.name}</span><span class="product-price">${money(p.price)}</span>
    </button>`).join("") : `<p class="empty-products">Nenhum item encontrado.</p>`;
}

function renderCart() {
  const { items, subtotal, discount, total } = getTotals();
  const count = items.reduce((s, p) => s + state.cart[p.id], 0);

  $("order-items").innerHTML = items.length ? items.map((p) =>
    `<div class="order-item">
      <div class="order-thumbnail"><span class="food-emoji food-emoji-small">${p.emoji}</span></div>
      <div class="order-details"><span class="order-name">${p.name}</span><span class="order-unit">${money(p.price)}</span></div>
      <div class="order-quantity">
        ${state.editing ? `<button data-dec="${p.id}" title="Remove one">${icon("minus", 12, 2)}</button>` : ""}
        <span>×${state.cart[p.id]}</span>
        ${state.editing ? `<button data-add="${p.id}" title="Add one">${icon("plus", 12, 2)}</button>` : ""}
      </div>
      <span class="order-price">${money(p.price * state.cart[p.id])}</span>
    </div>`).join("")
    : `<div class="empty-cart">${icon("bag", 28, 1.2)}<p>O carrinho está vazio</p><span>Escolha algo do menu.</span></div>`;

  $("subtotal").textContent = money(subtotal);
  $("discount").textContent = discount > 0 ? `- ${money(discount)}` : money(0);
  $("discount").classList.toggle("discount-applied", discount > 0);
  
  $("edit").innerHTML = state.editing ? icon("x", 17) : icon("pencil", 17);
  
  $("success").textContent = `Venda Finalizada!${state.paymentDetail ? ` — ${state.paymentDetail}` : ""}`;
  $("success").classList.toggle("hidden", !state.placed);
  
  $("charge").textContent = state.placed ? "Venda Finalizada!" : `Finalizar ${money(total)}`;
  $("charge").disabled = !count || state.placed;
  
  $("order-panel").classList.toggle("mobile-cart-open", state.mobileCart);
  $("mobile-trigger").innerHTML = `${icon("bag", 18)} Order (${count}) · ${money(total)} ${icon(state.mobileCart ? "x" : "menu", 16)}`;
}

function initStaticIcons() {
  $("search-icon").innerHTML = icon("search", 17, 1.7);
  $("clear").innerHTML = icon("x", 14);
  $("chevron").innerHTML = icon("chevron", 14);
  $("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;
}

function renderAll() {
  renderNavigation();
  renderCategories();
  renderProducts();
  renderCart();
}

// ==========================================
// 4. LÓGICA DE NEGÓCIO E EVENTOS
// ==========================================

function updateCart(id, amount) {
  state.cart[id] = Math.max(0, (state.cart[id] || 0) + amount);
  state.placed = false;
  state.paymentDetail = null;
  renderCart();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  
  if (t.dataset.nav) { 
    state.activeNav = t.dataset.nav; 
    renderNavigation(); 
  } else if (t.dataset.cat) { 
    state.category = t.dataset.cat; 
    renderCategories();
    renderProducts(); 
  } else if (t.dataset.add) {
    updateCart(t.dataset.add, 1);
  } else if (t.dataset.dec) {
    updateCart(t.dataset.dec, -1);
  }
});

$("search").addEventListener("input", (e) => { 
  state.query = e.target.value; 
  if(state.activeNav !== "Home") {
    state.activeNav = "Home";
    renderNavigation();
  }
  renderProducts(); 
});

$("clear").addEventListener("click", () => { 
  state.query = ""; 
  $("search").value = ""; 
  renderProducts(); 
});

$("sort").addEventListener("change", (e) => { 
  state.sort = e.target.value; 
  renderProducts(); 
});

$("edit").addEventListener("click", () => { 
  state.editing = !state.editing; 
  renderCart(); 
});

$("back").addEventListener("click", () => { 
  state.activeNav = "Home"; 
  renderNavigation(); 
});

$("logout").addEventListener("click", () => { 
  state.activeNav = "Home"; 
  state.placed = false; 
  renderAll(); 
});

$("mobile-trigger").addEventListener("click", () => { 
  state.mobileCart = !state.mobileCart; 
  renderCart(); 
});

// ==========================================
// 5. SISTEMA DE DESCONTO E PAGAMENTO
// ==========================================

const modalDesconto = $("discount-modal");

$("discount-btn").addEventListener("click", () => {
  $("discount-input").value = state.discount ? state.discount.toFixed(2) : "";
  $("discount-remove").classList.toggle("hidden", !state.discount);
  modalDesconto.classList.remove("hidden");
  $("discount-input").focus();
});

$("discount-cancel").addEventListener("click", () => modalDesconto.classList.add("hidden"));
modalDesconto.addEventListener("click", (e) => { if (e.target === modalDesconto) modalDesconto.classList.add("hidden"); });

$("discount-remove").addEventListener("click", () => { 
  state.discount = 0; 
  modalDesconto.classList.add("hidden"); 
  renderCart(); 
});

function aplicarDesconto() {
  const inputVal = $("discount-input").value.replace(",", ".");
  const value = parseFloat(inputVal);
  const { subtotal } = getTotals();
  state.discount = isNaN(value) || value <= 0 ? 0 : Math.min(value, subtotal);
  modalDesconto.classList.add("hidden");
  renderCart();
}

$("discount-apply").addEventListener("click", aplicarDesconto);
$("discount-input").addEventListener("keydown", (e) => { if (e.key === "Enter") aplicarDesconto(); });

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
  } else if (payStep.type === "cash") {
    $("payment-title").textContent = "Dinheiro";
    payBody.innerHTML = `
      <button class="pay-back" data-pay-back>${icon("back", 15)} Voltar</button>
      <label class="pay-cash-label" for="cash-input">Valor recebido</label>
      <div class="modal-input-wrap pay-cash-input"><span>R$</span><input id="cash-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" /></div>
      <div class="pay-change"><span>Troco</span><strong id="cash-change">${money(0)}</strong></div>
      <button class="charge-button pay-finish" id="pay-finish" disabled>${icon("check", 17)} Finalizar</button>`;
    
    const input = $("cash-input");
    setTimeout(() => input.focus(), 10);

    input.addEventListener("input", () => {
      const recebidoStr = input.value.replace(",", ".");
      const received = parseFloat(recebidoStr) || 0; 
      const troco = received - total;
      const podeFinalizar = received >= total;

      $("cash-change").textContent = money(podeFinalizar ? troco : 0);
      $("cash-change").classList.toggle("change-ok", podeFinalizar);
      $("pay-finish").disabled = !podeFinalizar;
    });
  } else {
    $("payment-title").textContent = "Confirmar";
    payBody.innerHTML = `
      <div class="pay-confirm">${icon("check", 32)}<p>Pagamento por ${payStep.method}<br />Total: ${money(total)}</p></div>
      <button class="charge-button pay-finish" id="pay-finish">Finalizar</button>`;
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

payBody.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  
  if (t.dataset.pay === "pix") { payStep = { type: "confirm", method: "Pix" }; renderPayment(); }
  else if (t.dataset.pay === "card") { payStep = { type: "card" }; renderPayment(); }
  else if (t.dataset.pay === "cash") { payStep = { type: "cash", method: "Dinheiro" }; renderPayment(); }
  else if (t.dataset.card) { payStep = { type: "confirm", method: `Cartão (${t.dataset.card})` }; renderPayment(); }
  else if ("payBack" in t.dataset) { payStep = { type: "method" }; renderPayment(); }
  else if (t.id === "pay-finish") {
    const { total } = getTotals();
    let detail = payStep.method;
    
    if (payStep.method === "Dinheiro") {
      const received = parseFloat(($("cash-input").value || "").replace(",", ".")) || 0;
      detail = `Dinheiro · Troco ${money(Math.max(received - total, 0))}`;
    }
    
    state.placed = true;
    state.mobileCart = false;
    state.paymentDetail = detail;
    closePayment();
    renderCart(); 
  }
});

initStaticIcons();
renderAll();
