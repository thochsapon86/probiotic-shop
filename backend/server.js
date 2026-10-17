// จุดเริ่มต้นของ Express API: โหลด environment, middleware และ route หลัก
const path = require("path");
// โหลด .env จากโฟลเดอร์ backend โดยตรง ไม่ขึ้นกับว่าผู้ใช้สั่งรันจาก cwd ไหน
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// อนุญาตเฉพาะ origin ที่อยู่ใน CLIENT_URL และรองรับหลาย origin คั่นด้วย comma
const corsOptions = {
  // อนุญาต request ที่ไม่มี Origin ด้วย เช่น health check จาก server หรือ curl
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
// อ่าน JSON body ก่อนส่ง request เข้า route เช่น Login หรือสร้าง Order
app.use(morgan("dev"));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => res.set("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);
// เปิดไฟล์รูปสินค้าให้ Browser ขอผ่าน URL /uploads ได้

app.get("/", (req, res) => {
  res.send("Probiotic Shop API");
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM users");
    res.json({ message: "เชื่อมต่อ database สำเร็จ", users: rows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เชื่อมต่อ database ไม่ได้", error: err.message });
  }
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/dashboard", require("./routes/dashboard"));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
