const catchAsync = require("../utils/catchAsync");
const { AppError, sendSuccess } = require("../middleware/errorHandler");
const db = require("../config/database");

/**
 * Adiciona item ao carrinho
 */
const addToCart = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const { produto_id, quantidade = 1 } = req.body;
  const usuario_id = req.user.id;

  // Verificar se o produto existe e está ativo
  const productResult = await db.query(
    `
        SELECT p.*, v.usuario_id as vendedor_usuario_id
        FROM produtos p
        JOIN vendedores v ON p.vendedor_id = v.id
        WHERE p.id = $1 AND p.ativo = true
    `,
    [produto_id]
  );

  if (productResult.rows.length === 0) {
    return next(new AppError("Produto não encontrado ou inativo", 404));
  }

  const product = productResult.rows[0];

  // Verificar se não é o próprio vendedor tentando comprar
  if (product.vendedor_usuario_id === usuario_id) {
    return next(
      new AppError("Você não pode comprar seus próprios produtos", 400)
    );
  }

  // Verificar estoque
  if (product.estoque < quantidade) {
    return next(new AppError("Estoque insuficiente", 400));
  }

  // Verificar se já existe no carrinho
  const existingItem = await db.query(
    "SELECT * FROM carrinho_compras WHERE usuario_id = $1 AND produto_id = $2",
    [usuario_id, produto_id]
  );

  let result;
  if (existingItem.rows.length > 0) {
    // Atualizar quantidade
    const novaQuantidade = existingItem.rows[0].quantidade + quantidade;

    if (novaQuantidade > product.estoque) {
      return next(
        new AppError("Quantidade total excede o estoque disponível", 400)
      );
    }

    result = await db.query(
      `
            UPDATE carrinho_compras 
            SET quantidade = $1, data_adicionado = CURRENT_TIMESTAMP
            WHERE usuario_id = $2 AND produto_id = $3
            RETURNING *
        `,
      [novaQuantidade, usuario_id, produto_id]
    );
  } else {
    // Inserir novo item
    result = await db.query(
      `
            INSERT INTO carrinho_compras (usuario_id, produto_id, quantidade)
            VALUES ($1, $2, $3)
            RETURNING *
        `,
      [usuario_id, produto_id, quantidade]
    );
  }

  res.status(200).json({
    success: true,
    message: "Item adicionado ao carrinho com sucesso",
    data: result.rows[0],
  });
});

/**
 * Lista itens do carrinho
 */
const getCart = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const usuario_id = req.user.id;

  const result = await db.query(
    `
        SELECT 
            c.id, c.quantidade, c.data_adicionado,
            p.id as produto_id, p.nome, p.descricao, p.preco, p.estoque, p.imagem_url,
            cat.nome as categoria_nome,
            j.nome as jogo_nome,
            pj.servidor, pj.tipo_item,
            u.nome as vendedor_nome,
            (c.quantidade * p.preco) as subtotal
        FROM carrinho_compras c
        JOIN produtos p ON c.produto_id = p.id
        LEFT JOIN categorias_produtos cat ON p.categoria_id = cat.id
        LEFT JOIN produtos_jogos pj ON p.id = pj.produto_id
        LEFT JOIN jogos_plataformas j ON pj.jogo_id = j.id
        JOIN vendedores v ON p.vendedor_id = v.id
        JOIN usuarios u ON v.usuario_id = u.id
        WHERE c.usuario_id = $1 AND p.ativo = true
        ORDER BY c.data_adicionado DESC
    `,
    [usuario_id]
  );

  const items = result.rows;
  const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);

  sendSuccess(
    res,
    {
      items,
      total: parseFloat(total.toFixed(2)),
      count: items.length,
    },
    "Carrinho recuperado com sucesso"
  );
});

/**
 * Atualiza quantidade de item no carrinho
 */
