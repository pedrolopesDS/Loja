// ==========================================
// PÁGINA DE PEDIDOS DO CATÁLOGO (MESSAGES + SUPABASE)
// ==========================================
// Nota: A configuração do banco (supabaseClient), impressão térmica e alerta sonoro vivem no dados.js

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const icon = (name, size = 24, stroke = 1.5) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

let cachedOrders = [];
let productsMap = {};
let catalogProducts = [];
let editingOrders = new Map(); // Guarda o rascunho dos pedidos que estão sendo editados ("Reprovar Venda")
let initialLoadDone = false;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatCurrencyInput(value) {
  let v = String(value).replace(/\D/g, "");
  if (!v) return "";
  v = (parseInt(v, 10) / 100).toFixed(2);
  v = v.replace(".", ",");
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return v;
}

// Injeta os estilos dos botões de Aprovar/Reprovar e do Modo de Edição
function garantirEstilosMessages() {
  if (document.getElementById("messages-custom-styles")) return;
  const style = document.createElement("style");
  style.id = "messages-custom-styles";
  style.textContent = `
    .bill-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px dashed var(--border);
    }
    .btn-approve-sale {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid #16a34a;
      background: #16a34a;
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: filter 0.15s ease, transform 0.1s ease;
    }
    .btn-approve-sale:hover:not(:disabled) {
      filter: brightness(1.08);
    }
    .btn-reject-sale {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid #d97706;
      background: #fffbeb;
      color: #b45309;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-reject-sale:hover:not(:disabled) {
      background: #fef3c7;
    }
    .btn-cancel-edit {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--border, #e4e4e7);
      background: var(--surface, #ffffff);
      color: var(--muted-foreground, #71717a);
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-cancel-edit:hover {
      background: var(--muted, #f4f4f5);
      color: var(--foreground, #18181b);
    }
    .edit-order-banner {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 12.5px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .edit-qty-controls {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .edit-qty-btn {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 1px solid var(--border, #e4e4e7);
      background: var(--surface, #fff);
      color: var(--foreground, #18181b);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .edit-qty-btn:hover {
      border-color: var(--primary, #ea1d63);
      color: var(--primary, #ea1d63);
    }
    .edit-remove-item-btn {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 1px solid #fecdd3;
      background: #fff1f2;
      color: #e11d48;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-left: 4px;
    }
    .edit-add-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 12px 0;
      padding: 10px 12px;
      background: var(--muted, #f4f4f5);
      border-radius: 10px;
    }
    .edit-add-bar select,
    .edit-settings-grid select,
    .edit-settings-grid input {
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid var(--border, #e4e4e7);
      background: #ffffff;
      font-size: 12.5px;
      color: var(--foreground, #18181b);
      outline: none;
    }
    .edit-add-bar select {
      flex: 1;
      min-width: 200px;
    }
    .edit-add-btn {
      height: 34px;
      padding: 0 12px;
      border-radius: 8px;
      background: var(--primary, #ea1d63);
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    .edit-settings-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border, #e4e4e7);
    }
    .edit-field-group {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
    }
    .edit-field-group label {
      color: var(--muted-foreground, #71717a);
      font-family: Georgia, serif;
    }
  `;
  document.head.appendChild(style);
}

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
    `<a class="nav-button ${name === "Messages" ? "nav-button-active" : ""}" href="${href}" title="${name}">
      ${icon(ic)}<span>${name}</span>
    </a>`
  ).join("");
}

