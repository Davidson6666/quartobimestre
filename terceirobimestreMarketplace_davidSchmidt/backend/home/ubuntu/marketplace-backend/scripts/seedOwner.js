require("dotenv").config();
const db = require("../config/database");
const bcrypt = require("bcryptjs");

async function recreateDono() {
  try {
    console.log("🔄 Recriando usuário Dono...\n");

    // Hash da senha padrão 150975
    const senhaHash = await bcrypt.hash("150975", 12);

    // Inserir o usuário Dono
    const result = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, nome, email, tipo`,
      ["Dono", "donoFoda@gmail.com", senhaHash, "admin", true]
    );

    if (result.rows.length > 0) {
      console.log("✅ Usuário Dono recriado com sucesso!");
      console.log("   ID:", result.rows[0].id);
      console.log("   Nome:", result.rows[0].nome);
      console.log("   Email:", result.rows[0].email);
      console.log("   Tipo:", result.rows[0].tipo);
      console.log("\n📝 Credenciais:");
      console.log("   Email: donoFoda@gmail.com");
      console.log("   Senha: 150975");
    } else {
      console.log("⚠️  Usuário já existe ou não foi criado");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao recriar Dono:", err.message);
    process.exit(1);
  }
}

recreateDono();
