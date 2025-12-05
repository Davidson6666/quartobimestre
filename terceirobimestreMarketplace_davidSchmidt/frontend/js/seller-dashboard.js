/*
  Seller dashboard JS - carregamento de jogos/categorias/produtos,
  modal de adicionar/editar produto, criação/edição/exclusão via API.
  Usa fetch direto para evitar dependência de métodos ausentes em `api`.
*/

const API_BASE = "http://localhost:3000/api";

let games = [];
let categories = [];
let products = [];
let currentEditingProductId = null;

document.addEventListener("DOMContentLoaded", () => {
  // Botões/modal
  const addProductBtn = document.getElementById("addProductBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const productForm = document.getElementById("productForm");
  const searchInput = document.getElementById("searchProducts");

  if (addProductBtn)
    addProductBtn.addEventListener("click", () => openProductModal());
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeProductModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeProductModal);
  if (productForm) productForm.addEventListener("submit", handleProductSubmit);

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderProductsTable(
        products.filter((p) =>
          p.nome.toLowerCase().includes(searchInput.value.toLowerCase())
        )
      );
    });
  }

  loadInitialData();
});

async function loadInitialData() {
  try {
    await Promise.all([
      loadGames(),
      loadCategories(),
      loadProducts(),
      loadStats(),
    ]);
  } catch (err) {
    console.error("Erro no loadInitialData:", err);
  }
}

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  try {
    if (typeof auth !== "undefined" && auth.getToken) {
      const token = auth.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {}
  return headers;
}

function ensureArrayFromResponse(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "object") {
    if (x.id || x.nome) return [x];
    const vals = Object.values(x);
    if (vals.length && typeof vals[0] === "object") return vals;
    return Object.entries(x).map(([k, v]) => {
      if (typeof v === "string") return { id: Number(k) || k, nome: v };
      if (typeof v === "object") return v;
      return { id: Number(k) || k, nome: String(v) };
    });
  }
  return [];
}

function normalizeResponseToArray(resp, hintKeys = []) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (typeof resp !== "object") return [];
  if (Array.isArray(resp.data)) return resp.data;
  for (const k of hintKeys.concat([
    "data",
    "items",
    "results",
    "products",
    "games",
    "categories",
  ])) {
    if (
      Object.prototype.hasOwnProperty.call(resp, k) &&
      Array.isArray(resp[k])
    ) {
      return resp[k];
    }
  }
  // Busca recursiva pelo primeiro array dentro do objeto
  for (const k in resp) {
    if (resp[k] && typeof resp[k] === "object") {
      const arr = normalizeResponseToArray(resp[k]);
      if (arr.length) return arr;
    }
  }
  return [];
}

