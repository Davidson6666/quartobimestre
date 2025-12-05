require("dotenv").config();
const db = require("../config/database");

async function checkAdmins() {
  try {
    const result = await db.query(
      "SELECT id, nome, email, tipo FROM usuarios WHERE tipo = 'admin'"
    );
    console.log("Admins no banco:");
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Erro:", err);
    process.exit(1);
  }
}

checkAdmins();
