const bcrypt = require('bcrypt');
const pool = require('../db');

async function seedAdmin() {
  const hash = await bcrypt.hash('Admin@1234', 10);
  await pool.query(
  `INSERT INTO users (username, email, password_hash, role, full_name)
   VALUES ('admin', 'admin@example.com', ?, 'admin', 'Administrator')`,
  [hash]
  );
  console.log('Admin created: admin / Admin@1234');
  await pool.end();
}

seedAdmin().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
