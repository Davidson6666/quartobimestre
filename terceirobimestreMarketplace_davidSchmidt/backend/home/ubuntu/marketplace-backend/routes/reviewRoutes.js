const express = require('express');
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { 
    validateRequiredFields, 
    validatePositiveInteger,
    validateEnum,
    sanitizeStrings,
    validatePagination
} = require('../middleware/validation');

const router = express.Router();

// Rotas públicas (com autenticação opcional)
router.get('/', [
    optionalAuth,
    validatePagination(),
    validateEnum('tipo_avaliado', ['vendedor', 'funcionario', 'comprador', 'produto']),
    validatePositiveInteger('produto_id'),
    validatePositiveInteger('avaliado_id'),
    validatePositiveInteger('nota_min'),
    validatePositiveInteger('nota_max')
], reviewController.getReviews);

router.get('/stats', [
    validatePositiveInteger('produto_id'),
    validatePositiveInteger('avaliado_id'),
    validateEnum('tipo_avaliado', ['vendedor', 'funcionario', 'comprador', 'produto'])
], reviewController.getReviewStats);

// Middleware de autenticação para rotas protegidas
router.use(authenticate);

// Criar avaliação
router.post('/', [
    validateRequiredFields(['avaliado_id', 'tipo_avaliado', 'nota']),
    validatePositiveInteger('venda_id'),
    validatePositiveInteger('produto_id'),
    validatePositiveInteger('avaliado_id'),
    validateEnum('tipo_avaliado', ['vendedor', 'funcionario', 'comprador', 'produto']),
    validatePositiveInteger('nota'),
    sanitizeStrings(['comentario'])
], reviewController.createReview);

// Responder a avaliação
router.put('/:id/respond', [
    validateRequiredFields(['resposta']),
    sanitizeStrings(['resposta'])
], reviewController.respondToReview);

// Marcar avaliação como útil
router.post('/:id/useful', reviewController.markReviewUseful);

// Denunciar avaliação
router.post('/:id/report', [
    sanitizeStrings(['motivo'])
], reviewController.reportReview);

// Rotas administrativas (apenas admin)
router.put('/:id/remove-report', [
    authorize('admin')
], reviewController.removeReviewReport);

router.delete('/:id', [
    authorize('admin')
], reviewController.deleteReview);

module.exports = router;
