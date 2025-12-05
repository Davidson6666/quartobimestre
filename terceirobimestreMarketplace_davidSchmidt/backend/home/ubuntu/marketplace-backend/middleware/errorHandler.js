/**
 * Envia resposta de sucesso
 * @param {Object} res - Response object
 * @param {*} data - Dados a enviar
 * @param {string} message - Mensagem de sucesso
 * @param {number} statusCode - Status HTTP (padrão 200)
 */
const sendSuccess = (res, data, message = "Sucesso", statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Classe para erros customizados da aplicação
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Trata erros de validação do PostgreSQL
 * @param {Error} err - Erro do PostgreSQL
 * @returns {AppError} - Erro formatado
 */
const handleValidationErrorDB = (err) => {
  let message = "Dados inválidos";
  const code = err && err.code;

  // Erro de violação de constraint única
  if (code === "23505") {
    const detail = err.detail || "";
    const fieldMatch = detail.match(/Key \((.+?)\)=/);
    const field = fieldMatch ? fieldMatch[1] : "campo";
    message = `${field} já está em uso`;
  }

  // Erro de violação de chave estrangeira
  if (code === "23503") {
    message = "Referência inválida - registro relacionado não encontrado";
  }

  // Erro de violação de constraint not null
  if (code === "23502") {
    const field = err.column || "campo obrigatório";
    message = `${field} é obrigatório`;
  }

  // Erro de violação de constraint check
  if (code === "23514") {
    message = "Valor não atende aos critérios de validação";
  }

  return new AppError(message, 400);
};

/**
 * Envia erro em ambiente de desenvolvimento
 * @param {Error} err - Erro
 * @param {Object} res - Response object
 */
const sendErrorDev = (err, res) => {
  console.error("ERROR (dev) 💥", err.stack || err);
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

/**
 * Envia erro em ambiente de produção
 * @param {Error} err - Erro
 * @param {Object} res - Response object
 */
const sendErrorProd = (err, res) => {
  // log completo no servidor para diagnóstico
  console.error("ERROR 💥", err.stack || err);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // erro não previsto: não vazar detalhes em produção
  return res.status(500).json({
    success: false,
    message: "Algo deu errado!",
  });
};

/**
 * Middleware global de tratamento de erros
 * @param {Error} err - Erro
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const globalErrorHandler = (err, req, res, next) => {
  // garantir propriedades
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    return sendErrorDev(err, res);
  }

  // preservar propriedades do erro original
  const error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;

  // tratar erros do Postgres (código começando por 23 => constraint)
  if (error.code && String(error.code).startsWith("23")) {
    const handled = handleValidationErrorDB(error);
    return sendErrorProd(handled, res);
  }

  // erro de JSON inválido
  if (
    error.name === "SyntaxError" &&
    error.message &&
    error.message.includes("JSON")
  ) {
    return sendErrorProd(new AppError("JSON inválido na requisição", 400), res);
  }

  return sendErrorProd(error, res);
};

/**
 * Middleware para rotas não encontradas
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: "Rota não encontrada" });
}

module.exports = { globalErrorHandler, notFound, AppError, sendSuccess };
