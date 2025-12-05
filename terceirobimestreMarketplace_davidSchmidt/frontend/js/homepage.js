// Lógica da Homepage
document.addEventListener("DOMContentLoaded", () => {
  // Elementos do DOM
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const exploreBtn = document.getElementById("exploreBtn");
  const becomeSellerBtn = document.getElementById("becomeSellerBtn");
  const createSellerAccountBtn = document.getElementById(
    "createSellerAccountBtn"
  );
  const viewAllProductsBtn = document.getElementById("viewAllProductsBtn");
  const featuredProductsContainer = document.getElementById("featuredProducts");

  // Event Listeners para navegação
  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("loginModal").style.display = "block";
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      routeTo("pages/register.html");
    });
  }

  if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
      document
        .querySelector(".products-grid")
        .scrollIntoView({ behavior: "smooth" });
    });
  }

  if (becomeSellerBtn) {
    becomeSellerBtn.addEventListener("click", () => {
      routeTo("pages/register.html?type=seller");
    });
  }

  if (createSellerAccountBtn) {
    createSellerAccountBtn.addEventListener("click", () => {
      routeTo("pages/register.html?type=seller");
    });
  }

  if (viewAllProductsBtn) {
    viewAllProductsBtn.addEventListener("click", () => {
      alert("Página de produtos em desenvolvimento");
    });
  }

  // Atualizar navbar baseado no estado de autenticação
  updateNavbar();

  // Carregar produtos em destaque
  loadFeaturedProducts();

  // Ativar filtro das categorias populares
  ativarFiltroCategorias();
});

// Tenta carregar alternativas de imagem (.jpg <-> .png) antes de usar placeholder
function handleImgError(imgEl) {
  try {
    if (!imgEl) return;
    const placeholder =
      "https://dummyimage.com/280x200/cccccc/444444.png&text=Sem+Imagem";
    const src = imgEl.getAttribute("src") || "";
    if (!src) {
      imgEl.src = placeholder;
      return;
    }
    // usa dataset para evitar loop infinito
    const attempts = parseInt(imgEl.dataset.imgAttempts || "0", 10);
    if (attempts >= 2) {
      imgEl.src = placeholder;
      return;
    }

    // Tentativa 0 -> trocar extensão (png->jpg ou jpg->png) ou adicionar .jpg
    if (attempts === 0) {
      if (/\.png$/i.test(src)) {
        imgEl.dataset.imgAttempts = "1";
        imgEl.src = src.replace(/\.png$/i, ".jpg");
        return;
      }
      if (/\.jpe?g$/i.test(src)) {
        imgEl.dataset.imgAttempts = "1";
        imgEl.src = src.replace(/\.jpe?g$/i, ".png");
        return;
      }
      imgEl.dataset.imgAttempts = "1";
      imgEl.src = src + ".jpg";
      return;
    }

    // Tentativa 1 -> tentar o outro formato (caso tenha tentado adicionar .jpg antes) ou placeholder
    if (attempts === 1) {
      // se atualmente tem .jpg, tenta .png (caso inverso já foi tentado antes)
      if (/\.jpe?g$/i.test(src)) {
        imgEl.dataset.imgAttempts = "2";
        imgEl.src = src.replace(/\.jpe?g$/i, ".png");
        return;
      }
      // se atualmente tem .png, tenta .jpg
      if (/\.png$/i.test(src)) {
        imgEl.dataset.imgAttempts = "2";
        imgEl.src = src.replace(/\.png$/i, ".jpg");
        return;
      }
      // fallback final
      imgEl.dataset.imgAttempts = "2";
      imgEl.src = placeholder;
      return;
    }
  } catch (e) {
    imgEl.src =
      "https://dummyimage.com/280x200/cccccc/444444.png&text=Sem+Imagem";
  }
}

