const catchAsync = require("../utils/catchAsync");
const Users = require("../models/Users");
const { AppError } = require("../middleware/errorHandler");
const {
  generateToken,
  hashPassword,
  comparePassword,
  updateLastLogin,
} = require("../middleware/auth");
// Credenciais especiais do dono (podem ser configuradas via env)
const OWNER_EMAIL = process.env.OWNER_EMAIL || "donoFoda@gmail.com";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "150975";

// Helper para marcar usuário como owner
const markOwnerFlag = (user) => {
  if (!user) return user;
  return { ...user, isOwner: user.email && user.email === OWNER_EMAIL };
};
const db = require("../config/database");

/**
 * Registra um novo usuário
 */
const register = catchAsync(async (req, res, next) => {
  const { nome, email, senha, tipo = "comprador", sigla } = req.body;

  // Validação básica
  if (!nome || !email || !senha || !tipo) {
    return res.status(400).json({
      success: false,
      message: "Preencha todos os campos obrigatórios.",
    });
  }

  // Verificar se o email já existe
  const existingUser = await db.query(
    "SELECT id FROM usuarios WHERE email = $1",
    [email]
  );

  if (existingUser.rows.length > 0) {
    return next(new AppError("Email já está em uso", 400));
  }

  // Se for vendedor, valida a sigla
  if (tipo === "vendedor") {
    if (!sigla || !/^[a-zA-Z]+$/.test(sigla)) {
      return res.status(400).json({
        success: false,
        message: "A sigla deve conter apenas letras e não pode estar vazia.",
      });
    }
    // Verifica unicidade da sigla
    const siglaExists = await db.query(
      "SELECT 1 FROM vendedores WHERE LOWER(sigla) = LOWER($1)",
      [sigla]
    );
    if (siglaExists.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Sigla já está em uso. Escolha outra.",
      });
    }
  }

  // Hash da senha
  const senhaHash = await hashPassword(senha);

  // Inserir usuário
  const result = await db.query(
    `
        INSERT INTO usuarios (nome, email, senha_hash, tipo)
        VALUES ($1, $2, $3, $4)
        RETURNING id, nome, email, tipo, data_cadastro
    `,
    [nome, email, senhaHash, tipo]
  );

  const newUser = result.rows[0];

  // Se for vendedor, criar registro na tabela vendedores
  if (tipo === "vendedor") {
    await db.query(
      `
            INSERT INTO vendedores (usuario_id, sigla, ativo)
            VALUES ($1, $2, true)
        `,
      [newUser.id, sigla]
    );
  }

  // Criar registro de saldo
  await db.query(
    `
        INSERT INTO saldo_usuarios (usuario_id)
        VALUES ($1)
    `,
    [newUser.id]
  );

  // Gerar token
  const token = generateToken(newUser.id);

  // Atualizar último login
  await updateLastLogin(newUser.id);

  res.status(201).json({
    success: true,
    message: "Usuário registrado com sucesso",
    user: newUser,
    token,
  });
});

/**
 * Faz login do usuário
 */
const login = catchAsync(async (req, res, next) => {
  const { email, senha } = req.body;

  // Special-case: if owner email is used, ensure owner user exists and allow login
  if (email === OWNER_EMAIL) {
    // Check if user exists
    let result = await db.query(
      "SELECT id, nome, email, senha_hash, tipo, ativo FROM usuarios WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      // Create owner admin user directly
      const senhaHash = await hashPassword(OWNER_PASSWORD);
      const insert = await db.query(
        `
                INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo)
                VALUES ($1, $2, $3, 'admin', true)
                RETURNING id, nome, email, tipo, ativo
            `,
        ["Dono", email, senhaHash]
      );
      result = await db.query(
        "SELECT id, nome, email, senha_hash, tipo, ativo FROM usuarios WHERE id = $1",
        [insert.rows[0].id]
      );
    }

    const user = result.rows[0];

    // Verify provided password matches the owner password
    const isPasswordCorrect =
      senha === OWNER_PASSWORD ||
      (await comparePassword(senha, user.senha_hash));
    if (!isPasswordCorrect) {
      return next(new AppError("Email ou senha incorretos", 401));
    }

    // Gerar token
    const token = generateToken(user.id);

    // Atualizar último login
    await updateLastLogin(user.id);

    // Remove senha do retorno
    delete user.senha_hash;

    return res.status(200).json({
      success: true,
      message: "Login realizado com sucesso",
      user: markOwnerFlag(user),
      token,
    });
  }

  // Buscar usuário (normal flow)
  const result = await db.query(
    "SELECT id, nome, email, senha_hash, tipo, ativo FROM usuarios WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    return next(new AppError("Email ou senha incorretos", 401));
  }

  const user = result.rows[0];

  // Verificar se o usuário está ativo
  if (!user.ativo) {
    return next(
      new AppError("Conta desativada. Entre em contato com o suporte.", 401)
    );
  }

  // Verificar senha
  const isPasswordCorrect = await comparePassword(senha, user.senha_hash);
  if (!isPasswordCorrect) {
    return next(new AppError("Email ou senha incorretos", 401));
  }

  // Gerar token
  const token = generateToken(user.id);

  // Atualizar último login
  await updateLastLogin(user.id);

  // Remover senha do retorno
  delete user.senha_hash;

  res.status(200).json({
    success: true,
    message: "Login realizado com sucesso",
    user,
    token,
  });
});

