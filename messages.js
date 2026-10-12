const $ = (id) => document.getElementById(id);

// Função auxiliar para desenhar os ícones a partir do dados.js
const icon = (name, size = 24, stroke = 1.5) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

// Renderiza o menu lateral, marcando "Messages" como ativo
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

// Renderiza o ícone grande central da tela de mensagens
$("alt-icon").innerHTML = icon("message", 48);

// Configura o botão de Sair
$("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;
$("logout").addEventListener("click", () => {
  window.location.href = "index.html";
});

// Inicializa a página
renderNav();