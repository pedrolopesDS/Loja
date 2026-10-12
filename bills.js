// 1. Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCtcyBlS2VVj9hSo2QV9mGw8qkWVlgsFZQ",
  authDomain: "pdv-loja-1.firebaseapp.com",
  projectId: "pdv-loja-1",
  storageBucket: "pdv-loja-1.firebasestorage.app",
  messagingSenderId: "61547421823",
  appId: "1:61547421823:web:853bbbf3a5f189d1ce9f4a"
};

// Inicializa a aplicação e ativa o modo offline
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.enablePersistence().catch(console.error);

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

// A função agora é assíncrona para aguardar os dados do Firebase
async function renderBills() {
  const panel = $("bills-container");
  panel.innerHTML = '<p class="bills-empty">A carregar vendas...</p>';
  
  try {
    // Busca todas as vendas no Firebase ordenadas pela data mais recente
    const snapshot = await db.collection("vendas").orderBy("date", "desc").get();
    
    const sales = [];
    snapshot.forEach(doc => {
      // Cria o objeto da venda usando o ID gerado pela nuvem
      sales.push({ id: doc.id, ...doc.data() });
    });

    if (sales.length === 0) {
      panel.innerHTML = '<p class="bills-empty">Nenhuma venda finalizada ainda.</p>';
      return;
    }

    const total = roundMoney(sales.reduce((sum, sale) => sum + sale.total, 0));
    
    panel.innerHTML = `
      <div class="section-heading"><h2>Vendas realizadas</h2><span class="bills-count">${sales.length} venda${sales.length === 1 ? "" : "s"} · ${money(total)}</span></div>
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
          </div>
        </details>`).join("")}`;
  } catch (error) {
    console.error("Erro ao carregar as vendas do Firebase:", error);
    panel.innerHTML = '<p class="bills-empty" role="alert">Não foi possível ler o histórico de vendas. Verifique a sua ligação.</p>';
  }
}

$("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;
$("logout").addEventListener("click", () => window.location.href = "index.html");

renderNav();
renderBills();