// CRUD do Dono - segue padrão do CRUD do Admin, com permissões ampliadas
const baseUrl = "http://localhost:3000/api"; // Ajuste se necessário
const token = () => localStorage.getItem("token");
const myUserId = () => localStorage.getItem("userId"); // espera que o login salve userId
// Owner credentials removed from client for security - use standard login flow

// --- Vendedores ---
async function loadVendedores() {
  try {
    const res = await fetch(`${baseUrl}/vendedores`, {
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();
    const tbody = document.querySelector("#vendedores-table tbody");
    tbody.innerHTML = "";
    // keep same behavior as CRUDadm: assume data.vendedores exists
    const vendedores = data.vendedores || [];
    if (!vendedores || vendedores.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3">Nenhum vendedor encontrado.</td></tr>';
      return;
    }
    vendedores.forEach((v) => {
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
  } catch (err) {
    console.error("Erro ao carregar vendedores", err);
  }
}

async function buscarVendedorPorId() {
  const id = document.getElementById("busca-vendedor-id").value;
  if (!id) return alert("Informe o ID do vendedor!");
  try {
    const res = await fetch(`${baseUrl}/vendedores/${id}`, {
      headers: { Authorization: "Bearer " + token() },
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

      // Chama a função para buscar produtos do vendedor (mesmo comportamento do CRUDadm)
      buscarProdutosDoVendedor(v.id);
    } else {
      tbody.innerHTML =
        '<tr><td colspan="3">Vendedor não encontrado.</td></tr>';
      document.querySelector("#produtos-table tbody").innerHTML = "";
    }
  } catch (err) {
    console.error("Erro ao buscar vendedor", err);
  }
}

async function excluirVendedor(id) {
  if (!confirm("Excluir vendedor?")) return;
  try {
    await fetch(`${baseUrl}/vendedores/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token() },
    });
    loadVendedores();
  } catch (err) {
    console.error("Erro ao excluir vendedor", err);
  }
}

async function excluirVendedorPorId() {
  const id = document.getElementById("busca-vendedor-id").value;
  if (!id) return alert("Informe o ID do vendedor!");
  if (!confirm("Excluir vendedor pelo ID?")) return;
  try {
    await fetch(`${baseUrl}/vendedores/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token() },
    });
    loadVendedores();
  } catch (err) {
    console.error("Erro ao excluir vendedor por id", err);
  }
}

// --- Produtos ---
async function loadProdutos() {
  try {
    const res = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();
    const tbody = document.querySelector("#produtos-table tbody");
    tbody.innerHTML = "";
    const products =
      data.data && data.data.products
        ? data.data.products
        : data.products || [];
    if (!products || products.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4">Nenhum produto encontrado.</td></tr>';
      return;
    }
    products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${p.nome || ""}</td>
                <td>${p.vendedor_nome || ""}</td>
                <td>R$ ${p.preco || p.price || ""}</td>
                <td>
                    <button class="edit" onclick="editarProduto(${
                      p.id
                    })">Editar</button>
                    <button class="delete" onclick="excluirProduto(${
                      p.id
                    })">Excluir</button>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar produtos", err);
  }
}

async function buscarProdutosDoVendedor(vendedorId) {
  if (!vendedorId) return alert("Informe o ID do vendedor para busca!");
  try {
    const res = await fetch(`${baseUrl}/products?vendedor_id=${vendedorId}`, {
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();
    const tbody = document.querySelector("#produtos-table tbody");
    tbody.innerHTML = "";
    const products =
      data.data && data.data.products
        ? data.data.products
        : data.products || [];
    if (products && products.length > 0) {
      products.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${p.nome || ""}</td>
                    <td>${p.vendedor_nome || ""}</td>
                    <td>R$ ${p.preco || p.price || ""}</td>
                    <td>
                        <button class="edit" onclick="editarProduto(${
                          p.id
                        })">Editar</button>
                        <button class="delete" onclick="excluirProduto(${
                          p.id
                        })">Excluir</button>
                    </td>
                `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML =
        '<tr><td colspan="4">Nenhum produto encontrado para este vendedor.</td></tr>';
    }
  } catch (err) {
    console.error("Erro ao buscar produtos do vendedor", err);
  }
}

async function excluirProduto(id) {
  if (!confirm("Excluir produto?")) return;
  try {
    const res = await fetch(`${baseUrl}/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();
    
    if (!res.ok) {
      alert("Erro ao excluir: " + (data.message || "Erro desconhecido"));
      console.error("Erro ao excluir produto:", data);
      return;
    }
    
    alert("Produto excluído com sucesso!");
    loadProdutos();
  } catch (err) {
    console.error("Erro ao excluir produto", err);
    alert("Erro ao excluir produto: " + err.message);
  }
}

