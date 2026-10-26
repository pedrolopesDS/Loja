// ==========================================
// FRENTE DE CAIXA (INTEGRADA AO SUPABASE)
// ==========================================

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

const navigation = [
  ["Home", "bag", "index.html"], 
  ["Produtos", "box", "produtos.html"], 
  ["Dashboard", "dashboard", "dashboard.html"], 
  ["Messages", "message", "messages.html"], 
  ["Bills", "receipt", "bills.html"], 
  ["Setting", "settings", "settings.html"]
];

const CUSTOM_ITEM_ID = "__custom_amount__";

const state = {
  category: "Todas", 
  query: "", 
  sort: "Ordem Alfabética", 
  editing: false, 
  placed: false, 
  mobileCart: false, 
  discount: 0, 
  customAmount: 0,
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
    .map((id) => {
      if (id === CUSTOM_ITEM_ID) {
        return state.customAmount > 0
          ? { id: CUSTOM_ITEM_ID, name: "Valor Avulso", price: state.customAmount, isCustom: true }
          : null;
      }
      const prod = products.find((p) => String(p.id) === String(id));
      return prod && (state.cart[prod.id] || 0) > 0 ? prod : null;
    })
    .filter(Boolean);

  const productsSubtotal = items
    .filter((p) => !p.isCustom)
    .reduce((s, p) => s + p.price * state.cart[p.id], 0);

  const customAmount = state.customAmount > 0 ? state.customAmount : 0;
  const grossTotal = productsSubtotal + customAmount;
  const discount = Math.min(state.discount, grossTotal);

  return {
    items,
    subtotal: productsSubtotal,
    customAmount,
    grossTotal,
    discount,
    total: Math.max(grossTotal - discount, 0)
  };
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function formatCurrencyInput(value) {
  let v = String(value).replace(/\D/g, ""); 
  if (!v) return "";
  v = (parseInt(v, 10) / 100).toFixed(2); 
  v = v.replace(".", ","); 
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); 
  return v;
}

// ==========================================
// FUNÇÕES DE RENDERIZAÇÃO E SUPABASE
// ==========================================

