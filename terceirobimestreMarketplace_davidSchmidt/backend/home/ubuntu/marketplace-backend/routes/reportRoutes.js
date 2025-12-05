const express = require("express");
const reportController = require("../controllers/reportController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Proteger todas as rotas de relatórios
router.use(authenticate);

/**
 * GET /api/reports/vendedores-vendas
 * Relatório de quantas vendas cada vendedor fez
 * Query params: mes (opcional, formato YYYY-MM), ano (opcional, formato YYYY)
 */
router.get("/vendedores-vendas", reportController.getVendasPorVendedor);

/**
 * GET /api/reports/vendedor/:vendedorId
 * Relatório de vendas de um vendedor específico pelo ID
 */
router.get("/vendedor/:vendedorId", reportController.getVendasPorVendedorId);

/**
 * GET /api/reports/vendas-mes
 * Relatório de quanto a empresa vendeu em um determinado mês
 * Query params: mes (obrigatório, formato YYYY-MM)
 */
router.get("/vendas-mes", reportController.getVendasPorMes);

module.exports = router;
