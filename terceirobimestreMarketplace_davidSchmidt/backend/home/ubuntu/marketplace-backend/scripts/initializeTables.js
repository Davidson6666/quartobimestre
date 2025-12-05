require("dotenv").config();
const db = require("../config/database");

/**
 * Script para criar todas as tabelas necessárias no banco de dados
 */

const initializeTables = async () => {
  try {
    console.log("📊 Iniciando criação de tabelas...");

    // ===== CRIAR TABELA USUARIOS =====
    console.log("👥 Criando tabela usuarios...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha_hash VARCHAR(255) NOT NULL,
                tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('comprador', 'vendedor', 'admin', 'ambos')),
                ativo BOOLEAN DEFAULT true,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // ===== CRIAR TABELA VENDEDORES =====
    console.log("🏪 Criando tabela vendedores...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS vendedores (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL UNIQUE,
                sigla VARCHAR(10),
                ativo BOOLEAN DEFAULT true,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);

    // ===== CRIAR TABELA CATEGORIAS =====
    console.log("📂 Criando tabela categorias_produtos...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS categorias_produtos (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL UNIQUE,
                descricao TEXT,
                icone VARCHAR(100),
                ordem_exibicao INTEGER DEFAULT 0,
                ativo BOOLEAN DEFAULT true,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // ===== CRIAR TABELA JOGOS =====
    console.log("🎮 Criando tabela jogos_plataformas...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS jogos_plataformas (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL UNIQUE,
                icone_url TEXT,
                ativo BOOLEAN DEFAULT true,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // ===== CRIAR TABELA PRODUTOS =====
    console.log("📦 Criando tabela produtos...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS produtos (
                id SERIAL PRIMARY KEY,
                vendedor_id INTEGER NOT NULL,
                categoria_id INTEGER,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                preco DECIMAL(10,2) NOT NULL,
                estoque INTEGER DEFAULT 0,
                imagem_url TEXT,
                destaque BOOLEAN DEFAULT false,
                ativo BOOLEAN DEFAULT true,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) ON DELETE CASCADE,
                FOREIGN KEY (categoria_id) REFERENCES categorias_produtos(id)
            )
        `);

    // ===== CRIAR TABELA PRODUTOS_JOGOS =====
    console.log("🎮 Criando tabela produtos_jogos...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS produtos_jogos (
                id SERIAL PRIMARY KEY,
                produto_id INTEGER NOT NULL,
                jogo_id INTEGER NOT NULL,
                servidor VARCHAR(100),
                tipo_item VARCHAR(100),
                FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
                FOREIGN KEY (jogo_id) REFERENCES jogos_plataformas(id)
            )
        `);

    // ===== CRIAR TABELA CARRINHO =====
    console.log("🛒 Criando tabela carrinho_compras...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS carrinho_compras (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                produto_id INTEGER NOT NULL,
                quantidade INTEGER NOT NULL DEFAULT 1,
                data_adicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
                UNIQUE(usuario_id, produto_id)
            )
        `);

    // ===== CRIAR TABELA VENDAS =====
    console.log("💰 Criando tabela vendas...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS vendas (
                id SERIAL PRIMARY KEY,
                vendedor_id INTEGER NOT NULL,
                comprador_id INTEGER NOT NULL,
                valor_total DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluída', 'cancelada')),
                data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
                FOREIGN KEY (comprador_id) REFERENCES usuarios(id)
            )
        `);

    // ===== CRIAR TABELA ITENS_VENDA =====
    console.log("📋 Criando tabela itens_venda...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS itens_venda (
                id SERIAL PRIMARY KEY,
                venda_id INTEGER NOT NULL,
                produto_id INTEGER NOT NULL,
                quantidade INTEGER NOT NULL,
                preco_unitario DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
                FOREIGN KEY (produto_id) REFERENCES produtos(id)
            )
        `);

    // ===== CRIAR TABELA PAGAMENTOS (TABELA FALTANTE!) =====
    console.log("💳 Criando tabela pagamentos...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS pagamentos (
                id SERIAL PRIMARY KEY,
                venda_id INTEGER NOT NULL UNIQUE,
                metodo_pagamento VARCHAR(50) NOT NULL CHECK (metodo_pagamento IN ('pix', 'cartao', 'boleto', 'saldo')),
                valor DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
                codigo_transacao VARCHAR(255),
                data_pagamento TIMESTAMP,
                data_confirmacao TIMESTAMP,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE
            )
        `);

    // ===== CRIAR TABELA AVALIACOES =====
    console.log("⭐ Criando tabela avaliacoes...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS avaliacoes (
                id SERIAL PRIMARY KEY,
                produto_id INTEGER,
                avaliador_id INTEGER NOT NULL,
                avaliado_id INTEGER NOT NULL,
                tipo_avaliado VARCHAR(50) CHECK (tipo_avaliado IN ('produto', 'vendedor')),
                nota INTEGER CHECK (nota >= 1 AND nota <= 5),
                comentario TEXT,
                data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (produto_id) REFERENCES produtos(id),
                FOREIGN KEY (avaliador_id) REFERENCES usuarios(id),
                FOREIGN KEY (avaliado_id) REFERENCES usuarios(id)
            )
        `);

    // ===== CRIAR TABELA MENSAGENS =====
    console.log("💬 Criando tabela mensagens...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS mensagens (
                id SERIAL PRIMARY KEY,
                remetente_id INTEGER NOT NULL,
                destinatario_id INTEGER NOT NULL,
                conteudo TEXT NOT NULL,
                lida BOOLEAN DEFAULT false,
                data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (remetente_id) REFERENCES usuarios(id),
                FOREIGN KEY (destinatario_id) REFERENCES usuarios(id)
            )
        `);

    // ===== CRIAR TABELA NOTIFICACOES =====
    console.log("🔔 Criando tabela notificacoes...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS notificacoes (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                mensagem TEXT NOT NULL,
                tipo VARCHAR(50),
                lida BOOLEAN DEFAULT false,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        `);

    // ===== CRIAR TABELA SALDO =====
    console.log("💵 Criando tabela saldo_usuarios...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS saldo_usuarios (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL UNIQUE,
                saldo DECIMAL(10,2) DEFAULT 0,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);

    // ===== CRIAR TABELA SAQUES =====
    console.log("🏦 Criando tabela saques...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS saques (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pendente',
                data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_processamento TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        `);

    // ===== CRIAR TABELA LOGS DE AUDITORIA =====
    console.log("📝 Criando tabela logs_auditoria...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS logs_auditoria (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER,
                acao VARCHAR(255) NOT NULL,
                tabela VARCHAR(100) NOT NULL,
                id_registro INTEGER,
                dados_antigos TEXT,
                dados_novos TEXT,
                data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        `);

    // ===== CRIAR TABELA COMISSOES =====
    console.log("💰 Criando tabela comissoes_config...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS comissoes_config (
                id SERIAL PRIMARY KEY,
                tipo_usuario VARCHAR(50),
                percentual_comissao DECIMAL(5,2),
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // ===== CRIAR TABELA REPASSE DE VENDAS =====
    console.log("💸 Criando tabela repasse_vendas...");
    await db.query(`
            CREATE TABLE IF NOT EXISTS repasse_vendas (
                id SERIAL PRIMARY KEY,
                venda_id INTEGER NOT NULL,
                vendedor_id INTEGER NOT NULL,
                valor_bruto DECIMAL(10,2),
                comissao DECIMAL(10,2),
                valor_liquido DECIMAL(10,2),
                status VARCHAR(50) DEFAULT 'pendente',
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (venda_id) REFERENCES vendas(id),
                FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
            )
        `);

    console.log("✅ Todas as tabelas foram criadas com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar tabelas:", error.message);
    process.exit(1);
  }
};

initializeTables();
