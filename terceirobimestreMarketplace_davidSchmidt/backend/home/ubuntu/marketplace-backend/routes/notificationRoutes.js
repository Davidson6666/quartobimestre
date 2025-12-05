const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');
const { 
    validateRequiredFields, 
    validatePositiveInteger,
    validateEnum,
    sanitizeStrings,
    validatePagination
} = require('../middleware/validation');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

// Listar notificações do usuário
router.get('/', [
    validatePagination(),
    validateEnum('tipo', ['venda', 'pagamento', 'sistema', 'chat', 'promocao'])
], notificationController.getNotifications);

// Obter contagem de notificações não lidas
router.get('/unread-count', notificationController.getUnreadCount);

// Marcar notificação como lida
router.put('/:id/read', notificationController.markAsRead);

// Marcar todas as notificações como lidas
router.put('/read-all', notificationController.markAllAsRead);

// Deletar notificação
router.delete('/:id', notificationController.deleteNotification);

// Deletar todas as notificações lidas
router.delete('/read', notificationController.deleteReadNotifications);

// Rotas administrativas (apenas admin)
router.post('/', [
    authorize('admin'),
    validateRequiredFields(['usuario_id', 'titulo', 'mensagem']),
    validatePositiveInteger('usuario_id'),
    validateEnum('tipo', ['venda', 'pagamento', 'sistema', 'chat', 'promocao']),
    sanitizeStrings(['titulo', 'mensagem'])
], notificationController.createNotification);

router.post('/bulk', [
    authorize('admin'),
    validateRequiredFields(['titulo', 'mensagem']),
    validateEnum('tipo', ['venda', 'pagamento', 'sistema', 'chat', 'promocao']),
    sanitizeStrings(['titulo', 'mensagem'])
], notificationController.createBulkNotification);

router.get('/stats', [
    authorize('admin')
], notificationController.getNotificationStats);

module.exports = router;
