# 🗄️ Database - GameMarket

Este diretório contém os scripts para criação e população do banco de dados do projeto GameMarket.

## 📋 Arquivos

### `schema.sql`
Script SQL completo para criar todas as tabelas, relacionamentos e índices do banco de dados PostgreSQL.

**Tabelas criadas:**
- `usuarios` - Usuários do sistema (admin, vendedor, comprador, ambos)
- `vendedores` - Perfis de vendedores
- `produtos` - Produtos disponíveis no marketplace
- `categorias_produtos` - Categorias dos produtos
- `jogos_plataformas` - Jogos e plataformas suportadas
- `produtos_jogos` - Relacionamento entre produtos e jogos
- `carrinho_compras` - Carrinho de compras dos usuários
- `vendas` - Vendas realizadas
- `itens_venda` - Itens individuais de cada venda
- `pagamentos` - Registro de pagamentos
- `avaliacoes` - Avaliações de produtos e vendedores
- `notificacoes` - Notificações do sistema
- `saldo_usuarios` - Saldo de cada usuário
- `saques` - Saques solicitados pelos vendedores
- `mensagens` - Sistema de mensagens entre usuários
- `logs_auditoria` - Log de auditoria
- `comissoes_config` - Configuração de comissões
- `funcionarios_vinculos` - Vínculo entre vendedores e funcionários

---

### `seed.js`
Script Node.js para popular o banco de dados com dados de exemplo.

**O que é criado:**
- 5 categorias de produtos (Skins, Moedas Virtuais, Contas, Itens Raros, Boosting)
- 5 jogos/plataformas (CS2, Valorant, LoL, Fortnite, Minecraft)
- 5 usuários de teste
- 3 vendedores
- 5 produtos de exemplo
- 1 venda de exemplo com pagamento
- 2 avaliações de exemplo
- Notificações de boas-vindas

**Credenciais de teste criadas:**
- **Admin**: `admplaceMarket@gmail.com` / `123456`
- **Vendedor**: `joao@email.com` / `123456`
- **Comprador**: `maria@email.com` / `123456`
- **Ambos**: `pedro@email.com` / `123456`

**Para executar:**
```bash
cd backend/home/ubuntu/marketplace-backend
node ../../../../../../database/seed.js
```

---

### `seedOwner.js`
Script Node.js para criar ou recriar o usuário "Dono" (super admin).

**Credenciais do Dono:**
- **Email**: `donoFoda@gmail.com`
- **Senha**: `150975`

**Para executar:**
```bash
cd backend/home/ubuntu/marketplace-backend
node ../../../../../../database/seedOwner.js
```

---

## 🚀 Instruções de Configuração

### 1️⃣ Criar o Banco de Dados

```bash
# Conectar no PostgreSQL
psql -U seu_usuario -d seu_banco

# Executar o script SQL
\i /caminho/para/database/schema.sql
```

Ou com comando único:
```bash
psql -U seu_usuario -d seu_banco -f /caminho/para/database/schema.sql
```

### 2️⃣ Configurar Variáveis de Ambiente

Crie um arquivo `.env` em `backend/home/ubuntu/marketplace-backend/`:

```env
# Database
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco

# JWT
JWT_SECRET=seu_secret_jwt_super_seguro

# Servidor
PORT=3000
NODE_ENV=development
```

### 3️⃣ Instalar Dependências

```bash
cd backend/home/ubuntu/marketplace-backend
npm install
```

### 4️⃣ Popular o Banco de Dados

```bash
# Executar seed principal (dados de exemplo)
node ../../../../../../database/seed.js

# Criar/Recriar usuário Dono
node ../../../../../../database/seedOwner.js
```

### 5️⃣ Iniciar o Servidor

```bash
npm start
```

---

## 📊 Estrutura do Banco de Dados

### Relacionamentos Principais

```
usuarios
├── vendedores (1:N)
│   ├── produtos (1:N)
│   │   ├── categorias_produtos
│   │   ├── produtos_jogos
│   │   │   └── jogos_plataformas
│   │   └── avaliacoes
│   ├── vendas (1:N)
│   │   ├── itens_venda
│   │   │   └── produtos
│   │   └── pagamentos
│   └── funcionarios_vinculos
├── carrinho_compras
├── notificacoes
├── saldo_usuarios
├── saques
└── mensagens
```

---

## 🔐 Tipos de Usuário

- **admin**: Acesso total ao sistema, pode gerenciar vendedores e produtos
- **vendedor**: Pode criar e gerenciar seus próprios produtos
- **comprador**: Pode comprar produtos
- **ambos**: Tem os poderes de vendedor e comprador

---

## 📝 Notas Importantes

- Todas as senhas no seed.js são `123456`
- A senha do Dono é `150975`
- O banco usa PostgreSQL
- Foreign keys estão ativas (cascatas configuradas)
- Índices criados para performance em campos frequentemente consultados

---

## 🐛 Troubleshooting

### Erro: "Sem permissão para criar tabelas"
```bash
# Dar permissões no PostgreSQL
psql -U postgres
ALTER USER seu_usuario CREATEDB;
```

### Erro: "Banco de dados não existe"
```bash
createdb -U seu_usuario seu_banco
```

### Erro: "Conflito de foreign key"
Certificar que o schema.sql foi executado antes dos seeds.

---

**Criado com ❤️ para o projeto GameMarket - Quarto Bimestre**