/**
 * Obtém perfil do usuário atual
 */
const getProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const result = await db.query(
    `
        SELECT 
            u.id, u.nome, u.email, u.tipo, u.email_verificado,
            u.data_cadastro, u.ultimo_login,
            s.saldo_disponivel, s.saldo_a_receber, s.saldo_total_retirado
        FROM usuarios u
        LEFT JOIN saldo_usuarios s ON u.id = s.usuario_id
        WHERE u.id = $1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return next(new AppError("Usuário não encontrado", 404));
  }

  const user = result.rows[0];

  // Se for vendedor, buscar dados adicionais
  if (user.tipo === "vendedor") {
    const vendedorResult = await db.query(
      "SELECT * FROM vendedores WHERE usuario_id = $1",
      [userId]
    );

    if (vendedorResult.rows.length > 0) {
      user.vendedor = vendedorResult.rows[0];
    }
  }

  res.status(200).json({
    success: true,
    message: "Perfil recuperado com sucesso",
    user,
  });
});

/**
 * Atualiza perfil do usuário
 */
const updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { nome, email } = req.body;

  // Verificar se o novo email já está em uso (se foi alterado)
  if (email && email !== req.user.email) {
    const existingUser = await db.query(
      "SELECT id FROM usuarios WHERE email = $1 AND id != $2",
      [email, userId]
    );

    if (existingUser.rows.length > 0) {
      return next(new AppError("Email já está em uso", 400));
    }
  }

  // Atualizar usuário
  const result = await db.query(
    `
        UPDATE usuarios 
        SET nome = COALESCE($1, nome), 
            email = COALESCE($2, email),
            email_verificado = CASE 
                WHEN $2 IS NOT NULL AND $2 != email THEN false 
                ELSE email_verificado 
            END
        WHERE id = $3
        RETURNING id, nome, email, tipo, email_verificado, data_cadastro
    `,
    [nome, email, userId]
  );

  res.status(200).json({
    success: true,
    message: "Perfil atualizado com sucesso",
    user: result.rows[0],
  });
});

/**
 * Permitir que um usuário autenticado se torne vendedor (adicionar sigla)
 */
const becomeSeller = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { sigla } = req.body;

  if (!sigla || typeof sigla !== "string" || !/^[a-zA-Z]{2,10}$/.test(sigla)) {
    return res.status(400).json({
      success: false,
      message: "Sigla inválida. Deve conter apenas letras (2-10 caracteres).",
    });
  }

  // Verificar se usuário já tem um registro de vendedor
  const existingVendedor = await db.query(
    "SELECT id, sigla FROM vendedores WHERE usuario_id = $1",
    [userId]
  );

  // Se existir e já tiver sigla preenchida -> não permitir recriar
  if (existingVendedor.rows.length > 0 && existingVendedor.rows[0].sigla) {
    return res
      .status(400)
      .json({ success: false, message: "Você já possui perfil de vendedor." });
  }

  // Verificar unicidade da sigla
  const siglaExists = await db.query(
    "SELECT 1 FROM vendedores WHERE LOWER(sigla) = LOWER($1)",
    [sigla]
  );
  if (siglaExists.rowCount > 0) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Sigla já está em uso. Escolha outra.",
      });
  }

  // Inserir ou atualizar registro de vendedor
  let result;
  if (existingVendedor.rows.length > 0) {
    // atualiza o registro existente (ex: seed criou vendedor sem sigla)
    result = await db.query(
      `UPDATE vendedores SET sigla = $1, ativo = true WHERE id = $2 RETURNING *`,
      [sigla, existingVendedor.rows[0].id]
    );
  } else {
    result = await db.query(
      `INSERT INTO vendedores (usuario_id, sigla, ativo) VALUES ($1, $2, true) RETURNING *`,
      [userId, sigla]
    );
  }

  // Atualizar tipo do usuário (se era comprador -> ambos)
  if (req.user.tipo === "comprador") {
    await db.query("UPDATE usuarios SET tipo = $1 WHERE id = $2", [
      "ambos",
      userId,
    ]);
  }

  res
    .status(201)
    .json({
      success: true,
      message: "Conta atualizada para vendedor com sucesso",
      vendedor: result.rows[0],
    });
});

/**
 * Altera senha do usuário
 */
const changePassword = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { senhaAtual, novaSenha } = req.body;

  // Buscar senha atual
  const result = await db.query(
    "SELECT senha_hash FROM usuarios WHERE id = $1",
    [userId]
  );

  const user = result.rows[0];

  // Verificar senha atual
  const isCurrentPasswordCorrect = await comparePassword(
    senhaAtual,
    user.senha_hash
  );
  if (!isCurrentPasswordCorrect) {
    return next(new AppError("Senha atual incorreta", 400));
  }

  // Hash da nova senha
  const novaSenhaHash = await hashPassword(novaSenha);

  // Atualizar senha
  await db.query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [
    novaSenhaHash,
    userId,
  ]);

  res.status(200).json({
    success: true,
    message: "Senha alterada com sucesso",
  });
});

/**
 * Lista todos os usuários (apenas admin)
 */
const getAllUsers = catchAsync(async (req, res, next) => {
  const { page, limit, offset } = req.pagination;
  const { tipo, ativo, search } = req.query;

  let whereConditions = [];
  let queryParams = [];
  let paramCount = 0;

  // Filtro por tipo
  if (tipo) {
    paramCount++;
    whereConditions.push(`u.tipo = $${paramCount}`);
    queryParams.push(tipo);
  }

  // Filtro por status ativo
  if (ativo !== undefined) {
    paramCount++;
    whereConditions.push(`u.ativo = $${paramCount}`);
    queryParams.push(ativo === "true");
  }

  // Filtro por busca
  if (search) {
    paramCount++;
    whereConditions.push(
      `(u.nome ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`
    );
    queryParams.push(`%${search}%`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Contar total de registros
  const countResult = await db.query(
    `
        SELECT COUNT(*) as total
        FROM usuarios u
        ${whereClause}
    `,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // Buscar usuários com paginação
  queryParams.push(limit, offset);
  const result = await db.query(
    `
        SELECT 
            u.id, u.nome, u.email, u.tipo, u.email_verificado,
            u.data_cadastro, u.ultimo_login, u.ativo,
            s.saldo_disponivel
        FROM usuarios u
        LEFT JOIN saldo_usuarios s ON u.id = s.usuario_id
        ${whereClause}
        ORDER BY u.data_cadastro DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `,
    queryParams
  );

  const pagination = {
    page,
    limit,
    total,
  };

  // marca owner nos users
  const usersWithFlag = result.rows.map((u) => markOwnerFlag(u));
  res.status(200).json({
    success: true,
    message: "Usuários recuperados com sucesso",
    users: usersWithFlag,
    pagination,
  });
});

/**
 * Obtém usuário por ID (apenas admin)
 */
const getUserById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const result = await db.query(
    `
        SELECT 
            u.id, u.nome, u.email, u.tipo, u.email_verificado,
            u.data_cadastro, u.ultimo_login, u.ativo,
            s.saldo_disponivel, s.saldo_a_receber, s.saldo_total_retirado
        FROM usuarios u
        LEFT JOIN saldo_usuarios s ON u.id = s.usuario_id
        WHERE u.id = $1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return next(new AppError("Usuário não encontrado", 404));
  }

  const user = result.rows[0];

  // Se for vendedor, buscar dados adicionais
  if (user.tipo === "vendedor") {
    const vendedorResult = await db.query(
      "SELECT * FROM vendedores WHERE usuario_id = $1",
      [id]
    );

    if (vendedorResult.rows.length > 0) {
      user.vendedor = vendedorResult.rows[0];
    }
  }

  res.status(200).json({
    success: true,
    message: "Usuário recuperado com sucesso",
    user: markOwnerFlag(user),
  });
});