const updateCartItem = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const { id } = req.params;
  const { quantidade } = req.body;
  const usuario_id = req.user.id;

  // Verificar se o item existe e pertence ao usuário
  const itemResult = await db.query(
    `
        SELECT c.*, p.estoque
        FROM carrinho_compras c
        JOIN produtos p ON c.produto_id = p.id
        WHERE c.id = $1 AND c.usuario_id = $2
    `,
    [id, usuario_id]
  );

  if (itemResult.rows.length === 0) {
    return next(new AppError("Item do carrinho não encontrado", 404));
  }

  const item = itemResult.rows[0];

  // Verificar estoque
  if (quantidade > item.estoque) {
    return next(new AppError("Quantidade excede o estoque disponível", 400));
  }

  const result = await db.query(
    `
        UPDATE carrinho_compras 
        SET quantidade = $1
        WHERE id = $2 AND usuario_id = $3
        RETURNING *
    `,
    [quantidade, id, usuario_id]
  );

  sendSuccess(res, result.rows[0], "Item do carrinho atualizado com sucesso");
});

/**
 * Remove item do carrinho
 */
const removeFromCart = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const { id } = req.params;
  const usuario_id = req.user.id;

  const result = await db.query(
    "DELETE FROM carrinho_compras WHERE id = $1 AND usuario_id = $2 RETURNING id",
    [id, usuario_id]
  );

  if (result.rows.length === 0) {
    return next(new AppError("Item do carrinho não encontrado", 404));
  }

  sendSuccess(res, null, "Item removido do carrinho com sucesso");
});

/**
 * Limpa carrinho
 */
const clearCart = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const usuario_id = req.user.id;

  await db.query("DELETE FROM carrinho_compras WHERE usuario_id = $1", [
    usuario_id,
  ]);

  sendSuccess(res, null, "Carrinho limpo com sucesso");
});

/**
 * Cria uma nova venda (checkout)
 */
const createSale = catchAsync(async (req, res, next) => {
  console.log("🛒 createSale - Request recebida:", req.body);
  console.log("🛒 createSale - Usuário:", req.user);

  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const { metodo_pagamento, itens } = req.body;
  const comprador_id = req.user.id;

  console.log("🛒 Métod pagamento:", metodo_pagamento, "Itens:", itens);

  if (!itens || itens.length === 0) {
    return next(new AppError("Nenhum item fornecido para a venda", 400));
  }

  // Usar transação para garantir consistência
  const result = await db.transaction(async (client) => {
    let valorTotal = 0;
    const vendas = new Map(); // Agrupar por vendedor

    // Validar itens e agrupar por vendedor
    for (const item of itens) {
      const { produto_id, quantidade } = item;

      // Verificar produto
      const productResult = await client.query(
        `
                SELECT p.*, v.id as vendedor_id, v.usuario_id as vendedor_usuario_id
                FROM produtos p
                JOIN vendedores v ON p.vendedor_id = v.id
                WHERE p.id = $1 AND p.ativo = true
            `,
        [produto_id]
      );

      if (productResult.rows.length === 0) {
        throw new AppError(
          `Produto ${produto_id} não encontrado ou inativo`,
          400
        );
      }

      const product = productResult.rows[0];

      // Verificar se não é o próprio vendedor
      if (product.vendedor_usuario_id === comprador_id) {
        throw new AppError("Você não pode comprar seus próprios produtos", 400);
      }

      // Verificar estoque
      if (product.estoque < quantidade) {
        throw new AppError(
          `Estoque insuficiente para o produto ${product.nome}`,
          400
        );
      }

      const subtotal = parseFloat(product.preco) * quantidade;
      valorTotal += subtotal;

      // Agrupar por vendedor
      const vendedorId = product.vendedor_id;
      if (!vendas.has(vendedorId)) {
        vendas.set(vendedorId, {
          vendedor_id: vendedorId,
          itens: [],
          valor_total: 0,
        });
      }

      vendas.get(vendedorId).itens.push({
        produto_id,
        quantidade,
        preco_unitario: product.preco,
        subtotal,
        product,
      });
      vendas.get(vendedorId).valor_total += subtotal;
    }

    const vendasCriadas = [];

    // Criar uma venda para cada vendedor
    for (const [vendedorId, vendaData] of vendas) {
      // Criar venda
      const vendaResult = await client.query(
        `
                INSERT INTO vendas (vendedor_id, comprador_id, valor_total, status)
                VALUES ($1, $2, $3, 'pendente')
                RETURNING *
            `,
        [vendedorId, comprador_id, vendaData.valor_total]
      );

      const venda = vendaResult.rows[0];

      // Criar itens da venda
      for (const item of vendaData.itens) {
        await client.query(
          `
                    INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal)
                    VALUES ($1, $2, $3, $4, $5)
                `,
          [
            venda.id,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
            item.subtotal,
          ]
        );

        // Reduzir estoque
        await client.query(
          `
                    UPDATE produtos 
                    SET estoque = estoque - $1
                    WHERE id = $2
                `,
          [item.quantidade, item.produto_id]
        );
      }

      // Criar pagamento
      await client.query(
        `
                INSERT INTO pagamentos (venda_id, metodo_pagamento, valor, status)
                VALUES ($1, $2, $3, 'pendente')
            `,
        [venda.id, metodo_pagamento, vendaData.valor_total]
      );

      vendasCriadas.push(venda);
    }

    // Limpar carrinho
    await client.query("DELETE FROM carrinho_compras WHERE usuario_id = $1", [
      comprador_id,
    ]);

    return { vendas: vendasCriadas, valor_total: valorTotal };
  });

  sendSuccess(res, result, "Venda criada com sucesso", 201);
});

