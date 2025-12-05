const db = require("../config/database");
const catchAsync = require("../utils/catchAsync");
const { AppError } = require("../middleware/errorHandler");

/**
 * Relatório: Vendas de um vendedor específico pelo ID
 */
const getVendasPorVendedorId = catchAsync(async (req, res, next) => {
  const { vendedorId } = req.params;

  // Buscar informações do vendedor
  const vendedorResult = await db.query(
    "SELECT v.id, u.nome FROM vendedores v JOIN usuarios u ON v.usuario_id = u.id WHERE v.id = $1",
    [vendedorId]
  );

  if (vendedorResult.rows.length === 0) {
    return next(new AppError("Vendedor não encontrado", 404));
  }

  const vendedorNome = vendedorResult.rows[0].nome;

  // Buscar todas as vendas deste vendedor COM DETALHES DOS PRODUTOS
  const query = `
        SELECT 
            ve.id as venda_id,
            TO_CHAR(ve.data_venda, 'DD/MM/YYYY HH24:MI') as data_venda,
            ve.valor_total,
            ve.status
        FROM vendas ve
        WHERE ve.vendedor_id = $1
        ORDER BY ve.data_venda DESC
    `;

  const result = await db.query(query, [vendedorId]);

  // Para cada venda, buscar os produtos detalhados
  const vendasComDetalhes = await Promise.all(
    result.rows.map(async (venda) => {
      const produtosQuery = `
            SELECT 
                ive.id as item_id,
                p.id as produto_id,
                p.nome as produto_nome,
                p.preco,
                p.imagem_url,
                p.descricao,
                ive.quantidade,
                (ive.quantidade * p.preco) as subtotal
            FROM itens_venda ive
            JOIN produtos p ON ive.produto_id = p.id
            WHERE ive.venda_id = $1
            ORDER BY p.nome
        `;

      const produtosResult = await db.query(produtosQuery, [venda.venda_id]);

      return {
        venda_id: venda.venda_id,
        data_venda: venda.data_venda,
        valor_total: venda.valor_total,
        status: venda.status,
        quantidade_itens: produtosResult.rows.length,
        produtos: produtosResult.rows,
      };
    })
  );

  // Calcular totais
  const totalVendas = vendasComDetalhes.length;
  const valorTotal = vendasComDetalhes.reduce(
    (sum, venda) => sum + parseFloat(venda.valor_total || 0),
    0
  );
  const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

  res.status(200).json({
    success: true,
    message: `Relatório de vendas - ${vendedorNome}`,
    data: {
      vendedor: {
        id: vendedorId,
        nome: vendedorNome,
      },
      resumo: {
        total_vendas: totalVendas,
        valor_total_vendido: valorTotal.toFixed(2),
        ticket_medio: ticketMedio.toFixed(2),
      },
      vendas: vendasComDetalhes,
      data_geracao: new Date().toLocaleString("pt-BR"),
    },
  });
});

/**
 * Relatório: Quantas vendas o vendedor autenticado fez
 */
