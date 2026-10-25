// ==========================================
// CONFIGURAÇÃO GLOBAL E BANCO DE DADOS (SUPABASE)
// ==========================================

const SUPABASE_URL = "https://aykrfzyktixjwplkmmjk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5a3JmenlrdGl4andwbGttbWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTQ5OTgsImV4cCI6MjEwNzIzMDk5OH0.BfulX8WR_EXD83-8JPw2HW7TOhAFx-bqIoCMn9FbkdQ";

// Nome alterado para supabaseClient para não chocar com a biblioteca!
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// ALERTA SONORO E NOTIFICAÇÃO VISUAL (TOAST)
// ==========================================
let globalAudioCtx = null;

function initGlobalAudio() {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume();
  }
}

document.addEventListener("click", initGlobalAudio, { once: true });
document.addEventListener("keydown", initGlobalAudio, { once: true });

function tocarAlertaNovoPedido() {
  try {
    initGlobalAudio();
    if (!globalAudioCtx) return;

    const agora = globalAudioCtx.currentTime;

    const tocarNota = (frequencia, inicio, duracao) => {
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequencia, inicio);

      gain.gain.setValueAtTime(0.001, inicio);
      gain.gain.exponentialRampToValueAtTime(0.35, inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);

      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);

      osc.start(inicio);
      osc.stop(inicio + duracao);
    };

    // Toque duplo de alerta ("Ding-Dong")
    tocarNota(880, agora, 0.18);           // Lá (A5)
    tocarNota(1174.66, agora + 0.16, 0.45); // Ré (D6)
  } catch (err) {
    console.warn("Áudio aguardando interação na página:", err);
  }
}

function garantirEstilosToast() {
  if (document.getElementById("pdv-toast-styles")) return;

  const style = document.createElement("style");
  style.id = "pdv-toast-styles";
  style.textContent = `
    #pdv-toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .pdv-toast {
      pointer-events: auto;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--surface, #ffffff);
      color: var(--foreground, #18181b);
      border: 1px solid var(--border, #e4e4e7);
      border-left: 4px solid var(--primary, #ea1d63);
      border-radius: 12px;
      padding: 13px 15px;
      min-width: 280px;
      max-width: 360px;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
    }
    .pdv-toast.pdv-toast-visible {
      transform: translateX(0);
      opacity: 1;
    }
    .pdv-toast-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: oklch(0.62 0.235 14 / 0.12);
      color: var(--primary, #ea1d63);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pdv-toast-body {
      flex: 1;
      min-width: 0;
    }
    .pdv-toast-title {
      font-size: 13.5px;
      font-weight: 600;
      line-height: 1.3;
      margin: 0 0 2px;
      word-wrap: break-word;
    }
    .pdv-toast-sub {
      font-family: Georgia, serif;
      font-size: 11.5px;
      color: var(--muted-foreground, #71717a);
      margin: 0;
    }
    .pdv-toast-close {
      background: transparent;
      border: 0;
      color: var(--muted-foreground, #71717a);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pdv-toast-close:hover {
      background: var(--muted, #f4f4f5);
      color: var(--foreground, #18181b);
    }
  `;
  document.head.appendChild(style);
}

function mostrarNotificacaoPedido(pedido) {
  garantirEstilosToast();

  let container = document.getElementById("pdv-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "pdv-toast-container";
    document.body.appendChild(container);
  }

  const nomeCliente = (pedido && pedido.nome_cliente ? pedido.nome_cliente : "Cliente").trim();
  const valorFormatado = pedido && pedido.total != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(pedido.total))
    : "";

  const toast = document.createElement("div");
  toast.className = "pdv-toast";
  toast.title = "Clique para abrir os pedidos em Messages";
  toast.innerHTML = `
    <div class="pdv-toast-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths.message}</svg>
    </div>
    <div class="pdv-toast-body">
      <p class="pdv-toast-title">Novo pedido de ${escapeHtml(nomeCliente)}</p>
      <p class="pdv-toast-sub">${valorFormatado ? `${valorFormatado} · ` : ""}Clique para ver</p>
    </div>
    <button type="button" class="pdv-toast-close" aria-label="Fechar notificação" title="Fechar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths.x}</svg>
    </button>
  `;

  const removerToast = () => {
    toast.classList.remove("pdv-toast-visible");
    setTimeout(() => toast.remove(), 300);
  };

  // Clicar no "X" apenas fecha a notificação; clicar no card leva para messages.html
  toast.addEventListener("click", (e) => {
    if (e.target.closest(".pdv-toast-close")) {
      e.stopPropagation();
      removerToast();
      return;
    }
    window.location.href = "messages.html";
  });

  container.appendChild(toast);

  // Anima a entrada na tela
  requestAnimationFrame(() => {
    toast.classList.add("pdv-toast-visible");
  });

  // Fecha sozinho após 7 segundos
  setTimeout(removerToast, 7000);
}