/**
 * Lista vendas do usuário
 */
const getUserSales = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const { page, limit, offset } = req.pagination;
  const { status, tipo = "compras" } = req.query; // 'compras' ou 'vendas'
  const usuario_id = req.user.id;

  let whereConditions = [];
  let queryParams = [usuario_id];
  let paramCount = 1;

  // Determinar se são compras ou vendas
  let userField;
  if (tipo === "vendas") {
    // Buscar vendas onde o usuário é vendedor
    userField = "v.usuario_id";
    whereConditions.push(`EXISTS (
            SELECT 1 FROM vendedores vend 
            WHERE vend.id = s.vendedor_id AND vend.usuario_id = $${paramCount}
        )`);
  } else {
    // Buscar compras onde o usuário é comprador
    userField = "s.comprador_id";
    whereConditions.push(`s.comprador_id = $${paramCount}`);
  }

  // Filtro por status
  if (status) {
    paramCount++;
    whereConditions.push(`s.status = $${paramCount}`);
    queryParams.push(status);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Contar total
  const countResult = await db.query(
    `
        SELECT COUNT(*) as total
        FROM vendas s
        LEFT JOIN vendedores v ON s.vendedor_id = v.id
        ${whereClause}
    `,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // Buscar vendas
  queryParams.push(limit, offset);
  const result = await db.query(
    `
        SELECT 
            s.id, s.valor_total, s.status, s.data_venda, s.data_atualizacao,
            uc.nome as comprador_nome, uc.email as comprador_email,
            uv.nome as vendedor_nome, uv.email as vendedor_email,
            p.status as pagamento_status, p.metodo_pagamento,
            (
                SELECT COUNT(*) 
                FROM itens_venda iv 
                WHERE iv.venda_id = s.id
            ) as total_itens
        FROM vendas s
        LEFT JOIN usuarios uc ON s.comprador_id = uc.id
        LEFT JOIN vendedores v ON s.vendedor_id = v.id
        LEFT JOIN usuarios uv ON v.usuario_id = uv.id
        LEFT JOIN pagamentos p ON s.id = p.venda_id
        ${whereClause}
        ORDER BY s.data_venda DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `,
    queryParams
  );

  const pagination = {
    page,
    limit,
    total,
  };

  sendSuccess(
    res,
    {
      sales: result.rows,
      pagination,
    },
    `${tipo === "vendas" ? "Vendas" : "Compras"} recuperadas com sucesso`
  );
});

