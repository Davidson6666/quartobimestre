const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { AppError } = require("./errorHandler"); // manter apenas AppError
const catchAsync = require("../utils/catchAsync"); // novo util
const db = require("../config/database");

/**
 * Gera token JWT
 * @param {number} userId - ID do usuário
 * @returns {string} - Token JWT
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "marketplace-secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * Gera hash da senha
 * @param {string} password - Senha em texto plano
 * @returns {Promise<string>} - Hash da senha
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

/**
 * Compara senha com hash
 * @param {string} password - Senha em texto plano
 * @param {string} hash - Hash da senha
 * @returns {Promise<boolean>} - True se a senha estiver correta
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Middleware para verificar autenticação
 */
const authenticate = catchAsync(async (req, res, next) => {
  // 1) Verificar se o token existe
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("Você não está logado! Faça login para acessar.", 401)
    );
  }

  // 2) Verificar se o token é válido
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "marketplace-secret");
  } catch (error) {
    return next(new AppError("Token inválido. Faça login novamente.", 401));
  }

  // 3) Verificar se o usuário ainda existe
  const result = await db.query(
    "SELECT id, nome, email, tipo, ativo FROM usuarios WHERE id = $1",
    [decoded.userId]
  );

  if (result.rows.length === 0) {
    return next(new AppError("O usuário deste token não existe mais.", 401));
  }

  const currentUser = result.rows[0];

  // 4) Verificar se o usuário está ativo
  if (!currentUser.ativo) {
    return next(
      new AppError(
        "Sua conta foi desativada. Entre em contato com o suporte.",
        401
      )
    );
  }

  // 5) Adicionar usuário ao request
  req.user = currentUser;
  next();
});

/**
 * Middleware para verificar autorização por tipo de usuário
 * @param {...string} roles - Tipos de usuário permitidos
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Usuário não autenticado.", 401));
    }

    if (!roles.includes(req.user.tipo)) {
      return next(
        new AppError("Você não tem permissão para realizar esta ação.", 403)
      );
    }

    next();
  };
};

/**
 * Middleware para verificar se o usuário é o proprietário do recurso
 * @param {string} userIdField - Campo que contém o ID do usuário proprietário
 */
const authorizeOwner = (userIdField = "usuario_id") => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Usuário não autenticado.", 401));
    }

    // Admin pode acessar qualquer recurso
    if (req.user.tipo === "admin") {
      return next();
    }

    // Verificar se o usuário é o proprietário
    const resourceUserId = req.body[userIdField] || req.params[userIdField];

    if (resourceUserId && parseInt(resourceUserId) !== req.user.id) {
      return next(
        new AppError("Você só pode acessar seus próprios recursos.", 403)
      );
    }

    next();
  });
};

/**
 * Middleware para verificar se o usuário é vendedor
 */
const requireVendedor = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Usuário não autenticado.", 401));
  }

  if (!["vendedor", "ambos", "admin"].includes(req.user.tipo)) {
    return next(new AppError("Acesso restrito a vendedores.", 403));
  }

  // Buscar dados do vendedor
  const result = await db.query(
    "SELECT * FROM vendedores WHERE usuario_id = $1 AND ativo = true",
    [req.user.id]
  );

  if (result.rows.length === 0 && req.user.tipo !== "admin") {
    return next(
      new AppError("Perfil de vendedor não encontrado ou inativo.", 403)
    );
  }

  if (result.rows.length > 0) {
    req.vendedor = result.rows[0];
  }

  next();
});

/**
 * Middleware para verificar se o usuário é funcionário de um vendedor
 */
const requireFuncionario = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Usuário não autenticado.", 401));
  }

  // Admin e vendedores têm acesso total
  if (["admin", "vendedor", "ambos"].includes(req.user.tipo)) {
    return next();
  }

  // Verificar se é funcionário ativo
  const result = await db.query(
    `
        SELECT fv.*, v.usuario_id as vendedor_usuario_id 
        FROM funcionarios_vinculos fv
        JOIN vendedores v ON fv.vendedor_id = v.id
        WHERE fv.funcionario_id = $1 AND fv.ativo = true
    `,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return next(new AppError("Acesso restrito a funcionários ativos.", 403));
  }

  req.funcionario = result.rows[0];
  next();
});

/**
 * Middleware opcional de autenticação (não falha se não houver token)
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "marketplace-secret"
    );

    const result = await db.query(
      "SELECT id, nome, email, tipo, ativo FROM usuarios WHERE id = $1 AND ativo = true",
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
  } catch (error) {
    // Token inválido, mas não falha - apenas continua sem usuário
  }

  next();
});

/**
 * Atualiza último login do usuário
 * @param {number} userId - ID do usuário
 */
const updateLastLogin = async (userId) => {
  try {
    await db.query(
      "UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1",
      [userId]
    );
  } catch (error) {
    console.error("Erro ao atualizar último login:", error);
  }
};

// NOTE: Removed development-only bcrypt.hash console.log to avoid side-effects during tests

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  authenticate,
  authorize,
  authorizeOwner,
  requireVendedor,
  requireFuncionario,
  optionalAuth,
  updateLastLogin,
};
