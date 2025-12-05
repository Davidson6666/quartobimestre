# link para o youtube : https://youtu.be/2t0v_FdbMmI

# GameMarket - Marketplace de Produtos para Games

Marketplace completo desenvolvido com **Node.js/Express** no backend e **HTML, CSS e JavaScript puro** no frontend.

## 📋 Estrutura do Projeto

```
gamemarket-completo/
├── backend/              # Backend Node.js/Express
│   ├── config/          # Configurações (database, etc)
│   ├── controllers/     # Controladores das rotas
│   ├── middleware/      # Middlewares (autenticação, etc)
│   ├── models/          # Modelos de dados
│   ├── routes/          # Definição de rotas
│   ├── scripts/         # Scripts auxiliares (seed, etc)
│   ├── server.js        # Arquivo principal do servidor
│   └── package.json     # Dependências do backend
│
└── frontend/            # Frontend HTML/CSS/JS
    ├── css/             # Arquivos CSS
    ├── js/              # Arquivos JavaScript
    ├── pages/           # Páginas HTML
    ├── assets/          # Imagens e outros assets
    └── index.html       # Página inicial
```

## 🚀 Tecnologias Utilizadas

### Backend

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **bcrypt** - Criptografia de senhas
- **dotenv** - Variáveis de ambiente

### Frontend

- **HTML5** - Estrutura
- **CSS3** - Estilização (com variáveis CSS e animações)
- **JavaScript (Vanilla)** - Lógica e interatividade
- **Fetch API** - Comunicação com o backend

## 📦 Instalação e Configuração

### 1. Pré-requisitos

- **Node.js** (v14 ou superior)
- **PostgreSQL** (v12 ou superior)
- **npm** ou **yarn**

### 2. Configurar o Backend

```bash
# Navegar para o diretório do backend
cd backend

# Instalar dependências
npm install

# Criar arquivo .env na raiz do backend
# Copie o conteúdo abaixo e ajuste conforme necessário
```

**Conteúdo do arquivo `.env`:**

```env
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gamemarket
DB_USER=postgres
DB_PASSWORD=postgres

# Configuração do JWT
JWT_SECRET=seu_secret_jwt_super_seguro_aqui

# Porta do servidor
PORT=3000
```

### 3. Configurar o Banco de Dados

```bash
# Criar o banco de dados no PostgreSQL
psql -U postgres
CREATE DATABASE gamemarket;
\q

# Executar o script de seed (criar tabelas e dados iniciais)
cd backend
npm run seed
```

### 4. Iniciar o Backend

```bash
# No diretório backend
npm start

# Ou para desenvolvimento com auto-reload
npm run dev
```

O backend estará rodando em `http://localhost:3000`

### 5. Iniciar o Frontend

O frontend é composto apenas de arquivos estáticos HTML, CSS e JavaScript, então você pode abri-lo de várias formas:

**Opção 1: Servidor HTTP Simples (Recomendado)**

```bash
# No diretório frontend
# Usando Python 3
python3 -m http.server 8000

# Ou usando Node.js (se tiver http-server instalado globalmente)
npx http-server -p 8000
```

Acesse em: `http://localhost:8000`

**Opção 2: Extensão Live Server do VS Code**

Se você usa VS Code, instale a extensão "Live Server" e clique com o botão direito no `index.html` e selecione "Open with Live Server".

**Opção 3: Abrir diretamente no navegador**

Você pode abrir o arquivo `index.html` diretamente no navegador, mas algumas funcionalidades podem não funcionar corretamente devido a restrições de CORS.

## 👥 Usuários de Teste

Após executar o script de seed, os seguintes usuários estarão disponíveis:

### Admin

- **E-mail:** admin@gamemarket.com
- **Senha:** admin123

### Vendedor

- **E-mail:** vendedor@gamemarket.com
- **Senha:** vendedor123

### Comprador

- **E-mail:** comprador@gamemarket.com
- **Senha:** comprador123

## 📱 Funcionalidades Implementadas

### Para Visitantes

- ✅ Visualizar página inicial (homepage)
- ✅ Explorar produtos em destaque
- ✅ Visualizar categorias populares
- ✅ Criar conta (comprador ou vendedor)
- ✅ Fazer login

### Para Compradores

