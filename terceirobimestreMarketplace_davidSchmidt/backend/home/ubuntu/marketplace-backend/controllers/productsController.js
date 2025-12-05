const Produtos = require('../models/Produtos');
const Vendedores = require('../models/Vendedores');
const catchAsync = require('../utils/catchAsync');

async function createProduct(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Não autenticado' });

    // buscar vendedor associado; criar se não existir (opcional: ou retornar erro)
    let vendedor = await Vendedores.getByUsuarioId(userId);
    if (!vendedor) {
      // criar automaticamente para facilitar testes; em produção talvez queira exigir aprovação
      vendedor = await Vendedores.create({ usuario_id: userId });
    }

    const { categoria_id, nome, descricao, preco, estoque, imagem_url, ativo = true, destaque = false } = req.body;

    // validação mínima
    if (!categoria_id || !nome || preco == null || estoque == null) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes' });
    }

    const produto = await Produtos.create({
      vendedor_id: vendedor.id,
      categoria_id,
      nome,
      descricao,
      preco,
      estoque,
      imagem_url,
      ativo,
      destaque
    });

    return res.status(200).json({
      success: true,
      message: 'Produto criado com sucesso',
      data: produto
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProduct };