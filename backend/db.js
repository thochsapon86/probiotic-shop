require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ทดสอบการเชื่อมต่อตอนเริ่มเซิร์ฟเวอร์
pool
  .getConnection()
  .then((conn) => {
    console.log(`✅ เชื่อมต่อ database สำเร็จ (${process.env.DB_NAME})`);
    conn.release();
  })
  .catch((err) => {
    console.error("❌ เชื่อมต่อ database ไม่สำเร็จ:", err.message);
  });

module.exports = pool;