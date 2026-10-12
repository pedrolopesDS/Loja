// 1. Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCtcyBlS2VVj9hSo2QV9mGw8qkWVlgsFZQ",
  authDomain: "pdv-loja-1.firebaseapp.com",
  projectId: "pdv-loja-1",
  storageBucket: "pdv-loja-1.firebasestorage.app",
  messagingSenderId: "61547421823",
  appId: "1:61547421823:web:853bbbf3a5f189d1ce9f4a"
};

// 2. Inicializa a aplicação Firebase (Versão Compat)
firebase.initializeApp(firebaseConfig);

// 3. Inicializa o Firestore e ATIVA O MODO OFFLINE
const db = firebase.firestore();
db.enablePersistence().catch((err) => {
  if (err.code == 'failed-precondition') {
    console.log("Múltiplas abas abertas, persistência offline ativada apenas na primeira.");
  } else if (err.code == 'unimplemented') {
    console.log("O navegador atual não suporta persistência offline.");
  }
});

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

// Menu atualizado com links para páginas reais
const navigation = [
  ["Home", "bag", "index.html"], 
  ["Produtos", "box", "produtos.html"], 
  ["Dashboard", "dashboard", "dashboard.html"], 
  ["Messages", "message", "messages.html"], 
  ["Bills", "receipt", "bills.html"], 
  ["Setting", "settings", "settings.html"]
];

