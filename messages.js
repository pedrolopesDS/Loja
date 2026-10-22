// ==========================================
// PÁGINA DE PEDIDOS DO CATÁLOGO (MESSAGES + SUPABASE)
// ==========================================
// Nota: A configuração do banco (supabaseClient) vive no dados.js

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const icon = (name, size = 24, stroke = 1.5) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

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
    const { data, error } = await supabaseClient
      .from("pedidos")
      .select("*, itens_pedido(*)")
      .order("data_venda", { ascending: false });
      
    if (error) throw error;

    const orders = (data || []).map(p => ({
      id: p.id,
      clientName: p.nome_cliente || "Cliente não informado",
      date: p.data_venda,
      payment: p.metodo_pagamento,
      total: parseFloat(p.total),
      subtotal: parseFloat(p.subtotal),
      discount: parseFloat(p.desconto),
      received: p.valor_recebido !== null ? parseFloat(p.valor_recebido) : null,
      change: p.troco !== null ? parseFloat(p.troco) : null,
      items: (p.itens_pedido || []).map(item => ({
        name: item.nome_produto,
        quantity: item.quantidade,
        price: parseFloat(item.preco_unitario),
        total: parseFloat(item.total)
      }))
    }));

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
              <div><span>Total do pedido</span><strong>${money(order.total)}</strong></div>${order.payment === "Dinheiro" && order.received !== null ? `<div><span>Valor informado</span><strong>${money(order.received)}</strong></div><div><span>Troco</span><strong>${money(order.change)}</strong></div>` : ""}
            </div>
            <div class="bill-actions">
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

$("messages-container").addEventListener("click", (e) => {
  const deleteBtn = e.target.closest("[data-delete-order]");
  if (!deleteBtn) return;

  const orderId = deleteBtn.dataset.deleteOrder;
  if (orderId) {
    deleteOrder(orderId, deleteBtn);
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
