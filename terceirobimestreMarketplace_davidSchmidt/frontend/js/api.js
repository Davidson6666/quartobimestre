// Configuração da API
const API_URL = "http://localhost:3000/api";

// Classe para gerenciar chamadas à API
class API {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  // Método auxiliar melhorado para fazer requisições (trata respostas não-JSON e adiciona logs)
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem("token");

    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Ler texto primeiro e tentar parsear JSON somente se aplicável
      const text = await response.text().catch(() => null);
      const contentType = response.headers.get("content-type") || "";
      let data = null;
      if (text && contentType.includes("application/json")) {
        try {
          data = JSON.parse(text);
        } catch (err) {
          data = text;
        }
      } else {
        data = text;
      }

      if (!response.ok) {
        const msg =
          (data && (data.message || data.error)) || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      return data;
    } catch (error) {
      console.error("Erro na API:", error, url, config);
      throw error;
    }
  }

  // Wrappers genéricos úteis para o frontend (api.get/post/put/delete)
  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint, body = null) {
    return this.request(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put(endpoint, body = null) {
    return this.request(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }

  // Métodos de Autenticação
  async login(email, password) {
    return this.post("/users/login", { email, senha: password });
  }

  async register(userData) {
    return this.post("/users/register", userData);
  }

  async becomeSeller(sigla) {
    return this.post("/users/become-seller", { sigla });
  }

  // Métodos de Produtos
  async getProducts(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/products?${queryParams}` : "/products";
    return this.get(endpoint);
  }

  async getProductById(id) {
    return this.get(`/products/${id}`);
  }

  async createProduct(productData) {
    return this.post("/products", productData);
  }

  async updateProduct(id, productData) {
    return this.put(`/products/${id}`, productData);
  }

  async deleteProduct(id) {
    return this.delete(`/products/${id}`);
  }

  async getMyProducts(vendedorId) {
    return this.get(`/products?vendedor_id=${vendedorId}`);
  }

  // Métodos de Jogos e Categorias
  async getGames() {
    return this.get("/products/games");
  }

  async getCategories() {
    return this.get("/products/categories");
  }

  // Métodos de Vendas (para vendedores)
  async getSellerStats() {
    return this.get("/sales/seller/stats");
  }

  async getMySales() {
    return this.get("/sales/seller/my-sales");
  }

  // Métodos de Compra
  async buyProduct(productId, quantity, paymentMethod) {
    return this.post("/sales", {
      metodo_pagamento: paymentMethod,
      itens: [
        {
          produto_id: parseInt(productId),
          quantidade: parseInt(quantity),
        },
      ],
    });
  }
}

// Instância global da API
const api = new API(API_URL);
