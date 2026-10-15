// ==========================================
// PÁGINA DE HISTÓRICO DE VENDAS (SUPABASE)
// ==========================================
// Nota: A configuração do banco (supabaseClient) agora vive no dados.js

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
    `<a class="nav-button ${name === "Bills" ? "nav-button-active" : ""}" href="${href}" title="${name}">
      ${icon(ic)}<span>${name}</span>
    </a>`
  ).join("");
}

// ==========================================
// EXCLUIR VENDA NO SUPABASE
// ==========================================
async function deleteSale(saleId, buttonEl) {
  const confirmar = confirm("Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.");
  if (!confirmar) return;

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.innerHTML = `<span>Excluindo...</span>`;
  }

  try {
    // 1. Remove os itens da venda primeiro (garante a exclusão mesmo sem ON DELETE CASCADE)
    await supabaseClient
      .from("itens_venda")
      .delete()
      .eq("venda_id", saleId);

    // 2. Remove o registro da venda principal
    const { error } = await supabaseClient
      .from("vendas")
      .delete()
      .eq("id", saleId);

    if (error) throw error;

    // 3. Recarrega a lista e atualiza a contagem e o valor total no topo
    await renderBills();
  } catch (error) {
    console.error("Erro ao excluir a venda do Supabase:", error);
    alert("Não foi possível excluir a venda. Verifique a consola ou as permissões (RLS) no Supabase.");
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.innerHTML = `${icon("trash", 15)}<span>Excluir venda</span>`;
    }
  }
}

// ==========================================
// CARREGAR E RENDERIZAR AS VENDAS
// ==========================================
async function renderBills() {
  const panel = $("bills-container");
  panel.innerHTML = '<p class="bills-empty">A carregar vendas...</p>';
  
  try {
    // Busca todas as vendas no Supabase ordenadas pela data (mais recentes primeiro)
    // O "*, itens_venda(*)" é a magia do PostgreSQL: traz a venda e os itens de dentro dela numa única requisição!
    const { data, error } = await supabaseClient
      .from("vendas")
      .select("*, itens_venda(*)")
      .order("data_venda", { ascending: false });
      
    if (error) throw error;

    // Traduz as colunas do Supabase (Português) para o formato do HTML (Inglês)
    const sales = (data || []).map(v => ({
      id: v.id,
      date: v.data_venda,
      payment: v.metodo_pagamento,
      total: parseFloat(v.total),
      subtotal: parseFloat(v.subtotal),
      discount: parseFloat(v.desconto),
      received: v.valor_recebido !== null ? parseFloat(v.valor_recebido) : null,
      change: v.troco !== null ? parseFloat(v.troco) : null,
      items: (v.itens_venda || []).map(item => ({
        name: item.nome_produto,
        quantity: item.quantidade,
        price: parseFloat(item.preco_unitario),
        total: parseFloat(item.total)
      }))
    }));

    if (sales.length === 0) {
      panel.innerHTML = '<p class="bills-empty">Nenhuma venda finalizada ainda.</p>';
      return;
    }

    const totalGeral = roundMoney(sales.reduce((sum, sale) => sum + sale.total, 0));
    
    panel.innerHTML = `
      <div class="section-heading"><h2>Vendas realizadas</h2><span class="bills-count">${sales.length} venda${sales.length === 1 ? "" : "s"} · ${money(totalGeral)}</span></div>
      ${sales.map((sale) => `
        <details class="bill-record">
          <summary>
            <span class="bill-date"><strong>${escapeHtml(new Date(sale.date).toLocaleString("pt-BR"))}</strong><small>Venda #${escapeHtml(sale.id.slice(-8))}</small></span>
            <span class="bill-method">${escapeHtml(sale.payment)}</span>
            <strong class="bill-total">${money(sale.total)}</strong>
            <span class="bill-chevron">${icon("chevron", 16)}</span>
          </summary>
          <div class="bill-detail">
            <div class="bill-table-wrap"><table class="bill-table">
              <thead><tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead>
              <tbody>${sale.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${money(item.price)}</td><td>${money(item.total)}</td></tr>`).join("")}</tbody>
            </table></div>
            <div class="bill-totals"><div><span>Subtotal</span><strong>${money(sale.subtotal)}</strong></div><div><span>Desconto</span><strong>${money(sale.discount)}</strong></div><div><span>Total pago</span><strong>${money(sale.total)}</strong></div>${sale.payment === "Dinheiro" ? `<div><span>Valor recebido</span><strong>${money(sale.received)}</strong></div><div><span>Troco</span><strong>${money(sale.change)}</strong></div>` : ""}</div>
            <div class="bill-actions">
              <button type="button" class="bill-delete-btn" data-delete-sale="${escapeHtml(sale.id)}" title="Excluir esta venda">
                ${icon("trash", 15)}
                <span>Excluir venda</span>
              </button>
            </div>
          </div>
        </details>`).join("")}`;
  } catch (error) {
    console.error("Erro ao carregar as vendas do Supabase:", error);
    panel.innerHTML = '<p class="bills-empty" role="alert">Não foi possível ler o histórico de vendas. Verifique a sua ligação ao banco de dados.</p>';
  }
}

// Delegação de evento para capturar o clique no botão de excluir venda
$("bills-container").addEventListener("click", (e) => {
  const deleteBtn = e.target.closest("[data-delete-sale]");
  if (!deleteBtn) return;

  const saleId = deleteBtn.dataset.deleteSale;
  if (saleId) {
    deleteSale(saleId, deleteBtn);
  }
});

$("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;
$("logout").addEventListener("click", () => window.location.href = "index.html");

renderNav();
renderBills();
