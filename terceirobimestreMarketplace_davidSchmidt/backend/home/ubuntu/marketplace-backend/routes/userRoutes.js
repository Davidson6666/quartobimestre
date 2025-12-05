const express = require("express");
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");
const {
  validateRequiredFields,
  validateEmail,
  validatePassword,
  validateEnum,
  validateSigla,
  sanitizeStrings,
  validatePagination,
} = require("../middleware/validation");

const router = express.Router();

// Rotas públicas (sem autenticação)
router.post(
  "/register",
  [
    validateRequiredFields(["nome", "email", "senha"]),
    validateEmail("email"),
    validatePassword("senha"),
    validateEnum("tipo", ["comprador", "vendedor", "ambos"]),
    sanitizeStrings(["nome"]),
  ],
  userController.register
);

router.post(
  "/login",
  [validateRequiredFields(["email", "senha"]), validateEmail("email")],
  userController.login
);

// Middleware de autenticação para todas as rotas abaixo
router.use(authenticate);

// Rotas protegidas (requer autenticação)
router.get("/profile", userController.getProfile);

router.put(
  "/profile",
  [validateEmail("email"), sanitizeStrings(["nome"])],
  userController.updateProfile
);

router.put(
  "/change-password",
  [
    validateRequiredFields(["senhaAtual", "novaSenha"]),
    validatePassword("novaSenha"),
  ],
  userController.changePassword
);

// Permitir que usuário autenticado se torne vendedor (fornecendo sigla única)
router.post(
  "/become-seller",
  [
    // precisa estar autenticado
    authorize("admin", "vendedor", "ambos", "comprador"), // allow all authenticated types, controller will handle current state
    validateRequiredFields(["sigla"]),
    validateSigla("sigla"),
    sanitizeStrings(["sigla"]),
  ],
  userController.becomeSeller
);

// Rotas administrativas (apenas admin)
router.get(
  "/",
  [authorize("admin"), validatePagination()],
  userController.getAllUsers
);

router.get("/:id", [authorize("admin")], userController.getUserById);

router.put(
  "/:id/status",
  [authorize("admin"), validateRequiredFields(["ativo"])],
  userController.toggleUserStatus
);

router.delete("/:id", [authorize("admin")], userController.deleteUser);

module.exports = router;
