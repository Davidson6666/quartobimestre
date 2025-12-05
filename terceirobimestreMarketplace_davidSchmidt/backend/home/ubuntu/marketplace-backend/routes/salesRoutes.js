const express = require('express');
const salesController = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');
const { 
    validateRequiredFields, 
    validatePositiveInteger,
    validateEnum,
    validatePagination
} = require('../middleware/validation');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

// ===== ROTAS DO CARRINHO =====

// Obter carrinho do usuário
router.get('/cart', salesController.getCart);

// Adicionar item ao carrinho
router.post('/cart', [
    validateRequiredFields(['produto_id']),
    validatePositiveInteger('produto_id'),
    validatePositiveInteger('quantidade')
], salesController.addToCart);

// Atualizar item do carrinho
router.put('/cart/:id', [
    validateRequiredFields(['quantidade']),
    validatePositiveInteger('quantidade')
], salesController.updateCartItem);

// Remover item do carrinho
router.delete('/cart/:id', salesController.removeFromCart);

// Limpar carrinho
router.delete('/cart', salesController.clearCart);

// ===== ROTAS DE VENDAS =====

// Criar nova venda (checkout)
router.post('/', [
    validateRequiredFields(['metodo_pagamento', 'itens']),
    validateEnum('metodo_pagamento', ['pix', 'cartao', 'boleto', 'saldo'])
], salesController.createSale);

// ⚠️ IMPORTANTE: Rotas mais específicas devem vir ANTES de rotas com parâmetros!

// Obter extrato de pagamentos (DEVE vir antes de /:id)
router.get('/extrato/pagamentos', salesController.getPaymentStatement);

// Listar vendas/compras do usuário
router.get('/', [
    validatePagination(),
    validateEnum('tipo', ['compras', 'vendas']),
    validateEnum('status', ['pendente', 'pago', 'entregue', 'cancelado', 'em_disputa'])
], salesController.getUserSales);

// Obter detalhes de uma venda
router.get('/:id', salesController.getSaleById);

// Atualizar status da venda (vendedor ou admin)
router.put('/:id/status', [
    validateRequiredFields(['status']),
    validateEnum('status', ['pendente', 'pago', 'entregue', 'cancelado', 'em_disputa'])
], salesController.updateSaleStatus);

// Confirmar pagamento (simulação)
router.post('/:id/confirm-payment', [
    validateRequiredFields(['codigo_transacao'])
], salesController.confirmPayment);

module.exports = router;