// ==========================================
// APROVAR PEDIDO -> LANÇAR NO BILLS E IMPRIMIR NOTINHA
// ==========================================
async function aprovarELancarVenda(orderObj, buttonEl) {
  if (!orderObj || !orderObj.items || orderObj.items.length === 0) {
    alert("O pedido precisa ter pelo menos 1 item para ser lançado nas vendas.");
    return;
  }

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.innerHTML = `<span>Lançando venda...</span>`;
  }

  const vendaId = window.crypto ? window.crypto.randomUUID() : generateUUID();
  const agora = new Date().toISOString();

  const subtotalCalculado = roundMoney(
    orderObj.items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  );
  const descontoCalculado = roundMoney(Math.min(orderObj.discount || 0, subtotalCalculado));
  const totalCalculado = roundMoney(Math.max(subtotalCalculado - descontoCalculado, 0));

  const saleData = {
    id: vendaId,
    data_venda: agora,
    subtotal: subtotalCalculado,
    desconto: descontoCalculado,
    total: totalCalculado,
    metodo_pagamento: orderObj.payment,
    valor_recebido: orderObj.payment === "Dinheiro" && orderObj.received !== null ? roundMoney(orderObj.received) : null,
    troco: orderObj.payment === "Dinheiro" && orderObj.received !== null
      ? roundMoney(Math.max(orderObj.received - totalCalculado, 0))
      : null
  };

  const itemsData = orderObj.items.map((item) => ({
    id: window.crypto ? window.crypto.randomUUID() : generateUUID(),
    produto_id: item.productId || null,
    nome_produto: item.name,
    quantidade: item.quantity,
    preco_unitario: roundMoney(item.price),
    total: roundMoney(item.price * item.quantity)
  }));

  try {
    // 1. Grava a venda no histórico (bills.html) via RPC ou inserção direta
    const { error: rpcError } = await supabaseClient.rpc("sincronizar_venda_offline", {
      p_venda: saleData,
      p_itens: itemsData
    });

    if (rpcError) {
      // Fallback direto caso a RPC não seja utilizada
      const { error: vErr } = await supabaseClient.from("vendas").insert([saleData]);
      if (vErr) throw vErr;

      const itemsComVendaId = itemsData.map((it) => ({ ...it, venda_id: vendaId }));
      const { error: iErr } = await supabaseClient.from("itens_venda").insert(itemsComVendaId);
      if (iErr) throw iErr;
    }

    // 2. Imprime a notinha térmica de 58mm na OIA-8383
    imprimirNotinhaTermica({
      vendaId,
      dataVenda: agora,
      items: orderObj.items,
      subtotal: subtotalCalculado,
      customAmount: 0,
      discount: descontoCalculado,
      total: totalCalculado,
      method: orderObj.payment,
      received: saleData.valor_recebido,
      clientName: orderObj.clientName
    });

    // 3. Remove o pedido da fila pendente (messages.html) pois já virou venda no bills.html
    await supabaseClient.from("itens_pedido").delete().eq("pedido_id", orderObj.id);
    await supabaseClient.from("pedidos").delete().eq("id", orderObj.id);

    editingOrders.delete(String(orderObj.id));
    await renderMessages(true);
  } catch (error) {
    console.error("Erro ao aprovar e lançar venda:", error);
    alert("Não foi possível lançar a venda no Bills. Verifique a consola.");
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.innerHTML = `${icon("check", 15, 2)}<span>Aprovar Venda</span>`;
    }
  }
}

// ==========================================
// MODO DE EDIÇÃO QUANDO CLICA EM "REPROVAR VENDA"
// ==========================================
function iniciarEdicaoPedido(orderId) {
  const original = cachedOrders.find((o) => String(o.id) === String(orderId));
  if (!original) return;

  // Cria uma cópia editável do pedido
  editingOrders.set(String(orderId), {
    id: original.id,
    clientName: original.clientName,
    date: original.date,
    payment: original.payment,
    discount: original.discount || 0,
    received: original.received,
    change: original.change,
    items: original.items.map((it) => ({ ...it }))
  });

  renderOrdersView();
}

function cancelarEdicaoPedido(orderId) {
  editingOrders.delete(String(orderId));
  renderOrdersView();
}

