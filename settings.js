const $ = (id) => document.getElementById(id);

// Função para desenhar os ícones
const icon = (name, size = 24, stroke = 1.5) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

// Renderiza o menu lateral marcando "Setting" como ativo
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
    `<a class="nav-button ${name === "Setting" ? "nav-button-active" : ""}" href="${href}" title="${name}">
      ${icon(ic)}<span>${name}</span>
    </a>`
  ).join("");
}

// Inicializa os ícones da tela
$("alt-icon").innerHTML = icon("settings", 48); // Ícone de engrenagem grande
$("logout").innerHTML = `${icon("logout")}<span>Sair</span>`;

// Funcionalidade de sair
$("logout").addEventListener("click", () => {
  window.location.href = "index.html";
});

// Executa as funções ao carregar a página
renderNav();