function iniciarMonitorGlobalDePedidos() {
  const STORAGE_KEY = "pdv:knownOrderIds";

  async function verificarNovosPedidos() {
    try {
      const { data, error } = await supabaseClient
        .from("pedidos")
        .select("id, nome_cliente, total, data_venda")
        .order("data_venda", { ascending: true });

      if (error || !data) return;

      const rawSaved = sessionStorage.getItem(STORAGE_KEY);
      const isFirstCheck = rawSaved === null;
      const knownIds = new Set(rawSaved ? JSON.parse(rawSaved) : []);

      const novosPedidos = [];

      data.forEach((pedido) => {
        const id = String(pedido.id);
        if (!knownIds.has(id)) {
          if (!isFirstCheck) {
            novosPedidos.push(pedido);
          }
          knownIds.add(id);
        }
      });

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(knownIds)));

      if (novosPedidos.length > 0) {
        tocarAlertaNovoPedido();
        novosPedidos.forEach((pedido) => mostrarNotificacaoPedido(pedido));

        // Se o operador estiver na página messages.html, atualiza a lista automaticamente
        if (typeof window.renderMessages === "function") {
          window.renderMessages(true);
        }
      }
    } catch (e) {
      console.error("Erro ao verificar novos pedidos:", e);
    }
  }

  // 1. Faz a leitura inicial silenciosa para memorizar os pedidos já existentes
  verificarNovosPedidos();

  // 2. Escuta inserções em tempo real via Supabase Realtime em qualquer página
  supabaseClient
    .channel("global-pedidos-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "pedidos" },
      () => {
        setTimeout(verificarNovosPedidos, 500);
      }
    )
    .subscribe();

  // 3. Escuta eventos locais (caso o catálogo seja usado noutra aba do mesmo PC)
  window.addEventListener("storage", (e) => {
    if (e.key === "pdv:newOrderTrigger") {
      verificarNovosPedidos();
    }
  });

  // 4. Verificação periódica a cada 6 segundos em todas as páginas internas
  setInterval(verificarNovosPedidos, 6000);
}

// ==========================================
// CONTROLE DE AUTENTICAÇÃO E ROTAS PROTEGIDAS
// ==========================================
(function protegerRotas() {
  const path = window.location.pathname.toLowerCase();
  const isPublicPage = path.endsWith("catalogo.html") || path.endsWith("login.html");

  if (!isPublicPage) {
    document.documentElement.style.visibility = "hidden";

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
        sessionStorage.setItem("pdv:redirectAfterLogin", paginaAtual);
        window.location.replace("login.html");
      } else {
        document.documentElement.style.visibility = "visible";
        // Inicia o monitoramento sonoro e visual assim que confirma que o operador está logado
        iniciarMonitorGlobalDePedidos();
      }
    }).catch(() => {
      window.location.replace("login.html");
    });
  }

  // Intercepta o clique no botão "Sair" (#logout) em todas as páginas protegidas
  document.addEventListener("click", async (e) => {
    const logoutBtn = e.target.closest("#logout");
    if (!logoutBtn) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    sessionStorage.removeItem("pdv:knownOrderIds");
    await supabaseClient.auth.signOut();
    window.location.replace("login.html");
  }, true);
})();

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ==========================================
// DADOS COMPARTILHADOS (usado por index.html e produtos.html)
// ==========================================
const paths = {
  trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  barcode: '<path d="M3 5v14"/><path d="M6.5 5v14"/><path d="M10 5v14"/><path d="M14 5v14"/><path d="M17.5 5v14"/><path d="M21 5v14"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6"/><path d="M16 12h-6"/><path d="M16 16h-6"/>',
  invoice: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><circle cx="9" cy="10" r="3"/><path d="M9 6v8"/><path d="M15 15H6"/><path d="M15 19H6"/>',
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

const categories = [
  ["Bala", "candy"], ["Caixaria", "boxes"], ["Chiclete", "chiclete"], ["Chocolate", "chocolate"],
  ["Doces", "dessert"], ["Embalagem", "gift"], ["Pirulito", "lollipop"], ["Pote", "pote"], ["Salgadinho", "popcorn"],
];

let products = [];

function slugify(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "produto";
}

function uniqueId(name) {
  const base = slugify(name);
  let id = base, n = 2;
  while (products.some((p) => p.id === id)) id = `${base}-${n++}`;
  return id;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function productThumb(p, className) {
  const fallbackIcon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--muted-foreground);">${paths.box}</svg>`;
  const inner = p.photo ? `<img src="${p.photo}" alt="${escapeHtml(p.name)}">` : fallbackIcon;
  return `<span class="${className} thumb-media">${inner}</span>`;
}