// ESTADO GLOBAL DA APLICAÇÃO
const state = {
  category: "Bala", 
  query: "", 
  sort: "Ordem Alfabética", 
  editing: false, 
  placed: false, 
  mobileCart: false, 
  discount: 0, 
  paymentDetail: null,
  cart: {}, 
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
// 3. FUNÇÕES DE RENDERIZAÇÃO E FIREBASE
// ==========================================

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// Salvar venda utilizando o Firebase Firestore
async function saveCompletedSale(method, received) {
  if (state.placed) return false;
  const { items, subtotal, discount, total } = getTotals();
  if (!items.length || !method) return false;
  
  const sale = {
    date: new Date().toISOString(),
    items: items.map((product) => ({
      id: product.id, name: product.name, price: product.price,
      quantity: state.cart[product.id], total: roundMoney(product.price * state.cart[product.id])
    })),
    subtotal: roundMoney(subtotal), discount: roundMoney(discount), total: roundMoney(total),
    payment: method,
    received: method === "Dinheiro" ? roundMoney(received) : null,
    change: method === "Dinheiro" ? roundMoney(Math.max(received - total, 0)) : null
  };
  
  try {
    // Grava a venda diretamente na coleção "vendas"
    await db.collection("vendas").add(sale);
    return true;
  } catch (error) {
    console.error("Erro ao guardar a venda no Firebase:", error);
    alert("Ocorreu um erro ao registar a venda. Verifique a consola.");
    return false;
  }
}

function renderNavigation() {
  $("nav").innerHTML = navigation.map(([name, ic, href]) => {
    return `<a class="nav-button ${name === "Home" ? "nav-button-active" : ""}" href="${href}" title="${name}">
              ${icon(ic)}<span>${name}</span>
            </a>`;
  }).join("");

  $("title").innerHTML = "Menu <span>Categorias</span>";
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

// Busca os produtos do Firebase na Frente de Caixa
async function renderProducts() {
  $("products").innerHTML = '<p class="empty-products">A carregar produtos...</p>';
  
  try {
    const snapshot = await db.collection("produtos").get();
    
    // Atualiza a variável global
    products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });

    $("clear").classList.toggle("hidden", !state.query);
    
    let visible = products.filter((p) => p.category === state.category && p.name.toLowerCase().includes(state.query.toLowerCase()));
    
    if (state.sort === "Ordem Alfabética") {
      visible.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else if (state.sort === "Preço: Menor para o Maior") {
      visible.sort((a, b) => a.price - b.price);
    } else if (state.sort === "Preço: Maior para o Menor") {
      visible.sort((a, b) => b.price - a.price);
    }
  
    $("products").innerHTML = visible.length ? visible.map((p) =>
      `<button class="product-card" data-add="${p.id}" title="Add ${p.name} to order">
        <span class="product-image-wrap">${productThumb(p, "food-emoji")}${p.badge ? `<span class="badge">${p.badge}</span>` : ""}</span>
        <span class="product-name">${escapeHtml(p.name)}</span><span class="product-price">${money(p.price)}</span>
      </button>`).join("") : `<p class="empty-products">Nenhum item encontrado.</p>`;
      
  } catch (error) {
    console.error("Erro ao carregar produtos do Firebase:", error);
    $("products").innerHTML = '<p class="empty-products">Erro ao carregar o catálogo.</p>';
  }
}

function renderCart() {
  const { items, subtotal, discount, total } = getTotals();
  const count = items.reduce((s, p) => s + state.cart[p.id], 0);

  $("order-items").innerHTML = items.length ? items.map((p) =>
    `<div class="order-item">
      <div class="order-thumbnail">${productThumb(p, "food-emoji food-emoji-small")}</div>
      <div class="order-details"><span class="order-name">${escapeHtml(p.name)}</span><span class="order-unit">${money(p.price)}</span></div>
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
  
  // INICIALIZAÇÃO DO NOVO ÍCONE DE FATURA
  if ($("invoice-btn")) {
    $("invoice-btn").innerHTML = icon("invoice", 17);
  }
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
  if (state.placed) {
    state.cart = {};
    state.discount = 0;
    state.editing = false;
  }
  state.cart[id] = Math.max(0, (state.cart[id] || 0) + amount);
  state.placed = false;
  state.paymentDetail = null;
  renderCart();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  
  if (t.dataset.cat) { 
    state.category = t.dataset.cat; 
    renderCategories();
    renderProducts(); 
  } else if (t.dataset.add) {
    updateCart(t.dataset.add, 1);
  } else if (t.dataset.dec) {
    updateCart(t.dataset.dec, -1);
  }
});

// Eventos do Dropdown Customizado de Filtros
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

$("edit").addEventListener("click", () => { 
  state.editing = !state.editing; 
  renderCart(); 
});

// Miniaturas do cadastro: usa a foto original sem distorcer; sem foto, usa um ícone de embalagem.
function carregarMiniaturaPDF(produto) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 144;
    const ctx = canvas.getContext("2d");
    if (!ctx) { resolve(null); return; }
    const limpar = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 144, 144);
    };
    const fallback = () => {
      limpar();
      ctx.strokeStyle = "#a1a1aa";
      ctx.lineWidth = 3;
      ctx.strokeRect(32, 38, 80, 68);
      ctx.beginPath();
      ctx.moveTo(32, 38); ctx.lineTo(72, 58); ctx.lineTo(112, 38);
      ctx.moveTo(72, 58); ctx.lineTo(72, 106); ctx.stroke();
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    if (!produto.photo) { fallback(); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timeout = setTimeout(() => { img.onload = img.onerror = null; fallback(); }, 8000);
    img.onerror = () => { clearTimeout(timeout); fallback(); };
    img.onload = () => {
      clearTimeout(timeout);
      try {
        limpar();
        const scale = Math.min(128 / img.naturalWidth, 128 / img.naturalHeight);
        const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
        ctx.drawImage(img, (144 - w) / 2, (144 - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (_) {
        canvas.width = canvas.height = 144;
        fallback();
      }
    };
    img.src = produto.photo;
  });
}

async function gerarFaturaPDF() {
  const botao = $("invoice-btn");
  if (botao && botao.disabled) return;
  const { items, subtotal, discount, total } = getTotals();
  if (!items.length) {
    alert("O carrinho está vazio. Adicione produtos antes de gerar a cotação.");
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Não foi possível carregar o gerador de PDF. Verifique sua conexão.");
    return;
  }
  // Congela os dados para alterações no carrinho não mudarem a cotação durante o carregamento.
  const linhas = items.map((p) => ({ ...p, quantidade: state.cart[p.id] }));
  if (botao) { botao.disabled = true; botao.setAttribute("aria-busy", "true"); }
  try {
    const miniaturas = await Promise.all(linhas.map(carregarMiniaturaPDF));
    const doc = new window.jspdf.jsPDF();
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    const margem = 16, direita = largura - margem;
    const xNome = margem + 19, xQtd = 121, xPreco = 157;
    const larguraNome = xQtd - xNome - 16;
    const limite = altura - 24;
    const agora = new Date();
    const numero = Date.now().toString(36).toUpperCase();
    let y;
    const texto = (valor, x, posY, tamanho = 10, negrito = false, cor = 35, alinhamento = "left") => {
      doc.setFont("helvetica", negrito ? "bold" : "normal");
      doc.setFontSize(tamanho);
      doc.setTextColor(cor);
      doc.text(valor, x, posY, { align: alinhamento });
    };
    const cabecalho = () => {
      texto("Cotação", margem, 23, 18, true);
      texto(`Nº: ${numero}`, direita, 22, 9, false, 110, "right");
      texto(`Data: ${agora.toLocaleDateString("pt-BR")} ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, margem, 31, 9, false, 110);
      doc.setFillColor(247, 247, 248);
      doc.rect(margem, 40, direita - margem, 11, "F");
      texto("Produto", margem + 3, 47, 9, false, 115);
      texto("Quantidade", xQtd, 47, 9, false, 115, "center");
      texto("Preço unitário", xPreco, 47, 9, false, 115, "right");
      texto("Total", direita - 3, 47, 9, false, 115, "right");
      y = 51;
    };
    const novaPagina = () => { doc.addPage(); cabecalho(); };
    cabecalho();
    linhas.forEach((p, index) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      const nome = doc.splitTextToSize(String(p.name), larguraNome);
      const identificacao = p.sku || p.barcode || p.id;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      const codigo = identificacao == null ? [] : doc.splitTextToSize(String(identificacao), larguraNome);
      // Fragmenta somente nomes excepcionalmente extensos, mantendo cada bloco dentro da página.
      const blocos = [
        ...nome.map((text) => ({ text, bold: true, size: 10, color: 35, step: 4.5 })),
        ...codigo.map((text) => ({ text, bold: false, size: 8, color: 145, step: 3.8 }))
      ];
      let offset = 0;
      while (offset < blocos.length) {
        if (y + 23 > limite) novaPagina();
        const disponivel = limite - y - 10;
        let usados = 0, fim = offset;
        while (fim < blocos.length && usados + blocos[fim].step <= disponivel) {
          usados += blocos[fim].step; fim++;
        }
        const alturaLinha = Math.max(23, usados + 10);
        const centro = y + alturaLinha / 2;
        if (miniaturas[index]) doc.addImage(miniaturas[index], "JPEG", margem + 1, centro - 7, 14, 14);
        let baseline = y + (alturaLinha - usados) / 2 + 3;
        for (let i = offset; i < fim; i++) {
          const bloco = blocos[i];
          texto(bloco.text, xNome, baseline, bloco.size, bloco.bold, bloco.color);
          baseline += bloco.step;
        }
        if (offset === 0) {
          texto(String(p.quantidade), xQtd, centro + 1.5, 10, true, 35, "center");
          texto(money(p.price), xPreco, centro + 1.5, 10, true, 35, "right");
          texto(money(p.price * p.quantidade), direita - 3, centro + 1.5, 10, true, 35, "right");
        }
        y += alturaLinha;
        doc.setDrawColor(235, 235, 238); doc.setLineWidth(0.25);
        doc.line(margem, y, direita, y);
        offset = fim;
        if (offset < blocos.length) novaPagina();
      }
    });
    if (y + (discount > 0 ? 39 : 32) > limite) novaPagina();
    y += 11;
    texto("Subtotal", xPreco - 4, y, 10, false, 110, "right");
    texto(money(subtotal), direita - 3, y, 10, false, 35, "right");
    if (discount > 0) {
      y += 7;
      texto("Desconto", xPreco - 4, y, 10, false, 110, "right");
      texto(`- ${money(discount)}`, direita - 3, y, 10, false, 35, "right");
    }
    y += 11;
    texto("TOTAL", xPreco - 4, y, 12, true, 35, "right");
    texto(money(total), direita - 3, y, 12, true, 35, "right");
    const paginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      texto("50.509.556/0001-86 - 50.509.556 Pedro Henrique Lopes de Oliveira", margem, altura - 12, 8, false, 140);
      texto(`${i} / ${paginas}`, direita, altura - 12, 8, false, 140, "right");
    }
    doc.save(`fatura-${agora.toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error("Falha ao gerar cotação:", error);
    alert("Não foi possível gerar a cotação. Tente novamente.");
  } finally {
    if (botao) { botao.disabled = false; botao.removeAttribute("aria-busy"); }
  }
}

if ($("invoice-btn")) {
  $("invoice-btn").addEventListener("click", gerarFaturaPDF);
}

$("logout").addEventListener("click", () => { 
  window.location.href = "index.html"; 
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

// Callback alterado para "async" para aguardar a gravação na nuvem
payBody.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  
  if (t.dataset.pay === "pix") { payStep = { type: "confirm", method: "Pix" }; renderPayment(); }
  else if (t.dataset.pay === "card") { payStep = { type: "card" }; renderPayment(); }
  else if (t.dataset.pay === "cash") { payStep = { type: "cash", method: "Dinheiro" }; renderPayment(); }
  else if (t.dataset.card) { payStep = { type: "confirm", method: `Cartão (${t.dataset.card})` }; renderPayment(); }
  else if ("payBack" in t.dataset) { payStep = { type: "method" }; renderPayment(); }
  else if (t.id === "pay-finish") {
    if (state.placed) return;
    const { total, items } = getTotals();
    if (!items.length || !payStep.method) return;
    let detail = payStep.method;
    let received = null;
    
    if (payStep.method === "Dinheiro") {
      received = parseFloat(($("cash-input").value || "").replace(",", "."));
      if (!Number.isFinite(received) || received < total) return;
      detail = `Dinheiro · Troco ${money(Math.max(received - total, 0))}`;
    }
    
    // AWAIT aqui: Aguarda a gravação no Firebase
    const vendaSalva = await saveCompletedSale(payStep.method, received);
    if (!vendaSalva) return;
    
    state.placed = true;
    state.mobileCart = false;
    state.paymentDetail = detail;
    closePayment();
    renderCart();
  }
});

initStaticIcons();
renderAll();

// Atualiza a tela de vendas quando os produtos mudam em outra aba (no cadastro)
window.addEventListener("storage", (e) => {
  if (e.key === 'pdv:updateTrigger') { renderProducts(); renderCart(); }
});