- ✅ Visualizar produtos
- ⏳ Adicionar ao carrinho (em desenvolvimento)
- ⏳ Finalizar compra (em desenvolvimento)
- ⏳ Acompanhar pedidos (em desenvolvimento)

### Para Vendedores

- ✅ Dashboard do vendedor
- ✅ Visualizar estatísticas de vendas
- ✅ Adicionar novos produtos
- ✅ Editar produtos existentes
- ✅ Excluir produtos
- ✅ Gerenciar estoque
- ⏳ Visualizar vendas (em desenvolvimento)
- ⏳ Gerenciar funcionários (em desenvolvimento)

### Para Administradores

- ⏳ Painel administrativo (em desenvolvimento)
- ⏳ Gerenciar usuários (em desenvolvimento)
- ⏳ Gerenciar jogos e categorias (em desenvolvimento)

## 🎨 Design e UX

O frontend foi desenvolvido com foco em:

- **Design Moderno**: Uso de gradientes, sombras e animações suaves
- **Responsividade**: Adaptável a diferentes tamanhos de tela
- **Acessibilidade**: Estrutura semântica e navegação por teclado
- **Performance**: Código otimizado e carregamento rápido
- **UX Intuitiva**: Fluxos de usuário claros e feedback visual

## 🔒 Segurança

- Senhas criptografadas com bcrypt
- Autenticação via JWT
- Validação de dados no backend
- Proteção contra SQL Injection (usando queries parametrizadas)
- CORS configurado adequadamente

## 📚 Documentação da API

Com o backend rodando, acesse:

- **Documentação:** `http://localhost:3000/api/docs`
- **Health Check:** `http://localhost:3000/health`

## 🛠️ Desenvolvimento

### Estrutura de Rotas do Frontend

- `/` - Página inicial (homepage)
- `/pages/login.html` - Página de login
- `/pages/register.html` - Página de registro
- `/pages/seller-dashboard.html` - Dashboard do vendedor

### Estrutura de Rotas da API

- `POST /api/users/register` - Registrar novo usuário
- `POST /api/users/login` - Fazer login
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto (vendedor)
- `PUT /api/products/:id` - Atualizar produto (vendedor)
- `DELETE /api/products/:id` - Excluir produto (vendedor)
- `GET /api/games` - Listar jogos
- `GET /api/categories` - Listar categorias

Additional useful endpoints

- `POST /api/users/become-seller` - (Authenticated) Permite que um usuário autenticado torne sua conta em vendedor (enviar { sigla: "loja" } ).

Examples (PowerShell / curl):

```powershell
# Become seller (usuário autenticado - substitua <TOKEN> pelo token JWT):
curl -Method POST "http://localhost:3000/api/users/become-seller" `
    -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer <TOKEN>" } `
    -Body ('{"sigla":"minhasigla"}')

# Admin creating vendedor for an existing user (requires admin token):
curl -Method POST "http://localhost:3000/api/vendedores" `
    -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer <ADMIN_TOKEN>" } `
    -Body ('{"usuario_id":123}')
```

## 🐛 Troubleshooting

### Backend não inicia

1. Verifique se o PostgreSQL está rodando
2. Confirme as credenciais no arquivo `.env`
3. Certifique-se de que o banco de dados `gamemarket` foi criado
4. Execute `npm run seed` para criar as tabelas

### Frontend não se conecta ao backend

1. Verifique se o backend está rodando em `http://localhost:3000`
2. Abra o console do navegador (F12) e verifique erros de CORS
3. Certifique-se de que está usando um servidor HTTP (não abrindo o arquivo diretamente)

### Erro de autenticação

1. Limpe o localStorage do navegador
2. Faça logout e login novamente
3. Verifique se o token JWT não expirou

## 📝 Próximos Passos

- [ ] Implementar carrinho de compras
- [ ] Sistema de checkout e pagamento
- [ ] Chat entre comprador e vendedor
- [ ] Sistema de avaliações
- [ ] Painel administrativo completo
- [ ] Notificações em tempo real
- [ ] Upload de imagens de produtos
- [ ] Filtros avançados de busca

## 📄 Licença

Este projeto foi desenvolvido para fins educacionais e de demonstração.

## 👨‍💻 Autor

Desenvolvido com ❤️ para o GameMarket

---

**Nota:** Este é um projeto em desenvolvimento. Algumas funcionalidades ainda estão sendo implementadas.
