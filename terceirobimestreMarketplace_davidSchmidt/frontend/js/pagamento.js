console.log("🔧 pagamento.js carregado");

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📄 DOM carregado");

  // Carregar dados do produto baseado na URL
  async function loadProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");
    console.log("🆔 Product ID:", productId);

    if (!productId) {
      document.body.innerHTML =
        "<p style='padding: 20px;'>Produto não encontrado.</p>";
      return null;
    }

    try {
      console.log("🌐 Chamando API para produto ID:", productId);
      const response = await api.getProductById(productId);
      console.log("✅ Resposta da API:", response);

      // A resposta pode vir como response.data ou response.product ou direto
      const product = response.data || response.product || response;
      console.log("📦 Produto extraído:", product);

      if (!product || !product.nome) {
        throw new Error("Dados do produto inválidos");
      }

      return { product, productId };
    } catch (err) {
      console.error("❌ Erro ao carregar produto:", err);
      document.body.innerHTML =
        "<p style='padding: 20px;'>Erro ao carregar produto: " +
        err.message +
        "</p>";
      return null;
    }
  }

  const result = await loadProductDetails();
  if (!result) return;

  const { product, productId } = result;
  console.log("✨ Produto pronto para renderizar:", product);

  // Preencher dados do produto
  document.getElementById("produto-nome").textContent =
    product.nome || "Produto sem nome";
  document.getElementById("produto-descricao").textContent =
    product.descricao || "Sem descrição";
  document.getElementById("produto-preco").textContent =
    "R$ " + (product.preco ? parseFloat(product.preco).toFixed(2) : "0.00");
  document.getElementById("produto-estoque").textContent =
    (product.estoque || 0) + " em estoque";
  document.getElementById("produto-vendedor").textContent =
    "Vendedor: " + (product.vendedor_nome || "Desconhecido");

  console.log("✅ Dados preenchidos no HTML");

  // Limita o campo de quantidade ao estoque disponível
  const quantidadeInput = document.getElementById("quantidade");
  if (quantidadeInput) {
    quantidadeInput.max = product.estoque || 0;
    quantidadeInput.value = 1;

    quantidadeInput.addEventListener("input", function () {
      if (parseInt(this.value) > product.estoque) {
        this.value = product.estoque;
      }
      if (parseInt(this.value) < 1) {
        this.value = 1;
      }
    });
  }

  // Troca entre PIX e Cartão
  const formaPagamento = document.getElementById("forma-pagamento");
  const pixSection = document.getElementById("pix-section");
  const cartaoSection = document.getElementById("cartao-section");

  formaPagamento.addEventListener("change", function () {
    if (this.value === "pix") {
      pixSection.style.display = "block";
      cartaoSection.style.display = "none";
    } else {
      pixSection.style.display = "none";
      cartaoSection.style.display = "block";
    }
  });

  // Inicializa com PIX visível
  pixSection.style.display = "block";

  // Validação do cartão (algoritmo Luhn)
  function validarCartaoLuhn(numero) {
    numero = numero.replace(/\D/g, "");
    let soma = 0,
      alterna = false;
    for (let i = numero.length - 1; i >= 0; i--) {
      let n = parseInt(numero.charAt(i));
      if (alterna) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      soma += n;
      alterna = !alterna;
    }
    return soma % 10 === 0;
  }

  // PIX: Confirmar compra
  document
    .getElementById("confirmar-pix")
    .addEventListener("click", async () => {
      const quantidade = parseInt(document.getElementById("quantidade").value);
      const metodoPagamento = "pix";

      console.log("🛍️ Clicou em confirmar compra PIX");
      console.log("Produto ID:", productId, "Quantidade:", quantidade);

      try {
        console.log("📤 Enviando requisição de compra...");
        const response = await api.buyProduct(
          productId,
          quantidade,
          metodoPagamento
        );
        console.log("✅ Resposta da compra:", response);
        alert("Compra realizada com sucesso!");
        routeTo("index.html");
      } catch (err) {
        console.error("❌ Erro ao realizar compra:", err);
        alert("Erro ao realizar compra: " + (err.message || "Tente novamente"));
      }
    });

  // Cartão: Validação
  document
    .getElementById("validar-cartao")
    .addEventListener("click", async () => {
      const numero = document.getElementById("numero-cartao").value;
      const nome = document.getElementById("nome-cartao").value;
      const validade = document.getElementById("validade-cartao").value;
      const cvv = document.getElementById("cvv-cartao").value;
      const erro = document.getElementById("cartao-erro");
      erro.textContent = "";

      if (!validarCartaoLuhn(numero)) {
        erro.textContent = "Número do cartão inválido!";
        return;
      }
      if (!nome || !validade.match(/^\d{2}\/\d{2}$/) || !cvv.match(/^\d{3}$/)) {
        erro.textContent = "Preencha todos os campos corretamente!";
        return;
      }

      // Se passou na validação, fazer a compra
      const quantidade = parseInt(document.getElementById("quantidade").value);
      const metodoPagamento = "cartao";

      try {
        await api.buyProduct(productId, quantidade, metodoPagamento);
        alert("Compra realizada com sucesso!");
        routeTo("index.html");
      } catch (err) {
        erro.textContent =
          "Erro ao realizar compra: " + (err.message || "Tente novamente");
      }
    });

  // Monitorar mudanças na URL para recarregar o produto
  let lastProductId = productId;
  setInterval(() => {
    const currentUrl = new URLSearchParams(window.location.search);
    const currentId = currentUrl.get("id");
    if (currentId && currentId !== lastProductId) {
      lastProductId = currentId;
      location.reload();
    }
  }, 500);
});