async function loadGames() {
  try {
    const res = await fetch(`${API_BASE}/products/games`);
    const json = res.ok
      ? await res.json()
      : await (await fetch(`${API_BASE}/games`)).json().catch(() => null);
    games = ensureArrayFromResponse(json.games || json.data || json);
    if (!games.length) {
      games = [
        { id: 1, nome: "Fortnite" },
        { id: 2, nome: "League of Legends" },
        { id: 3, nome: "Minecraft" },
        { id: 4, nome: "Valorant" },
        { id: 5, nome: "Free Fire" },
      ];
    }
    populateGameSelect();
  } catch (error) {
    games = [
      { id: 1, nome: "Fortnite" },
      { id: 2, nome: "League of Legends" },
      { id: 3, nome: "Minecraft" },
    ];
    populateGameSelect();
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/products/categories`);
    const json = res.ok
      ? await res.json()
      : await (await fetch(`${API_BASE}/categories`)).json().catch(() => null);
    console.log("categories raw response:", json);
    categories = normalizeResponseToArray(json, ["categories"]);
    if (!categories || !categories.length) {
      console.warn(
        "Nenhuma categoria retornada pela API. Adicione categorias no backend ou execute seed. Usando fallback local para testes."
      );
      categories = [
        { id: 1, nome: "Jogo" },
        { id: 2, nome: "Conta" },
        { id: 3, nome: "Dinheiro" },
        { id: 4, nome: "Item" },
        { id: 5, nome: "Skin" },
      ];
    }
    populateCategorySelect();
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
    categories = [
      { id: 1, nome: "Jogo" },
      { id: 2, nome: "Conta" },
      { id: 3, nome: "Dinheiro" },
    ];
    populateCategorySelect();
  }
}

function populateGameSelect() {
  const gameSelect = document.getElementById("productGame");
  if (!gameSelect) {
    console.warn("productGame select não encontrado");
    return;
  }

  const arr = ensureArrayFromResponse(games);
  console.log("populateGameSelect -> normalized games:", arr);

  gameSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione um jogo";
  gameSelect.appendChild(placeholder);

  if (!arr.length) {
    // fallback visível para teste
    [["Fortnite"], ["League of Legends"], ["Minecraft"]].forEach((g, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx + 1); // id provisório
      opt.textContent = Array.isArray(g) ? g[0] : g.nome || g;
      gameSelect.appendChild(opt);
    });
    return;
  }

  arr.forEach((g, i) => {
    const opt = document.createElement("option");
    const id = typeof g === "object" ? g.id ?? g._id ?? i + 1 : g;
    const label =
      typeof g === "object" ? g.nome ?? g.name ?? String(id) : String(g);
    opt.value = String(id);
    opt.textContent = label;
    gameSelect.appendChild(opt);
  });
}

function populateCategorySelect() {
  const catSelect = document.getElementById("productCategory");
  if (!catSelect) {
    console.warn("productCategory select não encontrado");
    return;
  }

  const arr = ensureArrayFromResponse(categories);
  console.log("populateCategorySelect -> normalized categories:", arr);

  catSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione uma categoria";
  catSelect.appendChild(placeholder);

  if (!arr.length) {
    // fallback
    const fallback = [
      { id: 1, nome: "Jogo" },
      { id: 2, nome: "Conta" },
      { id: 3, nome: "Dinheiro" },
    ];
    fallback.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = String(c.id);
      opt.textContent = c.nome;
      catSelect.appendChild(opt);
    });
    return;
  }

  arr.forEach((c, i) => {
    const opt = document.createElement("option");
    const id = typeof c === "object" ? c.id ?? c._id ?? i + 1 : c;
    const label =
      typeof c === "object" ? c.nome ?? c.name ?? String(id) : String(c);
    opt.value = String(id);
    opt.textContent = label;
    catSelect.appendChild(opt);
  });
}

async function loadProducts() {
  try {
    // CERTO: pega só os produtos do vendedor logado
    const response = await fetch("http://localhost:3000/api/products/mine", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });
    let json;
    if (response.status === 404) {
      console.warn("my-products rota não encontrada, buscando /products");
      response = await fetch(`${API_BASE}/products`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error(`Erro ao buscar produtos: ${response.status}`);
      json = await response.json();
    } else {
      if (!response.ok) {
        // tenta obter corpo de erro para log
        const txt = await response.text().catch(() => null);
        throw new Error(
          `Erro ao buscar produtos: ${response.status} ${txt || ""}`
        );
      }
      json = await response.json();
    }

    console.log("products raw response:", json);
    products = normalizeResponseToArray(json, ["products", "data"]);
    if (!products || !Array.isArray(products)) {
      // se veio um objeto único, tentar inferir lista a partir de propriedade 'data' ou 'items'
      console.warn("Products não é array, normalizando para []");
      products = [];
    }

    renderProductsTable(products);
    const totalProductsEl = document.getElementById("totalProducts");
    if (totalProductsEl) totalProductsEl.textContent = products.length;
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    const container = document.getElementById("productsTableContainer");
    if (container)
      container.innerHTML = `<div class="empty-state">Erro ao carregar produtos.</div>`;
  }
}

async function loadStats() {
  try {
    let res = await fetch(`${API_BASE}/sales/seller/stats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      console.warn("stats rota não encontrada, tentando /sales");
      res = await fetch(`${API_BASE}/sales`, { headers: getAuthHeaders() });
    }
    if (!res.ok)
      throw new Error(`Erro ao carregar estatísticas: ${res.status}`);
    const stats = await res.json();
    // preencher valores (dependendo do formato do backend)
    document.getElementById("totalSales").textContent =
      stats.totalSales ?? stats.vendas ?? 0;
    document.getElementById("totalRevenue").textContent = `R$ ${parseFloat(
      stats.revenue ?? stats.receita ?? 0
    ).toFixed(2)}`;
    document.getElementById("pendingOrders").textContent = stats.pending ?? 0;
  } catch (error) {
    console.error("Erro ao carregar estatísticas:", error);
  }
}

