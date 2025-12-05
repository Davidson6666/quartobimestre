// Script para resetar a senha do admin
require("dotenv").config();
const db = require("../config/database");
const bcrypt = require("bcryptjs");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "donoFoda@gmail.com";
const NEW_PASSWORD = "admin123"; // Nova senha padrão

async function resetAdminPassword() {
  try {
    console.log(`🔑 Resetando senha do admin: ${ADMIN_EMAIL}`);
    console.log(`📝 Nova senha: ${NEW_PASSWORD}`);

    // Gerar hash da nova senha
    const senhaHash = await bcrypt.hash(NEW_PASSWORD, 12);

    // Atualizar a senha no banco de dados
    const result = await db.query(
      "UPDATE usuarios SET senha_hash = $1 WHERE email = $2 RETURNING id, nome, email",
      [senhaHash, ADMIN_EMAIL]
    );

    if (result.rows.length === 0) {
      console.error("❌ Admin não encontrado com esse email!");
      process.exit(1);
    }

    console.log("✅ Senha resetada com sucesso!");
    console.log("👤 Admin:", result.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao resetar senha:", err);
    process.exit(1);
  }
}

resetAdminPassword();
