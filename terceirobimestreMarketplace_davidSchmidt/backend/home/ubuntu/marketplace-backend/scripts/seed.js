require('dotenv').config();
const db = require('../config/database');
const { hashPassword } = require('../middleware/auth');

/**
 * Script para popular o banco de dados com dados de exemplo
 */

const seedData = async () => {
    try {
        console.log('🌱 Iniciando seed do banco de dados...');

        // ===== CRIAR CATEGORIAS =====
        console.log('📂 Criando categorias...');
        const categorias = [
            { nome: 'Skins', descricao: 'Skins para armas e personagens', icone: 'fas fa-palette', ordem: 1 },
            { nome: 'Moedas Virtuais', descricao: 'Moedas e créditos de jogos', icone: 'fas fa-coins', ordem: 2 },
            { nome: 'Contas', descricao: 'Contas de jogos e plataformas', icone: 'fas fa-user-circle', ordem: 3 },
            { nome: 'Itens Raros', descricao: 'Itens raros e colecionáveis', icone: 'fas fa-gem', ordem: 4 },
            { nome: 'Boosting', descricao: 'Serviços de boost e rank', icone: 'fas fa-rocket', ordem: 5 }
        ];

        const categoriaIds = [];
        for (const categoria of categorias) {
            const result = await db.query(`
                INSERT INTO categorias_produtos (nome, descricao, icone, ordem_exibicao)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (nome) DO NOTHING
                RETURNING id
            `, [categoria.nome, categoria.descricao, categoria.icone, categoria.ordem]);
            
            if (result.rows.length > 0) {
                categoriaIds.push(result.rows[0].id);
            } else {
                // Se já existe, buscar o ID
                const existing = await db.query('SELECT id FROM categorias_produtos WHERE nome = $1', [categoria.nome]);
                categoriaIds.push(existing.rows[0].id);
            }
        }

        // ===== CRIAR JOGOS =====
        console.log('🎮 Criando jogos...');
        const jogos = [
            { nome: 'Counter-Strike 2', icone_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg' },
            { nome: 'Valorant', icone_url: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt5c6a2e3d8b5b8b8b/valorant-logo.png' },
            { nome: 'League of Legends', icone_url: 'https://www.riotgames.com/darkroom/1440/8d5c497da1c2eeec8cffa99b01abc64b:5329ca773963a5b739e98e715957ac39/lol-logo.png' },
            { nome: 'Fortnite', icone_url: 'https://cdn2.unrealengine.com/fortnite-logo-1920x1080-fb81b5b7e1b5.jpg' },
            { nome: 'Minecraft', icone_url: 'https://www.minecraft.net/content/dam/games/minecraft/key-art/MC_Vanilla_KeyArt_1200x600.jpg' }
        ];

        const jogoIds = [];
        for (const jogo of jogos) {
            const result = await db.query(`
                INSERT INTO jogos_plataformas (nome, icone_url)
                VALUES ($1, $2)
                ON CONFLICT (nome) DO NOTHING
                RETURNING id
            `, [jogo.nome, jogo.icone_url]);
            
            if (result.rows.length > 0) {
                jogoIds.push(result.rows[0].id);
            } else {
                const existing = await db.query('SELECT id FROM jogos_plataformas WHERE nome = $1', [jogo.nome]);
                jogoIds.push(existing.rows[0].id);
            }
        }

        // ===== CRIAR USUÁRIOS =====
        console.log('👥 Criando usuários...');
        const senhaHash = await hashPassword('123456');
        
        const usuarios = [
            { nome: 'Admin', email: 'admplaceMarket@gmail.com', tipo: 'admin' },
            { nome: 'João Vendedor', email: 'joao@email.com', tipo: 'vendedor' },
            { nome: 'Maria Silva', email: 'maria@email.com', tipo: 'comprador' },
            { nome: 'Pedro Santos', email: 'pedro@email.com', tipo: 'ambos' },
            { nome: 'Ana Costa', email: 'ana@email.com', tipo: 'vendedor' }
        ];

        const usuarioIds = [];
        for (const usuario of usuarios) {
            const result = await db.query(`
                INSERT INTO usuarios (nome, email, senha_hash, tipo)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            `, [usuario.nome, usuario.email, senhaHash, usuario.tipo]);
            
            if (result.rows.length > 0) {
                usuarioIds.push({ id: result.rows[0].id, tipo: usuario.tipo });
                
                // Criar saldo para o usuário
                await db.query(`
                    INSERT INTO saldo_usuarios (usuario_id)
                    VALUES ($1)
                    ON CONFLICT (usuario_id) DO NOTHING
                `, [result.rows[0].id]);
            } else {
                const existing = await db.query('SELECT id FROM usuarios WHERE email = $1', [usuario.email]);
                usuarioIds.push({ id: existing.rows[0].id, tipo: usuario.tipo });
            }
        }

        // ===== CRIAR VENDEDORES =====
        console.log('🏪 Criando perfis de vendedores...');
        const vendedorIds = [];
        for (const usuario of usuarioIds) {
            if (['vendedor', 'ambos', 'admin'].includes(usuario.tipo)) {
                const result = await db.query(`
                    INSERT INTO vendedores (usuario_id)
                    VALUES ($1)
                    ON CONFLICT (usuario_id) DO NOTHING
                    RETURNING id
                `, [usuario.id]);
                
                if (result.rows.length > 0) {
                    vendedorIds.push(result.rows[0].id);
                } else {
                    const existing = await db.query('SELECT id FROM vendedores WHERE usuario_id = $1', [usuario.id]);
                    if (existing.rows.length > 0) {
                        vendedorIds.push(existing.rows[0].id);
                    }
                }
            }
        }

        // ===== CRIAR PRODUTOS =====
        console.log('📦 Criando produtos...');
        const produtos = [
            {
                nome: 'AK-47 Redline (Field-Tested)',
                descricao: 'Skin clássica para AK-47 no Counter-Strike 2',
                preco: 89.90,
                estoque: 5,
                categoria_id: categoriaIds[0], // Skins
                jogo_id: jogoIds[0], // CS2
                servidor: 'Global',
                tipo_item: 'skin_arma',
                destaque: true
            },
            {
                nome: 'Vandal Prime',
                descricao: 'Skin Prime para Vandal no Valorant',
                preco: 120.00,
                estoque: 3,
                categoria_id: categoriaIds[0], // Skins
                jogo_id: jogoIds[1], // Valorant
                servidor: 'BR',
                tipo_item: 'skin_arma',
                destaque: true
            },
            {
                nome: '1000 RP League of Legends',
                descricao: 'Riot Points para League of Legends',
                preco: 25.00,
                estoque: 50,
                categoria_id: categoriaIds[1], // Moedas
                jogo_id: jogoIds[2], // LoL
                servidor: 'BR',
                tipo_item: 'moeda_virtual'
            },
            {
                nome: 'Conta Minecraft Premium',
                descricao: 'Conta original do Minecraft Java Edition',
                preco: 45.00,
                estoque: 10,
                categoria_id: categoriaIds[2], // Contas
                jogo_id: jogoIds[4], // Minecraft
                servidor: 'Global',
                tipo_item: 'conta'
            },
            {
                nome: 'Boost Diamante para Imortal',
                descricao: 'Serviço de boost de rank no Valorant',
                preco: 200.00,
                estoque: 2,
                categoria_id: categoriaIds[4], // Boosting
                jogo_id: jogoIds[1], // Valorant
                servidor: 'BR',
                tipo_item: 'servico'
            }
        ];

        const produtoIds = [];
        for (let i = 0; i < produtos.length; i++) {
            const produto = produtos[i];
            const vendedorId = vendedorIds[i % vendedorIds.length]; // Distribuir entre vendedores
            
            const result = await db.query(`
                INSERT INTO produtos (vendedor_id, categoria_id, nome, descricao, preco, estoque, destaque)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [vendedorId, produto.categoria_id, produto.nome, produto.descricao, produto.preco, produto.estoque, produto.destaque || false]);
            
            const produtoId = result.rows[0].id;
            produtoIds.push(produtoId);
            
            // Associar com jogo
            await db.query(`
                INSERT INTO produtos_jogos (produto_id, jogo_id, servidor, tipo_item)
                VALUES ($1, $2, $3, $4)
            `, [produtoId, produto.jogo_id, produto.servidor, produto.tipo_item]);
        }

        // ===== CRIAR ALGUMAS VENDAS DE EXEMPLO =====
        console.log('💰 Criando vendas de exemplo...');
        if (vendedorIds.length > 0 && usuarioIds.length > 2) {
            const vendaResult = await db.query(`
                INSERT INTO vendas (vendedor_id, comprador_id, valor_total, status)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [vendedorIds[0], usuarioIds[2].id, 89.90, 'pago']);
            
            const vendaId = vendaResult.rows[0].id;
            
            // Item da venda
            await db.query(`
                INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal)
                VALUES ($1, $2, $3, $4, $5)
            `, [vendaId, produtoIds[0], 1, 89.90, 89.90]);
            
            // Pagamento
            await db.query(`
                INSERT INTO pagamentos (venda_id, metodo_pagamento, valor, status, codigo_transacao)
                VALUES ($1, $2, $3, $4, $5)
            `, [vendaId, 'pix', 89.90, 'aprovado', 'TXN123456789']);
        }

        // ===== CRIAR AVALIAÇÕES DE EXEMPLO =====
        console.log('⭐ Criando avaliações de exemplo...');
        if (produtoIds.length > 0 && usuarioIds.length > 2) {
            await db.query(`
                INSERT INTO avaliacoes (produto_id, avaliador_id, avaliado_id, tipo_avaliado, nota, comentario)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [produtoIds[0], usuarioIds[2].id, usuarioIds[1].id, 'produto', 5, 'Produto excelente, entrega rápida!']);
            
            await db.query(`
                INSERT INTO avaliacoes (produto_id, avaliador_id, avaliado_id, tipo_avaliado, nota, comentario)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [produtoIds[1], usuarioIds[2].id, usuarioIds[3].id, 'produto', 4, 'Muito bom, recomendo!']);
        }

        // ===== CRIAR NOTIFICAÇÕES DE EXEMPLO =====
        console.log('🔔 Criando notificações de exemplo...');
        for (const usuario of usuarioIds.slice(1, 4)) { // Pular admin
            await db.query(`
                INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo)
                VALUES ($1, $2, $3, $4)
            `, [usuario.id, 'Bem-vindo ao GameMarket!', 'Sua conta foi criada com sucesso. Explore nosso marketplace!', 'sistema']);
        }

        console.log('✅ Seed concluído com sucesso!');
        console.log('\n📋 Dados criados:');
        console.log(`   • ${categorias.length} categorias`);
        console.log(`   • ${jogos.length} jogos`);
        console.log(`   • ${usuarios.length} usuários`);
        console.log(`   • ${vendedorIds.length} vendedores`);
        console.log(`   • ${produtos.length} produtos`);
        console.log('\n🔑 Credenciais de teste:');
        console.log('   Admin: admin@gamemarket.com / 123456');
        console.log('   Vendedor: joao@email.com / 123456');
        console.log('   Comprador: maria@email.com / 123456');
        console.log('   Ambos: pedro@email.com / 123456');

    } catch (error) {
        console.error('❌ Erro durante o seed:', error);
        throw error;
    }
};

// Executar seed se chamado diretamente
if (require.main === module) {
    seedData()
        .then(() => {
            console.log('🎉 Seed finalizado!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Falha no seed:', error);
            process.exit(1);
        });
}

module.exports = { seedData };
