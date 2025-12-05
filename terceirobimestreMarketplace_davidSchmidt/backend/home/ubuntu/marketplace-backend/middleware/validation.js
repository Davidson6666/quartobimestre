/**
 * Middleware de validação para requisições
 */

/**
 * Valida se os campos obrigatórios estão presentes
 * @param {Array} requiredFields - Lista de campos obrigatórios
 * @returns {Function} - Middleware function
 */
const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
      if (
        !req.body[field] &&
        req.body[field] !== 0 &&
        req.body[field] !== false
      ) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios ausentes",
        missingFields,
      });
    }

    next();
  };
};

/**
 * Valida formato de email
 * @param {string} email - Email a ser validado
 * @returns {boolean} - True se válido
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida se o email tem formato correto
 * @param {string} fieldName - Nome do campo de email (padrão: 'email')
 * @returns {Function} - Middleware function
 */
const validateEmail = (fieldName = "email") => {
  return (req, res, next) => {
    const email = req.body[fieldName];

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Formato de email inválido",
        field: fieldName,
      });
    }

    next();
  };
};

/**
 * Valida se a senha atende aos critérios mínimos
 * @param {string} fieldName - Nome do campo de senha (padrão: 'senha')
 * @returns {Function} - Middleware function
 */
const validatePassword = (fieldName = "senha") => {
  return (req, res, next) => {
    const password = req.body[fieldName];

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Senha deve ter pelo menos 6 caracteres",
          field: fieldName,
        });
      }
    }

    next();
  };
};

/**
 * Valida se o valor é um número positivo
 * @param {string} fieldName - Nome do campo
 * @returns {Function} - Middleware function
 */
const validatePositiveNumber = (fieldName) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (value !== undefined && value !== null) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        return res.status(400).json({
          success: false,
          message: `${fieldName} deve ser um número positivo`,
          field: fieldName,
        });
      }
      // Converte para número
      req.body[fieldName] = numValue;
    }

    next();
  };
};

/**
 * Valida se o valor é um inteiro positivo
 * @param {string} fieldName - Nome do campo
 * @returns {Function} - Middleware function
 */
const validatePositiveInteger = (fieldName) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (value !== undefined && value !== null) {
      const intValue = parseInt(value);
      if (
        isNaN(intValue) ||
        intValue < 0 ||
        !Number.isInteger(parseFloat(value))
      ) {
        return res.status(400).json({
          success: false,
          message: `${fieldName} deve ser um número inteiro positivo`,
          field: fieldName,
        });
      }
      // Converte para inteiro
      req.body[fieldName] = intValue;
    }

    next();
  };
};

/**
 * Valida se o valor está dentro de uma lista de opções válidas
 * @param {string} fieldName - Nome do campo
 * @param {Array} validOptions - Lista de opções válidas
 * @returns {Function} - Middleware function
 */
const validateEnum = (fieldName, validOptions) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (value && !validOptions.includes(value)) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} deve ser um dos valores: ${validOptions.join(
          ", "
        )}`,
        field: fieldName,
        validOptions,
      });
    }

    next();
  };
};

/**
 * Sanitiza strings removendo caracteres perigosos
 * @param {Array} fields - Lista de campos a serem sanitizados
 * @returns {Function} - Middleware function
 */
const sanitizeStrings = (fields) => {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === "string") {
        // Remove tags HTML e caracteres especiais perigosos
        req.body[field] = req.body[field]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<[^>]*>/g, "")
          .trim();
      }
    }
    next();
  };
};

/**
 * Valida parâmetros de paginação
 * @returns {Function} - Middleware function
 */
const validatePagination = () => {
  return (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Página deve ser um número maior que 0",
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Limite deve ser um número entre 1 e 100",
      });
    }

    req.pagination = {
      page: pageNum,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    };

    next();
  };
};

module.exports = {
  validateRequiredFields,
  validateEmail,
  validatePassword,
  validatePositiveNumber,
  validatePositiveInteger,
  validateEnum,
  sanitizeStrings,
  validatePagination,
  /**
   * Valida se a sigla do vendedor contém apenas letras e tem tamanho aceitável
   * @param {string} fieldName - Nome do campo (padrão: 'sigla')
   */
  validateSigla: (fieldName = "sigla") => {
    return (req, res, next) => {
      const val = req.body[fieldName];
      if (val === undefined || val === null) return next();
      if (typeof val !== "string" || !/^[a-zA-Z]{2,10}$/.test(val)) {
        return res.status(400).json({
          success: false,
          message: `${fieldName} inválida - deve conter somente letras (2-10 caracteres)`,
          field: fieldName,
        });
      }
      next();
    };
  },
  isValidEmail,
};
