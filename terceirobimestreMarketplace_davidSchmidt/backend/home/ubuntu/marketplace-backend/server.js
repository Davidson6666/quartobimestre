require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const db = require("./config/database");
const { globalErrorHandler, notFound } = require("./middleware/errorHandler");

// Importar rotas
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const salesRoutes = require("./routes/salesRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const vendedorRoutes = require("./routes/vendedorRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const port = process.env.PORT || 3000;

// ===== MIDDLEWARES DE SEGURANÇA =====
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    // Allow other origins (like Live Server at 127.0.0.1:5500) to load uploaded images
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Don't force a strict COOP which may interfere with cross-origin embedding during dev
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "blob:",
          "https://cdnjs.cloudflare.com",
        ],
        "script-src-elem": [
          "'self'",
          "'unsafe-inline'",
          "blob:",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "blob:",
        ],
        connectSrc: [
          "'self'",
          "http://127.0.0.1:5500",
          "http://localhost:5500",
          "http://localhost:3000",
        ],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      },
    },
  })
);

// ===== MIDDLEWARES GERAIS =====
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== SERVIR ARQUIVOS DE IMAGEM (UPLOADS) =====
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== MIDDLEWARE DE RATE LIMITING =====
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela de tempo
  message: {
    success: false,
    message: "Muitas requisições deste IP, tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// app.use('/api/', limiter);

// Rate limiting mais restritivo para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 8000, // máximo 8000 tentativas de login por IP
  message: {
    success: false,
    message: "Muitas tentativas de login, tente novamente em 15 minutos.",
  },
  skipSuccessfulRequests: true,
});

app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);

// ===== MIDDLEWARE DE HEALTH CHECK =====
app.get("/health", async (req, res) => {
  try {
    // Testar conexão com banco de dados
    const dbStatus = await db.testConnection();

    const healthCheck = {
      uptime: process.uptime(),
      message: "OK",
      timestamp: new Date().toISOString(),
      database: dbStatus ? "connected" : "disconnected",
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || "development",
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    const healthCheck = {
      uptime: process.uptime(),
      message: "ERROR",
      timestamp: new Date().toISOString(),
      database: "error",
      error: error.message,
    };

    res.status(503).json(healthCheck);
  }
});

// ===== ROTA PRINCIPAL =====
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GameMarket API está funcionando!",
    version: "1.0.0",
    documentation: "/api/docs",
    endpoints: {
      users: "/api/users",
      products: "/api/products",
      sales: "/api/sales",
      chat: "/api/chat",
      reviews: "/api/reviews",
      notifications: "/api/notifications",
    },
  });
});

// ===== DOCUMENTAÇÃO SIMPLES DA API =====
app.get("/api/docs", (req, res) => {
  res.json({
    title: "GameMarket API Documentation",
    version: "1.0.0",
    description: "API RESTful para marketplace de itens digitais de games",
    baseUrl: `${req.protocol}://${req.get("host")}/api`,
    endpoints: {
      authentication: {
        "POST /users/register": "Registrar novo usuário",
        "POST /users/login": "Fazer login",
        "GET /users/profile": "Obter perfil do usuário (requer auth)",
        "PUT /users/profile": "Atualizar perfil (requer auth)",
        "PUT /users/change-password": "Alterar senha (requer auth)",
      },
      products: {
        "GET /products": "Listar produtos com filtros",
        "GET /products/:id": "Obter produto por ID",
        "POST /products": "Criar produto (vendedor/admin)",
        "PUT /products/:id": "Atualizar produto (proprietário/admin)",
        "DELETE /products/:id": "Deletar produto (proprietário/admin)",
        "GET /products/categories": "Listar categorias",
        "GET /products/games": "Listar jogos/plataformas",
      },
      sales: {
        "GET /sales/cart": "Obter carrinho do usuário",
        "POST /sales/cart": "Adicionar item ao carrinho",
        "PUT /sales/cart/:id": "Atualizar item do carrinho",
        "DELETE /sales/cart/:id": "Remover item do carrinho",
        "POST /sales": "Criar venda (checkout)",
        "GET /sales": "Listar vendas/compras do usuário",
        "GET /sales/:id": "Obter detalhes da venda",
      },
      chat: {
        "POST /chat/messages": "Enviar mensagem",
        "GET /chat/conversations": "Listar conversas",
        "GET /chat/conversations/:id/messages": "Listar mensagens da conversa",
        "PUT /chat/conversations/:id/read": "Marcar mensagens como lidas",
      },
      reviews: {
        "GET /reviews": "Listar avaliações",
        "POST /reviews": "Criar avaliação",
        "GET /reviews/stats": "Obter estatísticas de avaliações",
        "PUT /reviews/:id/respond": "Responder avaliação",
        "POST /reviews/:id/useful": "Marcar avaliação como útil",
      },
      notifications: {
        "GET /notifications": "Listar notificações",
        "PUT /notifications/:id/read": "Marcar notificação como lida",
        "DELETE /notifications/:id": "Deletar notificação",
      },
    },
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer <token>",
      note: "Obtenha o token através do endpoint de login",
    },
    errorCodes: {
      400: "Bad Request - Dados inválidos",
      401: "Unauthorized - Token inválido ou ausente",
      403: "Forbidden - Sem permissão",
      404: "Not Found - Recurso não encontrado",
      429: "Too Many Requests - Rate limit excedido",
      500: "Internal Server Error - Erro interno do servidor",
    },
  });
});

// ===== ROTAS DA API =====
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/vendedores", vendedorRoutes);
app.use("/api/reports", reportRoutes);

// ===== MIDDLEWARE DE ERRO 404 =====
app.use(notFound);

// ===== MIDDLEWARE GLOBAL DE TRATAMENTO DE ERROS =====
app.use(globalErrorHandler);

// ===== INICIALIZAÇÃO DO SERVIDOR =====
const startServer = async () => {
  try {
    // Testar conexão com banco de dados
    const dbConnected = await db.testConnection();

    if (!dbConnected) {
      console.error("❌ Falha na conexão com o banco de dados");
      process.exit(1);
    }

    // Iniciar servidor
    const server = app.listen(port, () => {
      console.log(`🚀 Servidor GameMarket rodando em http://localhost:${port}`);
      console.log(`📚 Documentação da API: http://localhost:${port}/api/docs`);
      console.log(`🏥 Health Check: http://localhost:${port}/health`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n📡 Recebido ${signal}. Iniciando shutdown graceful...`);

      server.close(async () => {
        console.log("🔌 Servidor HTTP fechado");

        try {
          await db.close();
          console.log("🗄️ Conexões do banco de dados fechadas");
        } catch (error) {
          console.error("❌ Erro ao fechar conexões do banco:", error);
        }

        console.log("✅ Shutdown concluído");
        process.exit(0);
      });

      // Forçar shutdown após 10 segundos
      setTimeout(() => {
        console.error("⚠️ Forçando shutdown após timeout");
        process.exit(1);
      }, 10000);
    };

    // Capturar sinais de shutdown
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Capturar erros não tratados
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    });

    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
};

// Iniciar servidor apenas se não estiver sendo importado como módulo
if (require.main === module) {
  startServer();
}

module.exports = app;
