require("dotenv").config();
const db = require("../config/database");
const bcrypt = require("bcryptjs");

async function resetPasswords() {
  try {
    console.log("🔑 Resetando senhas...\n");

    // Reset Admin (id 23) para a senha padrão 123456
    const adminHash = await bcrypt.hash("123456", 12);
    const adminResult = await db.query(
      "UPDATE usuarios SET senha_hash = $1 WHERE id = 23 RETURNING id, nome, email",
      [adminHash]
    );

    if (adminResult.rows.length > 0) {
      console.log("✅ Senha do Admin resetada:");
      console.log("   Email:", adminResult.rows[0].email);
      console.log("   Senha: 123456\n");
    }

    // Reset Dono (id 27) para a senha padrão 150975
    const donoHash = await bcrypt.hash("150975", 12);
    const donoResult = await db.query(
      "UPDATE usuarios SET senha_hash = $1 WHERE id = 27 RETURNING id, nome, email",
      [donoHash]
    );

    if (donoResult.rows.length > 0) {
      console.log("✅ Senha do Dono resetada:");
      console.log("   Email:", donoResult.rows[0].email);
      console.log("   Senha: 150975\n");
    }

    console.log("🎉 Ambas as senhas foram resetadas!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro:", err);
    process.exit(1);
  }
}

resetPasswords();
