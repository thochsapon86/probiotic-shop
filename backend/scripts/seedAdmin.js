import bcrypt from 'bcrypt'
import { pool } from '../db.js'

const hash = await bcrypt.hash('Admin@1234', 10)
await pool.query(
  `INSERT INTO users (username, email, password_hash, role, full_name)
   VALUES ('admin', 'admin@example.com', ?, 'admin', 'Administrator')`,
  [hash]
)
console.log('Admin created')
process.exit()