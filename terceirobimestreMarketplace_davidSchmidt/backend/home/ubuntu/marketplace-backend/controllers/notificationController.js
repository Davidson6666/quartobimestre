const catchAsync = require('../utils/catchAsync');
const { AppError, sendSuccess } = require('../middleware/errorHandler');
const db = require('../config/database');

/**
 * Lista notificações do usuário
 */
const getNotifications = catchAsync(async (req, res, next) => {
    const { page, limit, offset } = req.pagination;
    const { tipo, lida } = req.query;
    const usuario_id = req.user.id;

    let whereConditions = ['usuario_id = $1'];
    let queryParams = [usuario_id];
    let paramCount = 1;

    // Filtro por tipo
    if (tipo) {
        paramCount++;
        whereConditions.push(`tipo = $${paramCount}`);
        queryParams.push(tipo);
    }

    // Filtro por status de leitura
    if (lida !== undefined) {
        paramCount++;
        whereConditions.push(`lida = $${paramCount}`);
        queryParams.push(lida === 'true');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Contar total
    const countResult = await db.query(`
        SELECT COUNT(*) as total
        FROM notificacoes
        ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    // Buscar notificações
    queryParams.push(limit, offset);
    const result = await db.query(`
        SELECT id, titulo, mensagem, tipo, lida, data_criacao
        FROM notificacoes
        ${whereClause}
        ORDER BY data_criacao DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    const pagination = {
        page,
        limit,
        total
    };

    res.status(200).json({
        success: true,
        message: 'Notificações recuperadas com sucesso',
        notifications: result.rows,
        pagination
    });
});

/**
 * Marca notificação como lida
 */
const markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const usuario_id = req.user.id;

    const result = await db.query(`
        UPDATE notificacoes 
        SET lida = true
        WHERE id = $1 AND usuario_id = $2
        RETURNING *
    `, [id, usuario_id]);

    if (result.rows.length === 0) {
        return next(new AppError('Notificação não encontrada', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Notificação marcada como lida',
        data: result.rows[0]
    });
});

/**
 * Marca todas as notificações como lidas
 */
const markAllAsRead = catchAsync(async (req, res, next) => {
    const usuario_id = req.user.id;

    const result = await db.query(`
        UPDATE notificacoes 
        SET lida = true
        WHERE usuario_id = $1 AND lida = false
        RETURNING id
    `, [usuario_id]);

    res.status(200).json({
        success: true,
        message: 'Todas as notificações foram marcadas como lidas',
        data: {
            marcadas: result.rows.length
        }
    });
});

/**
 * Obtém contagem de notificações não lidas
 */
const getUnreadCount = catchAsync(async (req, res, next) => {
    const usuario_id = req.user.id;

    const result = await db.query(
        'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = $1 AND lida = false',
        [usuario_id]
    );

    res.status(200).json({
        success: true,
        message: 'Contagem de notificações não lidas recuperada',
        data: {
            total_nao_lidas: parseInt(result.rows[0].total)
        }
    });
});

/**
 * Deleta notificação
 */
const deleteNotification = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const usuario_id = req.user.id;

    const result = await db.query(
        'DELETE FROM notificacoes WHERE id = $1 AND usuario_id = $2 RETURNING id',
        [id, usuario_id]
    );

    if (result.rows.length === 0) {
        return next(new AppError('Notificação não encontrada', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Notificação deletada com sucesso'
    });
});

/**
 * Deleta todas as notificações lidas
 */
const deleteReadNotifications = catchAsync(async (req, res, next) => {
    const usuario_id = req.user.id;

    const result = await db.query(
        'DELETE FROM notificacoes WHERE usuario_id = $1 AND lida = true RETURNING id',
        [usuario_id]
    );

    res.status(200).json({
        success: true,
        message: 'Notificações lidas deletadas com sucesso',
        data: {
            deletadas: result.rows.length
        }
    });
});

/**
 * Cria notificação (uso interno do sistema)
 */
