const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// ---------- อัปโหลดรูปสินค้า ----------
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "products");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // ตั้งชื่อไฟล์เอง ไม่ใช้ชื่อจากผู้ใช้ (กันชื่อซ้ำและ path แปลกๆ)
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error("INVALID_TYPE")),
});

function handleUpload(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "ไฟล์รูปต้องมีขนาดไม่เกิน 2 MB"
        : err.message === "INVALID_TYPE"
        ? "อนุญาตเฉพาะไฟล์ JPG, PNG, WEBP"
        : "อัปโหลดรูปไม่สำเร็จ";
    res.status(400).json({ message });
  });
}

const toDbPath = (file) => `/uploads/products/${file.filename}`;

// ลบเฉพาะไฟล์ในโฟลเดอร์ uploads/products (ใช้ basename กัน path traversal)
function removeLocalImage(dbPath) {
  if (!dbPath || !dbPath.startsWith("/uploads/products/")) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(dbPath)), () => {});
}

// ตรวจ "ลายเซ็นไฟล์" จริง เพราะ mimetype ที่เบราว์เซอร์ส่งมาปลอมได้
function hasImageSignature(filePath) {
  const fd = fs.openSync(filePath, "r");
  const b = Buffer.alloc(12);
  fs.readSync(fd, b, 0, 12, 0);
  fs.closeSync(fd);
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const webp = b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
  return jpg || png || webp;
}
function verifyImage(req, res, next) {
  if (req.file && !hasImageSignature(req.file.path)) {
    removeLocalImage(toDbPath(req.file));
    return res.status(400).json({ message: "ไฟล์ไม่ใช่รูปภาพที่ถูกต้อง" });
  }
  next();
}

const rules = [
  body("name").trim().notEmpty().withMessage("กรุณากรอกชื่อสินค้า"),
  body("description").optional({ checkFalsy: true }).trim(),
  body("price").isFloat({ min: 0 }).withMessage("ราคาต้องเป็นตัวเลขไม่ต่ำกว่า 0"),
  body("stock").isInt({ min: 0 }).withMessage("จำนวนสต็อกต้องเป็นจำนวนเต็มไม่ต่ำกว่า 0"),
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

// POST /api/products  (admin)  รับ multipart/form-data  ฟิลด์รูป = image
router.post("/", verifyToken, requireAdmin, handleUpload, verifyImage, rules, async (req, res) => {
  const errors = validationResult(req);
  const image = req.file ? toDbPath(req.file) : null;
  if (!errors.isEmpty()) {
    removeLocalImage(image);
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { name, description, price, stock } = req.body;
  try {
    const [r] = await pool.query(
      "INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)",
      [name, description || null, price, stock, image]
    );
    res.status(201).json({ message: "เพิ่มสินค้าสำเร็จ", product_id: r.insertId });
  } catch (err) {
    removeLocalImage(image);
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// PUT /api/products/:id  (admin)
// ไม่แนบรูป = คงรูปเดิม / แนบรูปใหม่ = แทนที่ / remove_image=1 = ลบรูป
router.put("/:id", verifyToken, requireAdmin, handleUpload, verifyImage, rules, async (req, res) => {
  const errors = validationResult(req);
  const newImage = req.file ? toDbPath(req.file) : null;
  if (!errors.isEmpty()) {
    removeLocalImage(newImage);
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { name, description, price, stock } = req.body;
  try {
    const [old] = await pool.query("SELECT image_url FROM products WHERE product_id = ?", [req.params.id]);
    if (!old[0]) {
      removeLocalImage(newImage);
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    let image = old[0].image_url;
    if (newImage) image = newImage;
    else if (req.body.remove_image === "1") image = null;

    await pool.query(
      "UPDATE products SET name=?, description=?, price=?, stock=?, image_url=? WHERE product_id=?",
      [name, description || null, price, stock, image, req.params.id]
    );
    if (image !== old[0].image_url) removeLocalImage(old[0].image_url);
    res.json({ message: "แก้ไขสินค้าสำเร็จ" });
  } catch (err) {
    removeLocalImage(newImage);
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// DELETE /api/products/:id  (admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [old] = await pool.query("SELECT image_url FROM products WHERE product_id = ?", [req.params.id]);
    const [r] = await pool.query("DELETE FROM products WHERE product_id = ?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "ไม่พบสินค้า" });
    removeLocalImage(old[0]?.image_url);
    res.json({ message: "ลบสินค้าสำเร็จ" });
  } catch (err) {
    // สินค้าที่เคยถูกสั่งซื้อแล้วจะลบไม่ได้ (foreign key จาก order_details)
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(409).json({ message: "ลบไม่ได้ เพราะสินค้านี้เคยมีในรายการสั่งซื้อแล้ว" });
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

module.exports = router;