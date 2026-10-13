// ==========================================
// DASHBOARD DE ESTATÍSTICAS (SUPABASE)
// ==========================================
const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const icon = (name, size = 24, stroke = 1.5) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let allSales = [];
let days = 7;

function renderNav() {
  const navigation = [
    ["Home", "bag", "index.html"], ["Produtos", "box", "produtos.html"],
    ["Dashboard", "dashboard", "dashboard.html"], ["Messages", "message", "messages.html"],
    ["Bills", "receipt", "bills.html"], ["Setting", "settings", "settings.html"]
  ];
  $("nav").innerHTML = navigation.map(([name, ic, href]) =>
    `<a class="nav-button ${name === "Dashboard" ? "nav-button-active" : ""}" href="${href}" title="${name}">${icon(ic)}<span>${name}</span></a>`
  ).join("");
  $("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;
  $("logout").addEventListener("click", () => (window.location.href = "index.html"));
}

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function filterSales() {
  if (!days) return allSales;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return allSales.filter((s) => s.date >= start);
}

function barChart(entries, fmt) {
  if (!entries.length) return '<p class="empty">Sem dados no período.</p>';
  const max = Math.max(...entries.map((e) => e.value), 1);
  return `<div class="chart">${entries.map((e) =>
    `<div class="bar-col" title="${esc(e.label)}: ${fmt(e.value)}"><div class="bar" style="height:${(e.value / max) * 100}%"></div></div>`
  ).join("")}</div><div class="bar-labels">${entries.map((e) => `<span>${esc(e.label)}</span>`).join("")}</div>`;
}

function rankList(entries, fmt) {
  if (!entries.length) return '<li class="empty">Sem dados no período.</li>';
  const max = Math.max(...entries.map((e) => e.value), 1);
  return entries.map((e) => `<li><div class="row"><span>${esc(e.label)}</span><strong>${fmt(e)}</strong></div>
    <div class="track"><div class="fill" style="width:${(e.value / max) * 100}%"></div></div></li>`).join("");
}

function render() {
  const sales = filterSales();
  const revenue = sales.reduce((s, v) => s + v.total, 0);
  const discount = sales.reduce((s, v) => s + v.discount, 0);
  const itemsSold = sales.reduce((s, v) => s + v.items.reduce((a, i) => a + i.quantity, 0), 0);
  const ticket = sales.length ? revenue / sales.length : 0;

  $("kpis").innerHTML = `
    <div class="kpi hl"><small>Faturamento</small><strong>${money(revenue)}</strong></div>
    <div class="kpi"><small>Nº de vendas</small><strong>${sales.length}</strong></div>
    <div class="kpi"><small>Ticket médio</small><strong>${money(ticket)}</strong></div>
    <div class="kpi"><small>Itens vendidos</small><strong>${itemsSold}</strong></div>
    <div class="kpi"><small>Descontos concedidos</small><strong>${money(discount)}</strong></div>`;

  // Faturamento por dia (preenche dias sem venda)
  const byDay = {};
  sales.forEach((s) => { const k = dayKey(s.date); byDay[k] = (byDay[k] || 0) + s.total; });
  let dayEntries;
  if (days) {
    dayEntries = [];
    const span = Math.max(days, 1);
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      dayEntries.push({ label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, value: byDay[k] || 0 });
    }
  } else {
    dayEntries = Object.keys(byDay).sort().slice(-30).map((k) => ({ label: k.slice(8) + "/" + k.slice(5, 7), value: byDay[k] }));
  }
  $("chart-title").textContent = days === 1 ? "Faturamento de hoje" : "Faturamento por dia";
  $("chart").innerHTML = barChart(dayEntries, money);

  // Pagamentos
  const pay = {};
  sales.forEach((s) => {
    const m = s.payment || "Outro";
    pay[m] = pay[m] || { label: m, value: 0, count: 0 };
    pay[m].value += s.total; pay[m].count++;
  });
  $("payments").innerHTML = rankList(Object.values(pay).sort((a, b) => b.value - a.value),
    (e) => `${money(e.value)} · ${e.count}x`);

  // Top produtos
  const prod = {};
  sales.forEach((s) => s.items.forEach((i) => {
    prod[i.name] = prod[i.name] || { label: i.name, value: 0, revenue: 0 };
    prod[i.name].value += i.quantity; prod[i.name].revenue += i.total;
  }));
  $("top").innerHTML = rankList(Object.values(prod).sort((a, b) => b.value - a.value).slice(0, 8),
    (e) => `${e.value} un · ${money(e.revenue)}`);

  // Vendas por hora
  const hours = Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: 0 }));
  sales.forEach((s) => hours[s.date.getHours()].value++);
  const used = hours.filter((h) => h.value > 0);
  const from = used.length ? Number(used[0].label) : 8;
  const to = used.length ? Number(used[used.length - 1].label) : 18;
  $("hours").innerHTML = sales.length ? barChart(hours.slice(from, to + 1).map((h) => ({ ...h, label: h.label + "h" })), (v) => `${v} vendas`) : '<p class="empty">Sem dados no período.</p>';
}

async function load() {
  try {
    const { data, error } = await supabaseClient
      .from("vendas")
      .select("*, itens_venda(*)")
      .order("data_venda", { ascending: true });
    if (error) throw error;
    allSales = (data || []).map((v) => ({
      date: new Date(v.data_venda),
      payment: v.metodo_pagamento,
      total: parseFloat(v.total) || 0,
      discount: parseFloat(v.desconto) || 0,
      items: (v.itens_venda || []).map((i) => ({
        name: i.nome_produto,
        quantity: Number(i.quantidade) || 0,
        total: parseFloat(i.total) || (parseFloat(i.preco_unitario) || 0) * (Number(i.quantidade) || 0),
      })),
    }));
    render();
  } catch (err) {
    console.error(err);
    $("kpis").innerHTML = '<p class="empty">Erro ao carregar estatísticas. Verifique a conexão.</p>';
  }
}

$("periods").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  document.querySelectorAll("#periods button").forEach((b) => b.classList.toggle("active", b === btn));
  days = Number(btn.dataset.days);
  render();
});

renderNav();
load();