const getVendasPorVendedor = catchAsync(async (req, res, next) => {
  const usuarioId = req.user.id;

  // Buscar o ID do vendedor usando o ID do usuário
  const vendedorResult = await db.query(
    "SELECT id FROM vendedores WHERE usuario_id = $1",
    [usuarioId]
  );

  if (vendedorResult.rows.length === 0) {
    return next(new AppError("Usuário não é um vendedor", 403));
  }

  const vendedorId = vendedorResult.rows[0].id;

  // Buscar todas as vendas deste vendedor
  const query = `
        SELECT 
            ve.id as venda_id,
            TO_CHAR(ve.data_venda, 'DD/MM/YYYY HH24:MI') as data_venda,
            ve.valor_total,
            ve.status
        FROM vendas ve
        WHERE ve.vendedor_id = $1
        ORDER BY ve.data_venda DESC
    `;

  const result = await db.query(query, [vendedorId]);

  // Para cada venda, buscar os produtos detalhados
  const vendasComDetalhes = await Promise.all(
    result.rows.map(async (venda) => {
      const produtosQuery = `
            SELECT 
                ive.id as item_id,
                p.id as produto_id,
                p.nome as produto_nome,
                p.preco,
                p.imagem_url,
                p.descricao,
                ive.quantidade,
                (ive.quantidade * p.preco) as subtotal
            FROM itens_venda ive
            JOIN produtos p ON ive.produto_id = p.id
            WHERE ive.venda_id = $1
            ORDER BY p.nome
        `;

      const produtosResult = await db.query(produtosQuery, [venda.venda_id]);

      return {
        venda_id: venda.venda_id,
        data_venda: venda.data_venda,
        valor_total: venda.valor_total,
        status: venda.status,
        quantidade_itens: produtosResult.rows.length,
        produtos: produtosResult.rows,
      };
    })
  );

  // Calcular totais
  const totalVendas = vendasComDetalhes.length;
  const valorTotal = vendasComDetalhes.reduce(
    (sum, venda) => sum + parseFloat(venda.valor_total || 0),
    0
  );
  const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

  res.status(200).json({
    success: true,
    message: "Relatório de vendas do vendedor",
    data: {
      resumo: {
        total_vendas: totalVendas,
        valor_total_vendido: valorTotal.toFixed(2),
        ticket_medio: ticketMedio.toFixed(2),
      },
      vendas: vendasComDetalhes,
      data_geracao: new Date().toLocaleString("pt-BR"),
    },
  });
});

/**
 * Relatório: Quanto a empresa vendeu em um determinado mês
 */
const getVendasPorMes = catchAsync(async (req, res, next) => {
  const { mes, ano } = req.query;

  if (!mes || !ano) {
    return next(
      new AppError(
        "Mês e ano são obrigatórios (formato: mes=01, ano=2025)",
        400
      )
    );
  }

  const mesNum = String(mes).padStart(2, "0");
  const dataFiltro = `${ano}-${mesNum}`;

  // Validar formato da data
  if (!/^\d{4}-\d{2}$/.test(dataFiltro)) {
    return next(
      new AppError("Formato de data inválido (use ano=YYYY, mes=MM)", 400)
    );
  }

  const query = `
        SELECT 
            TO_CHAR(ve.data_venda, 'DD/MM/YYYY') as data_venda,
            ve.id as venda_id,
            u.nome as vendedor_nome,
            COUNT(ive.id) as quantidade_itens,
            ve.valor_total,
            ve.status
        FROM vendas ve
        JOIN vendedores v ON ve.vendedor_id = v.id
        JOIN usuarios u ON v.usuario_id = u.id
        LEFT JOIN itens_venda ive ON ve.id = ive.venda_id
        WHERE TO_CHAR(ve.data_venda, 'YYYY-MM') = $1
        GROUP BY ve.id, u.nome, ve.data_venda, ve.valor_total, ve.status
        ORDER BY ve.data_venda DESC
    `;

  const result = await db.query(query, [dataFiltro]);

  // Calcular totais
  const totalVendas = result.rows.length;
  const valorTotal = result.rows.reduce(
    (sum, row) => sum + parseFloat(row.valor_total || 0),
    0
  );
  const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

  // Agrupar por dia
  const vendiasPorDia = {};
  result.rows.forEach((venda) => {
    if (!vendiasPorDia[venda.data_venda]) {
      vendiasPorDia[venda.data_venda] = {
        data: venda.data_venda,
        quantidade_vendas: 0,
        valor_total: 0,
      };
    }
    vendiasPorDia[venda.data_venda].quantidade_vendas += 1;
    vendiasPorDia[venda.data_venda].valor_total += parseFloat(
      venda.valor_total || 0
    );
  });

  res.status(200).json({
    success: true,
    message: `Relatório de vendas - ${mes}/${ano}`,
    data: {
      periodo: `${mes}/${ano}`,
      totais: {
        total_vendas: totalVendas,
        valor_total: parseFloat(valorTotal.toFixed(2)),
        ticket_medio: parseFloat(ticketMedio.toFixed(2)),
      },
      vendas_por_dia: Object.values(vendiasPorDia),
      detalhes_vendas: result.rows,
      data_geracao: new Date().toLocaleString("pt-BR"),
    },
  });
});

module.exports = {
  getVendasPorVendedor,
  getVendasPorVendedorId,
  getVendasPorMes,
};
