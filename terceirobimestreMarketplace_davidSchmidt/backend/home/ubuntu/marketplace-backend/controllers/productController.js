const catchAsync = require("../utils/catchAsync");
const { AppError } = require("../middleware/errorHandler");
const db = require("../config/database");

/**
 * Lista todas as categorias
 */
const getCategories = catchAsync(async (req, res, next) => {
  const { ativo } = req.query;
  let whereClause = "";
  let queryParams = [];
  if (ativo !== undefined) {
    whereClause = "WHERE ativo = $1";
    queryParams.push(ativo === "true");
  }
  const result = await db.query(
    `
      SELECT id, nome, descricao, icone, ativo, ordem_exibicao
      FROM categorias_produtos
      ${whereClause}
      ORDER BY ordem_exibicao ASC, nome ASC
    `,
    queryParams
  );
  res.status(200).json({
    success: true,
    message: "Categorias recuperadas com sucesso",
    data: result.rows,
  });
});

/**
 * Cria nova categoria (apenas admin)
 */
const createCategory = catchAsync(async (req, res, next) => {
  const { nome, descricao, icone, ordem_exibicao = 0 } = req.body;
  const result = await db.query(
    `
      INSERT INTO categorias_produtos (nome, descricao, icone, ordem_exibicao)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [nome, descricao, icone, ordem_exibicao]
  );
  res.status(201).json({
    success: true,
    message: "Categoria criada com sucesso",
    data: result.rows[0],
  });
});

/**
 * Atualiza categoria (apenas admin)
 */
const updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { nome, descricao, icone, ativo, ordem_exibicao } = req.body;
  const result = await db.query(
    `
      UPDATE categorias_produtos 
      SET nome = COALESCE($1, nome),
          descricao = COALESCE($2, descricao),
          icone = COALESCE($3, icone),
          ativo = COALESCE($4, ativo),
          ordem_exibicao = COALESCE($5, ordem_exibicao)
      WHERE id = $6
      RETURNING *
    `,
    [nome, descricao, icone, ativo, ordem_exibicao, id]
  );
  if (result.rows.length === 0) {
    return next(new AppError("Categoria não encontrada", 404));
  }
  res.status(200).json({
    success: true,
    message: "Categoria atualizada com sucesso",
    data: result.rows[0],
  });
});

/**
 * Deleta categoria (apenas admin)
 */
const deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const productsCount = await db.query(
    "SELECT COUNT(*) as count FROM produtos WHERE categoria_id = $1",
    [id]
  );
  if (parseInt(productsCount.rows[0].count) > 0) {
    return next(
      new AppError("Não é possível deletar categoria que possui produtos", 400)
    );
  }
  const result = await db.query(
    "DELETE FROM categorias_produtos WHERE id = $1 RETURNING id",
    [id]
  );
  if (result.rows.length === 0) {
    return next(new AppError("Categoria não encontrada", 404));
  }
  res.status(200).json({
    success: true,
    message: "Categoria deletada com sucesso",
  });
});

/**
 * Lista todos os jogos/plataformas
 */
const getGames = catchAsync(async (req, res, next) => {
  const { ativo } = req.query;
  let whereClause = "";
  let queryParams = [];
  if (ativo !== undefined) {
    whereClause = "WHERE ativo = $1";
    queryParams.push(ativo === "true");
  }
  const result = await db.query(
    `
      SELECT id, nome, icone_url, ativo
      FROM jogos_plataformas
      ${whereClause}
      ORDER BY nome ASC
    `,
    queryParams
  );
  res.status(200).json({
    success: true,
    message: "Jogos recuperados com sucesso",
    data: result.rows,
  });
});

/**
 * Cria novo jogo/plataforma (apenas admin)
 */
const createGame = catchAsync(async (req, res, next) => {
  const { nome, icone_url } = req.body;
  const result = await db.query(
    `
      INSERT INTO jogos_plataformas (nome, icone_url)
      VALUES ($1, $2)
      RETURNING *
    `,
    [nome, icone_url]
  );
  res.status(201).json({
    success: true,
    message: "Jogo criado com sucesso",
    data: result.rows[0],
  });
});

/**
 * Atualiza jogo/plataforma (apenas admin)
 */
const updateGame = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { nome, icone_url, ativo } = req.body;
  const result = await db.query(
    `
      UPDATE jogos_plataformas 
      SET nome = COALESCE($1, nome),
          icone_url = COALESCE($2, icone_url),
          ativo = COALESCE($3, ativo)
      WHERE id = $4
      RETURNING *
    `,
    [nome, icone_url, ativo, id]
  );
  if (result.rows.length === 0) {
    return next(new AppError("Jogo não encontrado", 404));
  }
  res.status(200).json({
    success: true,
    message: "Jogo atualizado com sucesso",
    data: result.rows[0],
  });
});

/**
 * Lista produtos com filtros e paginação (tela inicial, dashboard comprador, etc)
 */
const getProducts = catchAsync(async (req, res, next) => {
  const { page, limit, offset } = req.pagination;
  const {
    categoria_id,
    jogo_id,
    vendedor_id,
    ativo,
    destaque,
    search,
    preco_min,
    preco_max,
    servidor,
    tipo_item,
  } = req.query;

  let whereConditions = [];
  let queryParams = [];
  let paramCount = 0;

  // Filtros
  if (categoria_id) {
    paramCount++;
    whereConditions.push(`p.categoria_id = $${paramCount}`);
    queryParams.push(categoria_id);
  }
  if (jogo_id) {
    paramCount++;
    whereConditions.push(`pj.jogo_id = $${paramCount}`);
    queryParams.push(jogo_id);
  }
  if (vendedor_id) {
    paramCount++;
    whereConditions.push(`p.vendedor_id = $${paramCount}`);
    queryParams.push(vendedor_id);
  }
  // Só mostra produtos ativos para compradores/tela inicial
  paramCount++;
  whereConditions.push(`p.ativo = $${paramCount}`);
  queryParams.push(true);

  if (destaque !== undefined) {
    paramCount++;
    whereConditions.push(`p.destaque = $${paramCount}`);
    queryParams.push(destaque === "true");
  }
  if (search) {
    paramCount++;
    whereConditions.push(
      `(p.nome ILIKE $${paramCount} OR p.descricao ILIKE $${paramCount})`
    );
    queryParams.push(`%${search}%`);
  }
  if (preco_min) {
    paramCount++;
    whereConditions.push(`p.preco >= $${paramCount}`);
    queryParams.push(parseFloat(preco_min));
  }
  if (preco_max) {
    paramCount++;
    whereConditions.push(`p.preco <= $${paramCount}`);
    queryParams.push(parseFloat(preco_max));
  }
  if (servidor) {
    paramCount++;
    whereConditions.push(`pj.servidor = $${paramCount}`);
    queryParams.push(servidor);
  }
  if (tipo_item) {
    paramCount++;
    whereConditions.push(`pj.tipo_item = $${paramCount}`);
    queryParams.push(tipo_item);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Contar total de registros
  const countResult = await db.query(
    `
      SELECT COUNT(DISTINCT p.id) as total
      FROM produtos p
      LEFT JOIN produtos_jogos pj ON p.id = pj.produto_id
      LEFT JOIN categorias_produtos c ON p.categoria_id = c.id
      LEFT JOIN jogos_plataformas j ON pj.jogo_id = j.id
      LEFT JOIN vendedores v ON p.vendedor_id = v.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      ${whereClause}
    `,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total);

  // Buscar produtos com paginação
  queryParams.push(limit, offset);
  const result = await db.query(
    `
      SELECT DISTINCT
        p.id, p.nome, p.descricao, p.preco, p.estoque, 
        p.imagem_url, p.ativo, p.destaque, p.data_cadastro,
        c.nome as categoria_nome, c.icone as categoria_icone,
        j.nome as jogo_nome, j.icone_url as jogo_icone,
        pj.servidor, pj.tipo_item,
        u.nome as vendedor_nome,
        v.id as vendedor_id,
        (
          SELECT AVG(a.nota)::NUMERIC(3,2)
          FROM avaliacoes a 
          WHERE a.produto_id = p.id AND a.tipo_avaliado = 'produto'
        ) as avaliacao_media,
        (
          SELECT COUNT(*)
          FROM avaliacoes a 
          WHERE a.produto_id = p.id AND a.tipo_avaliado = 'produto'
        ) as total_avaliacoes
      FROM produtos p
      LEFT JOIN produtos_jogos pj ON p.id = pj.produto_id
      LEFT JOIN categorias_produtos c ON p.categoria_id = c.id
      LEFT JOIN jogos_plataformas j ON pj.jogo_id = j.id
      LEFT JOIN vendedores v ON p.vendedor_id = v.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      ${whereClause}
      ORDER BY p.destaque DESC, p.data_cadastro DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `,
    queryParams
  );

  const pagination = {
    page,
    limit,
    total,
  };

  res.status(200).json({
    success: true,
    message: "Produtos recuperados com sucesso",
    data: {
      products: result.rows,
      pagination,
    },
  });
});

/**
 * Obtém produto por ID
 */
const getProductById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await db.query(
    `
      SELECT 
        p.id, p.nome, p.descricao, p.preco, p.estoque, 
        p.imagem_url, p.ativo, p.destaque, p.data_cadastro, p.data_atualizacao,
        c.nome as categoria_nome, c.icone as categoria_icone,
        j.nome as jogo_nome, j.icone_url as jogo_icone,
        pj.servidor, pj.tipo_item,
        u.nome as vendedor_nome, u.id as vendedor_usuario_id,
        v.id as vendedor_id,
        (
          SELECT AVG(a.nota)::NUMERIC(3,2)
          FROM avaliacoes a 
          WHERE a.produto_id = p.id AND a.tipo_avaliado = 'produto'
        ) as avaliacao_media,
        (
          SELECT COUNT(*)
          FROM avaliacoes a 
          WHERE a.produto_id = p.id AND a.tipo_avaliado = 'produto'
        ) as total_avaliacoes
      FROM produtos p
      LEFT JOIN produtos_jogos pj ON p.id = pj.produto_id
      LEFT JOIN categorias_produtos c ON p.categoria_id = c.id
      LEFT JOIN jogos_plataformas j ON pj.jogo_id = j.id
      LEFT JOIN vendedores v ON p.vendedor_id = v.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE p.id = $1
    `,
    [id]
  );
  if (result.rows.length === 0) {
    return next(new AppError("Produto não encontrado", 404));
  }
  res.status(200).json({
    success: true,
    message: "Produto recuperado com sucesso",
    data: result.rows[0],
  });
});

/**
 * Cria novo produto (vendedores e admin)
 */
const createProduct = catchAsync(async (req, res, next) => {
  // Para multipart/form-data, os campos podem vir como string
  let {
    nome,
    descricao,
    preco,
    estoque,
    categoria_id,
    jogo_id,
    servidor,
    tipo_item,
    destaque = false,
    vendedor_id // só admin pode enviar esse campo
  } = req.body;

  // Converte campos numéricos se vierem como string
  preco = preco ? Number(preco) : undefined;
  estoque = estoque ? Number(estoque) : undefined;
  categoria_id = categoria_id ? Number(categoria_id) : undefined;
  jogo_id = jogo_id ? Number(jogo_id) : undefined;

  // Pega imagem enviada via upload
  const imagem_url = req.file ? req.file.path : null;

  // Validação dos campos obrigatórios
  if (!nome || !descricao || preco === undefined || estoque === undefined || !categoria_id) {
    return next(new AppError("Campos obrigatórios faltando (jogo é opcional)", 400));
  }

  // Verificar se o usuário é vendedor ou admin
  let vendedorId;
  if (req.user.tipo === "admin") {
    vendedorId = vendedor_id;
    if (!vendedorId) {
      return next(new AppError("Admin deve especificar vendedor_id", 400));
    }
    // Confirma se o vendedor existe e está ativo
    const vendedorResult = await db.query(
      "SELECT id FROM vendedores WHERE id = $1 AND ativo = true",
      [vendedorId]
    );
    if (vendedorResult.rows.length === 0) {
      return next(
        new AppError("Vendedor informado não existe ou está inativo", 400)
      );
    }
  } else if (req.user.tipo === "vendedor") {
    const vendedorResult = await db.query(
      "SELECT id FROM vendedores WHERE usuario_id = $1 AND ativo = true",
      [req.user.id]
    );
    if (vendedorResult.rows.length === 0) {
      return next(new AppError("Perfil de vendedor não encontrado", 403));
    }
    vendedorId = vendedorResult.rows[0].id;
  } else {
    // Se não for admin nem vendedor, não pode criar produto
    return next(
      new AppError("Apenas vendedores ou admin podem criar produtos", 403)
    );
  }

  try {
    // Iniciar transação
    await db.query("BEGIN");

    // Criar produto
    const productResult = await db.query(
      `
        INSERT INTO produtos (vendedor_id, categoria_id, nome, descricao, preco, estoque, imagem_url, destaque)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        vendedorId,
        categoria_id,
        nome,
        descricao,
        preco,
        estoque,
        imagem_url,
        destaque,
      ]
    );
    const product = productResult.rows[0];

    // Associar com jogo se fornecido
    if (jogo_id) {
      await db.query(
        `
          INSERT INTO produtos_jogos (produto_id, jogo_id, servidor, tipo_item)
          VALUES ($1, $2, $3, $4)
        `,
        [product.id, jogo_id, servidor || null, tipo_item || null]
      );
    }

    // Confirmar transação
    await db.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Produto criado com sucesso",
      data: product,
    });
  } catch (error) {
    // Reverter transação em caso de erro
    await db.query("ROLLBACK").catch(() => {});
    console.error("Erro ao criar produto:", error);
    return next(new AppError("Erro ao criar produto: " + error.message, 500));
  }
});