async function saveCompletedSale(method, received) {
  if (state.placed) return false;
  const { items, subtotal, customAmount, grossTotal, discount, total } = getTotals();
  if (!items.length || !method) return false;
  
  const vendaId = window.crypto ? window.crypto.randomUUID() : generateUUID();
  const agora = new Date().toISOString();

  const saleData = {
    id: vendaId,
    data_venda: agora,
    subtotal: roundMoney(grossTotal),
    desconto: roundMoney(discount),
    total: roundMoney(total),
    metodo_pagamento: method,
    valor_recebido: method === "Dinheiro" ? roundMoney(received) : null,
    troco: method === "Dinheiro" ? roundMoney(Math.max(received - total, 0)) : null
  };

  const itemsData = items.map(product => {
    const qty = product.isCustom ? 1 : state.cart[product.id];
    return {
      id: window.crypto ? window.crypto.randomUUID() : generateUUID(),
      produto_id: product.isCustom ? null : product.id,
      nome_produto: product.name,
      quantidade: qty,
      preco_unitario: roundMoney(product.price),
      total: roundMoney(product.price * qty)
    };
  });
  
  try {
    const { error } = await supabaseClient.rpc('sincronizar_venda_offline', {
      p_venda: saleData,
      p_itens: itemsData
    });

    if (error) throw error;

    imprimirNotinhaTermica({
      vendaId,
      dataVenda: agora,
      items,
      subtotal,
      customAmount,
      discount,
      total,
      method,
      received
    });

    return true;
  } catch (error) {
    console.error("Erro ao guardar a venda no Supabase:", error);
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

// Filtra e ordena instantaneamente na memória (NÃO faz requisição ao banco a cada clique)
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
  const { items, subtotal, customAmount, discount, total } = getTotals();
  const count = items.reduce((s, p) => s + (p.isCustom ? 1 : state.cart[p.id]), 0);

  $("order-items").innerHTML = items.length ? items.map((p) => {
    if (p.isCustom) {
      const customThumb = `<span class="food-emoji food-emoji-small thumb-media" style="color: var(--primary);">${icon("cash", 24)}</span>`;
      return `<div class="order-item">
        <div class="order-thumbnail">${customThumb}</div>
        <div class="order-details"><span class="order-name">${escapeHtml(p.name)}</span><span class="order-unit">${money(p.price)}</span></div>
        <div class="order-quantity">
          ${state.editing ? `<button data-dec="${CUSTOM_ITEM_ID}" title="Remover valor avulso">${icon("minus", 12, 2)}</button>` : ""}
          <span>×1</span>
          ${state.editing ? `<button data-edit-custom="true" title="Editar valor avulso">${icon("pencil", 12, 2)}</button>` : ""}
        </div>
        <span class="order-price">${money(p.price)}</span>
      </div>`;
    }

    return `<div class="order-item">
      <div class="order-thumbnail">${productThumb(p, "food-emoji food-emoji-small")}</div>
      <div class="order-details"><span class="order-name">${escapeHtml(p.name)}</span><span class="order-unit">${money(p.price)}</span></div>
      <div class="order-quantity">
        ${state.editing ? `<button data-dec="${p.id}" title="Remover um">${icon("minus", 12, 2)}</button>` : ""}
        <span>×${state.cart[p.id]}</span>
        ${state.editing ? `<button data-add="${p.id}" title="Adicionar mais um">${icon("plus", 12, 2)}</button>` : ""}
      </div>
      <span class="order-price">${money(p.price * state.cart[p.id])}</span>
    </div>`;
  }).join("")
    : `<div class="empty-cart">${icon("bag", 28, 1.2)}<p>O carrinho está vazio</p><span>Escolha algo do menu.</span></div>`;

  $("subtotal").textContent = money(subtotal);

  if ($("custom-amount")) {
    $("custom-amount").textContent = customAmount > 0 ? `+ ${money(customAmount)}` : money(0);
    $("custom-amount").classList.toggle("discount-applied", customAmount > 0);
  }

  $("discount").textContent = discount > 0 ? `- ${money(discount)}` : money(0);
  $("discount").classList.toggle("discount-applied", discount > 0);
  
  $("edit").innerHTML = state.editing ? icon("x", 17) : icon("pencil", 17);
  
  $("success").textContent = `Venda Finalizada!${state.paymentDetail ? ` — ${state.paymentDetail}` : ""}`;
  $("success").classList.toggle("hidden", !state.placed);
  
  $("charge").textContent = state.placed ? "Venda Finalizada!" : `Finalizar ${money(total)}`;
  $("charge").disabled = !count || state.placed;
  
  $("order-panel").classList.toggle("mobile-cart-open", state.mobileCart);
  $("mobile-trigger").innerHTML = `${icon("bag", 18)} Pedido (${count}) · ${money(total)} ${icon(state.mobileCart ? "x" : "menu", 16)}`;
}

function initStaticIcons() {
  $("search-icon").innerHTML = icon("search", 17, 1.7);
  $("clear").innerHTML = icon("x", 14);
  $("chevron").innerHTML = icon("chevron", 14);
  $("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;
  
  if ($("invoice-btn")) {
    $("invoice-btn").innerHTML = icon("invoice", 17);
  }
}

function renderAll() {
  renderNavigation();
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
    state.discount = 0;
    state.customAmount = 0;
    state.editing = false;
  }

  if (id === CUSTOM_ITEM_ID && amount < 0) {
    state.customAmount = 0;
    state.cartOrder = state.cartOrder.filter((itemId) => itemId !== CUSTOM_ITEM_ID);
    state.placed = false;
    state.paymentDetail = null;
    renderCart();
    return;
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
  } else if (t.dataset.editCustom) {
    abrirModalValorAvulso();
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

$("edit").addEventListener("click", () => { 
  state.editing = !state.editing; 
  renderCart(); 
});

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
  const { items, grossTotal, discount, total } = getTotals();
  if (!items.length) {
    alert("O carrinho está vazio. Adicione produtos antes de gerar a cotação.");
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Não foi possível carregar o gerador de PDF. Verifique sua conexão.");
    return;
  }
  
  const linhas = items.map((p) => ({ ...p, quantidade: p.isCustom ? 1 : state.cart[p.id] }));
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
      const identificacao = p.isCustom ? null : (p.sku || p.barcode || p.id);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      const codigo = identificacao == null ? [] : doc.splitTextToSize(String(identificacao), larguraNome);
      
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
    texto(money(grossTotal), direita - 3, y, 10, false, 35, "right");
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

$("mobile-trigger").addEventListener("click", () => { 
  state.mobileCart = !state.mobileCart; 
  renderCart(); 
});

// ==========================================
// SISTEMA DE VALOR AVULSO, DESCONTO E PAGAMENTO
// ==========================================

const modalValorAvulso = $("custom-amount-modal");

function abrirModalValorAvulso() {
  const input = $("custom-amount-input");
  input.type = "text";
  input.inputMode = "numeric";
  input.value = state.customAmount ? formatCurrencyInput((state.customAmount * 100).toFixed(0)) : "";

  $("custom-amount-remove").classList.toggle("hidden", !state.customAmount);
  modalValorAvulso.classList.remove("hidden");
  input.focus();
}

$("custom-amount-btn").addEventListener("click", abrirModalValorAvulso);

$("custom-amount-input").addEventListener("input", (e) => {
  e.target.value = formatCurrencyInput(e.target.value);
});

$("custom-amount-cancel").addEventListener("click", () => modalValorAvulso.classList.add("hidden"));
modalValorAvulso.addEventListener("click", (e) => {
  if (e.target === modalValorAvulso) modalValorAvulso.classList.add("hidden");
});

$("custom-amount-remove").addEventListener("click", () => {
  state.customAmount = 0;
  state.cartOrder = state.cartOrder.filter((id) => id !== CUSTOM_ITEM_ID);
  modalValorAvulso.classList.add("hidden");
  renderCart();
});

function aplicarValorAvulso() {
  if (state.placed) {
    state.cart = {};
    state.cartOrder = [];
    state.discount = 0;
    state.customAmount = 0;
    state.editing = false;
    state.placed = false;
    state.paymentDetail = null;
  }

  const inputVal = $("custom-amount-input").value.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(inputVal);

  if (isNaN(value) || value <= 0) {
    state.customAmount = 0;
    state.cartOrder = state.cartOrder.filter((id) => id !== CUSTOM_ITEM_ID);
  } else {
    state.customAmount = roundMoney(value);
    state.cartOrder = [CUSTOM_ITEM_ID, ...state.cartOrder.filter((id) => id !== CUSTOM_ITEM_ID)];
  }

  modalValorAvulso.classList.add("hidden");
  renderCart();

  if (state.customAmount > 0 && $("order-items")) {
    $("order-items").scrollTop = 0;
  }
}

$("custom-amount-apply").addEventListener("click", aplicarValorAvulso);
$("custom-amount-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") aplicarValorAvulso();
});

const modalDesconto = $("discount-modal");

$("discount-btn").addEventListener("click", () => {
  const input = $("discount-input");
  input.type = "text";
  input.inputMode = "numeric";
  input.value = state.discount ? formatCurrencyInput((state.discount * 100).toFixed(0)) : "";
  
  $("discount-remove").classList.toggle("hidden", !state.discount);
  modalDesconto.classList.remove("hidden");
  input.focus();
});

$("discount-input").addEventListener("input", (e) => {
  e.target.value = formatCurrencyInput(e.target.value);
});

$("discount-cancel").addEventListener("click", () => modalDesconto.classList.add("hidden"));
modalDesconto.addEventListener("click", (e) => { if (e.target === modalDesconto) modalDesconto.classList.add("hidden"); });

$("discount-remove").addEventListener("click", () => { 
  state.discount = 0; 
  modalDesconto.classList.add("hidden"); 
  renderCart(); 
});

function aplicarDesconto() {
  const inputVal = $("discount-input").value.replace(/\./g, "").replace(",", ".");
  const value = parseFloat(inputVal);
  const { grossTotal } = getTotals();
  state.discount = isNaN(value) || value <= 0 ? 0 : Math.min(value, grossTotal);
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
      <div class="modal-input-wrap pay-cash-input">
        <span>R$</span>
        <input id="cash-input" type="text" inputmode="numeric" placeholder="0,00" />
      </div>
      <div class="pay-change"><span>Troco</span><strong id="cash-change">${money(0)}</strong></div>
      <button class="charge-button pay-finish" id="pay-finish" disabled>${icon("check", 17)} Finalizar</button>`;
    
    const input = $("cash-input");
    setTimeout(() => input.focus(), 10);

    input.addEventListener("input", (e) => {
      e.target.value = formatCurrencyInput(e.target.value);

      const recebidoStr = e.target.value.replace(/\./g, "").replace(",", ".");
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
      const rawVal = ($("cash-input").value || "").replace(/\./g, "").replace(",", ".");
      received = parseFloat(rawVal);
      if (!Number.isFinite(received) || received < total) return;
      detail = `Dinheiro · Troco ${money(Math.max(received - total, 0))}`;
    }
    
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
  if (
    activeId === "discount-input" ||
    activeId === "cash-input" ||
    activeId === "custom-amount-input"
  ) {
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
