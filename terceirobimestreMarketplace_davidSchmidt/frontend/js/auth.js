// Gerenciamento de Autenticação
class Auth {
  constructor() {
    this.user = null;
    this.token = null;
    this.loadFromStorage();
  }

  // Carregar dados do localStorage
  loadFromStorage() {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      this.token = token;
      this.user = JSON.parse(user);
    }
  }

  // Salvar dados no localStorage
  saveToStorage() {
    if (this.token && this.user) {
      localStorage.setItem("token", this.token);
      localStorage.setItem("user", JSON.stringify(this.user));
    }
  }

  // Limpar dados do localStorage
  clearStorage() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  // Fazer login
  async login(email, password) {
    try {
      const response = await api.login(email, password);

      if (response && response.success && response.token && response.user) {
        this.token = response.token;
        this.user = response.user;
        this.saveToStorage();
        return { success: true, user: this.user };
      }

      throw new Error(
        response && response.message
          ? response.message
          : "Resposta inválida do servidor"
      );
    } catch (error) {
      console.error("Erro no login:", error);
      return { success: false, error: error.message };
    }
  }

  // Fazer registro
  async register(userData) {
    try {
      const response = await api.register(userData);

      if (response && response.success && response.token && response.user) {
        this.token = response.token;
        this.user = response.user;
        this.saveToStorage();
        routeTo("index.html");
        return { success: true, user: this.user };
      } else {
        throw new Error(
          response && response.message
            ? response.message
            : "Resposta inválida do servidor"
        );
      }
    } catch (error) {
      console.error("Erro no registro:", error);
      return { success: false, error: error.message };
    }
  }

  // Fazer logout
  logout() {
    this.user = null;
    this.token = null;
    this.clearStorage();
    routeTo("index.html");
  }

  // Verificar se está autenticado
  isAuthenticated() {
    return this.token !== null && this.user !== null;
  }

  // Verificar se é vendedor
  isSeller() {
    return this.isAuthenticated() && this.user.tipo === "vendedor";
  }

  // Verificar se é admin
  isAdmin() {
    return this.isAuthenticated() && this.user.tipo === "admin";
  }

  // Obter usuário atual
  getCurrentUser() {
    return this.user;
  }

  // Obter token
  getToken() {
    return this.token;
  }

  // Redirecionar para dashboard baseado no role
  redirectToDashboard() {
    if (!this.isAuthenticated()) {
      routeTo("pages/login.html");
      return;
    }

    if (this.isSeller()) {
      routeTo("pages/seller-dashboard.html");
    } else if (this.isAdmin()) {
      routeTo("pages/CRUDadm.html");
    } else {
      routeTo("index.html");
    }
  }
}

// Instância global de autenticação
const auth = new Auth();

// Adicionar listeners apenas se os elementos existem (evita erros em outras páginas)
if (document.getElementById("loginBtn")) {
  document.getElementById("loginBtn").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("loginModal").style.display = "block";
  });
}

document
  .getElementById("closeLoginModal")
  .addEventListener("click", function () {
    document.getElementById("loginModal").style.display = "none";
  });

document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        // Salve o token e o usuário para o resto da aplicação
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("userId", data.user.id);
        }
        // Redireciona para index (navbar irá mostrar links apropriados)
        routeTo("index.html");
      } else {
        document.getElementById("loginError").textContent =
          data.message || "Erro ao fazer login";
      }
    } catch (err) {
      document.getElementById("loginError").textContent =
        "Erro de conexão com o servidor";
    }
  });

document.addEventListener("DOMContentLoaded", function () {
  const crudBtn = document.getElementById("crudAdminBtn");
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.tipo === "admin") {
    crudBtn.style.display = "inline-block";
  } else {
    crudBtn.style.display = "none";
  }
});