function recalcularRascunho(draft) {
  const subtotal = roundMoney(draft.items.reduce((s, it) => s + it.price * it.quantity, 0));
  const discount = roundMoney(Math.min(draft.discount || 0, subtotal));
  const total = roundMoney(Math.max(subtotal - discount, 0));
  draft.subtotal = subtotal;
  draft.discount = discount;
  draft.total = total;
  return draft;
}

// ==========================================
// IMPRIMIR NOTINHA TÉRMICA 58mm DO PEDIDO
// ==========================================
function imprimirPedidoTermico(orderId) {
  const order = cachedOrders.find((o) => String(o.id) === String(orderId));
  if (!order || !order.items.length) {
    alert("Não foram encontrados itens para imprimir este pedido.");
    return;
  }

  imprimirNotinhaTermica({
    vendaId: order.id,
    dataVenda: order.date,
    items: order.items,
    subtotal: order.subtotal,
    customAmount: 0,
    discount: order.discount,
    total: order.total,
    method: order.payment,
    received: order.received,
    clientName: order.clientName
  });
}

// ==========================================
// GERADOR DE FATURA / RECIBO EM PDF
// ==========================================
function carregarMiniaturaPDF(fotoUrl) {
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
    if (!fotoUrl) { fallback(); return; }
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
    img.src = fotoUrl;
  });
}

async function gerarFaturaPedidoPDF(orderId, botao) {
  if (botao && botao.disabled) return;
  const order = cachedOrders.find((o) => String(o.id) === String(orderId));
  if (!order || !order.items.length) {
    alert("Não foram encontrados itens para gerar a fatura deste pedido.");
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Não foi possível carregar o gerador de PDF. Verifique sua conexão.");
    return;
  }

  if (botao) {
    botao.disabled = true;
    botao.setAttribute("aria-busy", "true");
  }

  try {
    const linhas = order.items.map((item) => {
      const cad = productsMap[item.productId] || {};
      return {
        name: item.name,
        quantidade: item.quantity,
        price: item.price,
        photo: cad.photo || null,
        barcode: cad.barcode || item.productId || ""
      };
    });

    const miniaturas = await Promise.all(linhas.map((l) => carregarMiniaturaPDF(l.photo)));
    const doc = new window.jspdf.jsPDF();
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    const margem = 16, direita = largura - margem;
    const xNome = margem + 19, xQtd = 121, xPreco = 157;
    const larguraNome = xQtd - xNome - 16;
    const limite = altura - 24;
    const dataPedido = new Date(order.date);
    const numero = String(order.id).slice(-8).toUpperCase();
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
      texto(
        `Data: ${dataPedido.toLocaleDateString("pt-BR")} ${dataPedido.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}   ·   Cliente: ${order.clientName}`,
        margem,
        31,
        9,
        false,
        110
      );
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
      const identificacao = p.barcode;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      const codigo = !identificacao ? [] : doc.splitTextToSize(String(identificacao), larguraNome);

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

    if (y + (order.discount > 0 ? 39 : 32) > limite) novaPagina();
    y += 11;
    texto("Subtotal", xPreco - 4, y, 10, false, 110, "right");
    texto(money(order.subtotal), direita - 3, y, 10, false, 35, "right");
    if (order.discount > 0) {
      y += 7;
      texto("Desconto", xPreco - 4, y, 10, false, 110, "right");
      texto(`- ${money(order.discount)}`, direita - 3, y, 10, false, 35, "right");
    }
    y += 11;
    texto("TOTAL", xPreco - 4, y, 12, true, 35, "right");
    texto(money(order.total), direita - 3, y, 12, true, 35, "right");

    const paginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      texto("50.509.556/0001-86 - 50.509.556 Pedro Henrique Lopes de Oliveira", margem, altura - 12, 8, false, 140);
      texto(`${i} / ${paginas}`, direita, altura - 12, 8, false, 140, "right");
    }
    doc.save(`fatura-pedido-${numero.toLowerCase()}.pdf`);
  } catch (error) {
    console.error("Falha ao gerar fatura do pedido:", error);
    alert("Não foi possível gerar a fatura. Tente novamente.");
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.removeAttribute("aria-busy");
    }
  }
}