/**
 * Atualiza produto (proprietário ou admin)
 */
const updateProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  let {
    nome,
    descricao,
    preco,
    estoque,
    categoria_id,
    ativo,
    destaque,
    jogo_id,
    servidor,
    tipo_item,
  } = req.body;

  // Converte campos numéricos se vierem como string
  preco = preco ? Number(preco) : undefined;
  estoque = estoque ? Number(estoque) : undefined;
  categoria_id = categoria_id ? Number(categoria_id) : undefined;
  jogo_id = jogo_id ? Number(jogo_id) : undefined;

  // Validação dos campos obrigatórios
  if (!nome || preco === undefined) {
    return next(new AppError("Campos obrigatórios faltando para atualização", 400));
  }

  // Pega imagem enviada via upload (se houver)
  const imagem_url = req.file ? req.file.path : undefined;

  // Verificar se o produto existe e se o usuário tem permissão
  const productCheck = await db.query(
    `
      SELECT p.*, v.usuario_id as vendedor_usuario_id
      FROM produtos p
      JOIN vendedores v ON p.vendedor_id = v.id
      WHERE p.id = $1
    `,
    [id]
  );
  if (productCheck.rows.length === 0) {
    return next(new AppError("Produto não encontrado", 404));
  }
  const product = productCheck.rows[0];

  // Verificar permissão (proprietário ou admin)
  if (
    req.user.tipo !== "admin" &&
    product.vendedor_usuario_id !== req.user.id
  ) {
    return next(
      new AppError("Você só pode editar seus próprios produtos", 403)
    );
  }

  try {
    // Iniciar transação
    await db.query("BEGIN");

    // Atualizar produto
    const productResult = await db.query(
      `
        UPDATE produtos 
        SET nome = COALESCE($1, nome),
            descricao = COALESCE($2, descricao),
            preco = COALESCE($3, preco),
            estoque = COALESCE($4, estoque),
            categoria_id = COALESCE($5, categoria_id),
            imagem_url = COALESCE($6, imagem_url),
            ativo = COALESCE($7, ativo),
            destaque = COALESCE($8, destaque),
            data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `,
      [
        nome,
        descricao,
        preco,
        estoque,
        categoria_id,
        imagem_url,
        ativo,
        destaque,
        id,
      ]
    );

    // Atualizar associação com jogo se fornecido
    if (jogo_id !== undefined) {
      if (jogo_id) {
        // Primeiro, remover associações existentes
        await db.query("DELETE FROM produtos_jogos WHERE produto_id = $1", [id]);
        
        // Depois, inserir a nova associação
        await db.query(
          `
            INSERT INTO produtos_jogos (produto_id, jogo_id, servidor, tipo_item)
            VALUES ($1, $2, $3, $4)
          `,
          [id, jogo_id, servidor || null, tipo_item || null]
        );
      } else {
        // Remover associação
        await db.query("DELETE FROM produtos_jogos WHERE produto_id = $1", [id]);
      }
    }

    // Confirmar transação
    await db.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Produto atualizado com sucesso",
      data: productResult.rows[0],
    });
  } catch (error) {
    // Reverter transação em caso de erro
    await db.query("ROLLBACK").catch(() => {});
    console.error("Erro ao atualizar produto:", error);
    return next(new AppError("Erro ao atualizar produto: " + error.message, 500));
  }
});

