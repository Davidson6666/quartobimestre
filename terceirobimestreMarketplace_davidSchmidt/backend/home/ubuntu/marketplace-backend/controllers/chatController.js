const catchAsync = require('../utils/catchAsync');
const { AppError, sendSuccess } = require('../middleware/errorHandler');
const db = require('../config/database');

/**
 * Gera ID único para conversa entre dois usuários
 * @param {number} userId1 - ID do primeiro usuário
 * @param {number} userId2 - ID do segundo usuário
 * @returns {string} - ID da conversa
 */
const generateConversationId = (userId1, userId2) => {
    const sortedIds = [userId1, userId2].sort((a, b) => a - b);
    return `conv_${sortedIds[0]}_${sortedIds[1]}`;
};

/**
 * Envia uma mensagem
 */
const sendMessage = catchAsync(async (req, res, next) => {
    const { destinatario_id, mensagem, anexo_url } = req.body;
    const remetente_id = req.user.id;

    if (remetente_id === parseInt(destinatario_id)) {
        return next(new AppError('Você não pode enviar mensagem para si mesmo', 400));
    }

    // Verificar se o destinatário existe
    const destinatarioResult = await db.query(
        'SELECT id, nome FROM usuarios WHERE id = $1 AND ativo = true',
        [destinatario_id]
    );

    if (destinatarioResult.rows.length === 0) {
        return next(new AppError('Destinatário não encontrado', 404));
    }

    const conversa_id = generateConversationId(remetente_id, destinatario_id);

    // Inserir mensagem
    const result = await db.query(`
        INSERT INTO mensagens (conversa_id, remetente_id, destinatario_id, mensagem, anexo_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `, [conversa_id, remetente_id, destinatario_id, mensagem, anexo_url]);

    // Criar notificação para o destinatário
    await db.query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo)
        VALUES ($1, $2, $3, 'chat')
    `, [
        destinatario_id,
        'Nova mensagem',
        `Você recebeu uma nova mensagem de ${req.user.nome}`
    ]);

    res.status(200).json({
        success: true,
        message: 'Mensagem',
        ...result.rows[0]
    });
});

/**
 * Lista conversas do usuário
 */
const getConversations = catchAsync(async (req, res, next) => {
    const usuario_id = req.user.id;

    const result = await db.query(`
        SELECT DISTINCT
            m.conversa_id,
            CASE 
                WHEN m.remetente_id = $1 THEN m.destinatario_id 
                ELSE m.remetente_id 
            END as outro_usuario_id,
            CASE 
                WHEN m.remetente_id = $1 THEN ud.nome 
                ELSE ur.nome 
            END as outro_usuario_nome,
            (
                SELECT m2.mensagem 
                FROM mensagens m2 
                WHERE m2.conversa_id = m.conversa_id 
                ORDER BY m2.data_envio DESC 
                LIMIT 1
            ) as ultima_mensagem,
            (
                SELECT m2.data_envio 
                FROM mensagens m2 
                WHERE m2.conversa_id = m.conversa_id 
                ORDER BY m2.data_envio DESC 
                LIMIT 1
            ) as data_ultima_mensagem,
            (
                SELECT COUNT(*) 
                FROM mensagens m2 
                WHERE m2.conversa_id = m.conversa_id 
                AND m2.destinatario_id = $1 
                AND m2.lida = false
            ) as mensagens_nao_lidas
        FROM mensagens m
        LEFT JOIN usuarios ur ON m.remetente_id = ur.id
        LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
        WHERE m.remetente_id = $1 OR m.destinatario_id = $1
        ORDER BY data_ultima_mensagem DESC
    `, [usuario_id]);

    sendSuccess(res, result.rows, 'Conversas recuperadas com sucesso');
});

/**
 * Lista mensagens de uma conversa
 */
const getMessages = catchAsync(async (req, res, next) => {
    const { conversa_id } = req.params;
    const { page, limit, offset } = req.pagination;
    const usuario_id = req.user.id;

    // Verificar se o usuário faz parte da conversa
    const conversationCheck = await db.query(
        'SELECT 1 FROM mensagens WHERE conversa_id = $1 AND (remetente_id = $2 OR destinatario_id = $2) LIMIT 1',
        [conversa_id, usuario_id]
    );

    if (conversationCheck.rows.length === 0) {
        return next(new AppError('Conversa não encontrada ou você não tem acesso', 404));
    }

    // Contar total de mensagens
    const countResult = await db.query(
        'SELECT COUNT(*) as total FROM mensagens WHERE conversa_id = $1',
        [conversa_id]
    );

    const total = parseInt(countResult.rows[0].total);

    // Buscar mensagens
    const result = await db.query(`
        SELECT 
            m.id, m.mensagem, m.anexo_url, m.data_envio, m.lida,
            m.remetente_id, m.destinatario_id,
            ur.nome as remetente_nome,
            ud.nome as destinatario_nome
        FROM mensagens m
        LEFT JOIN usuarios ur ON m.remetente_id = ur.id
        LEFT JOIN usuarios ud ON m.destinatario_id = ud.id
        WHERE m.conversa_id = $1
        ORDER BY m.data_envio DESC
        LIMIT $2 OFFSET $3
    `, [conversa_id, limit, offset]);

    // Marcar mensagens como lidas
    await db.query(`
        UPDATE mensagens 
        SET lida = true 
        WHERE conversa_id = $1 AND destinatario_id = $2 AND lida = false
    `, [conversa_id, usuario_id]);

    const pagination = {
        page,
        limit,
        total
    };

    sendSuccess(res, {
        messages: result.rows.reverse(), // Reverter para ordem cronológica
        pagination
    }, 'Mensagens recuperadas com sucesso');
});

/**
 * Marca mensagens como lidas
 */
const markAsRead = catchAsync(async (req, res, next) => {
    const { conversa_id } = req.params;
    const usuario_id = req.user.id;

    const result = await db.query(`
        UPDATE mensagens 
        SET lida = true 
        WHERE conversa_id = $1 AND destinatario_id = $2 AND lida = false
        RETURNING id
    `, [conversa_id, usuario_id]);

    sendSuccess(res, {
        mensagens_marcadas: result.rows.length
    }, 'Mensagens marcadas como lidas');
});

/**
 * Obtém contagem de mensagens não lidas
 */
const getUnreadCount = catchAsync(async (req, res, next) => {
    const usuario_id = req.user.id;

    const result = await db.query(
        'SELECT COUNT(*) as total FROM mensagens WHERE destinatario_id = $1 AND lida = false',
        [usuario_id]
    );

    sendSuccess(res, {
        total_nao_lidas: parseInt(result.rows[0].total)
    }, 'Contagem de mensagens não lidas recuperada');
});

module.exports = {
    sendMessage,
    getConversations,
    getMessages,
    markAsRead,
    getUnreadCount
};
