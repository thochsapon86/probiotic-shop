const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง' },
})

router.post(
  '/login',
  loginLimiter,
  [body('username').trim().notEmpty(), body('password').notEmpty()],
  async (req, res) => {
    if (!validationResult(req).isEmpty())
      return res.status(400).json({ message: 'กรุณากรอก Username และ Password' })

    const { username, password } = req.body
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
      const user = rows[0]
      // ใช้ข้อความเดียวกัน ไม่บอกว่าผิดที่ username หรือ password
      const ok = user && (await bcrypt.compare(password, user.password_hash))
      if (!ok) return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' })

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      )
      res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' })
    }
  }
)

router.get('/me', verifyToken, (req, res) => res.json(req.user))

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: "สมัครสมาชิกบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

const registerRules = [
  body("username")
    .trim()
    .matches(/^[A-Za-z0-9_]{4,20}$/)
    .withMessage("Username ต้องเป็น a-z, 0-9, _ ความยาว 4-20 ตัว"),
  body("email").trim().isEmail().withMessage("รูปแบบอีเมลไม่ถูกต้อง").normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password ต้องมีอย่างน้อย 8 ตัวอักษร")
    .matches(/[a-z]/).withMessage("Password ต้องมีตัวพิมพ์เล็ก")
    .matches(/[A-Z]/).withMessage("Password ต้องมีตัวพิมพ์ใหญ่")
    .matches(/[0-9]/).withMessage("Password ต้องมีตัวเลข")
    .matches(/[^A-Za-z0-9]/).withMessage("Password ต้องมีอักขระพิเศษ เช่น @ # ! $"),
  body("full_name").trim().notEmpty().withMessage("กรุณากรอกชื่อ-นามสกุล"),
  body("phone")
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{9,10}$/)
    .withMessage("เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก"),
];

router.post("/register", registerLimiter, registerRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });

  const { username, email, password, full_name, phone, address } = req.body;
  try {
    const [dup] = await pool.query(
      "SELECT username, email FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (dup.length > 0) {
      const msg = dup.some((u) => u.username === username)
        ? "Username นี้ถูกใช้งานแล้ว"
        : "อีเมลนี้ถูกใช้งานแล้ว";
      return res.status(409).json({ message: msg });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, address)
       VALUES (?, ?, ?, 'customer', ?, ?, ?)`,
      [username, email, password_hash, full_name, phone || null, address || null]
    );
    res.status(201).json({ message: "สมัครสมาชิกสำเร็จ" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Username หรืออีเมลนี้ถูกใช้งานแล้ว" });
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

module.exports = router;