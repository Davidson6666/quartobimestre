const express = require("express");
const productController = require("../controllers/productController");
const { authenticate, authorize, optionalAuth } = require("../middleware/auth");
const {
  validateRequiredFields,
  sanitizeStrings,
  validatePositiveInteger,
  validatePositiveNumber,
  validatePagination,
  // remova requireVendedor e upload se não existem!
} = require("../middleware/validation");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// ===== ROTAS DE CATEGORIAS =====
router.get("/categories", productController.getCategories);
router.post(
  "/categories",
  [
    authenticate,
    authorize("admin"),
    validateRequiredFields(["nome"]),
    sanitizeStrings(["nome", "descricao"]),
    validatePositiveInteger("ordem_exibicao"),
  ],
  productController.createCategory
);
router.put(
  "/categories/:id",
  [
    authenticate,
    authorize("admin"),
    sanitizeStrings(["nome", "descricao"]),
    validatePositiveInteger("ordem_exibicao"),
  ],
  productController.updateCategory
);
router.delete(
  "/categories/:id",
  [authenticate, authorize("admin")],
  productController.deleteCategory
);

// ===== ROTAS DE JOGOS/PLATAFORMAS =====
router.get("/games", productController.getGames);
router.post(
  "/games",
  [
    authenticate,
    authorize("admin"),
    validateRequiredFields(["nome"]),
    sanitizeStrings(["nome"]),
  ],
  productController.createGame
);
router.put(
  "/games/:id",
  [authenticate, authorize("admin"), sanitizeStrings(["nome"])],
  productController.updateGame
);

// ===== ROTAS DE PRODUTOS =====
// Listar produtos (admin e público)
router.get("/", [optionalAuth], productController.getProdutos);

// ROTA ESPECÍFICA DE PRODUTOS DO VENDEDOR (deve vir antes de /:id)
router.get("/mine", authenticate, productController.getMyProducts);

// Obter produto por ID (público)
router.get("/:id", productController.getProductById);

// Middleware de autenticação para rotas protegidas
router.use(authenticate);

// Criar produto (vendedores e admin)
router.post(
  "/",
  upload.single('imagem'),
  [
    // REMOVA requireVendedor daqui!
    validateRequiredFields(["nome", "preco", "estoque", "categoria_id"]),
    validatePositiveNumber("preco"),
    validatePositiveInteger("estoque"),
    validatePositiveInteger("categoria_id"),
    validatePositiveInteger("jogo_id"),
    validatePositiveInteger("vendedor_id"), // Apenas para admin
    sanitizeStrings(["nome", "descricao", "servidor", "tipo_item"]),
  ],
  productController.createProduct
);

// Atualizar produto (proprietário ou admin)
router.put(
  "/:id",
  [
    validatePositiveNumber("preco"),
    validatePositiveInteger("estoque"),
    validatePositiveInteger("categoria_id"),
    validatePositiveInteger("jogo_id"),
    sanitizeStrings(["nome", "descricao", "servidor", "tipo_item"]),
  ],
  productController.updateProduct
);

// Deletar produto (proprietário ou admin)
router.delete("/:id", productController.deleteProduct);

module.exports = router;