// Atualizar navbar baseado no estado de autenticação
function updateNavbar() {
  const navLinks = document.querySelector(".nav-links");

  if (auth.isAuthenticated()) {
    const user = auth.getCurrentUser();

    // Build nav with optional links for seller/admin/owner
    let extraLinks = "";
    if (auth.isSeller()) {
      extraLinks +=
        '<a href="pages/seller-dashboard.html" class="nav-link">Dashboard</a>';
    } else {
      // Usuários autenticados que ainda não são vendedores podem solicitar
      extraLinks +=
        '<a href="pages/become-seller.html" class="nav-link">Tornar-se vendedor</a>';
    }
    // Admin CRUD link (for admins)
    if (user && user.tipo === "admin") {
      extraLinks +=
        '<a href="pages/CRUDadm.html" class="nav-link btn-admin" id="crudAdminBtn">CRUD Admin</a>';
    }

    // Mostrar extrato APENAS para compradores
    let extratoLink = "";
    if (user && (user.tipo === "comprador" || user.tipo === "ambos")) {
      extratoLink = '<a href="pages/extrato.html" class="nav-link btn-secondary" id="extratoBtn">📄 Extrato</a>';
    }

    navLinks.innerHTML = `
            <a href="index.html" class="nav-link active">Início</a>
            ${extraLinks}
            <div class="user-menu">
                <span class="nav-link">${user.nome}</span>
                ${extratoLink}
                <button class="btn btn-secondary" id="logoutBtn">Sair</button>
            </div>
        `;

    // Event listener para logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        auth.logout();
      });
    }
  }
}

// Carregar produtos em destaque (com filtro opcional de categoria)
async function loadFeaturedProducts(categoriaId = null) {
  const container = document.getElementById("featuredProducts");

  try {
    container.innerHTML = '<div class="loading">Carregando produtos...</div>';

    // Monta os filtros para API
    const params = { limit: 6 };
    if (categoriaId) params.categoria_id = categoriaId;

    const response = await api.getProducts(params);
    console.log("API RESPONSE:", response);

    const products =
      response.data && Array.isArray(response.data.products)
        ? response.data.products
        : [];

    if (!products || products.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>Nenhum produto disponível no momento.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = products
      .map((product) => createProductCard(product))
      .join("");

    document.querySelectorAll(".product-card").forEach((card) => {
      card.addEventListener("click", () => {
        const productId = card.dataset.productId;
        routeTo(`pages/pagamento.html?id=${productId}`);
      });
    });

    // Após renderizar, tentar resolver melhor cada imagem (evita placeholder quando .jpg existe)
    document
      .querySelectorAll(".product-card img.product-image")
      .forEach((imgEl) => {
        // prefer data-src (real URL) — src foi definido como tiny data URI para prevenir fetch prematuro
        const src =
          imgEl.dataset.src ||
          imgEl.getAttribute("data-src") ||
          imgEl.getAttribute("src") ||
          "";
        if (src) resolveAndSetImage(imgEl, src);
      });
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <p>Erro ao carregar produtos. Tente novamente mais tarde.</p>
      </div>
    `;
  }
}

// Criar card de produto
function createProductCard(product) {
  const stockStatus = product.estoque > 0 ? "in-stock" : "out-of-stock";
  const stockText =
    product.estoque > 0 ? `${product.estoque} em estoque` : "Fora de estoque";

  // Corrigido: mostra "Jogo não especificado" só se realmente não tem nome
  const jogoNome =
    product.jogo_nome && product.jogo_nome.trim() !== ""
      ? product.jogo_nome
      : "Jogo não especificado";

  // Normalize image URL: if backend returns a relative path like 'uploads/..', convert to absolute URL
  const rawImg = product.imagem_url || product.imagem || "";
  const imgSrc = (function (p) {
    if (!p)
      return "https://dummyimage.com/280x200/cccccc/444444.png&text=Sem+Imagem";
    try {
      // replace backslashes (Windows) and normalize
      let s = String(p).replace(/\\/g, "/");
      // If the path contains 'uploads/', extract that tail (handles absolute FS paths)
      const idx = s.toLowerCase().lastIndexOf("uploads/");
      if (idx >= 0) s = s.slice(idx);
      s = s.replace(/^\/+/, "");
      if (s.startsWith("http://") || s.startsWith("https://")) return s;
      return `http://localhost:3000/${s}`;
    } catch (e) {
      return "https://dummyimage.com/280x200/cccccc/444444.png&text=Sem+Imagem";
    }
  })(rawImg);

  // tiny transparent 1x1 gif to prevent immediate failed fetch
  const blank =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  return `
    <div class="product-card" data-product-id="${product.id}">
      <img src="${blank}" data-src="${imgSrc}"
        alt="${product.nome}" 
        class="product-image"
        onerror="handleImgError(this)">
            <div class="product-info">
                <div class="product-game">${jogoNome}</div>
                <h3 class="product-name">${product.nome}</h3>
                <p class="product-description">${
                  product.descricao || "Sem descrição"
                }</p>
                <div class="product-seller">
                  <span>Vendedor: ${
                    product.vendedor_nome || "Desconhecido"
                  }</span>
                </div>
                <div class="product-footer">
                    <div class="product-price">R$ ${parseFloat(
                      product.preco
                    ).toFixed(2)}</div>
                    <div class="product-stock ${stockStatus}">${stockText}</div>
                </div>
            </div>
        </div>
    `;
}