// ==========================================
// EXCLUIR PEDIDO NO SUPABASE
// ==========================================
async function deleteOrder(orderId, buttonEl) {
  const confirmar = confirm("Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.");
  if (!confirmar) return;

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.innerHTML = `<span>Excluindo...</span>`;
  }

  try {
    await supabaseClient
      .from("itens_pedido")
      .delete()
      .eq("pedido_id", orderId);

    const { error } = await supabaseClient
      .from("pedidos")
      .delete()
      .eq("id", orderId);

    if (error) throw error;

    editingOrders.delete(String(orderId));
    await renderMessages(true);
  } catch (error) {
    console.error("Erro ao excluir o pedido do Supabase:", error);
    alert("Não foi possível excluir o pedido. Verifique a consola.");
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.innerHTML = `${icon("trash", 15)}<span>Excluir pedido</span>`;
    }
  }
}

// ==========================================
// RENDERIZAÇÃO DA LISTA E MODO DE EDIÇÃO
// ==========================================
function renderOrdersView(abertosSet = null) {
  const panel = $("messages-container");
  if (!panel) return;

  const abertos = abertosSet || new Set(
    Array.from(panel.querySelectorAll("details.bill-record[open]"))
      .map((el) => el.dataset.orderId)
      .filter(Boolean)
  );

  if (cachedOrders.length === 0) {
    panel.innerHTML = '<p class="bills-empty">Nenhum pedido recebido pelo catálogo ainda.</p>';
    return;
  }

  const totalGeral = roundMoney(cachedOrders.reduce((sum, order) => sum + order.total, 0));

  const opcoesProdutosHtml = catalogProducts
    .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — ${money(p.price)}</option>`)
    .join("");

  panel.innerHTML = `
    <div class="section-heading">
      <h2>Pedidos do Catálogo</h2>
      <span class="bills-count">${cachedOrders.length} pedido${cachedOrders.length === 1 ? "" : "s"} · ${money(totalGeral)}</span>
    </div>
    ${cachedOrders.map((order) => {
      const orderIdStr = String(order.id);
      const isEditing = editingOrders.has(orderIdStr);
      const viewOrder = isEditing ? recalcularRascunho(editingOrders.get(orderIdStr)) : order;
      const isOpen = isEditing || abertos.has(orderIdStr);

      if (isEditing) {
        return `
        <details class="bill-record" data-order-id="${escapeHtml(orderIdStr)}" open>
          <summary>
            <span class="bill-date">
              <strong>${escapeHtml(viewOrder.clientName)} <span style="color:#d97706; font-size:12px;">(Editando pedido)</span></strong>
              <small>${escapeHtml(new Date(viewOrder.date).toLocaleString("pt-BR"))} · Pedido #${escapeHtml(orderIdStr.slice(-8))}</small>
            </span>
            <span class="bill-method">${escapeHtml(viewOrder.payment)}</span>
            <strong class="bill-total">${money(viewOrder.total)}</strong>
            <span class="bill-chevron">${icon("chevron", 16)}</span>
          </summary>
          <div class="bill-detail">
            <div class="edit-order-banner">
              <span><strong>Pedido reprovado para ajustes:</strong> Altere quantidades, adicione/remova produtos e conclua para enviar ao Bills e imprimir a notinha.</span>
            </div>

            <div class="bill-table-wrap">
              <table class="bill-table">
                <thead>
                  <tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr>
                </thead>
                <tbody>
                  ${viewOrder.items.length ? viewOrder.items.map((item, idx) => `
                    <tr>
                      <td>${escapeHtml(item.name)}</td>
                      <td>
                        <div class="edit-qty-controls">
                          <button type="button" class="edit-qty-btn" data-edit-dec="${escapeHtml(orderIdStr)}" data-item-idx="${idx}" title="Diminuir">${icon("minus", 12, 2)}</button>
                          <strong>${item.quantity}</strong>
                          <button type="button" class="edit-qty-btn" data-edit-inc="${escapeHtml(orderIdStr)}" data-item-idx="${idx}" title="Aumentar">${icon("plus", 12, 2)}</button>
                          <button type="button" class="edit-remove-item-btn" data-edit-remove-item="${escapeHtml(orderIdStr)}" data-item-idx="${idx}" title="Remover item">${icon("trash", 12, 2)}</button>
                        </div>
                      </td>
                      <td>${money(item.price)}</td>
                      <td>${money(item.price * item.quantity)}</td>
                    </tr>
                  `).join("") : `<tr><td colspan="4" style="text-align:center; padding: 14px; color: var(--muted-foreground);">Nenhum item no pedido. Adicione um produto abaixo.</td></tr>`}
                </tbody>
              </table>
            </div>

            <div class="edit-add-bar">
              <select id="add-prod-select-${escapeHtml(orderIdStr)}">
                <option value="">Selecione um produto para adicionar ao pedido...</option>
                ${opcoesProdutosHtml}
              </select>
              <button type="button" class="edit-add-btn" data-edit-add-prod="${escapeHtml(orderIdStr)}">
                ${icon("plus", 14, 2)}
                <span>Adicionar Produto</span>
              </button>
            </div>

            <div class="edit-settings-grid">
              <div class="edit-field-group">
                <label for="edit-pay-${escapeHtml(orderIdStr)}">Pagamento:</label>
                <select id="edit-pay-${escapeHtml(orderIdStr)}" data-edit-payment="${escapeHtml(orderIdStr)}">
                  <option value="Pix" ${viewOrder.payment === "Pix" ? "selected" : ""}>Pix</option>
                  <option value="Cartão (Débito)" ${viewOrder.payment === "Cartão (Débito)" ? "selected" : ""}>Cartão (Débito)</option>
                  <option value="Cartão (Crédito)" ${viewOrder.payment === "Cartão (Crédito)" ? "selected" : ""}>Cartão (Crédito)</option>
                  <option value="Dinheiro" ${viewOrder.payment === "Dinheiro" ? "selected" : ""}>Dinheiro</option>
                </select>
              </div>
              <div class="edit-field-group">
                <label for="edit-disc-${escapeHtml(orderIdStr)}">Desconto (R$):</label>
                <input
                  id="edit-disc-${escapeHtml(orderIdStr)}"
                  type="text"
                  inputmode="numeric"
                  placeholder="0,00"
                  value="${viewOrder.discount > 0 ? formatCurrencyInput((viewOrder.discount * 100).toFixed(0)) : ""}"
                  data-edit-discount="${escapeHtml(orderIdStr)}"
                  style="width: 110px;"
                />
              </div>
            </div>

            <div class="bill-totals" style="margin-top: 12px;">
              <div><span>Cliente</span><strong>${escapeHtml(viewOrder.clientName)}</strong></div>
              <div><span>Subtotal</span><strong id="edit-subtotal-${escapeHtml(orderIdStr)}">${money(viewOrder.subtotal)}</strong></div>
              <div><span>Desconto</span><strong id="edit-discount-val-${escapeHtml(orderIdStr)}">${money(viewOrder.discount)}</strong></div>
              <div><span>Total final</span><strong id="edit-total-${escapeHtml(orderIdStr)}">${money(viewOrder.total)}</strong></div>
            </div>

            <div class="bill-actions">
              <button type="button" class="btn-cancel-edit" data-cancel-edit="${escapeHtml(orderIdStr)}">
                ${icon("x", 15, 2)}
                <span>Cancelar Edição</span>
              </button>
              <button type="button" class="btn-approve-sale" data-finish-edit="${escapeHtml(orderIdStr)}" ${viewOrder.items.length === 0 ? "disabled" : ""}>
                ${icon("check", 15, 2)}
                <span>Concluir Edição e Lançar Venda</span>
              </button>
            </div>
          </div>
        </details>`;
      }

      return `
        <details class="bill-record" data-order-id="${escapeHtml(orderIdStr)}" ${isOpen ? "open" : ""}>
          <summary>
            <span class="bill-date">
              <strong>${escapeHtml(order.clientName)}</strong>
              <small>${escapeHtml(new Date(order.date).toLocaleString("pt-BR"))} · Pedido #${escapeHtml(orderIdStr.slice(-8))}</small>
            </span>
            <span class="bill-method">${escapeHtml(order.payment)}</span>
            <strong class="bill-total">${money(order.total)}</strong>
            <span class="bill-chevron">${icon("chevron", 16)}</span>
          </summary>
          <div class="bill-detail">
            <div class="bill-table-wrap"><table class="bill-table">
              <thead><tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead>
              <tbody>${order.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${money(item.price)}</td><td>${money(item.total)}</td></tr>`).join("")}</tbody>
            </table></div>
            <div class="bill-totals">
              <div><span>Cliente</span><strong>${escapeHtml(order.clientName)}</strong></div>
              <div><span>Subtotal</span><strong>${money(order.subtotal)}</strong></div>
              ${order.discount > 0 ? `<div><span>Desconto</span><strong>- ${money(order.discount)}</strong></div>` : ""}
              <div><span>Total do pedido</span><strong>${money(order.total)}</strong></div>
              ${order.payment === "Dinheiro" && order.received !== null ? `<div><span>Valor informado</span><strong>${money(order.received)}</strong></div><div><span>Troco</span><strong>${money(order.change)}</strong></div>` : ""}
            </div>
            <div class="bill-actions">
              <button type="button" class="btn-approve-sale" data-approve-order="${escapeHtml(orderIdStr)}" title="Confirmar pedido, enviar para Bills e imprimir notinha">
                ${icon("check", 15, 2)}
                <span>Aprovar Venda</span>
              </button>
              <button type="button" class="btn-reject-sale" data-reject-order="${escapeHtml(orderIdStr)}" title="Reprovar para editar itens/valores antes de enviar para Bills">
                ${icon("pencil", 15, 1.8)}
                <span>Reprovar Venda</span>
              </button>
              <button type="button" class="icon-btn edit-button" data-print-order="${escapeHtml(orderIdStr)}" title="Imprimir Notinha Térmica (58mm)">
                ${icon("printer", 17)}
              </button>
              <button type="button" class="icon-btn edit-button" data-invoice-order="${escapeHtml(orderIdStr)}" title="Fatura / Recibo (PDF)">
                ${icon("invoice", 17)}
              </button>
              <button type="button" class="bill-delete-btn" data-delete-order="${escapeHtml(orderIdStr)}" title="Excluir este pedido">
                ${icon("trash", 15)}
                <span>Excluir pedido</span>
              </button>
            </div>
          </div>
        </details>`;
    }).join("")}`;
}

// ==========================================
// CARREGAR PEDIDOS DO SUPABASE
// ==========================================
async function renderMessages(silencioso = false) {
  garantirEstilosMessages();
  const panel = $("messages-container");
  if (!panel) return;

  // Se o operador estiver no meio da edição de um pedido reprovado, evita sobrescrever a tela no refresh automático
  if (silencioso && editingOrders.size > 0) return;

  const abertos = new Set(
    Array.from(panel.querySelectorAll("details.bill-record[open]"))
      .map((el) => el.dataset.orderId)
      .filter(Boolean)
  );

  if (!silencioso && !initialLoadDone) {
    panel.innerHTML = '<p class="bills-empty">A carregar pedidos...</p>';
  }
  
  try {
    const [pedidosRes, produtosRes] = await Promise.all([
      supabaseClient.from("pedidos").select("*, itens_pedido(*)").order("data_venda", { ascending: false }),
      supabaseClient.from("produtos").select("id, nome, preco, codigo_barras, foto_url").order("nome", { ascending: true })
    ]);
      
    if (pedidosRes.error) throw pedidosRes.error;

    productsMap = {};
    catalogProducts = (produtosRes.data || []).map((p) => {
      productsMap[p.id] = { barcode: p.codigo_barras, photo: p.foto_url, name: p.nome, price: parseFloat(p.preco) };
      return {
        id: p.id,
        name: p.nome,
        price: parseFloat(p.preco),
        barcode: p.codigo_barras,
        photo: p.foto_url
      };
    });

    const orders = (pedidosRes.data || []).map(p => ({
      id: p.id,
      clientName: p.nome_cliente || "Cliente não informado",
      date: p.data_venda,
      payment: p.metodo_pagamento,
      total: parseFloat(p.total),
      subtotal: parseFloat(p.subtotal),
      discount: parseFloat(p.desconto || 0),
      received: p.valor_recebido !== null ? parseFloat(p.valor_recebido) : null,
      change: p.troco !== null ? parseFloat(p.troco) : null,
      items: (p.itens_pedido || []).map(item => ({
        productId: item.produto_id,
        name: item.nome_produto,
        quantity: item.quantidade,
        price: parseFloat(item.preco_unitario),
        total: parseFloat(item.total)
      }))
    }));

    initialLoadDone = true;
    cachedOrders = orders;

    renderOrdersView(abertos);
  } catch (error) {
    console.error("Erro ao carregar os pedidos do Supabase:", error);
    if (!silencioso) {
      panel.innerHTML = '<p class="bills-empty" role="alert">Não foi possível ler os pedidos. Verifique a sua ligação ao banco de dados.</p>';
    }
  }
}

window.renderMessages = renderMessages;

// ==========================================
// EVENTOS DE CLIQUE E EDIÇÃO EM MESSAGES
// ==========================================
$("messages-container").addEventListener("click", (e) => {
  // 1. Aprovar Venda direto
  const approveBtn = e.target.closest("[data-approve-order]");
  if (approveBtn) {
    const order = cachedOrders.find((o) => String(o.id) === String(approveBtn.dataset.approveOrder));
    if (order) aprovarELancarVenda(order, approveBtn);
    return;
  }

  // 2. Reprovar Venda (abre o Modo de Edição do pedido)
  const rejectBtn = e.target.closest("[data-reject-order]");
  if (rejectBtn) {
    iniciarEdicaoPedido(rejectBtn.dataset.rejectOrder);
    return;
  }

  // 3. Cancelar Edição
  const cancelEditBtn = e.target.closest("[data-cancel-edit]");
  if (cancelEditBtn) {
    cancelarEdicaoPedido(cancelEditBtn.dataset.cancelEdit);
    return;
  }

  // 4. Concluir Edição -> Lançar no Bills e imprimir notinha
  const finishEditBtn = e.target.closest("[data-finish-edit]");
  if (finishEditBtn) {
    const draft = editingOrders.get(String(finishEditBtn.dataset.finishEdit));
    if (draft) {
      recalcularRascunho(draft);
      aprovarELancarVenda(draft, finishEditBtn);
    }
    return;
  }

  // 5. Diminuir quantidade de um item na edição
  const decBtn = e.target.closest("[data-edit-dec]");
  if (decBtn) {
    const orderId = String(decBtn.dataset.editDec);
    const idx = parseInt(decBtn.dataset.itemIdx, 10);
    const draft = editingOrders.get(orderId);
    if (draft && draft.items[idx]) {
      draft.items[idx].quantity -= 1;
      if (draft.items[idx].quantity <= 0) {
        draft.items.splice(idx, 1);
      } else {
        draft.items[idx].total = roundMoney(draft.items[idx].price * draft.items[idx].quantity);
      }
      renderOrdersView();
    }
    return;
  }

  // 6. Aumentar quantidade de um item na edição
  const incBtn = e.target.closest("[data-edit-inc]");
  if (incBtn) {
    const orderId = String(incBtn.dataset.editInc);
    const idx = parseInt(incBtn.dataset.itemIdx, 10);
    const draft = editingOrders.get(orderId);
    if (draft && draft.items[idx]) {
      draft.items[idx].quantity += 1;
      draft.items[idx].total = roundMoney(draft.items[idx].price * draft.items[idx].quantity);
      renderOrdersView();
    }
    return;
  }

  // 7. Remover item na edição
  const remItemBtn = e.target.closest("[data-edit-remove-item]");
  if (remItemBtn) {
    const orderId = String(remItemBtn.dataset.editRemoveItem);
    const idx = parseInt(remItemBtn.dataset.itemIdx, 10);
    const draft = editingOrders.get(orderId);
    if (draft && draft.items[idx]) {
      draft.items.splice(idx, 1);
      renderOrdersView();
    }
    return;
  }

  // 8. Adicionar novo produto do catálogo ao pedido em edição
  const addProdBtn = e.target.closest("[data-edit-add-prod]");
  if (addProdBtn) {
    const orderId = String(addProdBtn.dataset.editAddProd);
    const selectEl = $(`add-prod-select-${orderId}`);
    const prodId = selectEl ? selectEl.value : "";
    if (!prodId) return;

    const prod = catalogProducts.find((p) => String(p.id) === String(prodId));
    const draft = editingOrders.get(orderId);
    if (prod && draft) {
      const existente = draft.items.find((it) => String(it.productId) === String(prod.id));
      if (existente) {
        existente.quantity += 1;
        existente.total = roundMoney(existente.price * existente.quantity);
      } else {
        draft.items.push({
          productId: prod.id,
          name: prod.name,
          quantity: 1,
          price: prod.price,
          total: roundMoney(prod.price)
        });
      }
      renderOrdersView();
    }
    return;
  }

  // 9. Imprimir Notinha Térmica avulsa
  const printBtn = e.target.closest("[data-print-order]");
  if (printBtn) {
    imprimirPedidoTermico(printBtn.dataset.printOrder);
    return;
  }

  // 10. Gerar Fatura PDF
  const invoiceBtn = e.target.closest("[data-invoice-order]");
  if (invoiceBtn) {
    gerarFaturaPedidoPDF(invoiceBtn.dataset.invoiceOrder, invoiceBtn);
    return;
  }

  // 11. Excluir Pedido
  const deleteBtn = e.target.closest("[data-delete-order]");
  if (deleteBtn) {
    deleteOrder(deleteBtn.dataset.deleteOrder, deleteBtn);
  }
});

// Mudança de método de pagamento durante a edição
$("messages-container").addEventListener("change", (e) => {
  const paySelect = e.target.closest("[data-edit-payment]");
  if (paySelect) {
    const orderId = String(paySelect.dataset.editPayment);
    const draft = editingOrders.get(orderId);
    if (draft) {
      draft.payment = paySelect.value;
    }
  }
});

// Máscara e atualização em tempo real do desconto durante a edição
$("messages-container").addEventListener("input", (e) => {
  const discInput = e.target.closest("[data-edit-discount]");
  if (discInput) {
    discInput.value = formatCurrencyInput(discInput.value);
    const orderId = String(discInput.dataset.editDiscount);
    const draft = editingOrders.get(orderId);
    if (draft) {
      const val = parseFloat(discInput.value.replace(/\./g, "").replace(",", ".")) || 0;
      draft.discount = val;
      recalcularRascunho(draft);

      const subEl = $(`edit-subtotal-${orderId}`);
      const discEl = $(`edit-discount-val-${orderId}`);
      const totEl = $(`edit-total-${orderId}`);
      if (subEl) subEl.textContent = money(draft.subtotal);
      if (discEl) discEl.textContent = money(draft.discount);
      if (totEl) totEl.textContent = money(draft.total);
    }
  }
});

$("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;

renderNav();
renderMessages();