// --- Admins (diferencial do Dono) ---
async function loadAdmins() {
  try {
    // Backend expõe /api/users com filtro tipo=admin
    const res = await fetch(`${baseUrl}/users?tipo=admin&page=1&limit=20`, {
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("loadAdmins: resposta não OK", res.status, data);
    }
    const tbody = document.querySelector("#admins-table tbody");
    tbody.innerHTML = "";
    const admins = data.users || [];
    if (!admins || admins.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3">Nenhum admin encontrado.</td></tr>';
      return;
    }
    admins.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${a.nome || ""}</td>
                <td>${a.email || ""}</td>
                <td>
                    <button class="delete" onclick="excluirAdmin(${
                      a.id
                    })">Excluir</button>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar admins", err);
  }
}

async function buscarAdminPorId() {
  const id = document.getElementById("busca-admin-id").value;
  if (!id) return alert("Informe o ID do admin!");
  try {
    const res = await fetch(`${baseUrl}/users/${id}`, {
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("buscarAdminPorId: resposta não OK", res.status, data);
    }
    const tbody = document.querySelector("#admins-table tbody");
    tbody.innerHTML = "";
    if (data.user) {
      const a = data.user;
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${a.nome || ""}</td>
                <td>${a.email || ""}</td>
                <td><button class="delete" onclick="excluirAdmin(${
                  a.id
                })">Excluir</button></td>
            `;
      tbody.appendChild(tr);
    } else {
      tbody.innerHTML = '<tr><td colspan="3">Admin não encontrado.</td></tr>';
    }
  } catch (err) {
    console.error("Erro ao buscar admin", err);
  }
}

async function excluirAdmin(id) {
  if (!confirm("Excluir admin?")) return;
  try {
    const res = await fetch(`${baseUrl}/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Erro ao excluir admin");
      return;
    }

    alert(data.message || "Admin excluído com sucesso");
    loadAdmins();
  } catch (err) {
    console.error("Erro ao excluir admin", err);
    alert("Erro ao excluir admin: " + err.message);
  }
}

async function excluirAdminPorId() {
  const id = document.getElementById("busca-admin-id").value;
  if (!id) return alert("Informe o ID do admin!");
  if (!confirm("Excluir admin pelo ID?")) return;
  try {
    const res = await fetch(`${baseUrl}/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Erro ao excluir admin");
      return;
    }

    alert(data.message || "Admin excluído com sucesso");
    loadAdmins();
  } catch (err) {
    console.error("Erro ao excluir admin por id", err);
    alert("Erro ao excluir admin: " + err.message);
  }
}

// Excluir próprio admin (dono pode se remover)
async function excluirMeuAdmin() {
  const id = myUserId();
  if (!id)
    return alert("ID do usuário não encontrado no localStorage (userId).");
  if (
    !confirm(
      "Tem certeza que deseja excluir seu próprio usuário admin? Essa ação é irreversível."
    )
  )
    return;
  try {
    const res = await fetch(`${baseUrl}/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Erro ao excluir sua conta");
      return;
    }

    // Após excluir a si mesmo, limpar localStorage e redirecionar para login
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    alert(
      data.message ||
        "Seu usuário foi excluído. Você será redirecionado para a página inicial."
    );
    routeTo("index.html");
  } catch (err) {
    console.error("Erro ao excluir próprio admin", err);
    alert("Erro ao excluir sua conta: " + err.message);
  }
}

// --- Modal editar produto (reaproveitado) ---
function fecharModalEditar() {
  document.getElementById("modal-editar-produto").style.display = "none";
}

async function editarProduto(id) {
  try {
    const res = await fetch(`${baseUrl}/products/${id}`, {
      headers: { Authorization: "Bearer " + token() },
    });
    const data = await res.json();
    const produto = data.data || data.product || data;
    document.getElementById("edit-produto-id").value =
      produto.id || produto._id;
    document.getElementById("edit-produto-nome").value =
      produto.nome || produto.title || "";
    document.getElementById("edit-produto-preco").value =
      produto.preco || produto.price || "";
    document.getElementById("modal-editar-produto").style.display = "block";
  } catch (err) {
    console.error("Erro ao abrir edição do produto", err);
  }
}

// Salva edição
document.getElementById("form-editar-produto").onsubmit = async function (e) {
  e.preventDefault();
  const id = document.getElementById("edit-produto-id").value;
  const nome = document.getElementById("edit-produto-nome").value;
  const preco = document.getElementById("edit-produto-preco").value;
  try {
    await fetch(`${baseUrl}/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token(),
      },
      body: JSON.stringify({ nome, preco }),
    });
    fecharModalEditar();
    loadProdutos();
  } catch (err) {
    console.error("Erro ao salvar edição do produto", err);
  }
};

// Inicialização
// On page load, if there's a valid token and userId, load data; otherwise, do nothing (use site's normal login)
window.addEventListener("load", () => {
  if (token() && myUserId()) {
    loadVendedores();
    loadProdutos();
    loadAdmins();
  }
});

// ===== RELATÓRIOS =====
function abrirRelatorioVendasPorVendedor() {
  window.open("relatorio.html", "_blank");
}

function abrirRelatorioVendasPorMes() {
  routeTo("pages/relatorio-mes.html");
}