// Tenta resolver a melhor URL de imagem (testa carregamento via Image()) e define no elemento
function resolveAndSetImage(imgEl, initialUrl) {
  if (!imgEl || !initialUrl) return;
  const placeholder =
    "https://dummyimage.com/280x200/cccccc/444444.png&text=Sem+Imagem";
  const seen = new Set();
  const candidates = [];
  candidates.push(initialUrl);
  try {
    const u = String(initialUrl);
    if (/\.png$/i.test(u)) candidates.push(u.replace(/\.png$/i, ".jpg"));
    if (/\.jpe?g$/i.test(u)) candidates.push(u.replace(/\.jpe?g$/i, ".png"));
    if (!/\.[a-zA-Z0-9]+$/.test(u)) {
      candidates.push(u + ".jpg");
      candidates.push(u + ".png");
    }
  } catch (e) {}

  const fullCandidates = candidates
    .map((c) => {
      if (c.startsWith("http://") || c.startsWith("https://")) return c;
      return (
        c.replace(/^\/+/, "") &&
        `http://localhost:3000/${c.replace(/^\/+/, "")}`
      );
    })
    .filter(Boolean);
  console.debug("[resolveImage] candidates for", initialUrl, fullCandidates);
  let idx = 0;
  function tryNext() {
    if (idx >= fullCandidates.length) {
      imgEl.src = placeholder;
      imgEl.dataset.imgAttempts = "2";
      console.debug(
        "[resolveImage] no candidates worked, using placeholder for",
        initialUrl
      );
      return;
    }
    const url = fullCandidates[idx++];
    if (seen.has(url)) return tryNext();
    seen.add(url);
    const tester = new Image();
    tester.onload = function () {
      console.debug("[resolveImage] loaded", url);
      imgEl.src = url;
    };
    tester.onerror = function () {
      console.debug("[resolveImage] failed", url);
      tryNext();
    };
    tester.src = url;
  }
  tryNext();
}

// Ativar filtro das categorias populares
function ativarFiltroCategorias() {
  // Seleciona todos os botões de categoria (precisam ter data-id)
  document.querySelectorAll(".categoria-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const categoriaId = btn.getAttribute("data-id");
      loadFeaturedProducts(categoriaId);
    });
  });
}

// (Opcional) Se quiser recarregar todos os produtos em destaque ao clicar em "Ver Todos"
const viewAllProductsBtn = document.getElementById("viewAllProductsBtn");
if (viewAllProductsBtn) {
  viewAllProductsBtn.addEventListener("click", () => {
    loadFeaturedProducts();
  });
}

// (Mantém o resto dos listeners para login, registro, etc)
document.addEventListener("DOMContentLoaded", function () {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      routeTo("pages/login.html");
    });
  }

  const registerBtn = document.getElementById("registerBtn");
  if (registerBtn) {
    registerBtn.addEventListener("click", function () {
      routeTo("pages/register.html");
    });
  }

  const createSellerAccountBtn = document.getElementById(
    "createSellerAccountBtn"
  );
  if (createSellerAccountBtn) {
    createSellerAccountBtn.addEventListener("click", function () {
      routeTo("pages/register.html?type=seller");
    });
  }

  const sellerDashboardBtn = document.getElementById("sellerDashboardBtn");
  if (sellerDashboardBtn && auth.isAuthenticated() && auth.isSeller()) {
    sellerDashboardBtn.style.display = "inline-block";
    sellerDashboardBtn.addEventListener("click", function () {
      routeTo("pages/seller-dashboard.html");
    });
  }

  const closeLoginModalBtn = document.getElementById("closeLoginModal");
  if (closeLoginModalBtn) {
    closeLoginModalBtn.addEventListener("click", function () {
      document.getElementById("loginModal").style.display = "none";
    });
  }
});

// Navbar links for admin/owner are handled by updateNavbar() on load
