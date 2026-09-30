// ==========================================
// 1. DADOS E CONFIGURAÇÕES
// ==========================================
const paths = {
  bag: '',
  dashboard: '',
  message: '',
  receipt: '',
  settings: '',
  logout: '',
  search: '',
  x: '',
  pencil: '',
  minus: '',
  plus: '',
  chevron: '',
  menu: '',
  candy: '',
  boxes: '',
  chiclete: '',
  chocolate: '',
  dessert: '',
  gift: '',
  lollipop: '',
  pote: '',
  popcorn: '',
  pix: '',
  card: '',
  cash: '',
  check: '',
  back: '',
};

const products = [
  { id: "bala-morango", name: "Bala de Morango", price: 0.5, category: "Bala", emoji: "🍬" },
  { id: "bala-menta", name: "Bala de Menta", price: 0.5, category: "Bala", emoji: "🍬" },
  { id: "bala-acida", name: "Bala Ácida", price: 0.75, category: "Bala", emoji: "🍬", badge: "Novo" },
  { id: "caixa-sortida", name: "Caixa Sortida", price: 15.9, category: "Caixaria", emoji: "📦" },
  { id: "caixa-trufas", name: "Caixa de Trufas", price: 24.9, category: "Caixaria", emoji: "📦", badge: "Novo" },
  { id: "chiclete-morango", name: "Chiclete Morango", price: 0.75, category: "Chiclete", emoji: "🫧" },
  { id: "chiclete-menta", name: "Chiclete Menta", price: 0.75, category: "Chiclete", emoji: "🫧" },
  { id: "barra-leite", name: "Barra Ao Leite", price: 7.9, category: "Chocolate", emoji: "🍫" },
  { id: "barra-amargo", name: "Barra Meio Amargo", price: 8.5, category: "Chocolate", emoji: "🍫" },
  { id: "trufa-belga", name: "Trufa Belga", price: 4.5, category: "Chocolate", emoji: "🍫" },
  { id: "brigadeiro", name: "Brigadeiro Gourmet", price: 3.5, category: "Doces", emoji: "🍮" },
  { id: "doce-leite", name: "Doce de Leite", price: 3.0, category: "Doces", emoji: "🍮" },
  { id: "sacola-kraft", name: "Sacola Kraft", price: 1.5, category: "Embalagem", emoji: "🛍️" },
  { id: "caixa-presente", name: "Caixa de Presente", price: 5.0, category: "Embalagem", emoji: "🎁" },
  { id: "pirulito-colorido", name: "Pirulito Colorido", price: 1.0, category: "Pirulito", emoji: "🍭" },
  { id: "pirulito-gigante", name: "Pirulito Gigante", price: 3.5, category: "Pirulito", emoji: "🍭", badge: "Novo" },
  { id: "pote-brigadeiro", name: "Pote de Brigadeiro", price: 12.9, category: "Pote", emoji: "🫙" },
  { id: "pote-doce-leite", name: "Pote de Doce de Leite", price: 14.9, category: "Pote", emoji: "🫙" },
  { id: "salgadinho-queijo", name: "Salgadinho de Queijo", price: 6.9, category: "Salgadinho", emoji: "🧀" },
  { id: "chips-milho", name: "Chips de Milho", price: 5.9, category: "Salgadinho", emoji: "🌽" },
];

const categories = [
  ["Bala", "candy"], ["Caixaria", "boxes"], ["Chiclete", "chiclete"], ["Chocolate", "chocolate"],
  ["Doces", "dessert"], ["Embalagem", "gift"], ["Pirulito", "lollipop"], ["Pote", "pote"], ["Salgadinho", "popcorn"],
];

const catImages = { 
  Caixaria: "icons/caixaria.svg", Chiclete: "icons/chicletes.svg", 
  Doces: "icons/doces.svg", Embalagem: "icons/embalagens.svg", Salgadinho: "icons/salgadinho.svg" 
};

const navigation = [
  ["Home", "bag"], ["Dashboard", "dashboard"], ["Messages", "message"], 
  ["Bills", "receipt"], ["Setting", "settings"]
];

const altIcons = { Dashboard: "dashboard", Messages: "message", Bills: "receipt", Setting: "settings" };

// ESTADO GLOBAL DA APLICAÇÃO
const state = {
  category: "Bala", 
  query: "", 
  sort: "Popular", 
  activeNav: "Home",
  editing: false, 
  placed: false, 
  mobileCart: false, 
  discount: 0, 
  paymentDetail: null,
  cart: { "barra-leite": 2, "trufa-belga": 1, "pote-brigadeiro": 3, "pirulito-colorido": 2 },
};

// ==========================================
// 2. UTILITÁRIOS
// ==========================================
const $ = (id) => document.getElementById(id);

// MELHORIA 1: Usar a API nativa de formatação de moedas (muito mais seguro e limpo)
const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (n) => moneyFormatter.format(n);

const icon = (name, size = 24, stroke = 1.5) =>
  `