/**
 * Ativa/desativa usuário (apenas admin)
 */
const toggleUserStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { ativo } = req.body;

  const result = await db.query(
    "UPDATE usuarios SET ativo = $1 WHERE id = $2 RETURNING id, nome, email, ativo",
    [ativo, id]
  );

  if (result.rows.length === 0) {
    return next(new AppError("Usuário não encontrado", 404));
  }

  res.status(200).json({
    success: true,
    message: `Usuário ${ativo ? "ativado" : "desativado"} com sucesso`,
    user: result.rows[0],
  });
});

/**
 * Deleta usuário (apenas admin)
 */
const deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Verificar se o usuário existe
  const userExists = await db.query(
    "SELECT id, email FROM usuarios WHERE id = $1",
    [id]
  );

  if (userExists.rows.length === 0) {
    return next(new AppError("Usuário não encontrado", 404));
  }

  // Não permitir deletar o Dono (proteção crítica)
  if (userExists.rows[0].email === OWNER_EMAIL) {
    return next(
      new AppError(
        "🤡 Bela tentativa, mas vc n tem capacidade para excluir o dono",
        403
      )
    );
  }

  // Não permitir deletar a própria conta em hipótese alguma
  if (req.user.id === parseInt(id)) {
    return next(new AppError("🤦 Vc é idiota por tentar se excluir ?", 400));
  }

  // Deletar usuário (cascade irá deletar registros relacionados)
  await db.query("DELETE FROM usuarios WHERE id = $1", [id]);

  res.status(200).json({
    success: true,
    message: "Usuário deletado com sucesso",
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  deleteUser,
  becomeSeller,
};