/**
 * Deleta produto (proprietário ou admin)
 */
const deleteProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  // Verificar se o produto existe e se o usuário tem permissão
  const productCheck = await db.query(
    `
      SELECT p.*, v.usuario_id as vendedor_usuario_id
      FROM produtos p
      JOIN vendedores v ON p.vendedor_id = v.id
      WHERE p.id = $1
    `,
    [id]
  );
  if (productCheck.rows.length === 0) {
    return next(new AppError("Produto não encontrado", 404));
  }
  const product = productCheck.rows[0];

  // Verificar permissão (proprietário ou admin)
  if (
    req.user.tipo !== "admin" &&
    product.vendedor_usuario_id !== req.user.id
  ) {
    return next(
      new AppError("Você só pode deletar seus próprios produtos", 403)
    );
  }

  // Verificar se há vendas deste produto (apenas para vendedores, não para admin)
  if (req.user.tipo !== "admin") {
    const salesCount = await db.query(
      "SELECT COUNT(*) as count FROM itens_venda WHERE produto_id = $1",
      [id]
    );
    if (parseInt(salesCount.rows[0].count) > 0) {
      return next(
        new AppError("Não é possível deletar produto que possui vendas", 400)
      );
    }
  }

  // Deletar em cascata: primeiro remover itens de venda, depois o produto
  try {
    // Iniciar transação
    await db.query("BEGIN");
    
    // Deletar itens de venda relacionados
    await db.query("DELETE FROM itens_venda WHERE produto_id = $1", [id]);
    
    // Deletar produtos_jogos relacionados
    await db.query("DELETE FROM produtos_jogos WHERE produto_id = $1", [id]);
    
    // Deletar o produto
    await db.query("DELETE FROM produtos WHERE id = $1", [id]);
    
    // Confirmar transação
    await db.query("COMMIT");
  } catch (error) {
    // Reverter transação em caso de erro
    await db.query("ROLLBACK");
    console.error("Erro ao deletar produto:", error);
    return next(new AppError("Erro ao deletar produto: " + error.message, 500));
  }

  res.status(200).json({
    success: true,
    message: "Produto deletado com sucesso",
  });
});