/**
 * Obtém detalhes de uma venda
 */
const getSaleById = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const { id } = req.params;
  const usuario_id = req.user.id;

  // Buscar venda
  const saleResult = await db.query(
    `
        SELECT 
            s.id, s.valor_total, s.status, s.data_venda, s.data_atualizacao,
            s.comprador_id, s.vendedor_id,
            uc.nome as comprador_nome, uc.email as comprador_email,
            uv.nome as vendedor_nome, uv.email as vendedor_email,
            p.status as pagamento_status, p.metodo_pagamento, p.codigo_transacao,
            p.data_pagamento, p.data_confirmacao
        FROM vendas s
        LEFT JOIN usuarios uc ON s.comprador_id = uc.id
        LEFT JOIN vendedores v ON s.vendedor_id = v.id
        LEFT JOIN usuarios uv ON v.usuario_id = uv.id
        LEFT JOIN pagamentos p ON s.id = p.venda_id
        WHERE s.id = $1
    `,
    [id]
  );

  if (saleResult.rows.length === 0) {
    return next(new AppError("Venda não encontrada", 404));
  }

  const sale = saleResult.rows[0];

  // Verificar permissão (comprador, vendedor ou admin)
  const isComprador = sale.comprador_id === usuario_id;
  const isVendedor = await db.query(
    "SELECT 1 FROM vendedores WHERE id = $1 AND usuario_id = $2",
    [sale.vendedor_id, usuario_id]
  );
  const isAdmin = req.user && req.user.tipo === "admin";

  if (!isComprador && isVendedor.rows.length === 0 && !isAdmin) {
    return next(
      new AppError("Você não tem permissão para ver esta venda", 403)
    );
  }

  // Buscar itens da venda
  const itemsResult = await db.query(
    `
        SELECT 
            iv.id, iv.quantidade, iv.preco_unitario, iv.subtotal,
            p.id as produto_id, p.nome, p.descricao, p.imagem_url,
            c.nome as categoria_nome,
            j.nome as jogo_nome,
            pj.servidor, pj.tipo_item
        FROM itens_venda iv
        JOIN produtos p ON iv.produto_id = p.id
        LEFT JOIN categorias_produtos c ON p.categoria_id = c.id
        LEFT JOIN produtos_jogos pj ON p.id = pj.produto_id
        LEFT JOIN jogos_plataformas j ON pj.jogo_id = j.id
        WHERE iv.venda_id = $1
        ORDER BY iv.id
    `,
    [id]
  );

  sale.itens = itemsResult.rows;

  sendSuccess(res, sale, "Venda recuperada com sucesso");
});

/**
 * Atualiza status da venda (vendedor ou admin)
 */
const updateSaleStatus = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const { id } = req.params;
  const { status } = req.body;
  const usuario_id = req.user.id;

  // Verificar se a venda existe
  const saleResult = await db.query(
    `
        SELECT s.*, v.usuario_id as vendedor_usuario_id
        FROM vendas s
        JOIN vendedores v ON s.vendedor_id = v.id
        WHERE s.id = $1
    `,
    [id]
  );

  if (saleResult.rows.length === 0) {
    return next(new AppError("Venda não encontrada", 404));
  }

  const sale = saleResult.rows[0];

  // Verificar permissão (vendedor ou admin)
  if (
    (!req.user || req.user.tipo !== "admin") &&
    sale.vendedor_usuario_id !== usuario_id
  ) {
    return next(
      new AppError("Você só pode atualizar suas próprias vendas", 403)
    );
  }

  // Atualizar status
  const result = await db.query(
    `
        UPDATE vendas 
        SET status = $1, data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `,
    [status, id]
  );

  sendSuccess(res, result.rows[0], "Status da venda atualizado com sucesso");
});

/**
 * Obter extrato de pagamentos do cliente (APENAS COMPRADORES)
 */
