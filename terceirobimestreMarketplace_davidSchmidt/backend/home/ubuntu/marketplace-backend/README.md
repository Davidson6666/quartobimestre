# GameMarket Backend API

Backend RESTful para o marketplace de itens digitais GameMarket, desenvolvido em Node.js com Express e PostgreSQL.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **Helmet** - Segurança HTTP
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - Logging de requisições
- **Rate Limiting** - Proteção contra spam

## 📋 Pré-requisitos

- Node.js 16+ 
- PostgreSQL 12+
- npm ou yarn

## 🔧 Instalação

1. **Clone o repositório e instale as dependências:**
```bash
cd marketplace-backend
npm install
```

2. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=marketplace
DB_PASSWORD=sua_senha
DB_PORT=5432
PORT=3000
JWT_SECRET=seu_jwt_secret_super_seguro
NODE_ENV=development
FRONTEND_URL=http://localhost:8000
```

3. **Configure o banco de dados:**
- Crie um banco de dados PostgreSQL chamado `marketplace`
- Execute o script SQL de criação das tabelas (database_schema.sql)

4. **Popule o banco com dados de exemplo (opcional):**
```bash
npm run seed
```

## 🏃‍♂️ Executando

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 📚 Documentação da API

Acesse `http://localhost:3000/api/docs` para ver a documentação completa dos endpoints.

### Endpoints Principais

#### Autenticação
- `POST /api/users/register` - Registrar usuário
- `POST /api/users/login` - Fazer login
- `GET /api/users/profile` - Obter perfil (requer auth)

#### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Obter produto
- `POST /api/products` - Criar produto (vendedor)
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Deletar produto

#### Vendas
- `GET /api/sales/cart` - Obter carrinho
- `POST /api/sales/cart` - Adicionar ao carrinho
- `POST /api/sales` - Criar venda (checkout)
- `GET /api/sales` - Listar vendas/compras

#### Chat
- `POST /api/chat/messages` - Enviar mensagem
- `GET /api/chat/conversations` - Listar conversas
- `GET /api/chat/conversations/:id/messages` - Mensagens da conversa

#### Avaliações
- `GET /api/reviews` - Listar avaliações
- `POST /api/reviews` - Criar avaliação
- `GET /api/reviews/stats` - Estatísticas

#### Notificações
- `GET /api/notifications` - Listar notificações
- `PUT /api/notifications/:id/read` - Marcar como lida

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação. Inclua o token no header:

```
Authorization: Bearer <seu_token>
```

## 👥 Tipos de Usuário

- **comprador** - Pode comprar produtos
- **vendedor** - Pode vender produtos
- **ambos** - Pode comprar e vender
- **admin** - Acesso administrativo completo

## 🛡️ Segurança

- Rate limiting (100 req/15min geral, 5 req/15min para auth)
- Helmet para headers de segurança
- Validação de entrada
- Sanitização de dados
- Hash seguro de senhas
- Proteção contra SQL injection

## 📊 Monitoramento

### Health Check
```bash
GET /health
```

Retorna status do servidor e conexão com banco de dados.

### Logs
O sistema usa Morgan para logging de requisições HTTP.

## 🗄️ Estrutura do Banco

### Principais Tabelas
- `usuarios` - Dados dos usuários
- `vendedores` - Perfis de vendedores
- `produtos` - Catálogo de produtos
- `categorias_produtos` - Categorias
- `jogos_plataformas` - Jogos/plataformas
- `vendas` - Transações
- `itens_venda` - Itens das vendas
- `pagamentos` - Dados de pagamento
- `mensagens` - Sistema de chat
- `avaliacoes` - Sistema de avaliações
- `notificacoes` - Notificações do sistema

## 🧪 Dados de Teste

Após executar `npm run seed`, você terá:

### Usuários de Teste
- **Admin:** admin@gamemarket.com / 123456
- **Vendedor:** joao@email.com / 123456  
- **Comprador:** maria@email.com / 123456
- **Ambos:** pedro@email.com / 123456

### Produtos de Exemplo
- Skins de CS2 e Valorant
- Moedas virtuais (RP, V-Bucks)
- Contas de jogos
- Serviços de boost

## 🚨 Tratamento de Erros

A API retorna erros padronizados:

```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

### Códigos de Status
- `400` - Bad Request (dados inválidos)
- `401` - Unauthorized (não autenticado)
- `403` - Forbidden (sem permissão)
- `404` - Not Found (recurso não encontrado)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## 🔄 Versionamento

A API segue versionamento semântico (SemVer).

Versão atual: **1.0.0**

## 📝 Scripts Disponíveis

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia em modo desenvolvimento (nodemon)
- `npm run seed` - Popula banco com dados de exemplo
- `npm test` - Executa testes (a implementar)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

---

**GameMarket Team** - Marketplace de itens digitais para gamers
