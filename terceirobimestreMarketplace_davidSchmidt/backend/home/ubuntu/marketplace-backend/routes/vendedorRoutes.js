const express = require("express");
const router = express.Router();
const vendedorController = require("../controllers/vendedorController");
const { authenticate, authorize } = require("../middleware/auth");

// Listar todos os vendedores (sem autenticação)
router.get("/", vendedorController.getAllVendedores);

// Criar novo vendedor (admin only)
router.post(
  "/",
  authenticate,
  authorize("admin"),
  vendedorController.createVendedor
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  vendedorController.getVendedorById
);

// Atualizar vendedor (admin only)
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  vendedorController.updateVendedor
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  vendedorController.deleteVendedor
);

module.exports = router;