const getPaymentStatement = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  
  // ✅ RESTRIÇÃO: Apenas compradores podem acessar
  if (req.user.tipo !== "comprador" && req.user.tipo !== "ambos") {
    return next(new AppError("Apenas compradores podem acessar o extrato de pagamentos.", 403));
  }
  
  const { page = 1, limit = 10, status } = req.query;
  const usuario_id = req.user.id;

  console.log(`🔍 DEBUG - Usuário: ${req.user.nome} (ID: ${usuario_id}), Tipo: ${req.user.tipo}`);

  const offset = (page - 1) * limit;

  // Construir query
  let whereClause = `WHERE v.comprador_id = $1`;
  const queryParams = [usuario_id];

  if (status) {
    whereClause += ` AND p.status = $2`;
    queryParams.push(status);
  }

  // Contar total
  const countQuery = `
    SELECT COUNT(*) as total
    FROM vendas v
    JOIN pagamentos p ON v.id = p.venda_id
    ${whereClause}
  `;

  const countResult = await db.query(
    countQuery,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total);

  // Buscar pagamentos com informações de vendas
  const dataQuery = `
    SELECT 
      v.id as venda_id,
      p.id as pagamento_id,
      p.status,
      p.metodo_pagamento,
      p.valor,
      p.data_confirmacao,
      v.valor_total,
      v.status as venda_status,
      v.data_venda,
      vend.nome as vendedor_nome,
      vend.email as vendedor_email,
      (
        SELECT COUNT(*) 
        FROM itens_venda iv 
        WHERE iv.venda_id = v.id
      ) as total_itens,
      (
        SELECT json_agg(json_build_object(
          'produto_nome', prod.nome,
          'quantidade', ive.quantidade,
          'preco', prod.preco,
          'subtotal', ive.quantidade * prod.preco
        ))
        FROM itens_venda ive
        JOIN produtos prod ON ive.produto_id = prod.id
        WHERE ive.venda_id = v.id
      ) as itens
    FROM vendas v
    JOIN pagamentos p ON v.id = p.venda_id
    JOIN vendedores vend_rel ON v.vendedor_id = vend_rel.id
    JOIN usuarios vend ON vend_rel.usuario_id = vend.id
    ${whereClause}
    ORDER BY v.data_venda DESC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  queryParams.push(limit, offset);

  const result = await db.query(dataQuery, queryParams);

  const pagination = {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
  };

  sendSuccess(
    res,
    {
      payments: result.rows,
      pagination,
    },
    "Extrato de pagamentos recuperado com sucesso"
  );
});

/**
 * Confirma pagamento (simulação - em produção seria integração com gateway)
 */
const confirmPayment = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Usuário não autenticado.", 401));
  const { id } = req.params; // ID da venda
  const { codigo_transacao } = req.body;

  // Buscar pagamento
  const paymentResult = await db.query(
    "SELECT * FROM pagamentos WHERE venda_id = $1",
    [id]
  );

  if (paymentResult.rows.length === 0) {
    return next(new AppError("Pagamento não encontrado", 404));
  }

  const payment = paymentResult.rows[0];

  if (payment.status === "aprovado") {
    return next(new AppError("Pagamento já foi confirmado", 400));
  }

  // Usar transação para atualizar pagamento e venda
  const result = await db.transaction(async (client) => {
    // Atualizar pagamento
    await client.query(
      `
            UPDATE pagamentos 
            SET status = 'aprovado', 
                codigo_transacao = $1,
                data_confirmacao = CURRENT_TIMESTAMP
            WHERE venda_id = $2
        `,
      [codigo_transacao, id]
    );

    // Atualizar venda
    const vendaResult = await client.query(
      `
            UPDATE vendas 
            SET status = 'pago', data_atualizacao = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `,
      [id]
    );

    return vendaResult.rows[0];
  });

  sendSuccess(res, result, "Pagamento confirmado com sucesso");
});

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  createSale,
  getUserSales,
  getSaleById,
  updateSaleStatus,
  getPaymentStatement,
  confirmPayment,
};
