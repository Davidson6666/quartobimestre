// Exemplo simples: listar vendedores e produtos, excluir vendedor/produto

// Função para buscar e renderizar vendedores
async function loadVendedores() {
  const res = await fetch("http://localhost:3000/api/vendedores", {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });
  const data = await res.json();
  const tbody = document.querySelector("#vendedores-table tbody");
  tbody.innerHTML = "";
  data.vendedores.forEach((v) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${v.usuario_nome || ""}</td>
            <td>${v.usuario_email || ""}</td>
            <td>
                <button class="delete" onclick="excluirVendedor(${
                  v.id
                })">Excluir</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// Função para buscar e renderizar produtos
async function loadProdutos() {
  const res = await fetch("http://localhost:3000/api/products", {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });
  const data = await res.json();
  const tbody = document.querySelector("#produtos-table tbody");
  tbody.innerHTML = "";
  const products = data.data.products;
  if (products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4">Nenhum produto encontrado.</td></tr>';
  } else {
    products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${p.nome}</td>
                <td>${p.vendedor_nome}</td>
                <td>R$ ${p.preco}</td>
                <td>
                    <button class="edit" onclick="editarProduto(${p.id})">Editar</button>
                    <button class="delete" onclick="excluirProduto(${p.id})">Excluir</button>
                </td>
            `;
      tbody.appendChild(tr);
    });
  }
}

// Excluir vendedor
async function excluirVendedor(id) {
  if (confirm("Excluir vendedor?")) {
    await fetch(`http://localhost:3000/api/vendedores/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    loadVendedores();
  }
}

// Excluir produto
async function excluirProduto(id) {
  if (confirm("Excluir produto?")) {
    try {
      const res = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert("Erro ao excluir: " + (data.message || "Erro desconhecido"));
        console.error("Erro ao excluir produto:", data);
        return;
      }
      
      alert("Produto excluído com sucesso!");
      loadProdutos();
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Erro ao excluir produto: " + error.message);
    }
  }
}

// Editar produto (exemplo: abre alert, depois pode fazer modal)
async function editarProduto(id) {
  // Busca os dados do produto
  const res = await fetch(`http://localhost:3000/api/products/${id}`, {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });
  const data = await res.json();
  const produto = data.data;

  // Preenche o modal
  document.getElementById("edit-produto-id").value = produto.id;
  document.getElementById("edit-produto-nome").value = produto.nome;
  document.getElementById("edit-produto-preco").value = produto.preco;

  // Mostra o modal
  document.getElementById("modal-editar-produto").style.display = "block";
}

// Fecha o modal
function fecharModalEditar() {
  document.getElementById("modal-editar-produto").style.display = "none";
}

// Salva edição
document.getElementById("form-editar-produto").onsubmit = async function (e) {
  e.preventDefault();
  const id = document.getElementById("edit-produto-id").value;
  const nome = document.getElementById("edit-produto-nome").value;
  const preco = document.getElementById("edit-produto-preco").value;

  await fetch(`http://localhost:3000/api/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ nome, preco }),
  });
  fecharModalEditar();
  // Atualiza a lista
  loadProdutos();
};

// Buscar vendedor pelo ID e mostrar na tabela
async function buscarVendedorPorId() {
  const id = document.getElementById("busca-vendedor-id").value;
  if (!id) return alert("Informe o ID do vendedor!");
  const res = await fetch(`http://localhost:3000/api/vendedores/${id}`, {
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });
  const data = await res.json();
  const tbody = document.querySelector("#vendedores-table tbody");
  tbody.innerHTML = "";
  if (data.vendedor) {
    const v = data.vendedor;
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${v.usuario_nome || ""}</td>
            <td>${v.usuario_email || ""}</td>
            <td>
                <button class="delete" onclick="excluirVendedor(${
                  v.id
                })">Excluir</button>
            </td>
        `;
    tbody.appendChild(tr);

    // Chama a função para buscar produtos do vendedor
    buscarProdutosDoVendedor(v.id);
  } else {
    tbody.innerHTML = '<tr><td colspan="3">Vendedor não encontrado.</td></tr>';
    document.querySelector("#produtos-table tbody").innerHTML = "";
  }
}

// Excluir vendedor pelo ID digitado
async function excluirVendedorPorId() {
  const id = document.getElementById("busca-vendedor-id").value;
  if (!id) return alert("Informe o ID do vendedor!");
  if (confirm("Excluir vendedor pelo ID?")) {
    await fetch(`http://localhost:3000/api/vendedores/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    loadVendedores();
  }
}

// Buscar produtos do vendedor pelo vendedorId
async function buscarProdutosDoVendedor(vendedorId) {
  const res = await fetch(
    `http://localhost:3000/api/products?vendedor_id=${vendedorId}`,
    {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    }
  );
  const data = await res.json();
  const tbody = document.querySelector("#produtos-table tbody");
  tbody.innerHTML = "";
  const products = data.data.products; // <-- CORRIGIDO
  if (products && products.length > 0) {
    products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${p.nome}</td>
                <td>${p.vendedor_nome}</td>
                <td>R$ ${p.preco}</td>
                <td>
                    <button class="edit" onclick="editarProduto(${p.id})">Editar</button>
                    <button class="delete" onclick="excluirProduto(${p.id})">Excluir</button>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML =
      '<tr><td colspan="4">Nenhum produto encontrado para este vendedor.</td></tr>';
  }
}

// Inicialização
loadVendedores();
loadProdutos();

// ===== RELATÓRIOS =====
function abrirRelatorioVendasPorVendedor() {
  window.open("relatorio.html", "_blank");
}

function abrirRelatorioVendasPorMes() {
  routeTo("pages/relatorio-mes.html");
}