/**
 * Lista produtos do vendedor logado
 */
const getMyProducts = catchAsync(async (req, res, next) => {
  // Busca o vendedor_id do usuário logado
  const vendedorResult = await db.query(
    "SELECT id FROM vendedores WHERE usuario_id = $1 AND ativo = true",
    [req.user.id]
  );
  if (vendedorResult.rows.length === 0) {
    return res
      .status(403)
      .json({ success: false, message: "Perfil de vendedor não encontrado." });
  }
  const vendedorId = vendedorResult.rows[0].id;

  console.log('Buscando produtos do vendedor:', vendedorId);

  // Busca os produtos desse vendedor
  const result = await db.query(
    "SELECT * FROM produtos WHERE vendedor_id = $1 ORDER BY id DESC",
    [vendedorId]
  );
  res.status(200).json({ success: true, produtos: result.rows });
});

/**
 * Lista produtos com base no vendedor_id fornecido na query (para admin)
 */
const getProdutos = async (req, res) => {
  const vendedorId = req.query.vendedor_id;
  let result;
  if (vendedorId) {
    result = await db.query(
      `SELECT p.*, 
              u.nome AS vendedor_nome,
              j.nome AS jogo_nome
       FROM produtos p
       JOIN vendedores v ON p.vendedor_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN produtos_jogos pj ON p.id = pj.produto_id
       LEFT JOIN jogos_plataformas j ON pj.jogo_id = j.id
       WHERE p.vendedor_id = $1`,
      [vendedorId]
    );
  } else {
    result = await db.query(
      `SELECT p.*, 
              u.nome AS vendedor_nome,
              j.nome AS jogo_nome
       FROM produtos p
       JOIN vendedores v ON p.vendedor_id = v.id
       JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN produtos_jogos pj ON p.id = pj.produto_id
       LEFT JOIN jogos_plataformas j ON pj.jogo_id = j.id`
    );
  }
  res.status(200).json({
    success: true,
    data: {
      products: result.rows,
    },
  });
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getGames,
  createGame,
  updateGame,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getProdutos,
};
