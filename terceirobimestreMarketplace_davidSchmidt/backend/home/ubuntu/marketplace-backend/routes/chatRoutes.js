const express = require('express');
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const { 
    validateRequiredFields, 
    validatePositiveInteger,
    sanitizeStrings,
    validatePagination
} = require('../middleware/validation');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

// Enviar mensagem
router.post('/messages', [
    validateRequiredFields(['destinatario_id', 'mensagem']),
    validatePositiveInteger('destinatario_id'),
    sanitizeStrings(['mensagem'])
], chatController.sendMessage);

// Listar conversas do usuário
router.get('/conversations', chatController.getConversations);

// Listar mensagens de uma conversa
router.get('/conversations/:conversa_id/messages', [
    validatePagination()
], chatController.getMessages);

// Marcar mensagens como lidas
router.put('/conversations/:conversa_id/read', chatController.markAsRead);

// Obter contagem de mensagens não lidas
router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;