function renderProductsTable(list) {
  const container = document.getElementById("productsTableContainer");
  if (!container) return;
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhum produto encontrado.</div>`;
    return;
  }

  const rows = list.map((p) => {
    // Normalize imagem_url to absolute URL (handle backslashes and leading slashes)
    const rawImg = p.imagem_url || p.imagem || '';
    const img = (function(u){
      if (!u) return '';
      let s = String(u).replace(/\\/g, '/');
      const idx = s.toLowerCase().lastIndexOf('uploads/');
      if (idx >= 0) s = s.slice(idx);
      s = s.replace(/^\/+/, '');
      if (s.startsWith('http://') || s.startsWith('https://')) return s;
      return `http://localhost:3000/${s}`;
    })(rawImg);
    const price = Number(p.preco ?? p.price ?? 0).toFixed(2);
    const stock = p.estoque ?? p.stock ?? 0;
    const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    return `
      <div class="product-row" data-id="${p.id ?? p._id ?? ""}">
        <div class="product-thumb"><img src="${blank}" data-src="${img}" alt="${
      p.nome
    }" onerror="handleImgError(this)"></div>
        <div class="product-info">
          <div class="product-name">${p.nome}</div>
          <div class="product-game">${p.jogo_nome ?? p.jogo ?? ""}</div>
          <div class="product-price">R$ ${price}</div>
          <div class="product-stock">${stock} em estoque</div>
        </div>
        <div class="product-actions">
          <button class="btn btn-outline btn-edit" data-id="${
            p.id ?? p._id ?? ""
          }">Editar</button>
          <button class="btn btn-danger btn-delete" data-id="${
            p.id ?? p._id ?? ""
          }">Excluir</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = rows.join("");
  // após render, tentar resolver melhor as imagens (preload candidatos)
  container.querySelectorAll('img').forEach(imgEl => {
    // usar data-src quando presente (src foi trocado para tiny data uri)
    const src = imgEl.dataset.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '';
    if (src) resolveAndSetImage(imgEl, src);
  });
  // listeners...
  container.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const prod = products.find((x) => String(x.id ?? x._id) === String(id));
      if (prod) openProductModal(prod);
    });
  });
  container.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      deleteProduct(id);
    });
  });
}

// Tenta carregar alternativas de imagem (.jpg, .png) antes de usar placeholder
function handleImgError(imgEl) {
  try {
    if (!imgEl) return;
      const placeholder = 'https://dummyimage.com/120x80/cccccc/444444.png&text=Sem+Imagem';
      const src = imgEl.getAttribute('src') || '';
      if (!src) { imgEl.src = placeholder; return; }
      const attempts = parseInt(imgEl.dataset.imgAttempts || '0', 10);
      if (attempts >= 2) { imgEl.src = placeholder; return; }

      if (attempts === 0) {
        if (/\.png$/i.test(src)) { imgEl.dataset.imgAttempts = '1'; imgEl.src = src.replace(/\.png$/i, '.jpg'); return; }
        if (/\.jpe?g$/i.test(src)) { imgEl.dataset.imgAttempts = '1'; imgEl.src = src.replace(/\.jpe?g$/i, '.png'); return; }
        imgEl.dataset.imgAttempts = '1'; imgEl.src = src + '.jpg'; return;
      }

      if (attempts === 1) {
        if (/\.jpe?g$/i.test(src)) { imgEl.dataset.imgAttempts = '2'; imgEl.src = src.replace(/\.jpe?g$/i, '.png'); return; }
        if (/\.png$/i.test(src)) { imgEl.dataset.imgAttempts = '2'; imgEl.src = src.replace(/\.png$/i, '.jpg'); return; }
        imgEl.dataset.imgAttempts = '2'; imgEl.src = placeholder; return;
      }
  } catch (e) { imgEl.src = 'https://dummyimage.com/120x80/cccccc/444444.png&text=Sem+Imagem'; }
}

function openProductModal(product = null) {
  const modal = document.getElementById("productModal");
  if (!modal) return;
  const form = document.getElementById("productForm");
  form.reset();

  if (product) {
    currentEditingProductId = product.id ?? product._id ?? null;
    document.getElementById("modalTitle").textContent = "Editar Produto";
    document.getElementById("productId").value = currentEditingProductId;
    document.getElementById("productName").value = product.nome ?? "";
    document.getElementById("productDescription").value =
      product.descricao ?? product.description ?? "";
    document.getElementById("productPrice").value =
      product.preco ?? product.price ?? "";
    document.getElementById("productStock").value =
      product.estoque ?? product.stock ?? 0;
    const gameSelect = document.getElementById("productGame");
    if (gameSelect) {
      const val =
        product.jogo_id ?? product.jogo ?? product.jogo_nome ?? product.game;
      if (val !== undefined) gameSelect.value = val;
    }
    const catSelect = document.getElementById("productCategory");
    if (catSelect) {
      const val = product.categoria_id ?? product.categoria ?? product.category;
      if (val !== undefined) catSelect.value = val;
    }
  } else {
    currentEditingProductId = null;
    document.getElementById("modalTitle").textContent = "Adicionar Produto";
    document.getElementById("productId").value = "";
  }

  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  currentEditingProductId = null;
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // Não precisa append manual do arquivo, FormData já pega o campo 'imagem'

  const isEdit = !!form.productId.value;
  const url = isEdit
    ? `${API_BASE}/products/${form.productId.value}`
    : `${API_BASE}/products`;
  const method = isEdit ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      body: formData,
      headers: {
        Authorization: "Bearer " + auth.getToken(),
      },
    });

    if (response.ok) {
      alert("Produto salvo com sucesso!");
      closeProductModal();
      await loadProducts();
      await loadStats();
    } else {
      const error = await response.json();
      alert("Erro ao salvar produto: " + error.message);
    }
  } catch (err) {
    alert("Erro ao salvar produto.");
  }
}

async function deleteProduct(productId) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;
  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => null);
      throw new Error(
        `Erro ao excluir produto: ${res.status} ${errBody || ""}`
      );
    }
    alert("Produto excluído com sucesso!");
    await loadProducts();
    await loadStats();
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    alert("Erro ao excluir produto. Tente novamente.");
  }
}

fetch("http://localhost:3000/api/products/mine", {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token"),
  },
})
  .then((response) => response.json())
  .then((data) => {
    if (!data.success) {
      document.getElementById("productsTableContainer").innerHTML =
        "Erro ao carregar produtos.";
      return;
    }
    // Renderize os produtos normalmente usando data.produtos
  })
  .catch((error) => {
    document.getElementById("productsTableContainer").innerHTML =
      "Erro ao carregar produtos.";
  });

fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nome: 'Produto Teste',
    descricao: 'Descrição',
    preco: 100,
    estoque: 10,
    categoria_id: 1,
    jogo_id: 2
  })
})

// Tenta resolver a melhor URL de imagem (preload candidates .jpg/.png) e define no elemento
function resolveAndSetImage(imgEl, initialUrl) {
  if (!imgEl || !initialUrl) return;
  const placeholder = 'https://dummyimage.com/120x80/cccccc/444444.png&text=Sem+Imagem';
  const seen = new Set();
  const candidates = [];
  candidates.push(initialUrl);
  try {
    const u = String(initialUrl);
    if (/\.png$/i.test(u)) candidates.push(u.replace(/\.png$/i, '.jpg'));
    if (/\.jpe?g$/i.test(u)) candidates.push(u.replace(/\.jpe?g$/i, '.png'));
    if (!/\.[a-zA-Z0-9]+$/.test(u)) { candidates.push(u + '.jpg'); candidates.push(u + '.png'); }
  } catch (e) {}

  const fullCandidates = candidates
    .map(c => {
      if (c.startsWith('http://') || c.startsWith('https://')) return c;
      return c.replace(/^\/+/, '') && `http://localhost:3000/${c.replace(/^\/+/, '')}`;
    })
    .filter(Boolean);
  console.debug('[resolveImage] candidates for', initialUrl, fullCandidates);
  let idx = 0;
  function tryNext() {
    if (idx >= fullCandidates.length) {
      imgEl.src = placeholder;
      imgEl.dataset.imgAttempts = '2';
      console.debug('[resolveImage] no candidates worked, using placeholder for', initialUrl);
      return;
    }
    const url = fullCandidates[idx++];
    if (seen.has(url)) return tryNext();
    seen.add(url);
    const tester = new Image();
    tester.onload = function() { console.debug('[resolveImage] loaded', url); imgEl.src = url; };
    tester.onerror = function() { console.debug('[resolveImage] failed', url); tryNext(); };
    tester.src = url;
  }
  tryNext();
}
