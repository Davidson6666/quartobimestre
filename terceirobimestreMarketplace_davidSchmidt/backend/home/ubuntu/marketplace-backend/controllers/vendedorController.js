const db = require("../config/database");

// Listar todos os vendedores
const getAllVendedores = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT v.id, u.nome AS usuario_nome, u.email AS usuario_email
       FROM vendedores v
       JOIN usuarios u ON v.usuario_id = u.id
       ORDER BY u.nome ASC`
    );
    res.json({
      success: true,
      vendedores: result.rows,
    });
  } catch (error) {
    console.error("Erro ao listar vendedores:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar vendedores",
      error: error.message,
    });
  }
};

// Exemplo para retornar nome e email do usuário do vendedor
const getVendedorById = async (req, res) => {
  const id = req.params.id;
  const result = await db.query(
    `SELECT v.*, u.nome AS usuario_nome, u.email AS usuario_email
     FROM vendedores v
     JOIN usuarios u ON v.usuario_id = u.id
     WHERE v.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ vendedor: null });
  }
  res.json({ vendedor: result.rows[0] });
};

const deleteVendedor = async (req, res) => {
  const id = req.params.id;
  await db.query("DELETE FROM vendedores WHERE id = $1", [id]);
  res.json({ success: true, message: "Vendedor excluído com sucesso" });
};

// Criar novo vendedor
const createVendedor = async (req, res) => {
  try {
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({
        success: false,
        message: "usuario_id é obrigatório",
      });
    }

    // Verificar se o usuário existe
    const usuarioResult = await db.query(
      "SELECT id FROM usuarios WHERE id = $1",
      [usuario_id]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    // Verificar se já é vendedor
    const vendedorExistente = await db.query(
      "SELECT id FROM vendedores WHERE usuario_id = $1",
      [usuario_id]
    );

    if (vendedorExistente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Este usuário já é um vendedor",
      });
    }

    // Criar vendedor
    const result = await db.query(
      `INSERT INTO vendedores (usuario_id)
       VALUES ($1)
       RETURNING *`,
      [usuario_id]
    );

    res.status(201).json({
      success: true,
      message: "Vendedor criado com sucesso",
      vendedor: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao criar vendedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar vendedor",
      error: error.message,
    });
  }
};

// Atualizar vendedor
const updateVendedor = async (req, res) => {
  try {
    const id = req.params.id;
    const { ativo } = req.body;

    if (ativo === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Campo "ativo" é obrigatório',
      });
    }

    // Verificar se vendedor existe
    const vendedorExistente = await db.query(
      "SELECT id FROM vendedores WHERE id = $1",
      [id]
    );

    if (vendedorExistente.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendedor não encontrado",
      });
    }

    // Atualizar vendedor
    const result = await db.query(
      `UPDATE vendedores 
       SET ativo = $1
       WHERE id = $2
       RETURNING *`,
      [ativo, id]
    );

    res.json({
      success: true,
      message: "Vendedor atualizado com sucesso",
      vendedor: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar vendedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar vendedor",
      error: error.message,
    });
  }
};

module.exports = {
  getAllVendedores,
  getVendedorById,
  deleteVendedor,
  createVendedor,
  updateVendedor,
};
