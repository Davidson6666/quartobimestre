const catchAsync = require('../utils/catchAsync');
const { AppError, sendSuccess } = require('../middleware/errorHandler');
const db = require('../config/database');

/**
 * Cria uma nova avaliação
 */
const createReview = catchAsync(async (req, res, next) => {
    const {
        venda_id,
        produto_id,
        avaliado_id,
        tipo_avaliado,
        nota,
        comentario
    } = req.body;
    const avaliador_id = req.user.id;

    // Verificar se a venda existe e se o usuário é o comprador
    if (venda_id) {
        const vendaResult = await db.query(
            'SELECT * FROM vendas WHERE id = $1 AND comprador_id = $2 AND status = $3',
            [venda_id, avaliador_id, 'pago']
        );

        if (vendaResult.rows.length === 0) {
            return next(new AppError('Venda não encontrada ou você não pode avaliar esta venda', 404));
        }
    }

    // Verificar se já existe avaliação para esta combinação
    let existingReviewQuery = `
        SELECT id FROM avaliacoes 
        WHERE avaliador_id = $1 AND avaliado_id = $2 AND tipo_avaliado = $3
    `;
    let existingReviewParams = [avaliador_id, avaliado_id, tipo_avaliado];

    if (venda_id) {
        existingReviewQuery += ' AND venda_id = $4';
        existingReviewParams.push(venda_id);
    }

    if (produto_id) {
        existingReviewQuery += venda_id ? ' AND produto_id = $5' : ' AND produto_id = $4';
        existingReviewParams.push(produto_id);
    }

    const existingReview = await db.query(existingReviewQuery, existingReviewParams);

    if (existingReview.rows.length > 0) {
        return next(new AppError('Você já avaliou este item', 400));
    }

    // Verificar se não está tentando avaliar a si mesmo
    if (avaliador_id === parseInt(avaliado_id)) {
        return next(new AppError('Você não pode avaliar a si mesmo', 400));
    }

    // Criar avaliação
    const result = await db.query(`
        INSERT INTO avaliacoes (
            venda_id, produto_id, avaliador_id, avaliado_id, 
            tipo_avaliado, nota, comentario
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `, [venda_id, produto_id, avaliador_id, avaliado_id, tipo_avaliado, nota, comentario]);

    // Criar notificação para o avaliado
    const tipoTexto = tipo_avaliado === 'produto' ? 'produto' : 'perfil';
    await db.query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo)
        VALUES ($1, $2, $3, 'sistema')
    `, [
        avaliado_id,
        'Nova avaliação',
        `Você recebeu uma nova avaliação de ${nota} estrela(s) no seu ${tipoTexto}`
    ]);

    res.status(200).json({
        success: true,
        message: 'Avaliação criada com sucesso',
        data: result.rows[0]
    });
});

/**
 * Lista avaliações com filtros
 */
const getReviews = catchAsync(async (req, res, next) => {
    const { page, limit, offset } = req.pagination;
    const {
        produto_id,
        avaliado_id,
        tipo_avaliado,
        nota_min,
        nota_max,
        denunciada = false
    } = req.query;

    let whereConditions = ['a.denunciada = $1'];
    let queryParams = [denunciada === 'true'];
    let paramCount = 1;

    // Filtros
    if (produto_id) {
        paramCount++;
        whereConditions.push(`a.produto_id = $${paramCount}`);
        queryParams.push(produto_id);
    }

    if (avaliado_id) {
        paramCount++;
        whereConditions.push(`a.avaliado_id = $${paramCount}`);
        queryParams.push(avaliado_id);
    }

    if (tipo_avaliado) {
        paramCount++;
        whereConditions.push(`a.tipo_avaliado = $${paramCount}`);
        queryParams.push(tipo_avaliado);
    }

    if (nota_min) {
        paramCount++;
        whereConditions.push(`a.nota >= $${paramCount}`);
        queryParams.push(parseInt(nota_min));
    }

    if (nota_max) {
        paramCount++;
        whereConditions.push(`a.nota <= $${paramCount}`);
        queryParams.push(parseInt(nota_max));
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Contar total
    const countResult = await db.query(`
        SELECT COUNT(*) as total
        FROM avaliacoes a
        ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    // Buscar avaliações
    queryParams.push(limit, offset);
    const result = await db.query(`
        SELECT 
            a.id, a.nota, a.comentario, a.data_avaliacao, a.util_count,
            a.data_resposta, a.resposta_avaliado, a.tipo_avaliado,
            ua.nome as avaliador_nome,
            uv.nome as avaliado_nome,
            p.nome as produto_nome,
            v.id as venda_id
        FROM avaliacoes a
        LEFT JOIN usuarios ua ON a.avaliador_id = ua.id
        LEFT JOIN usuarios uv ON a.avaliado_id = uv.id
        LEFT JOIN produtos p ON a.produto_id = p.id
        LEFT JOIN vendas v ON a.venda_id = v.id
        ${whereClause}
        ORDER BY a.data_avaliacao DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    const pagination = {
        page,
        limit,
        total
    };

    sendSuccess(res, {
        reviews: result.rows,
        pagination
    }, 'Avaliações recuperadas com sucesso');
});

/**
 * Obtém estatísticas de avaliações
 */
const getReviewStats = catchAsync(async (req, res, next) => {
    const { produto_id, avaliado_id, tipo_avaliado } = req.query;

    let whereConditions = ['denunciada = false'];
    let queryParams = [];
    let paramCount = 0;

    if (produto_id) {
        paramCount++;
        whereConditions.push(`produto_id = $${paramCount}`);
        queryParams.push(produto_id);
    }

    if (avaliado_id) {
        paramCount++;
        whereConditions.push(`avaliado_id = $${paramCount}`);
        queryParams.push(avaliado_id);
    }

    if (tipo_avaliado) {
        paramCount++;
        whereConditions.push(`tipo_avaliado = $${paramCount}`);
        queryParams.push(tipo_avaliado);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Estatísticas gerais
    const statsResult = await db.query(`
        SELECT 
            COUNT(*) as total_avaliacoes,
            AVG(nota)::NUMERIC(3,2) as nota_media,
            COUNT(CASE WHEN nota = 5 THEN 1 END) as nota_5,
            COUNT(CASE WHEN nota = 4 THEN 1 END) as nota_4,
            COUNT(CASE WHEN nota = 3 THEN 1 END) as nota_3,
            COUNT(CASE WHEN nota = 2 THEN 1 END) as nota_2,
            COUNT(CASE WHEN nota = 1 THEN 1 END) as nota_1
        FROM avaliacoes
        ${whereClause}
    `, queryParams);

    const stats = statsResult.rows[0];

    // Calcular percentuais
    const total = parseInt(stats.total_avaliacoes);
    if (total > 0) {
        stats.percentual_5 = ((parseInt(stats.nota_5) / total) * 100).toFixed(1);
        stats.percentual_4 = ((parseInt(stats.nota_4) / total) * 100).toFixed(1);
        stats.percentual_3 = ((parseInt(stats.nota_3) / total) * 100).toFixed(1);
        stats.percentual_2 = ((parseInt(stats.nota_2) / total) * 100).toFixed(1);
        stats.percentual_1 = ((parseInt(stats.nota_1) / total) * 100).toFixed(1);
    }

    sendSuccess(res, stats, 'Estatísticas de avaliações recuperadas com sucesso');
});

/**
 * Responde a uma avaliação (apenas o avaliado)
 */
const respondToReview = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { resposta } = req.body;
    const usuario_id = req.user.id;

    // Verificar se a avaliação existe e se o usuário pode responder
    const reviewResult = await db.query(
        'SELECT * FROM avaliacoes WHERE id = $1 AND avaliado_id = $2',
        [id, usuario_id]
    );

    if (reviewResult.rows.length === 0) {
        return next(new AppError('Avaliação não encontrada ou você não pode responder', 404));
    }

    const review = reviewResult.rows[0];

    if (review.resposta_avaliado) {
        return next(new AppError('Você já respondeu a esta avaliação', 400));
    }

    // Atualizar com resposta
    const result = await db.query(`
        UPDATE avaliacoes 
        SET resposta_avaliado = $1, data_resposta = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `, [resposta, id]);

    // Criar notificação para o avaliador
    await db.query(`
        INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo)
        VALUES ($1, $2, $3, 'sistema')
    `, [
        review.avaliador_id,
        'Resposta à avaliação',
        'Sua avaliação recebeu uma resposta'
    ]);

    sendSuccess(res, result.rows[0], 'Resposta adicionada com sucesso');
});

/**
 * Marca avaliação como útil
 */
const markReviewUseful = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // Verificar se a avaliação existe
    const reviewResult = await db.query('SELECT * FROM avaliacoes WHERE id = $1', [id]);

    if (reviewResult.rows.length === 0) {
        return next(new AppError('Avaliação não encontrada', 404));
    }

    // Incrementar contador
    const result = await db.query(`
        UPDATE avaliacoes 
        SET util_count = util_count + 1
        WHERE id = $1
        RETURNING util_count
    `, [id]);

    sendSuccess(res, {
        util_count: result.rows[0].util_count
    }, 'Avaliação marcada como útil');
});

/**
 * Denuncia uma avaliação
 */
const reportReview = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar se a avaliação existe
    const reviewResult = await db.query('SELECT * FROM avaliacoes WHERE id = $1', [id]);

    if (reviewResult.rows.length === 0) {
        return next(new AppError('Avaliação não encontrada', 404));
    }

    // Marcar como denunciada
    await db.query('UPDATE avaliacoes SET denunciada = true WHERE id = $1', [id]);

    // Criar notificação para administradores
    const adminsResult = await db.query('SELECT id FROM usuarios WHERE tipo = $1', ['admin']);
    
    for (const admin of adminsResult.rows) {
        await db.query(`
            INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo)
            VALUES ($1, $2, $3, 'sistema')
        `, [
            admin.id,
            'Avaliação denunciada',
            `Uma avaliação foi denunciada. Motivo: ${motivo || 'Não informado'}`
        ]);
    }

    sendSuccess(res, null, 'Avaliação denunciada com sucesso');
});

/**
 * Remove denúncia de avaliação (apenas admin)
 */
const removeReviewReport = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const result = await db.query(`
        UPDATE avaliacoes 
        SET denunciada = false
        WHERE id = $1
        RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
        return next(new AppError('Avaliação não encontrada', 404));
    }

    sendSuccess(res, result.rows[0], 'Denúncia removida com sucesso');
});

/**
 * Deleta avaliação (apenas admin)
 */
const deleteReview = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const result = await db.query('DELETE FROM avaliacoes WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
        return next(new AppError('Avaliação não encontrada', 404));
    }

    sendSuccess(res, null, 'Avaliação deletada com sucesso');
});

module.exports = {
    createReview,
    getReviews,
    getReviewStats,
    respondToReview,
    markReviewUseful,
    reportReview,
    removeReviewReport,
    deleteReview
};
