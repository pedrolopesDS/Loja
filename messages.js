// ==========================================
// PÁGINA DE PEDIDOS DO CATÁLOGO (MESSAGES + SUPABASE)
// ==========================================
// Nota: A configuração do banco (supabaseClient) vive no dados.js

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const icon = (name, size = 24, stroke = 1.5) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

let cachedOrders = [];
let productsMap = {};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

    await renderMessages();
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
// CARREGAR E RENDERIZAR OS PEDIDOS DO CATÁLOGO
// ==========================================
async function renderMessages() {
  const panel = $("messages-container");
  panel.innerHTML = '<p class="bills-empty">A carregar pedidos...</p>';
  
  try {
    // Busca pedidos e catálogo de produtos em paralelo para incluir foto e código de barras no PDF
    const [pedidosRes, produtosRes] = await Promise.all([
      supabaseClient.from("pedidos").select("*, itens_pedido(*)").order("data_venda", { ascending: false }),
      supabaseClient.from("produtos").select("id, codigo_barras, foto_url")
    ]);
      
    if (pedidosRes.error) throw pedidosRes.error;

    productsMap = {};
    (produtosRes.data || []).forEach((p) => {
      productsMap[p.id] = { barcode: p.codigo_barras, photo: p.foto_url };
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

    cachedOrders = orders;

    if (orders.length === 0) {
      panel.innerHTML = '<p class="bills-empty">Nenhum pedido recebido pelo catálogo ainda.</p>';
      return;
    }

    const totalGeral = roundMoney(orders.reduce((sum, order) => sum + order.total, 0));
    
    panel.innerHTML = `
      <div class="section-heading"><h2>Pedidos do Catálogo</h2><span class="bills-count">${orders.length} pedido${orders.length === 1 ? "" : "s"} · ${money(totalGeral)}</span></div>
      ${orders.map((order) => `
        <details class="bill-record">
          <summary>
            <span class="bill-date">
              <strong>${escapeHtml(order.clientName)}</strong>
              <small>${escapeHtml(new Date(order.date).toLocaleString("pt-BR"))} · Pedido #${escapeHtml(order.id.slice(-8))}</small>
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
              <div><span>Total do pedido</span><strong>${money(order.total)}</strong></div>
              ${order.payment === "Dinheiro" && order.received !== null ? `<div><span>Valor informado</span><strong>${money(order.received)}</strong></div><div><span>Troco</span><strong>${money(order.change)}</strong></div>` : ""}
            </div>
            <div class="bill-actions">
              <button type="button" class="icon-btn edit-button" data-invoice-order="${escapeHtml(order.id)}" title="Fatura / Recibo">
                ${icon("invoice", 17)}
              </button>
              <button type="button" class="bill-delete-btn" data-delete-order="${escapeHtml(order.id)}" title="Excluir este pedido">
                ${icon("trash", 15)}
                <span>Excluir pedido</span>
              </button>
            </div>
          </div>
        </details>`).join("")}`;
  } catch (error) {
    console.error("Erro ao carregar os pedidos do Supabase:", error);
    panel.innerHTML = '<p class="bills-empty" role="alert">Não foi possível ler os pedidos. Verifique se a coluna "nome_cliente" e as tabelas "pedidos" e "itens_pedido" foram criadas no banco de dados.</p>';
  }
}

// Delegação de eventos para os botões de Fatura/Recibo e Excluir pedido
$("messages-container").addEventListener("click", (e) => {
  const invoiceBtn = e.target.closest("[data-invoice-order]");
  if (invoiceBtn) {
    gerarFaturaPedidoPDF(invoiceBtn.dataset.invoiceOrder, invoiceBtn);
    return;
  }

  const deleteBtn = e.target.closest("[data-delete-order]");
  if (deleteBtn) {
    deleteOrder(deleteBtn.dataset.deleteOrder, deleteBtn);
  }
});

window.addEventListener("storage", (e) => {
  if (e.key === "pdv:newOrderTrigger") {
    renderMessages();
  }
});

$("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;
$("logout").addEventListener("click", () => window.location.href = "index.html");

renderNav();
renderMessages();
