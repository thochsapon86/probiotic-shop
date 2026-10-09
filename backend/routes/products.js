const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const rules = [
  body("name").trim().notEmpty().withMessage("กรุณากรอกชื่อสินค้า"),
  body("description").optional({ checkFalsy: true }).trim(),
  body("price").isFloat({ min: 0 }).withMessage("ราคาต้องเป็นตัวเลขไม่ต่ำกว่า 0"),
  body("stock").isInt({ min: 0 }).withMessage("จำนวนสต็อกต้องเป็นจำนวนเต็มไม่ต่ำกว่า 0"),
  body("image_url").optional({ checkFalsy: true }).trim(),
];

// GET /api/products?search=คำค้น&category=หมวด  (ต้อง login)
// admin เห็นสินค้าทั้งหมด / ลูกค้าเห็นเฉพาะสินค้าที่เปิดขาย (is_active = 1)
router.get("/", verifyToken, async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const category = (req.query.category || "").trim();
    const where = [];
    const params = [];

    if (req.user.role !== "admin") where.push("is_active = 1");
    if (search) {
      where.push("(name LIKE ? OR description LIKE ? OR product_id = ?)");
      params.push(`%${search}%`, `%${search}%`, Number(search) || 0);
    }
    if (category) {
      where.push("category = ?");
      params.push(category);
    }

    const sql =
      "SELECT product_id, name, description, price, stock, image_url, category, is_active FROM products" +
      (where.length ? " WHERE " + where.join(" AND ") : "") +
      " ORDER BY product_id DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// GET /api/products/featured  (สาธารณะ ไม่ต้อง login ใช้แสดงบนหน้าแรก)
// ตอนนี้ = สินค้าที่เปิดขายและมีสต็อก เรียงจากใหม่สุด สูงสุด 9 รายการ
router.get("/featured", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT product_id, name, description, price, stock, image_url, category
       FROM products
       WHERE is_active = 1 AND stock > 0
       ORDER BY created_at DESC, product_id DESC
       LIMIT 9`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// GET /api/products/categories  (ต้องอยู่ก่อน /:id)
router.get("/categories", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category <> '' AND is_active = 1 ORDER BY category"
    );
    res.json(rows.map((r) => r.category));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// GET /api/products/:id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products WHERE product_id = ?", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: "ไม่พบสินค้า" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// POST /api/products  (admin)
router.post("/", verifyToken, requireAdmin, rules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { name, description, price, stock, image_url } = req.body;
  try {
    const [r] = await pool.query(
      "INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)",
      [name, description || null, price, stock, image_url || null]
    );
    res.status(201).json({ message: "เพิ่มสินค้าสำเร็จ", product_id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// PUT /api/products/:id  (admin)
router.put("/:id", verifyToken, requireAdmin, rules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { name, description, price, stock, image_url } = req.body;
  try {
    const [r] = await pool.query(
      "UPDATE products SET name=?, description=?, price=?, stock=?, image_url=? WHERE product_id=?",
      [name, description || null, price, stock, image_url || null, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "ไม่พบสินค้า" });
    res.json({ message: "แก้ไขสินค้าสำเร็จ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// DELETE /api/products/:id  (admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [r] = await pool.query("DELETE FROM products WHERE product_id = ?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "ไม่พบสินค้า" });
    res.json({ message: "ลบสินค้าสำเร็จ" });
  } catch (err) {
    // สินค้าที่เคยถูกสั่งซื้อแล้วจะลบไม่ได้ (foreign key จาก order_items)
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(409).json({ message: "ลบไม่ได้ เพราะสินค้านี้เคยมีในรายการสั่งซื้อแล้ว" });
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

module.exports = router;