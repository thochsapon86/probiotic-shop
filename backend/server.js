require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(morgan("dev"));

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});