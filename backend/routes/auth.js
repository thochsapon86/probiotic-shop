const router = require("express").Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const resetPasswordRules = [
  body("password")
    .isLength({ min: 8 }).withMessage("Password ต้องมีอย่างน้อย 8 ตัวอักษร")
    .matches(/[a-z]/).withMessage("Password ต้องมีตัวพิมพ์เล็ก")
    .matches(/[A-Z]/).withMessage("Password ต้องมีตัวพิมพ์ใหญ่")
    .matches(/[0-9]/).withMessage("Password ต้องมีตัวเลข")
    .matches(/[^A-Za-z0-9]/).withMessage("Password ต้องมีอักขระพิเศษ"),
];

function createMailer() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

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
        { user_id: user.user_id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      )
      res.json({
        token,
        user: { user_id: user.user_id, username: user.username, role: user.role, full_name: user.full_name },
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' })
    }
  }
)

router.get('/me', verifyToken, (req, res) => res.json(req.user))

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // demo/local ให้ทดสอบซ้ำได้มากขึ้น แต่ production ยังคงจำกัดไว้ 5 ครั้ง/ชั่วโมง
  max: Number(process.env.FORGOT_PASSWORD_MAX || (process.env.NODE_ENV === "production" ? 5 : 20)),
  message: { message: "กรุณาลองใหม่ภายหลัง" },
});

// ไม่เปิดเผยว่า email มีบัญชีอยู่หรือไม่ เพื่อป้องกันการไล่ตรวจรายชื่อผู้ใช้
router.post("/forgot-password", forgotPasswordLimiter, [body("email").trim().isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });

  const genericMessage = "หากอีเมลนี้ลงทะเบียนไว้ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้";
  try {
    const [rows] = await pool.query("SELECT user_id, email FROM users WHERE email = ?", [req.body.email]);
    if (!rows[0]) return res.json({ message: genericMessage });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await pool.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE user_id = ?",
      [tokenHash, rows[0].user_id]
    );

    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`;
    const mailer = createMailer();
    if (mailer) {
      await mailer.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: req.body.email,
        subject: "รีเซ็ตรหัสผ่าน Probiotic Shop",
        text: `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 15 นาที): ${resetUrl}`,
      });
    } else if (process.env.NODE_ENV !== "production") {
      console.info(`[password-reset] ${req.body.email}: ${resetUrl}`);
    } else {
      return res.status(503).json({ message: "ระบบส่งอีเมลยังไม่พร้อมใช้งาน" });
    }
    res.json({ message: genericMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ไม่สามารถส่งคำขอ reset password ได้" });
  }
});

router.post("/reset-password", [body("token").isHexadecimal().isLength({ min: 64, max: 64 }), ...resetPasswordRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg || "ข้อมูลไม่ถูกต้อง" });

  const tokenHash = crypto.createHash("sha256").update(req.body.token).digest("hex");
  try {
    const [rows] = await pool.query(
      "SELECT user_id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [tokenHash]
    );
    if (!rows[0]) return res.status(400).json({ message: "ลิงก์ reset password ไม่ถูกต้องหรือหมดอายุแล้ว" });

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    await pool.query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?",
      [passwordHash, rows[0].user_id]
    );
    res.json({ message: "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ไม่สามารถตั้งรหัสผ่านใหม่ได้" });
  }
});

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
    const [created] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, address)
       VALUES (?, ?, ?, 'customer', ?, ?, ?)`,
      [username, email, password_hash, full_name, phone || null, address || null]
    );

    // ออก JWT ให้ทันทีเพื่อให้ Register API นำไปทดสอบ endpoint ที่ต้อง login ต่อใน Postman/Thunder Client ได้
    const token = jwt.sign(
      { user_id: created.insertId, username, role: "customer" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      token,
      user: {
        user_id: created.insertId,
        username,
        email,
        role: "customer",
        full_name,
      },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Username หรืออีเมลนี้ถูกใช้งานแล้ว" });
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

module.exports = router;