const createNotification = catchAsync(async (req, res, next) => {
    const { usuario_id, titulo, mensagem, tipo = 'sistema' } = req.body;

    // Verificar se o usuário existe
    const userResult = await db.query('SELECT id FROM usuarios WHERE id = $1', [usuario_id]);
    
    if (userResult.rows.length === 0) {
        return next(new AppError('Usuário não encontrado', 404));
    }

    const result = await db.query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [usuario_id, titulo, mensagem, tipo]);

    res.status(201).json({
        success: true,
        message: 'Notificação criada com sucesso',
        data: result.rows[0]
    });
});

/**
 * Cria notificação em massa (apenas admin)
 */
const createBulkNotification = catchAsync(async (req, res, next) => {
    const { titulo, mensagem, tipo = 'promocao', filtros = {} } = req.body;

    let whereConditions = ['ativo = true'];
    let queryParams = [];
    let paramCount = 0;

    // Aplicar filtros
    if (filtros.tipo_usuario) {
        paramCount++;
        whereConditions.push(`tipo = $${paramCount}`);
        queryParams.push(filtros.tipo_usuario);
    }

    if (filtros.data_cadastro_apos) {
        paramCount++;
        whereConditions.push(`data_cadastro >= $${paramCount}`);
        queryParams.push(filtros.data_cadastro_apos);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Buscar usuários que atendem aos critérios
    const usersResult = await db.query(`
        SELECT id FROM usuarios ${whereClause}
    `, queryParams);

    if (usersResult.rows.length === 0) {
        return next(new AppError('Nenhum usuário encontrado com os critérios especificados', 404));
    }

    // Criar notificações em lote
    const notifications = usersResult.rows.map(user => 
        `(${user.id}, '${titulo}', '${mensagem}', '${tipo}')`
    ).join(',');

    const result = await db.query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo)
        VALUES ${notifications}
        RETURNING id
    `);

    res.status(201).json({
        success: true,
        message: 'Notificações em massa criadas com sucesso',
        data: {
            criadas: result.rows.length,
            usuarios_notificados: usersResult.rows.length
        }
    });
});

/**
 * Obtém estatísticas de notificações (apenas admin)
 */
const getNotificationStats = catchAsync(async (req, res, next) => {
    const { data_inicio, data_fim } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (data_inicio) {
        paramCount++;
        whereConditions.push(`data_criacao >= $${paramCount}`);
        queryParams.push(data_inicio);
    }

    if (data_fim) {
        paramCount++;
        whereConditions.push(`data_criacao <= $${paramCount}`);
        queryParams.push(data_fim);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await db.query(`
        SELECT 
            COUNT(*) as total_notificacoes,
            COUNT(CASE WHEN lida = true THEN 1 END) as lidas,
            COUNT(CASE WHEN lida = false THEN 1 END) as nao_lidas,
            COUNT(CASE WHEN tipo = 'venda' THEN 1 END) as tipo_venda,
            COUNT(CASE WHEN tipo = 'pagamento' THEN 1 END) as tipo_pagamento,
            COUNT(CASE WHEN tipo = 'sistema' THEN 1 END) as tipo_sistema,
            COUNT(CASE WHEN tipo = 'chat' THEN 1 END) as tipo_chat,
            COUNT(CASE WHEN tipo = 'promocao' THEN 1 END) as tipo_promocao,
            AVG(CASE WHEN lida = true THEN 1.0 ELSE 0.0 END)::NUMERIC(5,2) as taxa_leitura
        FROM notificacoes
        ${whereClause}
    `, queryParams);

    const stats = result.rows[0];

    // Estatísticas por dia (últimos 7 dias)
    const dailyStatsResult = await db.query(`
        SELECT 
            DATE(data_criacao) as data,
            COUNT(*) as total,
            COUNT(CASE WHEN lida = true THEN 1 END) as lidas
        FROM notificacoes
        WHERE data_criacao >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(data_criacao)
        ORDER BY data DESC
    `);

    stats.estatisticas_diarias = dailyStatsResult.rows;

    res.status(200).json({
        success: true,
        message: 'Estatísticas de notificações recuperadas com sucesso',
        data: stats
    });
});

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteNotification,
    deleteReadNotifications,
    createNotification,
    createBulkNotification,
    getNotificationStats
};
