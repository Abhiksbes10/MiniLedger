
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "miniledger",
});

const otpStore = new Map<
  string,
  { otp: string; expiresAt: number }
>();

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.post("/auth/request-otp", async (req, res) => {
  const phone = String(req.body.phone || "").trim();

  if (!/^\+?[0-9]{10,15}$/.test(phone)) {
    return res.status(400).json({
      error: "Enter a valid phone number.",
    });
  }

  const otp = String(
    Math.floor(100000 + Math.random() * 900000)
  );

  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  console.log(`Mock OTP for ${phone}: ${otp}`);

  return res.json({
    message: "Mock OTP generated.",
    otp,
  });
});

app.post("/auth/verify-otp", async (req, res) => {
  const phone = String(req.body.phone || "").trim();
  const otp = String(req.body.otp || "").trim();

  if (!/^\+?[0-9]{10,15}$/.test(phone) || !/^[0-9]{6}$/.test(otp)) {
    return res.status(400).json({
      error: "Valid phone and six-digit OTP are required.",
    });
  }

  const savedOtp = otpStore.get(phone);

  if (!savedOtp || savedOtp.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return res.status(400).json({
      error: "OTP is missing or expired. Request a new OTP.",
    });
  }

  if (savedOtp.otp !== otp) {
    return res.status(400).json({
      error: "Incorrect OTP.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (phone)
       VALUES ($1)
       ON CONFLICT (phone)
       DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id, phone`,
      [phone]
    );

    otpStore.delete(phone);

    return res.json({
      message: "Login successful.",
      user: result.rows[0],
    });
  } catch {
    return res.status(500).json({
      error: "Login failed. Please try again.",
    });
  }
});

app.get("/loans", async (req, res) => {
  const userId = Number(req.query.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      error: "A valid userId query parameter is required.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, friend_name, amount,
              due_date, is_repaid, created_at
       FROM loans
       WHERE user_id = $1
       ORDER BY due_date ASC, id DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({
      error: "Failed to fetch loans.",
    });
  }
});

app.post("/loans", async (req, res) => {
  const friendName = String(req.body.friendName || "").trim();
  const amount = Number(req.body.amount);
  const dueDate = String(req.body.dueDate || "");
  const userId = Number(req.body.userId);

  if (!friendName || friendName.length > 100) {
    return res.status(400).json({
      error: "Friend name is required (max 100 characters).",
    });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      error: "Amount must be greater than zero.",
    });
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      error: "A valid userId is required.",
    });
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
    Number.isNaN(Date.parse(dueDate)) ||
    new Date(`${dueDate}T00:00:00.000Z`)
      .toISOString()
      .slice(0, 10) !== dueDate
  ) {
    return res.status(400).json({
      error: "Enter a valid date in YYYY-MM-DD format.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, friendName, amount, dueDate]
    );

    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({
      error: "Failed to create loan. Check that the user exists.",
    });
  }
});

app.patch("/loans/:id/repaid", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid loan ID.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE loans
       SET is_repaid = TRUE
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Loan not found.",
      });
    }

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({
      error: "Failed to update loan.",
    });
  }
});

app.get("/summary/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      error: "Invalid user ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS total_lent,
         COALESCE(
           SUM(amount) FILTER (WHERE is_repaid = TRUE),
           0
         ) AS total_repaid,
         COALESCE(
           SUM(amount) FILTER (
             WHERE is_repaid = FALSE
               AND due_date < CURRENT_DATE
           ),
           0
         ) AS overdue_amount
       FROM loans
       WHERE user_id = $1`,
      [userId]
    );

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({
      error: "Failed to calculate summary.",
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`MiniLedger API running on http://localhost:${port}`);
});
