const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();


const app = express.Router();
const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads-alhakim-catering')));

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

const pool = mysql.createPool({
  host: "localhost",
  user: "kinq6231_alhakim",
  password: "kinq6231_alhakim",
  database: "kinq6231_alhakim",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// ========================================
// FINANCIAL & ACCOUNTING HELPER FUNCTIONS
// ========================================

/**
 * 1. Otomatisasi Penjualan Pesanan ke Neraca & Arus Kas
 * Halaman 3 & 4 PDF:
 * A. DP:
 *    Debit: Kas (nominal DP)
 *    Debit: Piutang Usaha (sisa pembayaran)
 *    Kredit: Pendapatan Penjualan (total order)
 *    Arus Kas: Operasi -> Penjualan (uang DP yang benar-benar diterima)
 * B. COD / Transfer / Tunai:
 *    Debit: Kas (total pembayaran)
 *    Kredit: Pendapatan Penjualan (total order)
 *    Arus Kas: Operasi -> Penjualan (total pembayaran)
 */
async function recordOrderSalesFinancials(connection, orderId, paymentMethod, paymentAmount, finalAmount, userId) {
  try {
    const finalTotal = parseFloat(finalAmount) || 0;
    if (finalTotal <= 0) return;

    const normalizedMethod = (paymentMethod || 'transfer').toLowerCase();

    // Check if journal entry already recorded for this order to prevent duplicate
    const [existing] = await connection.query(
      'SELECT id FROM accounting_journal_entries WHERE reference_type = "order" AND reference_id = ? AND description LIKE "Penjualan pesanan%"',
      [orderId]
    );
    if (existing.length > 0) {
      return;
    }

    if (normalizedMethod === 'dp') {
      const nominalDp = parseFloat(paymentAmount) > 0 ? parseFloat(paymentAmount) : (finalTotal * 0.5);
      const sisaPembayaran = Math.max(0, finalTotal - nominalDp);

      // 1. Neraca: Debit Kas (DP), Debit Piutang Usaha (Sisa), Kredit Pendapatan Penjualan (Total)
      await connection.query(
        `INSERT INTO accounting_journal_entries 
         (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
         VALUES (CURRENT_DATE, 'order', ?, ?, 'Kas', 'Pendapatan Penjualan', ?, ?)`,
        [orderId, `Penjualan pesanan DP #${orderId} (Uang Muka)`, nominalDp, userId || null]
      );

      if (sisaPembayaran > 0) {
        await connection.query(
          `INSERT INTO accounting_journal_entries 
           (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
           VALUES (CURRENT_DATE, 'order', ?, ?, 'Piutang Usaha', 'Pendapatan Penjualan', ?, ?)`,
          [orderId, `Penjualan pesanan DP #${orderId} (Sisa Piutang Usaha)`, sisaPembayaran, userId || null]
        );
      }

      // 2. Arus Kas: Operasi -> Penjualan (Hanya uang DP yang diterima)
      const [cfRes] = await connection.query(
        `INSERT INTO cash_flow_transactions 
         (type, activity_category, sub_category, debit_account, credit_account, amount, description, order_id, created_by) 
         VALUES ('income', 'operasi', 'Penjualan', 'Kas', 'Pendapatan Penjualan', ?, ?, ?, ?)`,
        [nominalDp, `Penerimaan DP pesanan #${orderId}`, orderId, userId || null]
      );

      await connection.query(
        `INSERT INTO cash_flow_edit_history 
         (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
         VALUES (?, ?, 'income', ?, ?, 'operasi', 'Penjualan', 'Kas', 'Pendapatan Penjualan', 'created')`,
        [cfRes.insertId, userId || null, nominalDp, `Penerimaan DP pesanan #${orderId}`]
      );
    } else {
      // COD, Transfer, Tunai
      // 1. Neraca: Debit Kas, Kredit Pendapatan Penjualan
      await connection.query(
        `INSERT INTO accounting_journal_entries 
         (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
         VALUES (CURRENT_DATE, 'order', ?, ?, 'Kas', 'Pendapatan Penjualan', ?, ?)`,
        [orderId, `Penjualan pesanan #${orderId} (${normalizedMethod.toUpperCase()})`, finalTotal, userId || null]
      );

      // 2. Arus Kas: Operasi -> Penjualan
      const [cfRes] = await connection.query(
        `INSERT INTO cash_flow_transactions 
         (type, activity_category, sub_category, debit_account, credit_account, amount, description, order_id, created_by) 
         VALUES ('income', 'operasi', 'Penjualan', 'Kas', 'Pendapatan Penjualan', ?, ?, ?, ?)`,
        [finalTotal, `Penerimaan pembayaran pesanan #${orderId} (${normalizedMethod.toUpperCase()})`, orderId, userId || null]
      );

      await connection.query(
        `INSERT INTO cash_flow_edit_history 
         (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
         VALUES (?, ?, 'income', ?, ?, 'operasi', 'Penjualan', 'Kas', 'Pendapatan Penjualan', 'created')`,
        [cfRes.insertId, userId || null, finalTotal, `Penerimaan pembayaran pesanan #${orderId} (${normalizedMethod.toUpperCase()})`]
      );
    }
  } catch (error) {
    console.error('recordOrderSalesFinancials error:', error);
  }
}

/**
 * 2. Pelunasan DP Pesanan
 * Halaman 4 PDF:
 * Pelunasan DP: Debit Kas/Bank, Kredit Piutang Usaha. Pendapatan tidak dicatat ulang.
 * Arus Kas: Operasi -> Penjualan (sebesar sisa pelunasan)
 */
async function recordOrderDpSettlement(connection, orderId, sisaAmount, userId) {
  try {
    const amount = parseFloat(sisaAmount) || 0;
    if (amount <= 0) return;

    // Check if pelunasan already recorded
    const [existing] = await connection.query(
      'SELECT id FROM accounting_journal_entries WHERE reference_type = "order" AND reference_id = ? AND description LIKE "Pelunasan DP%"',
      [orderId]
    );
    if (existing.length > 0) {
      return;
    }

    // 1. Neraca: Debit Kas, Kredit Piutang Usaha
    await connection.query(
      `INSERT INTO accounting_journal_entries 
       (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
       VALUES (CURRENT_DATE, 'order', ?, ?, 'Kas', 'Piutang Usaha', ?, ?)`,
      [orderId, `Pelunasan DP pesanan #${orderId}`, amount, userId || null]
    );

    // 2. Arus Kas: Operasi -> Penjualan (Kas masuk sisa pembayaran)
    const [cfRes] = await connection.query(
      `INSERT INTO cash_flow_transactions 
       (type, activity_category, sub_category, debit_account, credit_account, amount, description, order_id, created_by) 
       VALUES ('income', 'operasi', 'Penjualan', 'Kas', 'Piutang Usaha', ?, ?, ?, ?)`,
      [amount, `Pelunasan DP pesanan #${orderId}`, orderId, userId || null]
    );

    await connection.query(
      `INSERT INTO cash_flow_edit_history 
       (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
       VALUES (?, ?, 'income', ?, ?, 'operasi', 'Penjualan', 'Kas', 'Piutang Usaha', 'created')`,
      [cfRes.insertId, userId || null, amount, `Pelunasan DP pesanan #${orderId}`]
    );
  } catch (error) {
    console.error('recordOrderDpSettlement error:', error);
  }
}

/**
 * 3. Pembatalan Transaksi Penjualan
 * Halaman 9 & 10 PDF:
 * Pembayaran dikembalikan:
 * - Neraca: Debit: Pembatalan penjualan, Kredit: Kas
 * - Arus Kas: Operasi -> Penjualan (Kas keluar sesuai nominal pengembalian)
 * Pembayaran tidak dikembalikan: Tidak ada transaksi baru
 */
async function recordOrderCancellationFinancials(connection, orderId, refundAmount, refundNotes, userId) {
  try {
    const refund = parseFloat(refundAmount) || 0;
    if (refund <= 0) return;

    // Check if cancellation refund already recorded
    const [existing] = await connection.query(
      'SELECT id FROM accounting_journal_entries WHERE reference_type = "order" AND reference_id = ? AND debit_account = "Pembatalan penjualan"',
      [orderId]
    );
    if (existing.length > 0) {
      return;
    }

    const desc = `Pengembalian dana pembatalan pesanan #${orderId}${refundNotes ? ': ' + refundNotes : ''}`;

    // 1. Neraca: Debit Pembatalan penjualan, Kredit Kas
    await connection.query(
      `INSERT INTO accounting_journal_entries 
       (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
       VALUES (CURRENT_DATE, 'order', ?, ?, 'Pembatalan penjualan', 'Kas', ?, ?)`,
      [orderId, desc, refund, userId || null]
    );

    // 2. Arus Kas: Operasi -> Penjualan (Kas keluar)
    const [cfRes] = await connection.query(
      `INSERT INTO cash_flow_transactions 
       (type, activity_category, sub_category, debit_account, credit_account, amount, description, order_id, created_by) 
       VALUES ('expense', 'operasi', 'Penjualan', 'Pembatalan penjualan', 'Kas', ?, ?, ?, ?)`,
      [refund, desc, orderId, userId || null]
    );

    await connection.query(
      `INSERT INTO cash_flow_edit_history 
       (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
       VALUES (?, ?, 'expense', ?, ?, 'operasi', 'Penjualan', 'Pembatalan penjualan', 'Kas', 'created')`,
      [cfRes.insertId, userId || null, refund, desc]
    );
  } catch (error) {
    console.error('recordOrderCancellationFinancials error:', error);
  }
}

/**
 * 4. Otomatisasi Transaksi Pembelian (Purchases)
 * Halaman 5 & 6 PDF:
 * Tunai / Transfer:
 * - Neraca: Debit Persediaan, Kredit Kas (total harga)
 * - Arus Kas: Operasi -> Pembelian Persediaan (Kas keluar total harga)
 * DP:
 * - Neraca: Debit Persediaan (total harga), Kredit Kas (DP dibayar), Kredit Utang Usaha (sisa pembayaran)
 * - Arus Kas: Operasi -> Pembelian Persediaan (Kas keluar DP dibayar)
 */
async function recordPurchaseFinancials(connection, purchase, userId) {
  try {
    const totalPrice = parseFloat(purchase.total_price) || 0;
    if (totalPrice <= 0) return;

    const method = (purchase.payment_method || 'Tunai');

    // Check if already recorded
    const [existing] = await connection.query(
      'SELECT id FROM accounting_journal_entries WHERE reference_type = "purchase" AND reference_id = ?',
      [purchase.id]
    );
    if (existing.length > 0) {
      return;
    }

    if (method === 'DP') {
      const dpAmount = parseFloat(purchase.dp_amount) || 0;
      const remaining = parseFloat(purchase.remaining_payment) || (totalPrice - dpAmount);

      // Neraca DP Pembelian:
      // Debit Persediaan (totalPrice), Kredit Kas (dpAmount), Kredit Utang Usaha (remaining)
      if (dpAmount > 0) {
        await connection.query(
          `INSERT INTO accounting_journal_entries 
           (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
           VALUES (?, 'purchase', ?, ?, 'Persediaan', 'Kas', ?, ?)`,
          [purchase.purchase_date, purchase.id, `Pembelian #${purchase.purchase_no}: ${purchase.item_name} (DP Dibayar)`, dpAmount, userId || null]
        );
      }

      if (remaining > 0) {
        await connection.query(
          `INSERT INTO accounting_journal_entries 
           (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
           VALUES (?, 'purchase', ?, ?, 'Persediaan', 'Utang Usaha', ?, ?)`,
          [purchase.purchase_date, purchase.id, `Pembelian #${purchase.purchase_no}: ${purchase.item_name} (Utang Usaha)`, remaining, userId || null]
        );
      }

      // Arus Kas: Kas keluar sebesar DP yang dibayar
      if (dpAmount > 0) {
        const [cfRes] = await connection.query(
          `INSERT INTO cash_flow_transactions 
           (type, activity_category, sub_category, debit_account, credit_account, amount, description, proof_image_url, created_by) 
           VALUES ('expense', 'operasi', 'Pembelian persediaan', 'Persediaan', 'Kas', ?, ?, ?, ?)`,
          [dpAmount, `Pembayaran DP pembelian #${purchase.purchase_no}: ${purchase.item_name}`, purchase.invoice_proof_url || null, userId || null]
        );

        await connection.query(
          `INSERT INTO cash_flow_edit_history 
           (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
           VALUES (?, ?, 'expense', ?, ?, 'operasi', 'Pembelian persediaan', 'Persediaan', 'Kas', 'created')`,
          [cfRes.insertId, userId || null, dpAmount, `Pembayaran DP pembelian #${purchase.purchase_no}: ${purchase.item_name}`]
        );
      }
    } else {
      // Tunai atau Transfer
      // Neraca: Debit Persediaan, Kredit Kas
      await connection.query(
        `INSERT INTO accounting_journal_entries 
         (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
         VALUES (?, 'purchase', ?, ?, 'Persediaan', 'Kas', ?, ?)`,
        [purchase.purchase_date, purchase.id, `Pembelian #${purchase.purchase_no}: ${purchase.item_name} (${method})`, totalPrice, userId || null]
      );

      // Arus Kas: Kas keluar total pembayaran
      const [cfRes] = await connection.query(
        `INSERT INTO cash_flow_transactions 
         (type, activity_category, sub_category, debit_account, credit_account, amount, description, proof_image_url, created_by) 
         VALUES ('expense', 'operasi', 'Pembelian persediaan', 'Persediaan', 'Kas', ?, ?, ?, ?)`,
        [totalPrice, `Pembelian persediaan #${purchase.purchase_no}: ${purchase.item_name} (${method})`, purchase.invoice_proof_url || null, userId || null]
      );

      await connection.query(
        `INSERT INTO cash_flow_edit_history 
         (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
         VALUES (?, ?, 'expense', ?, ?, 'operasi', 'Pembelian persediaan', 'Persediaan', 'Kas', 'created')`,
        [cfRes.insertId, userId || null, totalPrice, `Pembelian persediaan #${purchase.purchase_no}: ${purchase.item_name} (${method})`]
      );
    }
  } catch (error) {
    console.error('recordPurchaseFinancials error:', error);
  }
}

/**
 * 5. Pelunasan DP Pembelian
 * Halaman 6 PDF:
 * Pelunasan: Kas keluar sesuai sisa pembayaran.
 * Neraca: Debit Utang Usaha, Kredit Kas
 */
async function recordPurchaseDpSettlement(connection, purchase, userId) {
  try {
    const remaining = parseFloat(purchase.remaining_payment) || 0;
    if (remaining <= 0) return;

    // Neraca: Debit Utang Usaha, Kredit Kas
    await connection.query(
      `INSERT INTO accounting_journal_entries 
       (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
       VALUES (CURRENT_DATE, 'purchase', ?, ?, 'Utang Usaha', 'Kas', ?, ?)`,
      [purchase.id, `Pelunasan utang pembelian #${purchase.purchase_no}: ${purchase.item_name}`, remaining, userId || null]
    );

    // Arus Kas: Operasi -> Pembelian persediaan (Kas keluar)
    const [cfRes] = await connection.query(
      `INSERT INTO cash_flow_transactions 
       (type, activity_category, sub_category, debit_account, credit_account, amount, description, created_by) 
       VALUES ('expense', 'operasi', 'Pembelian persediaan', 'Utang Usaha', 'Kas', ?, ?, ?)`,
      [remaining, `Pelunasan pembelian #${purchase.purchase_no}: ${purchase.item_name}`, userId || null]
    );

    await connection.query(
      `INSERT INTO cash_flow_edit_history 
       (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
       VALUES (?, ?, 'expense', ?, ?, 'operasi', 'Pembelian persediaan', 'Utang Usaha', 'Kas', 'created')`,
      [cfRes.insertId, userId || null, remaining, `Pelunasan pembelian #${purchase.purchase_no}: ${purchase.item_name}`]
    );
  } catch (error) {
    console.error('recordPurchaseDpSettlement error:', error);
  }
}

/**
 * 6. Transaksi Pembelian Direturn
 * Halaman 11 PDF:
 * 1. Otomatis Neraca: Barang direturn, uang dikembalikan:
 *    Debit: Kas, Kredit: Persediaan
 * 2. Otomatis Arus Kas: Jika uang dikembalikan: Operasi -> Pembelian Persediaan, Kas masuk sesuai nominal pengembalian.
 * 3. Otomatis Stok Persediaan: Stok berkurang sesuai jumlah barang yang direturn, stok opname otomatis menyesuaikan.
 */
async function recordPurchaseReturnFinancials(connection, purchase, returnAmount, returnQty, returnNotes, userId) {
  try {
    const amount = parseFloat(returnAmount) || 0;
    const qty = parseFloat(returnQty) || 0;

    // 1. Neraca jika ada pengembalian uang
    if (amount > 0) {
      const desc = `Return pembelian #${purchase.purchase_no}: ${purchase.item_name}${returnNotes ? ' - ' + returnNotes : ''}`;
      await connection.query(
        `INSERT INTO accounting_journal_entries 
         (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
         VALUES (CURRENT_DATE, 'purchase', ?, ?, 'Kas', 'Persediaan', ?, ?)`,
        [purchase.id, desc, amount, userId || null]
      );

      // 2. Arus Kas: Kas masuk (refund)
      const [cfRes] = await connection.query(
        `INSERT INTO cash_flow_transactions 
         (type, activity_category, sub_category, debit_account, credit_account, amount, description, created_by) 
         VALUES ('income', 'operasi', 'Pembelian persediaan', 'Kas', 'Persediaan', ?, ?, ?)`,
        [amount, desc, userId || null]
      );

      await connection.query(
        `INSERT INTO cash_flow_edit_history 
         (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
         VALUES (?, ?, 'income', ?, ?, 'operasi', 'Pembelian persediaan', 'Kas', 'Persediaan', 'created')`,
        [cfRes.insertId, userId || null, amount, desc]
      );
    }

    // 3. Stok Persediaan berkurang jika barang direturn
    if (qty > 0 && purchase.inventory_item_id) {
      const [items] = await connection.query(
        'SELECT stock FROM inventory_items WHERE id = ? FOR UPDATE',
        [purchase.inventory_item_id]
      );
      if (items.length > 0) {
        const stockInitial = parseFloat(items[0].stock);
        const stockFinal = Math.max(0, stockInitial - qty);

        await connection.query(
          'UPDATE inventory_items SET stock = ? WHERE id = ?',
          [stockFinal, purchase.inventory_item_id]
        );

        await connection.query(
          `INSERT INTO inventory_stock_logs 
           (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
           VALUES (?, CURRENT_DATE, ?, 0, ?, ?, ?, 'return', ?, ?)`,
          [
            purchase.inventory_item_id,
            stockInitial,
            qty,
            stockFinal,
            `Return pembelian #${purchase.purchase_no}${returnNotes ? ': ' + returnNotes : ''}`,
            purchase.id,
            userId || null
          ]
        );
      }
    }
  } catch (error) {
    console.error('recordPurchaseReturnFinancials error:', error);
  }
}

// Helpers for Purchase and Request Number Generators
async function generatePurchaseNo(connection) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `PO-${yyyy}${mm}${dd}-`;

  const [rows] = await connection.query(
    'SELECT purchase_no FROM purchases WHERE purchase_no LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  let nextNumber = 1;
  if (rows.length > 0) {
    const parts = rows[0].purchase_no.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      nextNumber = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

async function generateRequestNo(connection) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `PR-${yyyy}${mm}${dd}-`;

  const [rows] = await connection.query(
    'SELECT request_no FROM purchase_requests WHERE request_no LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  let nextNumber = 1;
  if (rows.length > 0) {
    const parts = rows[0].request_no.split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      nextNumber = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token tidak valid' });
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    next();
  };
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, address, 'pembeli']
    );

    const token = jwt.sign(
      { id: result.insertId, email, role: 'pembeli' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registrasi berhasil',
      token,
      user: { id: result.insertId, name, email, role: 'pembeli' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat registrasi' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ambil user berdasarkan email saja supaya bisa bedakan akun nonaktif
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // Cek status aktif akun (0 = nonaktif)
    if (user.is_active === 0) {
      return res.status(403).json({ message: 'Akun Anda nonaktif. Silakan hubungi admin.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cashback_balance: user.cashback_balance,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat login' });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, phone, address, role, cashback_balance, commission_percentage, is_active FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    await pool.query(
      'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
      [name, phone, address, req.user.id]
    );

    res.json({ message: 'Profile berhasil diupdate' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, promo, search, limit } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (promo === 'true') {
      query += ' AND is_promo = TRUE';
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const [products] = await pool.query(query, params);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/products/promo', async (req, res) => {
  try {
    const [products] = await pool.query(
      'SELECT * FROM products WHERE is_promo = TRUE ORDER BY created_at DESC LIMIT 6'
    );
    res.json(products);
  } catch (error) {
    console.error('Get promo products error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/products/category/:category', async (req, res) => {
  try {
    const [products] = await pool.query(
      'SELECT * FROM products WHERE category = ? ORDER BY created_at DESC',
      [req.params.category]
    );
    res.json(products);
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (products.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    const [variants] = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = ?',
      [req.params.id]
    );

    const [wholesalePrices] = await pool.query(
      'SELECT * FROM wholesale_prices WHERE product_id = ? ORDER BY min_quantity',
      [req.params.id]
    );

    res.json({
      ...products[0],
      variants,
      wholesalePrices
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/products', authenticateToken, authorizeRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, discount_percentage, is_promo, stock, commission_percentage, cashback_percentage } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO products (name, description, category, price, discount_percentage, cashback_percentage, is_promo, stock, image_url, commission_percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, category, price, discount_percentage || 0, cashback_percentage || 1, is_promo || false, stock || 0, image_url, commission_percentage || 0]
    );

    res.status(201).json({ message: 'Produk berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Helper function to get unused images
const getUnusedImages = async (productId) => {
  const [allProductImages] = await pool.query(
    'SELECT media_url FROM product_images WHERE product_id = ?',
    [productId]
  );

  const imageUrls = allProductImages.map(img => img.media_url);
  return imageUrls;
};

// Helper function to delete image files from disk
const deleteImageFiles = (imageUrls) => {
  imageUrls.forEach(imageUrl => {
    if (imageUrl) {
      const filePath = path.join(__dirname, imageUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Image deleted:', filePath);
      }
    }
  });
};

app.put('/api/products/:id', authenticateToken, authorizeRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, discount_percentage, cashback_percentage, is_promo, stock, commission_percentage } = req.body;
    let image_url = req.body.existing_image;

    // If new image is uploaded, delete the old one
    if (req.file) {
      // Fetch the current product to get the old image
      const [products] = await pool.query('SELECT image_url FROM products WHERE id = ?', [req.params.id]);

      if (products.length > 0 && products[0].image_url) {
        const oldImagePath = products[0].image_url;
        // Delete old image file if it exists
        const oldFilePath = path.join(__dirname, oldImagePath.replace(/^\//, ''));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('Old image deleted:', oldFilePath);
        }
      }

      image_url = `/uploads/${req.file.filename}`;
    }

    await pool.query(
      'UPDATE products SET name = ?, description = ?, category = ?, price = ?, discount_percentage = ?, cashback_percentage = ?, is_promo = ?, stock = ?, image_url = ?, commission_percentage = ? WHERE id = ?',
      [name, description, category, price, discount_percentage || 0, cashback_percentage || 1, is_promo || false, stock || 0, image_url, commission_percentage || 0, req.params.id]
    );

    res.json({ message: 'Produk berhasil diupdate' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.delete('/api/products/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Fetch the product to get its image before deleting
    const [products] = await pool.query('SELECT image_url FROM products WHERE id = ?', [req.params.id]);

    if (products.length > 0 && products[0].image_url) {
      const imagePath = products[0].image_url;
      // Delete the image file if it exists
      const filePath = path.join(__dirname, imagePath.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Product image deleted:', filePath);
      }
    }

    // Get all product images and delete them
    const unusedImages = await getUnusedImages(req.params.id);
    deleteImageFiles(unusedImages);

    // Delete the product from database (cascades to all related records)
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search, role } = req.query;
    const pageInt = parseInt(page, 10) || 1;
    const limitInt = Math.min(parseInt(limit, 10) || 10, 10); // Max 10 per page
    const offset = (pageInt - 1) * limitInt;

    // Base query components
    const baseSelect = `
      SELECT o.*, 
        COALESCE(o.guest_customer_name, u.name) as customer_name, 
        u.email as customer_email, 
        COALESCE(o.guest_wa_number_1, u.phone) as customer_phone,
        o.guest_wa_number_1,
        o.guest_wa_number_2,
        o.guest_event_date,
        o.guest_event_time,
        GROUP_CONCAT(DISTINCT p.category ORDER BY p.category SEPARATOR ', ') as categories,
        COUNT(DISTINCT oi.id) as items_count,
        GROUP_CONCAT(DISTINCT CONCAT(oi.product_name, IF(oi.variant_name IS NOT NULL, CONCAT(' (', oi.variant_name, ')'), ''), ' x', oi.quantity) ORDER BY oi.id SEPARATOR ', ') as items_summary,
        (SELECT MIN(created_at) FROM order_status_logs WHERE order_id = o.id AND status = 'diproses') as tanggal_proses,
        (SELECT MIN(created_at) FROM order_status_logs WHERE order_id = o.id AND status = 'dikirim') as tanggal_pengiriman,
        (SELECT MIN(created_at) FROM order_status_logs WHERE order_id = o.id AND status = 'selesai') as tanggal_selesai,
        (SELECT rating FROM reviews WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as rating,
        CASE 
          WHEN JSON_VALID(o.delivery_notes) THEN JSON_UNQUOTE(JSON_EXTRACT(o.delivery_notes, '$.admin_notes'))
          ELSE NULL
        END as admin_notes,
        (SELECT u2.email 
         FROM order_status_logs osl
         JOIN users u2 ON osl.handler_id = u2.id
         WHERE osl.order_id = o.id AND osl.status = 'diproses'
         ORDER BY osl.created_at ASC
         LIMIT 1) as handler_email_proses,
        (SELECT u2.email 
         FROM order_status_logs osl
         JOIN users u2 ON osl.handler_id = u2.id
         WHERE osl.order_id = o.id AND osl.status = 'dikirim'
         ORDER BY osl.created_at ASC
         LIMIT 1) as handler_email_pengiriman
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1
    `;

    let baseParams = [];
    let whereClauses = [];

    // Role-based filtering
    if (req.user.role === 'pembeli') {
      whereClauses.push('o.user_id = ?');
      baseParams.push(req.user.id);
    } else if (req.user.role === 'marketing') {
      whereClauses.push('o.marketing_id = ?');
      baseParams.push(req.user.id);
    }

    // Role parameter filtering for dapur, kurir, operasional
    if (role) {
      if (role === 'dapur') {
        // Dapur sees orders that need processing: dibuat, diproses
        whereClauses.push('o.status IN (?, ?)');
        baseParams.push('dibuat', 'diproses');
      } else if (role === 'kurir') {
        // Kurir sees orders ready to ship: siap-kirim, dikirim
        whereClauses.push('o.status IN (?, ?)');
        baseParams.push('siap-kirim', 'dikirim');
      } else if (role === 'operasional') {
        // Operasional sees all orders (admin-like view)
        // No additional filter needed
      }
    }

    // Status filtering
    if (status && status !== 'all') {
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        whereClauses.push('o.status = ?');
        baseParams.push(statuses[0]);
      } else {
        whereClauses.push(`o.status IN (${statuses.map(() => '?').join(',')})`);
        baseParams.push(...statuses);
      }
    }

    // Search functionality
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClauses.push(`(
        o.id LIKE ? OR
        COALESCE(o.guest_customer_name, u.name) LIKE ? OR
        u.email LIKE ? OR
        COALESCE(o.guest_wa_number_1, u.phone) LIKE ? OR
        o.guest_wa_number_2 LIKE ? OR
        o.delivery_address LIKE ? OR
        o.guest_event_date LIKE ?
      )`);
      baseParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereClauses.length > 0 ? ' AND ' + whereClauses.join(' AND ') : '';

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1${whereClause}
    `;

    const [countRows] = await pool.query(countQuery, baseParams);
    const total = countRows[0]?.total || 0;

    // Data query with pagination
    let dataQuery = baseSelect + whereClause + ' GROUP BY o.id ORDER BY o.is_pinned DESC, o.created_at DESC LIMIT ? OFFSET ?';

    const dataParams = [...baseParams, limitInt, offset];
    const [orders] = await pool.query(dataQuery, dataParams);

    res.json({
      data: orders,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: limitInt > 0 ? Math.max(1, Math.ceil(total / limitInt)) : 1
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, 
        COALESCE(o.guest_customer_name, u.name) as customer_name, 
        u.email as customer_email, 
        COALESCE(o.guest_wa_number_1, u.phone) as customer_phone,
        c.commission_amount,
        c.status as commission_status
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN commissions c ON o.id = c.order_id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );

    const [statusLogs] = await pool.query(
      'SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY created_at',
      [req.params.id]
    );

    res.json({
      ...orders[0],
      items,
      statusLogs
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Guest Order Endpoint (No authentication required)
app.post('/api/orders/guest', upload.single('payment_proof'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get or create guest user
    let [guestUsers] = await connection.query('SELECT id FROM users WHERE email = ? AND role = ?', ['guest@alhakim.com', 'pembeli']);
    let guestUserId;

    if (guestUsers.length === 0) {
      const [result] = await connection.query(
        'INSERT INTO users (name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['Guest User', 'guest@alhakim.com', 'guest', '0000000000', '-', 'pembeli']
      );
      guestUserId = result.insertId;
    } else {
      guestUserId = guestUsers[0].id;
    }

    const items = JSON.parse(req.body.items);
    const delivery_address = req.body.delivery_address || '-';
    let delivery_notes = req.body.delivery_notes || '';
    const payment_method = req.body.payment_method || 'transfer';
    const voucher_code = req.body.voucher_code && req.body.voucher_code !== '' ? req.body.voucher_code : null;

    // Safely parse margin_amount to avoid NaN being sent to the database
    let margin_amount = 0;
    if (req.body.margin_amount !== undefined && req.body.margin_amount !== null && req.body.margin_amount !== '') {
      const parsedMargin = parseFloat(req.body.margin_amount);
      margin_amount = Number.isFinite(parsedMargin) ? parsedMargin : 0;
    }

    // Parse delivery_notes JSON untuk extract data ke kolom terpisah
    let guestData = {};
    try {
      guestData = typeof delivery_notes === 'string' ? JSON.parse(delivery_notes) : delivery_notes;
    } catch (e) {
      console.error('Error parsing delivery_notes:', e);
    }

    // Payment amount and marketing partner info: will be extracted and stored in separate columns
    // Also kept in delivery_notes JSON for backward compatibility
    if (req.body.payment_amount && !guestData.payment_amount) {
      guestData.payment_amount = req.body.payment_amount;
      delivery_notes = JSON.stringify(guestData);
    }
    if (req.body.partner_business_name && !guestData.partner_business_name) {
      guestData.partner_business_name = req.body.partner_business_name;
      delivery_notes = JSON.stringify(guestData);
    }
    if (req.body.partner_wa_number && !guestData.partner_wa_number) {
      guestData.partner_wa_number = req.body.partner_wa_number;
      delivery_notes = JSON.stringify(guestData);
    }

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items tidak valid atau kosong');
    }

    let total_amount = 0;
    const orderItems = [];

    for (const item of items) {
      // Validate item structure
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        throw new Error('Data item tidak valid');
      }

      const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [item.product_id]);

      if (products.length === 0) {
        throw new Error('Produk tidak ditemukan');
      }

      const product = products[0];

      // Validate stock availability
      if (product.stock < item.quantity) {
        throw new Error(`Stok produk "${product.name}" tidak mencukupi. Stok tersedia: ${product.stock}`);
      }

      // Ensure price is a valid number
      let price = parseFloat(product.discounted_price) || parseFloat(product.price) || 0;
      if (isNaN(price) || price < 0) {
        price = 0;
      }

      let variant_name = null;

      // Use variant price_adjustment as FULL price (not an adjustment) if variant is selected
      if (item.variant_id) {
        const [variants] = await connection.query('SELECT name, price_adjustment FROM product_variants WHERE id = ? AND product_id = ? AND is_active = TRUE', [item.variant_id, item.product_id]);
        if (variants.length === 0) {
          throw new Error(`Varian tidak ditemukan atau tidak aktif untuk produk "${product.name}"`);
        }
        const variantPrice = parseFloat(variants[0].price_adjustment) || 0;
        if (isNaN(variantPrice) || variantPrice < 0) {
          throw new Error(`Harga varian untuk produk "${product.name}" tidak valid`);
        }
        // Use variant price as the full price, not added to base price
        price = variantPrice;
        variant_name = variants[0].name; // Get variant name from database
      }

      // Process addons if provided
      let addonTotal = 0;
      let addonsData = [];
      if (item.addon_ids && Array.isArray(item.addon_ids) && item.addon_ids.length > 0) {
        const placeholders = item.addon_ids.map(() => '?').join(',');
        const [addons] = await connection.query(
          `SELECT id, name, price FROM product_addons WHERE id IN (${placeholders}) AND product_id = ? AND is_active = TRUE`,
          [...item.addon_ids, item.product_id]
        );

        for (const addon of addons) {
          const addonPrice = parseFloat(addon.price) || 0;
          addonTotal += addonPrice;
          addonsData.push({
            id: addon.id,
            name: addon.name,
            price: addonPrice
          });
        }
      }

      // Calculate subtotal: (base_price + addon_total) * quantity
      const basePriceWithAddons = price + addonTotal;
      const subtotal = basePriceWithAddons * item.quantity;

      // Ensure subtotal is a valid number
      const validSubtotal = isNaN(subtotal) ? 0 : subtotal;
      total_amount += validSubtotal;

      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: product.name,
        variant_name: variant_name,
        quantity: item.quantity,
        price: basePriceWithAddons, // Price includes addons
        subtotal: validSubtotal,
        addons_json: addonsData.length > 0 ? JSON.stringify(addonsData) : null,
        addons_price: addonTotal
      });
    }

    // Handle voucher discount
    let discount_amount = 0;
    let voucher_id = null;

    if (voucher_code) {
      const [vouchers] = await connection.query(
        'SELECT * FROM vouchers WHERE code = ? AND is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()',
        [voucher_code]
      );

      if (vouchers.length > 0) {
        const voucher = vouchers[0];

        if (total_amount >= voucher.min_purchase && voucher.used_count < voucher.quota) {
          if (voucher.discount_type === 'percentage') {
            discount_amount = total_amount * (voucher.discount_value / 100);
            if (voucher.max_discount > 0 && discount_amount > voucher.max_discount) {
              discount_amount = voucher.max_discount;
            }
          } else {
            discount_amount = voucher.discount_value;
          }

          voucher_id = voucher.id;

          await connection.query(
            'UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?',
            [voucher.id]
          );
        }
      }
    }

    // Ensure all amounts are valid numbers (not NaN)
    total_amount = isNaN(total_amount) ? 0 : parseFloat(total_amount) || 0;
    discount_amount = isNaN(discount_amount) ? 0 : parseFloat(discount_amount) || 0;
    margin_amount = isNaN(margin_amount) ? 0 : parseFloat(margin_amount) || 0;

    // Calculate base_amount (before margin) and final_amount (with margin)
    const base_amount = total_amount - discount_amount;
    const final_amount = Math.max(0, base_amount + margin_amount);

    // Final validation to ensure no NaN values
    if (isNaN(total_amount) || isNaN(discount_amount) || isNaN(final_amount)) {
      throw new Error('Invalid amount calculation detected');
    }

    // Parse event_date dan event_time untuk kolom terpisah
    let eventDate = null;
    let eventTime = null;
    if (guestData.event_date) {
      eventDate = guestData.event_date;
    }
    if (guestData.event_time) {
      eventTime = guestData.event_time;
    }

    // Extract payment amount and partner info from delivery_notes
    // Safely parse payment_amount from delivery notes to avoid NaN
    let payment_amount = null;
    if (
      guestData.payment_amount !== undefined &&
      guestData.payment_amount !== null &&
      guestData.payment_amount !== ''
    ) {
      const parsedPayment = parseFloat(guestData.payment_amount);
      payment_amount = Number.isFinite(parsedPayment) ? parsedPayment : null;
    }
    const partner_business_name = guestData.partner_business_name || null;
    const partner_wa_number = guestData.partner_wa_number || null;

    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        user_id, voucher_id, total_amount, discount_amount, cashback_used, final_amount, 
        payment_method, payment_amount, delivery_address, delivery_notes,
        guest_customer_name, guest_wa_number_1, guest_wa_number_2,
        guest_reference, guest_reference_detail, partner_business_name, partner_wa_number,
        guest_event_name, guest_event_date, guest_event_time,
        guest_sharelok_link, guest_landmark, guest_delivery_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guestUserId, voucher_id, total_amount, discount_amount, 0, final_amount,
        payment_method, payment_amount, delivery_address, delivery_notes,
        guestData.customer_name || null,
        guestData.wa_number_1 || null,
        guestData.wa_number_2 || null,
        guestData.reference || null,
        guestData.reference_detail || null,
        partner_business_name,
        partner_wa_number,
        guestData.event_name || null,
        eventDate,
        eventTime,
        guestData.sharelok_link || null,
        guestData.landmark || null,
        guestData.delivery_type || null
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, price, subtotal, addons_json, addons_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.variant_id, item.product_name, item.variant_name, item.quantity, item.price, item.subtotal, item.addons_json, item.addons_price || 0]
      );

      await connection.query(
        'UPDATE products SET sold_count = sold_count + ?, stock = stock - ? WHERE id = ?',
        [item.quantity, item.quantity, item.product_id]
      );
    }

    // Upload payment proof if exists
    let proofImageUrl = null;
    if (req.file) {
      proofImageUrl = `/uploads/${req.file.filename}`;
      await connection.query(
        'INSERT INTO order_status_logs (order_id, status, handler_name, notes, proof_image_url) VALUES (?, ?, ?, ?, ?)',
        [orderId, 'dibuat', 'Guest', 'Pesanan dibuat oleh guest', proofImageUrl]
      );
    } else {
      await connection.query(
        'INSERT INTO order_status_logs (order_id, status, handler_name, notes) VALUES (?, ?, ?, ?)',
        [orderId, 'dibuat', 'Guest', 'Pesanan dibuat oleh guest']
      );
    }

    // Integrasi Keuangan Otomatis (Neraca & Arus Kas)
    await recordOrderSalesFinancials(connection, orderId, payment_method, payment_amount, final_amount, guestUserId);

    await connection.commit();

    res.status(201).json({
      message: 'Pesanan berhasil dibuat',
      orderId: orderId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create guest order error:', error);
    res.status(500).json({ message: error.message || 'Terjadi kesalahan' });
  } finally {
    connection.release();
  }
});

app.post('/api/orders', authenticateToken, upload.single('payment_proof'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Handle both JSON and FormData
    let items, voucher_code, cashback_used, payment_method, delivery_address, delivery_notes;

    // Check if request is FormData (items will be a JSON string) or JSON (items will be an array)
    if (req.body.items && typeof req.body.items === 'string') {
      // FormData - parse JSON strings
      items = JSON.parse(req.body.items);
      voucher_code = req.body.voucher_code && req.body.voucher_code !== '' ? req.body.voucher_code : null;
      cashback_used = req.body.cashback_used ? parseFloat(req.body.cashback_used) : 0;
      payment_method = req.body.payment_method || 'transfer';
      delivery_address = req.body.delivery_address || '-';
      delivery_notes = req.body.delivery_notes || '';
    } else {
      // JSON format
      items = req.body.items;
      voucher_code = req.body.voucher_code || null;
      cashback_used = req.body.cashback_used || 0;
      payment_method = req.body.payment_method;
      delivery_address = req.body.delivery_address;
      delivery_notes = req.body.delivery_notes || '';
    }

    // Parse delivery_notes JSON if exists (for guest-like format)
    let guestData = {};
    if (delivery_notes) {
      try {
        guestData = typeof delivery_notes === 'string' ? JSON.parse(delivery_notes) : delivery_notes;
      } catch {
        // If not JSON, treat as plain text
        guestData = {};
      }
    }

    // Payment amount and marketing partner info: will be extracted and stored in separate columns
    // Also kept in delivery_notes JSON for backward compatibility
    if (req.body.payment_amount && !guestData.payment_amount) {
      guestData.payment_amount = req.body.payment_amount;
    }
    if (req.body.partner_business_name && !guestData.partner_business_name) {
      guestData.partner_business_name = req.body.partner_business_name;
    }
    if (req.body.partner_wa_number && !guestData.partner_wa_number) {
      guestData.partner_wa_number = req.body.partner_wa_number;
    }

    // Get margin_amount for marketing users (from request body or delivery_notes)
    let margin_amount = 0;
    if (req.body.margin_amount) {
      margin_amount = parseFloat(req.body.margin_amount) || 0;
    } else if (guestData.margin_amount) {
      margin_amount = parseFloat(guestData.margin_amount) || 0;
    }

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items tidak valid atau kosong');
    }

    let total_amount = 0;
    let cashback_earned = 0;
    const orderItems = [];

    for (const item of items) {
      // Validate item structure
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        throw new Error('Data item tidak valid');
      }

      const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [item.product_id]);

      if (products.length === 0) {
        throw new Error('Produk tidak ditemukan');
      }

      const product = products[0];

      // Safely parse numeric fields from database to avoid NaN issues
      const rawPrice = product.discounted_price != null && product.discounted_price !== ''
        ? product.discounted_price
        : product.price;
      let price = Number(rawPrice);

      if (!Number.isFinite(price)) {
        throw new Error(`Harga produk "${product.name}" tidak valid`);
      }

      const productCashbackPercentage = product.cashback_percentage !== undefined && product.cashback_percentage !== null
        ? Number(product.cashback_percentage)
        : 1;

      if (!Number.isFinite(productCashbackPercentage)) {
        throw new Error(`Persentase cashback untuk produk "${product.name}" tidak valid`);
      }

      // Validate stock availability
      if (product.stock < item.quantity) {
        throw new Error(`Stok produk "${product.name}" tidak mencukupi. Stok tersedia: ${product.stock}`);
      }

      let variant_name = null;

      // Use variant price_adjustment as FULL price (not an adjustment) if variant is selected
      if (item.variant_id) {
        const [variants] = await connection.query('SELECT name, price_adjustment FROM product_variants WHERE id = ? AND product_id = ? AND is_active = TRUE', [item.variant_id, item.product_id]);
        if (variants.length === 0) {
          throw new Error(`Varian tidak ditemukan atau tidak aktif untuk produk "${product.name}"`);
        }
        const variantPrice = Number(variants[0].price_adjustment || 0);
        if (!Number.isFinite(variantPrice) || variantPrice < 0) {
          throw new Error(`Harga varian untuk produk "${product.name}" tidak valid`);
        }
        // Use variant price as the full price, not added to base price
        price = variantPrice;
        variant_name = variants[0].name; // Get variant name from database
      }

      // Process addons if provided
      let addonTotal = 0;
      let addonsData = [];
      if (item.addon_ids && Array.isArray(item.addon_ids) && item.addon_ids.length > 0) {
        const placeholders = item.addon_ids.map(() => '?').join(',');
        const [addons] = await connection.query(
          `SELECT id, name, price FROM product_addons WHERE id IN (${placeholders}) AND product_id = ? AND is_active = TRUE`,
          [...item.addon_ids, item.product_id]
        );

        for (const addon of addons) {
          const addonPrice = Number(addon.price || 0);
          if (Number.isFinite(addonPrice) && addonPrice >= 0) {
            addonTotal += addonPrice;
            addonsData.push({
              id: addon.id,
              name: addon.name,
              price: addonPrice
            });
          }
        }
      }

      // Calculate subtotal: (base_price + addon_total) * quantity
      const basePriceWithAddons = price + addonTotal;
      const subtotal = basePriceWithAddons * item.quantity;

      // Ensure subtotal is a valid number
      const validSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
      total_amount += validSubtotal;
      cashback_earned += validSubtotal * (productCashbackPercentage / 100);

      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: product.name,
        variant_name: variant_name,
        quantity: item.quantity,
        price: basePriceWithAddons, // Price includes addons
        subtotal: validSubtotal,
        addons_json: addonsData.length > 0 ? JSON.stringify(addonsData) : null,
        addons_price: addonTotal
      });
    }

    let discount_amount = 0;
    let voucher_id = null;

    if (voucher_code) {
      const [vouchers] = await connection.query(
        'SELECT * FROM vouchers WHERE code = ? AND is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()',
        [voucher_code]
      );

      if (vouchers.length > 0) {
        const voucher = vouchers[0];

        if (total_amount >= voucher.min_purchase && voucher.used_count < voucher.quota) {
          if (voucher.discount_type === 'percentage') {
            discount_amount = total_amount * (voucher.discount_value / 100);
            if (voucher.max_discount > 0 && discount_amount > voucher.max_discount) {
              discount_amount = voucher.max_discount;
            }
          } else {
            discount_amount = voucher.discount_value;
          }

          voucher_id = voucher.id;

          await connection.query(
            'UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?',
            [voucher.id]
          );
        }
      }
    }

    // Validate cashback balance if used
    if (cashback_used > 0) {
      const [users] = await connection.query('SELECT cashback_balance FROM users WHERE id = ?', [req.user.id]);
      if (users.length === 0) {
        throw new Error('User tidak ditemukan');
      }
      const userBalance = users[0].cashback_balance || 0;
      if (cashback_used > userBalance) {
        throw new Error(`Saldo cashback tidak mencukupi. Saldo tersedia: Rp ${userBalance.toLocaleString('id-ID')}`);
      }
    }

    // Ensure all amounts are valid numbers (not NaN)
    total_amount = Number.isFinite(total_amount) ? Number(total_amount) : 0;
    discount_amount = Number.isFinite(discount_amount) ? Number(discount_amount) : 0;
    cashback_used = Number.isFinite(cashback_used) ? Number(cashback_used) : 0;
    margin_amount = Number.isFinite(margin_amount) ? Number(margin_amount) : 0;

    // Calculate base_amount (before margin) and final_amount (with margin)
    const base_amount = total_amount - discount_amount - cashback_used;

    // Validate base_amount is not negative
    if (base_amount < 0) {
      throw new Error('Total pembayaran tidak valid. Diskon atau cashback melebihi total belanja.');
    }

    const final_amount = base_amount + margin_amount;

    // Final validation to prevent NaN from being sent to the database
    if (!Number.isFinite(total_amount) || !Number.isFinite(base_amount) || !Number.isFinite(final_amount)) {
      throw new Error('Perhitungan total pesanan tidak valid (hasil bukan angka)');
    }

    // Validate final_amount is not negative
    if (final_amount < 0) {
      throw new Error('Total akhir tidak valid.');
    }

    // Parse event_date dan event_time untuk kolom terpisah (if guestData exists)
    let eventDate = null;
    let eventTime = null;
    if (guestData.event_date) {
      eventDate = guestData.event_date;
    }
    if (guestData.event_time) {
      eventTime = guestData.event_time;
    }

    // Build delivery_notes as JSON string
    // If delivery_notes is already a JSON string, use it; otherwise stringify guestData
    const deliveryNotesJson = (delivery_notes && typeof delivery_notes === 'string' && delivery_notes.trim().startsWith('{'))
      ? delivery_notes
      : (Object.keys(guestData).length > 0 ? JSON.stringify(guestData) : (delivery_notes || ''));

    // Extract payment amount and partner info from delivery_notes
    const payment_amount = guestData.payment_amount ? parseFloat(guestData.payment_amount) : null;
    const partner_business_name = guestData.partner_business_name || null;
    const partner_wa_number = guestData.partner_wa_number || null;

    // Set marketing_id if user is marketing
    const marketing_id = req.user.role === 'marketing' ? req.user.id : null;

    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        user_id, marketing_id, voucher_id, total_amount, base_amount, discount_amount, cashback_used, final_amount, margin_amount,
        payment_method, payment_amount, delivery_address, delivery_notes,
        guest_customer_name, guest_wa_number_1, guest_wa_number_2,
        guest_reference, guest_reference_detail, partner_business_name, partner_wa_number,
        guest_event_name, guest_event_date, guest_event_time,
        guest_sharelok_link, guest_landmark, guest_delivery_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, marketing_id, voucher_id, total_amount, base_amount, discount_amount, cashback_used || 0, final_amount, margin_amount,
        payment_method, payment_amount, delivery_address, deliveryNotesJson,
        guestData.customer_name || null,
        guestData.wa_number_1 || null,
        guestData.wa_number_2 || null,
        guestData.reference || null,
        guestData.reference_detail || null,
        partner_business_name,
        partner_wa_number,
        guestData.event_name || null,
        eventDate,
        eventTime,
        guestData.sharelok_link || null,
        guestData.landmark || null,
        guestData.delivery_type || null
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, price, subtotal, addons_json, addons_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.variant_id, item.product_name, item.variant_name, item.quantity, item.price, item.subtotal, item.addons_json, item.addons_price || 0]
      );

      await connection.query(
        'UPDATE products SET sold_count = sold_count + ?, stock = stock - ? WHERE id = ?',
        [item.quantity, item.quantity, item.product_id]
      );
    }

    if (cashback_used > 0) {
      await connection.query(
        'UPDATE users SET cashback_balance = cashback_balance - ? WHERE id = ?',
        [cashback_used, req.user.id]
      );

      await connection.query(
        'INSERT INTO cashback_history (user_id, order_id, amount, type, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, orderId, cashback_used, 'used', 'Digunakan untuk pesanan #' + orderId]
      );
    }
    await connection.query(
      'UPDATE users SET cashback_balance = cashback_balance + ? WHERE id = ?',
      [cashback_earned, req.user.id]
    );

    await connection.query(
      'INSERT INTO cashback_history (user_id, order_id, amount, type, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, orderId, cashback_earned, 'earned', 'Cashback dari pesanan #' + orderId]
    );

    // Upload payment proof if exists (from FormData)
    let proofImageUrl = null;
    if (req.file) {
      proofImageUrl = `/uploads/${req.file.filename}`;
      await connection.query(
        'INSERT INTO order_status_logs (order_id, status, handler_id, handler_name, notes, proof_image_url) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, 'dibuat', req.user.id, req.user.name || 'Customer', 'Pesanan dibuat dengan bukti pembayaran', proofImageUrl]
      );
    } else {
      await connection.query(
        'INSERT INTO order_status_logs (order_id, status, handler_id, handler_name, notes) VALUES (?, ?, ?, ?, ?)',
        [orderId, 'dibuat', req.user.id, req.user.name || 'Customer', 'Pesanan dibuat']
      );
    }

    // Create commission record if user is marketing
    if (marketing_id) {
      // Calculate admin commission based on product-level commission_percentage
      const [commissionRows] = await connection.query(
        `SELECT 
           SUM(oi.subtotal * (COALESCE(p.commission_percentage, 0) / 100)) AS admin_commission,
           SUM(oi.subtotal) AS items_base_amount
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );

      const admin_commission = commissionRows[0]?.admin_commission
        ? parseFloat(commissionRows[0].admin_commission)
        : 0;

      const effective_base_amount = commissionRows[0]?.items_base_amount
        ? parseFloat(commissionRows[0].items_base_amount)
        : base_amount;

      const commission_percentage =
        effective_base_amount > 0 ? (admin_commission / effective_base_amount) * 100 : 0;

      // Total commission = admin commission (from products) + margin_amount
      const commission_amount = admin_commission + margin_amount;

      await connection.query(
        `INSERT INTO commissions (marketing_id, order_id, base_amount, commission_percentage, commission_amount, status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [marketing_id, orderId, base_amount, commission_percentage, commission_amount]
      );
    }

    // Integrasi Keuangan Otomatis (Neraca & Arus Kas)
    await recordOrderSalesFinancials(connection, orderId, payment_method, payment_amount, final_amount, req.user.id);

    await connection.commit();

    res.status(201).json({
      message: 'Pesanan berhasil dibuat',
      orderId: orderId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message || 'Terjadi kesalahan' });
  } finally {
    connection.release();
  }
});

app.put('/api/orders/:id/status', authenticateToken, upload.fields([
  { name: 'proof', maxCount: 1 },
  { name: 'proof_shipping', maxCount: 1 },
  { name: 'proof_delivery', maxCount: 1 }
]), async (req, res) => {
  try {
    const { status, notes } = req.body;

    let proof_image_url = null;

    // Handle proof (single file - for dapur/operasional)
    if (req.files && req.files.proof && req.files.proof[0]) {
      proof_image_url = `/uploads/${req.files.proof[0].filename}`;
    }
    // Handle proof_shipping (for status 'dikirim' - kurir)
    else if (req.files && req.files.proof_shipping && req.files.proof_shipping[0]) {
      proof_image_url = `/uploads/${req.files.proof_shipping[0].filename}`;
    }
    // Handle proof_delivery (for status 'selesai' - kurir)
    else if (req.files && req.files.proof_delivery && req.files.proof_delivery[0]) {
      proof_image_url = `/uploads/${req.files.proof_delivery[0].filename}`;
    }

    // Get current order status before update
    const [currentOrders] = await pool.query('SELECT status, final_amount FROM orders WHERE id = ?', [req.params.id]);
    const currentStatus = currentOrders.length > 0 ? currentOrders[0].status : null;
    const orderAmount = currentOrders.length > 0 ? currentOrders[0].final_amount : 0;

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    const [users] = await pool.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const handlerName = users.length > 0 ? users[0].name : 'Unknown';

    await pool.query(
      'INSERT INTO order_status_logs (order_id, status, handler_id, handler_name, notes, proof_image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, status, req.user.id, handlerName, notes, proof_image_url]
    );

    // Update commission status to 'completed' when order is completed
    if (status === 'selesai' && currentStatus !== 'selesai') {
      try {
        await pool.query(
          `UPDATE commissions 
           SET status = 'completed', updated_at = NOW() 
           WHERE order_id = ? AND status = 'pending'`,
          [req.params.id]
        );
      } catch (error) {
        console.error('Error updating order completion status:', error);
      }
    }

    // Update commission status and refund if order is cancelled (Halaman 9 & 10 PDF)
    if (status === 'dibatalkan' && currentStatus !== 'dibatalkan') {
      try {
        const refundAmount = parseFloat(req.body.refund_amount) || 0;
        const refundNotes = req.body.refund_notes || notes || '';

        if (refundAmount > 0) {
          await pool.query(
            'UPDATE orders SET refund_amount = ?, refund_notes = ? WHERE id = ?',
            [refundAmount, refundNotes, req.params.id]
          );
          const conn = await pool.getConnection();
          try {
            await recordOrderCancellationFinancials(conn, req.params.id, refundAmount, refundNotes, req.user.id);
          } finally {
            conn.release();
          }
        }

        await pool.query(
          `UPDATE commissions 
           SET status = 'cancelled', updated_at = NOW() 
           WHERE order_id = ? AND status = 'pending'`,
          [req.params.id]
        );
      } catch (error) {
        console.error('Error handling order cancellation:', error);
      }
    }

    res.json({ message: 'Status pesanan berhasil diupdate' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Pin/Unpin order
app.put('/api/orders/:id/pin', authenticateToken, async (req, res) => {
  try {
    const { is_pinned } = req.body;
    const orderId = req.params.id;
    const userId = req.user.id;

    // Check if order exists
    const [orders] = await pool.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    // Convert to boolean if needed
    const shouldPin = is_pinned === true || is_pinned === 1 || is_pinned === 'true' || is_pinned === '1';

    if (shouldPin) {
      // Pin the order
      await pool.query(
        'UPDATE orders SET is_pinned = 1, pinned_by = ?, pinned_at = NOW() WHERE id = ?',
        [userId, orderId]
      );
      res.json({ message: 'Pesanan berhasil disematkan' });
    } else {
      // Unpin the order
      await pool.query(
        'UPDATE orders SET is_pinned = 0, pinned_by = NULL, pinned_at = NULL WHERE id = ?',
        [orderId]
      );
      res.json({ message: 'Pesanan berhasil dibatalkan sematkan' });
    }
  } catch (error) {
    console.error('Pin/unpin order error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/orders/:id/review', authenticateToken, async (req, res) => {
  try {
    const [reviews] = await pool.query(
      'SELECT * FROM reviews WHERE order_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review tidak ditemukan' });
    }

    res.json(reviews[0]);
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/orders/:id/review', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Check if review already exists
    const [existing] = await pool.query(
      'SELECT id FROM reviews WHERE order_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Review untuk pesanan ini sudah ada' });
    }

    await pool.query(
      'INSERT INTO reviews (order_id, user_id, rating, comment, image_url, resolved) VALUES (?, ?, ?, ?, ?, 0)',
      [req.params.id, req.user.id, rating, comment, image_url]
    );

    res.status(201).json({ message: 'Review berhasil ditambahkan' });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Get all reviews and complaints for admin
app.get('/api/reviews', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { type, status } = req.query;

    let reviews = [];
    let complaints = [];

    // Get reviews
    if (!type || type === 'all' || type === 'review') {
      const [reviewResults] = await pool.query(
        `SELECT r.*, u.name as customer_name, u.email as customer_email, o.id as order_id
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         JOIN orders o ON r.order_id = o.id
         ORDER BY r.created_at DESC`
      );
      reviews = reviewResults.map(r => ({
        ...r,
        type: 'review',
        resolved: r.resolved || 0
      }));
    }

    // Get complaints
    if (!type || type === 'all' || type === 'complain') {
      const [complaintResults] = await pool.query(
        `SELECT c.*, u.name as customer_name, u.email as customer_email, o.id as order_id
         FROM complaints c
         JOIN users u ON c.user_id = u.id
         JOIN orders o ON c.order_id = o.id
         ORDER BY c.created_at DESC`
      );
      complaints = complaintResults.map(c => ({
        ...c,
        type: 'complain',
        comment: c.description,
        rating: null,
        resolved: c.status === 'resolved' ? 1 : 0
      }));
    }

    // Combine and filter
    let combined = [...reviews, ...complaints];

    if (status === 'resolved') {
      combined = combined.filter(r => r.resolved === 1);
    } else if (status === 'pending') {
      combined = combined.filter(r => r.resolved === 0);
    }

    res.json(combined);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Resolve review or complaint
app.put('/api/reviews/:id/resolve', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { type } = req.body; // 'review' or 'complain'

    if (type === 'complain') {
      await pool.query(
        'UPDATE complaints SET status = ? WHERE id = ?',
        ['resolved', req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE reviews SET resolved = 1 WHERE id = ?',
        [req.params.id]
      );
    }

    res.json({ message: 'Review berhasil ditandai sebagai selesai' });
  } catch (error) {
    console.error('Resolve review error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/orders/:id/complaint', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { subject, description } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.query(
      'INSERT INTO complaints (order_id, user_id, subject, description, image_url) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, subject, description, image_url]
    );

    res.status(201).json({ message: 'Komplain berhasil diajukan' });
  } catch (error) {
    console.error('Add complaint error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// ========================================
// PRODUCT IMAGES ENDPOINTS
// ========================================
app.post('/api/products/:id/images', authenticateToken, authorizeRole('admin'), upload.array('images'), async (req, res) => {
  try {
    const { is_primary } = req.body;
    const productId = req.params.id;

    // Check if product exists
    const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }

    const insertedImages = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const mediaUrl = `/uploads/${file.filename}`;
      const isPrimary = is_primary && i === 0;

      const [result] = await pool.query(
        'INSERT INTO product_images (product_id, media_url, media_type, is_primary, display_order) VALUES (?, ?, ?, ?, ?)',
        [productId, mediaUrl, 'image', isPrimary, i]
      );

      insertedImages.push({ id: result.insertId, media_url: mediaUrl });
    }

    res.status(201).json({ message: 'Gambar berhasil ditambahkan', images: insertedImages });
  } catch (error) {
    console.error('Upload product images error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/products/:id/images', async (req, res) => {
  try {
    const [images] = await pool.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order',
      [req.params.id]
    );
    res.json(images);
  } catch (error) {
    console.error('Get product images error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.delete('/api/products/:id/images/:imageId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [images] = await pool.query(
      'SELECT media_url FROM product_images WHERE id = ? AND product_id = ?',
      [req.params.imageId, req.params.id]
    );

    if (images.length === 0) {
      return res.status(404).json({ message: 'Gambar tidak ditemukan' });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, images[0].media_url.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Product image deleted:', filePath);
    }

    // Delete from database
    await pool.query('DELETE FROM product_images WHERE id = ?', [req.params.imageId]);
    res.json({ message: 'Gambar berhasil dihapus' });
  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// ========================================
// PRODUCT VARIATIONS ENDPOINTS
// ========================================
app.post('/api/products/:id/variations', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, price_adjustment, stock, description } = req.body;

    const [result] = await pool.query(
      'INSERT INTO product_variants (product_id, name, price_adjustment, stock, description) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, name, price_adjustment || 0, stock || 0, description || null]
    );

    res.status(201).json({ message: 'Variasi berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    console.error('Create product variation error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/products/:id/variations', async (req, res) => {
  try {
    const [variations] = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = ? AND is_active = TRUE',
      [req.params.id]
    );
    res.json(variations);
  } catch (error) {
    console.error('Get product variations error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.put('/api/products/:id/variations/:variantId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, price_adjustment, stock, description, is_active } = req.body;

    await pool.query(
      'UPDATE product_variants SET name = ?, price_adjustment = ?, stock = ?, description = ?, is_active = ? WHERE id = ? AND product_id = ?',
      [name, price_adjustment || 0, stock || 0, description || null, is_active !== false, req.params.variantId, req.params.id]
    );

    res.json({ message: 'Variasi berhasil diupdate' });
  } catch (error) {
    console.error('Update product variation error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.delete('/api/products/:id/variations/:variantId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Get variant images
    const [variantImages] = await pool.query(
      'SELECT image_url FROM product_variant_images WHERE variant_id = ?',
      [req.params.variantId]
    );

    // Delete variant image files
    variantImages.forEach(img => {
      if (img.image_url) {
        const filePath = path.join(__dirname, img.image_url.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    // Delete variant from database (cascades to variant images)
    await pool.query(
      'DELETE FROM product_variants WHERE id = ? AND product_id = ?',
      [req.params.variantId, req.params.id]
    );

    res.json({ message: 'Variasi berhasil dihapus' });
  } catch (error) {
    console.error('Delete product variation error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// ========================================
// PRODUCT ADD-ONS ENDPOINTS
// ========================================
app.post('/api/products/:id/addons', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, description, price, max_quantity } = req.body;

    const [result] = await pool.query(
      'INSERT INTO product_addons (product_id, name, description, price, max_quantity) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, name, description || null, price, max_quantity || 0]
    );

    res.status(201).json({ message: 'Add-on berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    console.error('Create product addon error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/products/:id/addons', async (req, res) => {
  try {
    const [addons] = await pool.query(
      'SELECT * FROM product_addons WHERE product_id = ? AND is_active = TRUE',
      [req.params.id]
    );
    res.json(addons);
  } catch (error) {
    console.error('Get product addons error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.put('/api/products/:id/addons/:addonId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, description, price, max_quantity, is_active } = req.body;

    await pool.query(
      'UPDATE product_addons SET name = ?, description = ?, price = ?, max_quantity = ?, is_active = ? WHERE id = ? AND product_id = ?',
      [name, description || null, price, max_quantity || 0, is_active !== false, req.params.addonId, req.params.id]
    );

    res.json({ message: 'Add-on berhasil diupdate' });
  } catch (error) {
    console.error('Update product addon error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.delete('/api/products/:id/addons/:addonId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM product_addons WHERE id = ? AND product_id = ?',
      [req.params.addonId, req.params.id]
    );

    res.json({ message: 'Add-on berhasil dihapus' });
  } catch (error) {
    console.error('Delete product addon error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/banners', async (req, res) => {
  try {
    const [banners] = await pool.query(
      'SELECT * FROM banners WHERE is_active = TRUE ORDER BY display_order, created_at DESC'
    );
    res.json(banners);
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/banners', authenticateToken, authorizeRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const { title, description, display_order } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO banners (title, description, image_url, display_order) VALUES (?, ?, ?, ?)',
      [title, description, image_url, display_order || 0]
    );

    res.status(201).json({ message: 'Banner berhasil ditambahkan', id: result.insertId });
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.put('/api/banners/:id', authenticateToken, authorizeRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const { title, description, display_order } = req.body;
    let image_url = req.body.existing_image;

    // If new image is uploaded, delete the old one
    if (req.file) {
      // Fetch the current banner to get the old image
      const [banners] = await pool.query('SELECT image_url FROM banners WHERE id = ?', [req.params.id]);

      if (banners.length > 0 && banners[0].image_url) {
        const oldImagePath = banners[0].image_url;
        // Delete old image file if it exists
        const oldFilePath = path.join(__dirname, oldImagePath.replace(/^\//, ''));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('Old banner image deleted:', oldFilePath);
        }
      }

      image_url = `/uploads/${req.file.filename}`;
    }

    await pool.query(
      'UPDATE banners SET title = ?, description = ?, image_url = ?, display_order = ? WHERE id = ?',
      [title, description, image_url, display_order || 0, req.params.id]
    );

    res.json({ message: 'Banner berhasil diupdate' });
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.delete('/api/banners/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Fetch the banner to get its image before deleting
    const [banners] = await pool.query('SELECT image_url FROM banners WHERE id = ?', [req.params.id]);

    if (banners.length > 0 && banners[0].image_url) {
      const imagePath = banners[0].image_url;
      // Delete the image file if it exists
      const filePath = path.join(__dirname, imagePath.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Banner image deleted:', filePath);
      }
    }

    // Delete the banner from database
    await pool.query('DELETE FROM banners WHERE id = ?', [req.params.id]);
    res.json({ message: 'Banner berhasil dihapus' });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/vouchers', async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let isAdmin = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        isAdmin = decoded.role === 'admin';
      } catch {
        // Token invalid, treat as regular user
      }
    }

    let query;
    if (isAdmin) {
      // Admin can see all vouchers (active and inactive)
      query = 'SELECT * FROM vouchers ORDER BY created_at DESC';
    } else {
      // Regular users only see active and valid vouchers
      query = 'SELECT * FROM vouchers WHERE is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()';
    }

    const [vouchers] = await pool.query(query);
    res.json(vouchers);
  } catch (error) {
    console.error('Get vouchers error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const { code } = req.body;

    const [vouchers] = await pool.query(
      'SELECT * FROM vouchers WHERE code = ? AND is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()',
      [code]
    );

    if (vouchers.length === 0) {
      return res.status(404).json({ message: 'Voucher tidak valid atau sudah kadaluarsa' });
    }

    const voucher = vouchers[0];

    if (voucher.used_count >= voucher.quota) {
      return res.status(400).json({ message: 'Kuota voucher sudah habis' });
    }

    res.json(voucher);
  } catch (error) {
    console.error('Validate voucher error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/vouchers', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const {
      code, name, discount_type, discount_value,
      min_purchase, max_discount, quota,
      valid_from, valid_until
    } = req.body;

    const [result] = await pool.query(
      'INSERT INTO vouchers (code, name, discount_type, discount_value, min_purchase, max_discount, quota, valid_from, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [code, name, discount_type, discount_value, min_purchase || 0, max_discount || 0, quota, valid_from, valid_until]
    );

    res.status(201).json({ message: 'Voucher berhasil dibuat', id: result.insertId });
  } catch (error) {
    console.error('Create voucher error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.put('/api/vouchers/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code, name, discount_type, discount_value,
      min_purchase, max_discount, quota,
      valid_from, valid_until, is_active
    } = req.body;

    // Check if voucher exists
    const [vouchers] = await pool.query('SELECT id FROM vouchers WHERE id = ?', [id]);
    if (vouchers.length === 0) {
      return res.status(404).json({ message: 'Voucher tidak ditemukan' });
    }

    await pool.query(
      'UPDATE vouchers SET code = ?, name = ?, discount_type = ?, discount_value = ?, min_purchase = ?, max_discount = ?, quota = ?, valid_from = ?, valid_until = ?, is_active = ? WHERE id = ?',
      [code, name, discount_type, discount_value, min_purchase || 0, max_discount || 0, quota, valid_from, valid_until, is_active !== false, id]
    );

    res.json({ message: 'Voucher berhasil diupdate' });
  } catch (error) {
    console.error('Update voucher error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.delete('/api/vouchers/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if voucher exists
    const [vouchers] = await pool.query('SELECT id FROM vouchers WHERE id = ?', [id]);
    if (vouchers.length === 0) {
      return res.status(404).json({ message: 'Voucher tidak ditemukan' });
    }

    // Check if voucher is used in any orders
    const [orders] = await pool.query('SELECT id FROM orders WHERE voucher_id = ? LIMIT 1', [id]);
    if (orders.length > 0) {
      // Instead of deleting, deactivate the voucher
      await pool.query('UPDATE vouchers SET is_active = FALSE WHERE id = ?', [id]);
      return res.json({ message: 'Voucher berhasil dinonaktifkan (tidak dapat dihapus karena sudah digunakan)' });
    }

    // Delete the voucher if not used
    await pool.query('DELETE FROM vouchers WHERE id = ?', [id]);
    res.json({ message: 'Voucher berhasil dihapus' });
  } catch (error) {
    console.error('Delete voucher error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/cashback/balance', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT cashback_balance FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ balance: users[0]?.cashback_balance || 0 });
  } catch (error) {
    console.error('Get cashback balance error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/cashback/history', authenticateToken, async (req, res) => {
  try {
    const [history] = await pool.query(
      'SELECT * FROM cashback_history WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json(history);
  } catch (error) {
    console.error('Get cashback history error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/commission/balance', authenticateToken, authorizeRole('marketing'), async (req, res) => {
  try {
    // Ambil ringkasan komisi
    // Hanya menghitung komisi dari pesanan yang statusnya 'selesai' (komisi status 'completed')
    const [commissionSummary] = await pool.query(
      `SELECT
        -- Komisi yang sudah benar-benar menjadi hak marketing (status 'completed')
        SUM(CASE WHEN status = 'completed' THEN commission_amount ELSE 0 END) as totalCompleted,
        -- Komisi bulan ini (hanya dari pesanan yang selesai)
        SUM(CASE 
          WHEN status = 'completed' 
          AND MONTH(created_at) = MONTH(NOW()) 
          AND YEAR(created_at) = YEAR(NOW()) 
          THEN commission_amount 
          ELSE 0 
        END) as thisMonth,
        -- Total komisi sepanjang waktu (hanya dari pesanan yang selesai)
        SUM(CASE WHEN status = 'completed' THEN commission_amount ELSE 0 END) as totalEarned
       FROM commissions
       WHERE marketing_id = ?`,
      [req.user.id]
    );

    const totalCompleted = commissionSummary[0]?.totalCompleted || 0;
    const thisMonth = commissionSummary[0]?.thisMonth || 0;
    const totalEarned = commissionSummary[0]?.totalEarned || 0;

    // Ambil total penarikan (pending/approved/completed) untuk mengurangi saldo tersedia
    const [withdrawSummary] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('pending', 'approved', 'completed') THEN amount ELSE 0 END), 0) AS totalWithdrawn
       FROM commission_withdrawals
       WHERE marketing_id = ?`,
      [req.user.id]
    );

    const totalWithdrawn = withdrawSummary[0]?.totalWithdrawn || 0;

    // Saldo tersedia = komisi completed - semua penarikan yang belum ditolak
    const balance = Math.max(0, totalCompleted - totalWithdrawn);

    res.json({
      balance,
      thisMonth,
      totalEarned
    });
  } catch (error) {
    console.error('Get commission balance error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Riwayat komisi & penarikan untuk marketing
app.get('/api/commission/history', authenticateToken, authorizeRole('marketing'), async (req, res) => {
  try {
    // Riwayat komisi (credit)
    const [commissionHistory] = await pool.query(
      `SELECT 
         id,
         created_at,
         commission_amount AS amount,
         'credit' AS type,
         CONCAT('Komisi dari pesanan #', order_id) AS description,
         NULL AS status,
         NULL AS proof_image_url
       FROM commissions
       WHERE marketing_id = ?
         AND status != 'cancelled'`,
      [req.user.id]
    );

    // Riwayat penarikan (debit)
    const [withdrawHistory] = await pool.query(
      `SELECT
         id,
         created_at,
         amount,
         'debit' AS type,
         status,
         proof_image_url,
         CASE 
           WHEN status = 'pending' THEN CONCAT('Pengajuan penarikan (menunggu persetujuan) - ', bank_name)
           WHEN status = 'approved' THEN CONCAT('Penarikan disetujui - ', bank_name)
           WHEN status = 'completed' THEN CONCAT('Penarikan selesai - ', bank_name)
           WHEN status = 'rejected' THEN CONCAT('Penarikan ditolak - ', bank_name)
           ELSE CONCAT('Penarikan komisi - ', bank_name)
         END AS description
       FROM commission_withdrawals
       WHERE marketing_id = ?`,
      [req.user.id]
    );

    // Gabungkan dan urutkan berdasarkan tanggal terbaru
    const history = [...commissionHistory, ...withdrawHistory].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json(history);
  } catch (error) {
    console.error('Get commission history error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/commission/orders', authenticateToken, authorizeRole('marketing'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;

    const pageInt = parseInt(page, 10) || 1;
    const limitInt = Math.min(parseInt(limit, 10) || 10, 10); // Max 10 per page
    const offset = (pageInt - 1) * limitInt;

    // Base WHERE params (shared between count & data queries)
    const baseParams = [req.user.id];
    let whereClauses = [];

    if (status && status !== 'all') {
      whereClauses.push('c.status = ?');
      baseParams.push(status);
    }

    // Search functionality
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClauses.push(`(
        o.id LIKE ? OR
        COALESCE(o.guest_customer_name, u.name) LIKE ? OR
        u.email LIKE ? OR
        COALESCE(o.guest_wa_number_1, u.phone) LIKE ? OR
        o.delivery_address LIKE ? OR
        o.guest_event_date LIKE ?
      )`);
      baseParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const additionalWhereClause = whereClauses.length > 0
      ? ' AND ' + whereClauses.join(' AND ')
      : '';

    // Get total count of distinct orders for this marketing (with optional status filter and search)
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      LEFT JOIN commissions c ON o.id = c.order_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE o.marketing_id = ?${additionalWhereClause}
    `;
    const [countRows] = await pool.query(countQuery, baseParams);
    const total = countRows[0]?.total || 0;

    // Now fetch paginated data
    let dataQuery = `
      SELECT 
        o.*, 
        c.commission_amount, 
        c.status as commission_status,
        CASE 
          WHEN JSON_VALID(o.delivery_notes) THEN JSON_UNQUOTE(JSON_EXTRACT(o.delivery_notes, '$.admin_notes'))
          ELSE NULL
        END as admin_notes,
        GROUP_CONCAT(DISTINCT p.category ORDER BY p.category SEPARATOR ', ') as categories
      FROM orders o
      LEFT JOIN commissions c ON o.id = c.order_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE o.marketing_id = ?${additionalWhereClause}
    `;

    // Group by order id because we use aggregation (GROUP_CONCAT)
    dataQuery += ' GROUP BY o.id';

    dataQuery += ' ORDER BY o.created_at DESC';
    dataQuery += ' LIMIT ? OFFSET ?';

    const dataParams = [...baseParams, limitInt, offset];
    const [orders] = await pool.query(dataQuery, dataParams);

    res.json({
      data: orders,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: limitInt > 0 ? Math.max(1, Math.ceil(total / limitInt)) : 1
      }
    });
  } catch (error) {
    console.error('Get commission orders error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Commission withdrawal - Marketing
app.post('/api/commission/withdraw', authenticateToken, authorizeRole('marketing'), async (req, res) => {
  try {
    const { amount, bank_name, account_number, account_name } = req.body;

    if (!amount || !bank_name || !account_number || !account_name) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount < 50000) {
      return res.status(400).json({ message: 'Minimal penarikan adalah Rp 50.000' });
    }

    // Check balance
    const [balanceResult] = await pool.query(
      `SELECT SUM(CASE WHEN status = 'completed' THEN commission_amount ELSE 0 END) as balance
       FROM commissions
       WHERE marketing_id = ?`,
      [req.user.id]
    );

    const balance = balanceResult[0]?.balance || 0;
    if (withdrawalAmount > balance) {
      return res.status(400).json({ message: 'Saldo tidak mencukupi' });
    }

    // Check pending withdrawals
    const [pendingResult] = await pool.query(
      `SELECT SUM(amount) as pending_amount
       FROM commission_withdrawals
       WHERE marketing_id = ? AND status = 'pending'`,
      [req.user.id]
    );

    const pendingAmount = pendingResult[0]?.pending_amount || 0;
    if (withdrawalAmount > (balance - pendingAmount)) {
      return res.status(400).json({ message: 'Ada penarikan yang masih pending' });
    }

    // Create withdrawal request
    await pool.query(
      `INSERT INTO commission_withdrawals (marketing_id, amount, bank_name, account_number, account_name, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, withdrawalAmount, bank_name, account_number, account_name]
    );

    res.json({ message: 'Permintaan penarikan berhasil diajukan' });
  } catch (error) {
    console.error('Commission withdraw error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Get withdrawal requests - Admin
app.get('/api/admin/commission-withdrawals', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT w.*, u.name as marketing_name, u.email as marketing_email
      FROM commission_withdrawals w
      JOIN users u ON w.marketing_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND w.status = ?';
      params.push(status);
    }

    query += ' ORDER BY w.created_at DESC';

    const [withdrawals] = await pool.query(query, params);
    res.json(withdrawals);
  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Update withdrawal status - Admin (dengan upload bukti & catat pengeluaran arus kas)
app.put('/api/admin/commission-withdrawals/:id', authenticateToken, authorizeRole('admin'), upload.single('proof'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      connection.release();
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    // Ambil data withdrawal saat ini (untuk status lama, amount, dan bukti lama)
    const [currentRows] = await pool.query(
      'SELECT id, marketing_id, amount, status AS current_status, proof_image_url FROM commission_withdrawals WHERE id = ?',
      [id]
    );

    if (currentRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Request penarikan tidak ditemukan' });
    }

    const current = currentRows[0];

    // Jika sudah selesai, tidak boleh mengubah status lagi (tetap 'completed'),
    // tapi masih boleh update catatan dan bukti transfer.
    if (current.current_status === 'completed' && status !== 'completed') {
      connection.release();
      return res.status(400).json({ message: 'Status penarikan yang sudah selesai tidak dapat diubah' });
    }

    // Handle upload bukti transfer baru
    let newProofUrl = current.proof_image_url || null;
    if (req.file) {
      const uploadedUrl = `/uploads/${req.file.filename}`;

      // Hapus file bukti lama jika ada
      if (current.proof_image_url) {
        const oldFilePath = path.join(__dirname, current.proof_image_url.replace(/^\//, ''));
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (e) {
            console.error('Gagal menghapus bukti transfer lama:', e);
          }
        }
      }

      newProofUrl = uploadedUrl;
    }

    await pool.query(
      `UPDATE commission_withdrawals
       SET status = ?, admin_notes = ?, processed_by = ?, processed_at = NOW(), proof_image_url = ?
       WHERE id = ?`,
      [status, admin_notes || null, req.user.id, newProofUrl, id]
    );

    // Jika status berubah menjadi completed dan sebelumnya belum completed,
    // catat sebagai pengeluaran arus kas (aktivitas operasi)
    if (status === 'completed' && current.current_status !== 'completed') {
      try {
        await connection.beginTransaction();

        // Cek apakah transaksi arus kas untuk penarikan ini sudah ada
        const [existingTx] = await connection.query(
          `SELECT id FROM cash_flow_transactions 
           WHERE commission_withdrawal_id = ? AND type = 'expense'`,
          [id]
        );

        if (existingTx.length === 0) {
          const description = `Penarikan komisi marketing #${current.marketing_id} (withdrawal #${id})`;

          const [txResult] = await connection.query(
            `INSERT INTO cash_flow_transactions 
              (type, activity_category, amount, description, order_id, commission_withdrawal_id, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              'expense',
              'operasi',
              current.amount,
              description,
              null,
              id,
              req.user.id
            ]
          );

          const transactionId = txResult.insertId;

          // Catat ke riwayat edit arus kas
          await connection.query(
            `INSERT INTO cash_flow_edit_history 
             (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, change_type) 
             VALUES (?, ?, ?, ?, ?, ?, 'created')`,
            [
              transactionId,
              req.user.id,
              'expense',
              current.amount,
              description,
              'operasi'
            ]
          );
        }

        await connection.commit();
      } catch (err) {
        await connection.rollback();
        console.error('Error mencatat pengeluaran arus kas untuk penarikan komisi:', err);
        // Tidak perlu menggagalkan response utama, cukup log error
      }
    }

    connection.release();
    res.json({ message: 'Status penarikan berhasil diupdate' });
  } catch (error) {
    await connection.rollback().catch(() => { });
    connection.release();
    console.error('Update withdrawal status error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Update order payment status - Admin
app.put('/api/admin/orders/:id/payment-status', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!['pending', 'partial', 'paid'].includes(payment_status)) {
      return res.status(400).json({ message: 'Status pembayaran tidak valid' });
    }

    // Check if order exists
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    const order = orders[0];
    const previousPaymentStatus = order.payment_status;

    await pool.query(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [payment_status, id]
    );

    // Jika berubah menjadi 'paid' dari 'partial'/'pending' dan metode adalah 'dp'
    // Catat Pelunasan DP (Halaman 4 PDF): Debit Kas, Kredit Piutang Usaha
    if (payment_status === 'paid' && previousPaymentStatus !== 'paid' && order.payment_method === 'dp') {
      const finalAmount = parseFloat(order.final_amount) || 0;
      const dpPaid = parseFloat(order.payment_amount) > 0 ? parseFloat(order.payment_amount) : (finalAmount * 0.5);
      const remaining = Math.max(0, finalAmount - dpPaid);

      if (remaining > 0) {
        const connection = await pool.getConnection();
        try {
          await recordOrderDpSettlement(connection, id, remaining, req.user.id);
        } finally {
          connection.release();
        }
      }
    }

    res.json({ message: 'Status pembayaran berhasil diupdate' });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Update order notes (delivery_notes) - Admin
app.put('/api/admin/orders/:id/notes', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Check if order exists
    const [orders] = await pool.query('SELECT id, delivery_notes FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    const currentNotes = orders[0].delivery_notes;
    let updatedNotes = notes || '';

    // If current notes is JSON and we want to preserve structure
    if (currentNotes) {
      try {
        const parsedNotes = typeof currentNotes === 'string' && currentNotes.trim().startsWith('{')
          ? JSON.parse(currentNotes)
          : { notes: currentNotes };

        // Preserve customer notes (original 'notes' field) if it exists and is different from admin/kitchen notes
        // Only update admin_notes and kitchen_notes, keep customer notes intact
        const customerNotes = parsedNotes.notes &&
          parsedNotes.notes !== parsedNotes.kitchen_notes &&
          parsedNotes.notes !== parsedNotes.admin_notes
          ? parsedNotes.notes
          : (parsedNotes.notes || '');

        // Update or add kitchen_notes and admin_notes fields
        parsedNotes.kitchen_notes = notes || '';
        parsedNotes.admin_notes = notes || '';

        // Preserve customer notes if they exist separately
        if (customerNotes && customerNotes !== notes) {
          parsedNotes.notes = customerNotes;
        } else if (!parsedNotes.notes) {
          // If no customer notes exist, set notes to empty or the admin notes
          parsedNotes.notes = '';
        }

        updatedNotes = JSON.stringify(parsedNotes);
      } catch {
        // If not JSON, preserve the original as customer notes and create JSON structure
        const customerNotes = currentNotes || '';
        updatedNotes = JSON.stringify({
          notes: customerNotes,
          kitchen_notes: notes || '',
          admin_notes: notes || ''
        });
      }
    } else {
      // No existing notes, create new structure
      updatedNotes = JSON.stringify({ notes: '', kitchen_notes: notes || '', admin_notes: notes || '' });
    }

    await pool.query(
      'UPDATE orders SET delivery_notes = ? WHERE id = ?',
      [updatedNotes, id]
    );

    res.json({ message: 'Catatan berhasil diupdate' });
  } catch (error) {
    console.error('Update order notes error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Update admin notes on order (delivery_notes.admin_notes) - Marketing
app.put('/api/marketing/orders/:id/notes', authenticateToken, authorizeRole('marketing'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Check if order belongs to this marketing
    const [orders] = await pool.query(
      'SELECT id, delivery_notes FROM orders WHERE id = ? AND marketing_id = ?',
      [id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan atau bukan milik Anda' });
    }

    const currentNotes = orders[0].delivery_notes;
    let updatedNotes = notes || '';

    // If current notes is JSON, preserve structure and only update admin_notes
    if (currentNotes) {
      try {
        const parsedNotes = JSON.parse(currentNotes);

        // Preserve customer notes
        const customerNotes = parsedNotes.notes || '';
        const kitchenNotes = parsedNotes.kitchen_notes || '';

        parsedNotes.notes = customerNotes;
        parsedNotes.kitchen_notes = kitchenNotes;
        parsedNotes.admin_notes = notes || '';

        updatedNotes = JSON.stringify(parsedNotes);
      } catch {
        // If not JSON, create structured notes keeping old text as customer notes
        const customerNotes = currentNotes || '';
        updatedNotes = JSON.stringify({
          notes: customerNotes,
          kitchen_notes: '',
          admin_notes: notes || ''
        });
      }
    } else {
      // No existing notes, create new structure
      updatedNotes = JSON.stringify({ notes: '', kitchen_notes: '', admin_notes: notes || '' });
    }

    await pool.query(
      'UPDATE orders SET delivery_notes = ? WHERE id = ?',
      [updatedNotes, id]
    );

    res.json({ message: 'Catatan untuk admin berhasil diupdate' });
  } catch (error) {
    console.error('Update marketing order admin notes error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/stats/dashboard', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [todaySales] = await pool.query(
      'SELECT COALESCE(SUM(final_amount), 0) as total FROM orders WHERE DATE(created_at) = CURDATE() AND status != "dibatalkan"'
    );

    const [monthlySales] = await pool.query(
      'SELECT COALESCE(SUM(final_amount), 0) as total FROM orders WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) AND status != "dibatalkan"'
    );

    const [totalOrders] = await pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE status != "dibatalkan"'
    );

    const [pendingOrders] = await pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE status = "dibuat"'
    );

    const [totalProducts] = await pool.query(
      'SELECT COUNT(*) as total FROM products'
    );

    const [totalCustomers] = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE role = "pembeli"'
    );

    const [topProducts] = await pool.query(
      'SELECT name, category, sold_count as sold, (price * sold_count) as revenue FROM products ORDER BY sold_count DESC LIMIT 5'
    );

    res.json({
      stats: {
        todaySales: todaySales[0].total,
        monthlySales: monthlySales[0].total,
        totalOrders: totalOrders[0].total,
        pendingOrders: pendingOrders[0].total,
        totalProducts: totalProducts[0].total,
        totalCustomers: totalCustomers[0].total
      },
      topProducts
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Export sales report as CSV with date range filter (max 1 month)
app.get('/api/stats/export', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'start_date dan end_date wajib diisi' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Format tanggal tidak valid' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ message: 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir' });
    }

    // Batasi maksimal rentang tanggal 31 hari
    const diffMs = endDate.getTime() - startDate.getTime();
    const maxRangeMs = 31 * 24 * 60 * 60 * 1000;
    if (diffMs > maxRangeMs) {
      return res.status(400).json({ message: 'Rentang tanggal maksimal adalah 31 hari' });
    }

    const [rows] = await pool.query(
      `SELECT 
        o.id,
        DATE(o.created_at) as tanggal_pesanan,
        TIME(o.created_at) as waktu_pesanan,
        COALESCE(o.guest_customer_name, u.name) as customer_name,
        COALESCE(o.guest_wa_number_1, u.phone) as customer_phone,
        o.guest_event_name,
        o.guest_event_date,
        o.guest_event_time,
        o.payment_method,
        o.payment_status,
        o.status,
        o.total_amount,
        o.discount_amount,
        o.cashback_used,
        o.final_amount
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.status != 'dibatalkan'
        AND DATE(o.created_at) BETWEEN ? AND ?
      ORDER BY o.created_at ASC`,
      [start_date, end_date]
    );

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const header = [
      'Tanggal Pesanan',
      'Waktu Pesanan',
      'ID Pesanan',
      'Nama Customer',
      'No. WA Customer',
      'Nama Acara',
      'Tanggal Acara',
      'Waktu Acara',
      'Metode Pembayaran',
      'Status Pembayaran',
      'Status Pesanan',
      'Total Amount',
      'Diskon',
      'Cashback Digunakan',
      'Final Amount'
    ];

    const csvRows = [header.join(',')];

    rows.forEach((row) => {
      csvRows.push([
        escapeCsv(row.tanggal_pesanan),
        escapeCsv(row.waktu_pesanan),
        escapeCsv(row.id),
        escapeCsv(row.customer_name),
        escapeCsv(row.customer_phone),
        escapeCsv(row.guest_event_name),
        escapeCsv(row.guest_event_date),
        escapeCsv(row.guest_event_time),
        escapeCsv(row.payment_method),
        escapeCsv(row.payment_status),
        escapeCsv(row.status),
        escapeCsv(row.total_amount),
        escapeCsv(row.discount_amount),
        escapeCsv(row.cashback_used),
        escapeCsv(row.final_amount),
      ].join(','));
    });

    const filename = `laporan-penjualan-${start_date}-sd-${end_date}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Export sales stats error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengekspor laporan' });
  }
});

app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const [cart] = await pool.query(
      `SELECT c.*, 
              p.name, 
              p.price, 
              p.discounted_price, 
              COALESCE(
                (SELECT image_url FROM product_variant_images WHERE variant_id = c.variant_id AND is_primary = 1 LIMIT 1),
                (SELECT media_url FROM product_images WHERE product_id = c.product_id AND is_primary = 1 LIMIT 1),
                (SELECT media_url FROM product_images WHERE product_id = c.product_id ORDER BY display_order LIMIT 1),
                p.image_url
              ) as image_url,
              pv.name as variant_name, 
              (SELECT image_url FROM product_variant_images WHERE variant_id = c.variant_id AND is_primary = 1 LIMIT 1) as variant_image_url
       FROM cart c
       JOIN products p ON c.product_id = p.id
       LEFT JOIN product_variants pv ON c.variant_id = pv.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    // Parse addon_ids JSON and calculate price if total_price is null
    const cartWithAddons = cart.map(item => {
      let addonIds = [];
      if (item.addon_ids) {
        try {
          addonIds = typeof item.addon_ids === 'string' ? JSON.parse(item.addon_ids) : item.addon_ids;
        } catch (e) {
          console.error('Error parsing addon_ids:', e);
          addonIds = [];
        }
      }

      // If total_price is null, calculate it from product price
      let finalPrice = item.total_price;
      if (!finalPrice) {
        const basePrice = parseFloat(item.discounted_price || item.price || 0);
        finalPrice = basePrice * item.quantity;
      }

      return {
        ...item,
        addon_ids: addonIds,
        total_price: finalPrice
      };
    });

    res.json(cartWithAddons);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const { product_id, variant_id, quantity, addon_ids, total_price } = req.body;

    // Convert addon_ids to JSON string if it's an array
    const addonIdsJson = addon_ids && Array.isArray(addon_ids) && addon_ids.length > 0
      ? JSON.stringify(addon_ids)
      : null;

    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [req.user.id, product_id, variant_id, variant_id]
    );

    if (existing.length > 0) {
      // Update existing cart item
      if (total_price !== undefined && total_price !== null) {
        await pool.query(
          'UPDATE cart SET quantity = quantity + ?, addon_ids = ?, total_price = ? WHERE id = ?',
          [quantity, addonIdsJson, total_price, existing[0].id]
        );
      } else {
        await pool.query(
          'UPDATE cart SET quantity = quantity + ?, addon_ids = ? WHERE id = ?',
          [quantity, addonIdsJson, existing[0].id]
        );
      }
    } else {
      // Insert new cart item
      await pool.query(
        'INSERT INTO cart (user_id, product_id, variant_id, addon_ids, quantity, total_price) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, product_id, variant_id, addonIdsJson, quantity, total_price || null]
      );
    }

    res.json({ message: 'Produk berhasil ditambahkan ke keranjang' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.put('/api/cart/:id', authenticateToken, async (req, res) => {
  try {
    const { quantity } = req.body;

    // Get current cart item to recalculate total_price
    const [currentCart] = await pool.query(
      'SELECT quantity, total_price FROM cart WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (currentCart.length === 0) {
      return res.status(404).json({ message: 'Item tidak ditemukan' });
    }

    const currentItem = currentCart[0];
    let newTotalPrice = null;

    // If total_price exists, recalculate based on quantity ratio
    if (currentItem.total_price && currentItem.quantity > 0) {
      const pricePerUnit = currentItem.total_price / currentItem.quantity;
      newTotalPrice = pricePerUnit * quantity;
    }

    await pool.query(
      'UPDATE cart SET quantity = ?, total_price = ? WHERE id = ? AND user_id = ?',
      [quantity, newTotalPrice, req.params.id, req.user.id]
    );

    res.json({ message: 'Keranjang berhasil diupdate' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

    res.json({ message: 'Keranjang berhasil dikosongkan' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.delete('/api/cart/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM cart WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Item berhasil dihapus dari keranjang' });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;

    const pageInt = parseInt(page, 10) || 1;
    const limitInt = Math.min(parseInt(limit, 10) || 10, 10); // Max 10 per page
    const offset = (pageInt - 1) * limitInt;

    const whereClauses = [];
    const params = [];

    if (role && role !== 'all') {
      whereClauses.push('role = ?');
      params.push(role);
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClauses.push(`(
        name LIKE ? OR
        email LIKE ? OR
        phone LIKE ?
      )`);
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count total users
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereSql}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Fetch paginated users
    const [users] = await pool.query(
      `SELECT id, name, email, phone, address, role, cashback_balance, is_active, created_at 
       FROM users 
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitInt, offset]
    );

    res.json({
      data: users,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: limitInt > 0 ? Math.max(1, Math.ceil(total / limitInt)) : 1,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await pool.query(
      'SELECT id, name, email, phone, address, role, cashback_balance, is_active, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Nama, email, password, dan telepon harus diisi' });
    }

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    // Validate role
    const validRoles = ['pembeli', 'admin', 'marketing', 'operasional', 'dapur', 'kurir'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, address, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, address || null, role || 'pembeli', 1]
    );

    res.status(201).json({
      message: 'User berhasil dibuat',
      user: { id: result.insertId, name, email, phone, role: role || 'pembeli' }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat membuat user' });
  }
});

app.put('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, address, role } = req.body;

    // Check if user exists
    const [users] = await pool.query('SELECT id, email FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Check if email is being changed and already exists
    if (email && email !== users[0].email) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email sudah terdaftar' });
      }
    }

    // Validate role if provided
    const validRoles = ['pembeli', 'admin', 'marketing', 'operasional', 'dapur', 'kurir'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];

    if (name) {
      updateFields.push('name = ?');
      updateParams.push(name);
    }
    if (email) {
      updateFields.push('email = ?');
      updateParams.push(email);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateParams.push(hashedPassword);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateParams.push(phone || null);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateParams.push(address || null);
    }
    if (role) {
      updateFields.push('role = ?');
      updateParams.push(role);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data yang diupdate' });
    }

    updateParams.push(id);
    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    res.json({ message: 'User berhasil diupdate' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.put('/api/users/:id/role', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    res.json({ message: 'Role user berhasil diupdate' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.put('/api/users/:id/toggle-active', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Prevent deactivating yourself
    if (parseInt(id) === req.user.id && !is_active) {
      return res.status(400).json({ message: 'Tidak dapat menonaktifkan akun sendiri' });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);

    res.json({ message: `User berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
  } catch (error) {
    console.error('Toggle user active error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// ========================================
// KURIR CHECKLIST ENDPOINTS
// ========================================
app.get('/api/orders/:id/kurir-checklist', authenticateToken, async (req, res) => {
  try {
    const [checklists] = await pool.query(
      'SELECT * FROM kurir_checklists WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );

    if (checklists.length === 0) {
      // Return default empty checklist if none exists
      return res.json({ checklist_data: getDefaultKurirChecklist(), order_id: req.params.id });
    }

    res.json(checklists[0]);
  } catch (error) {
    console.error('Get kurir checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/orders/:id/kurir-checklist', authenticateToken, async (req, res) => {
  try {
    const { checklist_data } = req.body;
    const orderId = req.params.id;
    const userId = req.user.id;

    // Check if order exists
    const [orders] = await pool.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    // Insert or update checklist
    const [result] = await pool.query(
      'INSERT INTO kurir_checklists (order_id, checklist_data, saved_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE checklist_data = ?, saved_by = ?, updated_at = NOW()',
      [orderId, JSON.stringify(checklist_data), userId, JSON.stringify(checklist_data), userId]
    );

    res.status(201).json({
      message: 'Checklist berhasil disimpan',
      checklist_id: result.insertId || result.affectedRows
    });
  } catch (error) {
    console.error('Save kurir checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan checklist' });
  }
});

// ========================================
// KITCHEN CHECKLIST ENDPOINTS
// ========================================
app.get('/api/orders/:id/kitchen-checklist', authenticateToken, async (req, res) => {
  try {
    const [checklists] = await pool.query(
      'SELECT * FROM kitchen_checklists WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );

    if (checklists.length === 0) {
      // Return default empty checklist if none exists
      return res.json({ checklist_data: getDefaultChecklist(), order_id: req.params.id });
    }

    res.json(checklists[0]);
  } catch (error) {
    console.error('Get kitchen checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/orders/:id/kitchen-checklist', authenticateToken, async (req, res) => {
  try {
    const { checklist_data } = req.body;
    const orderId = req.params.id;
    const userId = req.user.id;

    // Check if order exists
    const [orders] = await pool.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    // Insert or update checklist
    const [result] = await pool.query(
      'INSERT INTO kitchen_checklists (order_id, checklist_data, saved_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE checklist_data = ?, saved_by = ?, updated_at = NOW()',
      [orderId, JSON.stringify(checklist_data), userId, JSON.stringify(checklist_data), userId]
    );

    res.status(201).json({
      message: 'Checklist berhasil disimpan',
      checklist_id: result.insertId
    });
  } catch (error) {
    console.error('Save kitchen checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan checklist' });
  }
});

// ========================================
// OPERASIONAL CHECKLIST ENDPOINTS
// ========================================
app.get('/api/operasional/checklist/:date', authenticateToken, async (req, res) => {
  try {
    const shiftDate = req.params.date;
    const userId = req.user.id;

    const [checklists] = await pool.query(
      'SELECT * FROM operasional_checklists WHERE shift_date = ? AND saved_by = ? ORDER BY created_at DESC LIMIT 1',
      [shiftDate, userId]
    );

    if (checklists.length === 0) {
      // Return default empty checklist if none exists
      return res.json({ checklist_data: getDefaultOperasionalChecklist(), shift_date: shiftDate });
    }

    // Parse checklist_data if it's a string
    let checklistData = checklists[0].checklist_data;
    if (typeof checklistData === 'string') {
      checklistData = JSON.parse(checklistData);
    }

    res.json({
      ...checklists[0],
      checklist_data: checklistData
    });
  } catch (error) {
    console.error('Get operasional checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/operasional/checklist/:date', authenticateToken, async (req, res) => {
  try {
    const { checklist_data } = req.body;
    const shiftDate = req.params.date;
    const userId = req.user.id;

    // Insert or update checklist
    const [result] = await pool.query(
      'INSERT INTO operasional_checklists (shift_date, checklist_data, saved_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE checklist_data = ?, updated_at = NOW()',
      [shiftDate, JSON.stringify(checklist_data), userId, JSON.stringify(checklist_data)]
    );

    res.status(201).json({
      message: 'Checklist berhasil disimpan',
      checklist_id: result.insertId || result.affectedRows
    });
  } catch (error) {
    console.error('Save operasional checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan checklist' });
  }
});

// ========================================
// ADMIN CHECKLIST ENDPOINTS
// ========================================
app.get('/api/admin/checklist/:date', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const checklistDate = req.params.date;
    const userId = req.user.id;

    const [checklists] = await pool.query(
      'SELECT * FROM admin_checklists WHERE checklist_date = ? AND admin_id = ? ORDER BY created_at DESC LIMIT 1',
      [checklistDate, userId]
    );

    if (checklists.length === 0) {
      // Return null to indicate no checklist exists yet
      return res.json(null);
    }

    // Parse checklist_data if it's a string
    let checklistData = checklists[0].checklist_data;
    if (typeof checklistData === 'string') {
      checklistData = JSON.parse(checklistData);
    }

    res.json({
      ...checklists[0],
      checklist_data: checklistData
    });
  } catch (error) {
    console.error('Get admin checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/admin/checklist/:date', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { checklist_data, notes } = req.body;
    const checklistDate = req.params.date;
    const userId = req.user.id;

    // Insert or update checklist
    const [result] = await pool.query(
      'INSERT INTO admin_checklists (checklist_date, admin_id, checklist_data, notes) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE checklist_data = ?, notes = ?, updated_at = NOW()',
      [checklistDate, userId, JSON.stringify(checklist_data), notes || null, JSON.stringify(checklist_data), notes || null]
    );

    res.status(201).json({
      message: 'Checklist berhasil disimpan',
      checklist_id: result.insertId || result.affectedRows
    });
  } catch (error) {
    console.error('Save admin checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan checklist' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'API Al Hakim Catering berjalan dengan baik!' });
});

// ========================================
// CASH FLOW ENDPOINTS
// ========================================

// Get cash flow summary (balance, income, expenses) with activity categories
app.get('/api/cash-flow/summary', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'AND DATE(created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    // Get overall balance
    const balanceQuery = `SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as balance
         FROM cash_flow_transactions 
         WHERE 1=1 ${dateFilter}`;
    const [balanceResult] = await pool.query(balanceQuery, params);
    const balance = parseFloat(balanceResult[0].balance || 0);

    // Get summary by activity category
    const categories = ['operasi', 'investasi', 'pendanaan'];
    const summaryByCategory = {};

    for (const category of categories) {
      const categoryParams = [...params];
      const incomeQuery = `SELECT COALESCE(SUM(amount), 0) as total 
           FROM cash_flow_transactions 
           WHERE type = 'income' AND activity_category = ? ${dateFilter}`;

      const expenseQuery = `SELECT COALESCE(SUM(amount), 0) as total 
           FROM cash_flow_transactions 
           WHERE type = 'expense' AND activity_category = ? ${dateFilter}`;

      const [incomeResult] = await pool.query(incomeQuery, [category, ...categoryParams]);
      const [expenseResult] = await pool.query(expenseQuery, [category, ...categoryParams]);

      const totalIncome = parseFloat(incomeResult[0].total || 0);
      const totalExpenses = parseFloat(expenseResult[0].total || 0);
      const totalCash = totalIncome - totalExpenses;

      summaryByCategory[category] = {
        totalIncome,
        totalExpenses,
        totalCash
      };
    }

    res.json({
      balance,
      operasi: summaryByCategory.operasi,
      investasi: summaryByCategory.investasi,
      pendanaan: summaryByCategory.pendanaan
    });
  } catch (error) {
    console.error('Get cash flow summary error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Get all cash flow transactions with pagination and filters
app.get('/api/cash-flow/transactions', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { type, activity_category, sub_category, start_date, end_date, limit = 10, offset = 0 } = req.query;

    let query = `
      SELECT cft.*, 
             u.name as created_by_name,
             o.id as order_id_ref
      FROM cash_flow_transactions cft
      LEFT JOIN users u ON cft.created_by = u.id
      LEFT JOIN orders o ON cft.order_id = o.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cash_flow_transactions cft
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (type) {
      query += ' AND cft.type = ?';
      countQuery += ' AND cft.type = ?';
      params.push(type);
      countParams.push(type);
    }

    if (activity_category) {
      query += ' AND cft.activity_category = ?';
      countQuery += ' AND cft.activity_category = ?';
      params.push(activity_category);
      countParams.push(activity_category);
    }

    if (sub_category) {
      query += ' AND cft.sub_category = ?';
      countQuery += ' AND cft.sub_category = ?';
      params.push(sub_category);
      countParams.push(sub_category);
    }

    if (start_date && end_date) {
      query += ' AND DATE(cft.created_at) BETWEEN ? AND ?';
      countQuery += ' AND DATE(cft.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
      countParams.push(start_date, end_date);
    }

    // Get total count
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total || 0;

    query += ' ORDER BY cft.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [transactions] = await pool.query(query, params);

    res.json({
      transactions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get cash flow transactions error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Create cash flow transaction (income or expense)
app.post('/api/cash-flow/transactions', authenticateToken, authorizeRole('admin'), upload.single('proof'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { type, amount, description, activity_category, sub_category, debit_account, credit_account } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ message: 'Type dan amount harus diisi' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Type harus income atau expense' });
    }

    const validCategories = ['operasi', 'investasi', 'pendanaan'];
    const category = activity_category && validCategories.includes(activity_category)
      ? activity_category
      : 'operasi';

    let proof_image_url = null;
    if (req.file) {
      proof_image_url = `/uploads/${req.file.filename}`;
    }

    const [result] = await connection.query(
      'INSERT INTO cash_flow_transactions (type, activity_category, sub_category, debit_account, credit_account, amount, description, proof_image_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [type, category, sub_category || null, debit_account || null, credit_account || null, parseFloat(amount), description || null, proof_image_url, req.user.id]
    );

    const transactionId = result.insertId;

    // Log creation in edit history
    await connection.query(
      `INSERT INTO cash_flow_edit_history 
       (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')`,
      [transactionId, req.user.id, type, parseFloat(amount), description || null, category, sub_category || null, debit_account || null, credit_account || null]
    );

    // If debit_account and credit_account provided, record to accounting_journal_entries for Neraca
    if (debit_account && credit_account) {
      await connection.query(
        `INSERT INTO accounting_journal_entries 
         (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
         VALUES (CURRENT_DATE, 'cash_flow', ?, ?, ?, ?, ?, ?)`,
        [transactionId, description || 'Transaksi Arus Kas', debit_account, credit_account, parseFloat(amount), req.user.id]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Transaksi berhasil ditambahkan',
      id: transactionId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create cash flow transaction error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  } finally {
    connection.release();
  }
});

// Update cash flow transaction
app.put('/api/cash-flow/transactions/:id', authenticateToken, authorizeRole('admin'), upload.single('proof'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { type, amount, description, activity_category, sub_category, debit_account, credit_account } = req.body;
    const transactionId = req.params.id;

    // Get current transaction data for history
    const [currentTransactions] = await connection.query(
      'SELECT type, amount, description, activity_category, sub_category, debit_account, credit_account FROM cash_flow_transactions WHERE id = ?',
      [transactionId]
    );
    if (currentTransactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    const current = currentTransactions[0];

    let proof_image_url = null;
    if (req.file) {
      proof_image_url = `/uploads/${req.file.filename}`;
    }

    const updateFields = ['is_edited = 1'];
    const updateParams = [];
    const historyChanges = {
      old_type: current.type,
      new_type: current.type,
      old_amount: current.amount,
      new_amount: current.amount,
      old_description: current.description,
      new_description: current.description,
      old_activity_category: current.activity_category,
      new_activity_category: current.activity_category,
      old_sub_category: current.sub_category,
      new_sub_category: current.sub_category,
      old_debit_account: current.debit_account,
      new_debit_account: current.debit_account,
      old_credit_account: current.credit_account,
      new_credit_account: current.credit_account
    };

    if (type && type !== current.type) {
      updateFields.push('type = ?');
      updateParams.push(type);
      historyChanges.new_type = type;
    }
    if (amount && parseFloat(amount) !== parseFloat(current.amount)) {
      updateFields.push('amount = ?');
      updateParams.push(parseFloat(amount));
      historyChanges.new_amount = parseFloat(amount);
    }
    if (description !== undefined && description !== current.description) {
      updateFields.push('description = ?');
      updateParams.push(description);
      historyChanges.new_description = description;
    }
    if (activity_category && activity_category !== current.activity_category) {
      const validCategories = ['operasi', 'investasi', 'pendanaan'];
      if (validCategories.includes(activity_category)) {
        updateFields.push('activity_category = ?');
        updateParams.push(activity_category);
        historyChanges.new_activity_category = activity_category;
      }
    }
    if (sub_category !== undefined && sub_category !== current.sub_category) {
      updateFields.push('sub_category = ?');
      updateParams.push(sub_category || null);
      historyChanges.new_sub_category = sub_category || null;
    }
    if (debit_account !== undefined && debit_account !== current.debit_account) {
      updateFields.push('debit_account = ?');
      updateParams.push(debit_account || null);
      historyChanges.new_debit_account = debit_account || null;
    }
    if (credit_account !== undefined && credit_account !== current.credit_account) {
      updateFields.push('credit_account = ?');
      updateParams.push(credit_account || null);
      historyChanges.new_credit_account = credit_account || null;
    }
    if (proof_image_url) {
      updateFields.push('proof_image_url = ?');
      updateParams.push(proof_image_url);
    }

    updateParams.push(transactionId);
    await connection.query(
      `UPDATE cash_flow_transactions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Log edit in history
    await connection.query(
      `INSERT INTO cash_flow_edit_history 
       (transaction_id, changed_by, old_type, new_type, old_amount, new_amount, 
        old_description, new_description, old_activity_category, new_activity_category,
        old_sub_category, new_sub_category, old_debit_account, new_debit_account,
        old_credit_account, new_credit_account, change_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'updated')`,
      [
        transactionId, req.user.id,
        historyChanges.old_type, historyChanges.new_type,
        historyChanges.old_amount, historyChanges.new_amount,
        historyChanges.old_description, historyChanges.new_description,
        historyChanges.old_activity_category, historyChanges.new_activity_category,
        historyChanges.old_sub_category, historyChanges.new_sub_category,
        historyChanges.old_debit_account, historyChanges.new_debit_account,
        historyChanges.old_credit_account, historyChanges.new_credit_account
      ]
    );

    // Sync with accounting_journal_entries
    const finalDebit = historyChanges.new_debit_account;
    const finalCredit = historyChanges.new_credit_account;
    const finalAmount = parseFloat(historyChanges.new_amount);
    const finalDesc = historyChanges.new_description || 'Transaksi Arus Kas';

    const [existingJournals] = await connection.query(
      'SELECT id FROM accounting_journal_entries WHERE reference_type = "cash_flow" AND reference_id = ?',
      [transactionId]
    );

    if (finalDebit && finalCredit) {
      if (existingJournals.length > 0) {
        await connection.query(
          `UPDATE accounting_journal_entries 
           SET debit_account = ?, credit_account = ?, amount = ?, description = ? 
           WHERE id = ?`,
          [finalDebit, finalCredit, finalAmount, finalDesc, existingJournals[0].id]
        );
      } else {
        await connection.query(
          `INSERT INTO accounting_journal_entries 
           (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
           VALUES (CURRENT_DATE, 'cash_flow', ?, ?, ?, ?, ?, ?)`,
          [transactionId, finalDesc, finalDebit, finalCredit, finalAmount, req.user.id]
        );
      }
    } else if (existingJournals.length > 0) {
      // If debit or credit removed, delete journal
      await connection.query(
        'DELETE FROM accounting_journal_entries WHERE id = ?',
        [existingJournals[0].id]
      );
    }

    await connection.commit();

    res.json({ message: 'Transaksi berhasil diupdate' });
  } catch (error) {
    await connection.rollback();
    console.error('Update cash flow transaction error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  } finally {
    connection.release();
  }
});

// Delete cash flow transaction
app.delete('/api/cash-flow/transactions/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const transactionId = req.params.id;

    // Get transaction data for history before deletion
    const [transactions] = await connection.query(
      'SELECT id, type, amount, description, activity_category, sub_category, debit_account, credit_account, proof_image_url FROM cash_flow_transactions WHERE id = ?',
      [transactionId]
    );
    if (transactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    const transaction = transactions[0];

    // Log deletion in history
    await connection.query(
      `INSERT INTO cash_flow_edit_history 
       (transaction_id, changed_by, old_type, old_amount, old_description, old_activity_category, old_sub_category, old_debit_account, old_credit_account, change_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'deleted')`,
      [
        transactionId, req.user.id,
        transaction.type, transaction.amount,
        transaction.description, transaction.activity_category,
        transaction.sub_category, transaction.debit_account, transaction.credit_account
      ]
    );

    // Delete associated journal entry
    await connection.query(
      'DELETE FROM accounting_journal_entries WHERE reference_type = "cash_flow" AND reference_id = ?',
      [transactionId]
    );

    // Delete proof image if exists
    if (transaction.proof_image_url) {
      const filePath = path.join(__dirname, transaction.proof_image_url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await connection.query('DELETE FROM cash_flow_transactions WHERE id = ?', [transactionId]);

    await connection.commit();

    res.json({ message: 'Transaksi berhasil dihapus' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete cash flow transaction error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  } finally {
    connection.release();
  }
});

// Get edit history for a transaction
app.get('/api/cash-flow/transactions/:id/history', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [history] = await pool.query(
      `SELECT h.*, u.name as changed_by_name
       FROM cash_flow_edit_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.transaction_id = ?
       ORDER BY h.created_at DESC`,
      [req.params.id]
    );

    res.json(history);
  } catch (error) {
    console.error('Get cash flow edit history error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Export cash flow to Excel
app.get('/api/cash-flow/export', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { type, activity_category, start_date, end_date } = req.query;

    let query = `
      SELECT cft.*, 
             u.name as created_by_name,
             o.id as order_id_ref
      FROM cash_flow_transactions cft
      LEFT JOIN users u ON cft.created_by = u.id
      LEFT JOIN orders o ON cft.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND cft.type = ?';
      params.push(type);
    }

    if (activity_category) {
      query += ' AND cft.activity_category = ?';
      params.push(activity_category);
    }

    if (start_date && end_date) {
      query += ' AND DATE(cft.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY cft.created_at DESC';

    const [transactions] = await pool.query(query, params);

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      return /[",\n]/.test(str) ? `"${str}"` : str;
    };

    const activityCategoryMap = {
      operasi: 'Aktivitas Operasi',
      investasi: 'Aktivitas Investasi',
      pendanaan: 'Aktivitas Pendanaan',
    };

    const typeMap = {
      income: 'Pemasukan',
      expense: 'Pengeluaran',
    };

    const header = [
      'Tanggal',
      'Kategori Aktivitas',
      'Tipe',
      'Jumlah',
      'Keterangan',
      'Dibuat Oleh',
      'Pesanan #',
    ];

    const csvRows = [header.join(',')];

    // Inisialisasi summary untuk setiap kategori aktivitas
    const summary = {
      balance: 0,
      operasi: { totalIncome: 0, totalExpenses: 0, totalCash: 0 },
      investasi: { totalIncome: 0, totalExpenses: 0, totalCash: 0 },
      pendanaan: { totalIncome: 0, totalExpenses: 0, totalCash: 0 },
    };

    transactions.forEach((row) => {
      const amount = Number(row.amount) || 0;
      const category = row.activity_category;
      const typeKey = row.type;

      // Tambah baris detail transaksi
      csvRows.push([
        escapeCsv(new Date(row.created_at).toLocaleString('id-ID')),
        escapeCsv(activityCategoryMap[category] || category),
        escapeCsv(typeMap[typeKey] || typeKey),
        escapeCsv(typeKey === 'income' ? amount : -amount),
        escapeCsv(row.description || '-'),
        escapeCsv(row.created_by_name || '-'),
        escapeCsv(row.order_id_ref || '-'),
      ].join(','));

      // Hitung summary jika kategori dan tipe valid
      if (summary[category] && (typeKey === 'income' || typeKey === 'expense')) {
        if (typeKey === 'income') {
          summary[category].totalIncome += amount;
          summary.balance += amount;
        } else if (typeKey === 'expense') {
          summary[category].totalExpenses += amount;
          summary.balance -= amount;
        }
      }
    });

    // Hitung total kas per kategori
    ['operasi', 'investasi', 'pendanaan'].forEach((cat) => {
      summary[cat].totalCash = summary[cat].totalIncome - summary[cat].totalExpenses;
    });

    // Tambahkan baris kosong pemisah
    csvRows.push('');

    // TOTAL SALDO
    csvRows.push([
      '',
      'TOTAL SALDO',
      '',
      escapeCsv(summary.balance),
      '',
      '',
      '',
    ].join(','));

    // Fungsi helper untuk menambahkan blok summary per kategori
    const appendCategorySummary = (key, title) => {
      const data = summary[key];
      csvRows.push('');
      csvRows.push(['', title, '', '', '', '', ''].join(','));
      csvRows.push([
        '',
        '',
        'TOTAL PEMASUKAN',
        escapeCsv(data.totalIncome),
        '',
        '',
        '',
      ].join(','));
      csvRows.push([
        '',
        '',
        'TOTAL PENGELUARAN',
        escapeCsv(-data.totalExpenses),
        '',
        '',
        '',
      ].join(','));
      csvRows.push([
        '',
        '',
        'TOTAL KAS',
        escapeCsv(data.totalCash),
        '',
        '',
        '',
      ].join(','));
    };

    // Tambahkan summary untuk masing-masing kategori aktivitas
    appendCategorySummary('operasi', 'AKTIVITAS OPERASI');
    appendCategorySummary('investasi', 'AKTIVITAS INVESTASI');
    appendCategorySummary('pendanaan', 'AKTIVITAS PENDANAAN');

    const filename = `laporan-arus-kas-${start_date || 'all'}-sd-${end_date || 'all'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csvRows.join('\n')); // BOM for Excel UTF-8 support
  } catch (error) {
    console.error('Export cash flow error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengekspor laporan' });
  }
});

// ========================================
// NERACA (BALANCE SHEET) ENDPOINTS
// ========================================

const DEBIT_ACCOUNTS = [
  'Kas',
  'Bank',
  'Piutang Usaha',
  'Persediaan',
  'Perlengkapan',
  'Aset Tetap',
  'HPP',
  'Beban Operasional',
  'Beban Bunga',
  'Pembatalan penjualan'
];

const CREDIT_ACCOUNTS = [
  'Utang Usaha',
  'Utang Bank',
  'Utang/Beban Masih Harus Dibayar',
  'Modal Pemilik',
  'Laba Ditahan',
  'Prive',
  'Pendapatan Penjualan',
  'Pendapatan Jasa',
  'Pendapatan Lainnya'
];

// Get standard chart of accounts
app.get('/api/neraca/accounts', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({
    debitAccounts: DEBIT_ACCOUNTS,
    creditAccounts: CREDIT_ACCOUNTS
  });
});

// Get Neraca summary (tabel neraca berdasarkan total saldo saja)
app.get('/api/neraca/summary', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = ' WHERE entry_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (end_date) {
      dateFilter = ' WHERE entry_date <= ?';
      params.push(end_date);
    }

    // Query debit accounts total
    const [debitRows] = await pool.query(
      `SELECT debit_account, SUM(amount) as total 
       FROM accounting_journal_entries 
       ${dateFilter} 
       GROUP BY debit_account`,
      params
    );

    // Query credit accounts total
    const [creditRows] = await pool.query(
      `SELECT credit_account, SUM(amount) as total 
       FROM accounting_journal_entries 
       ${dateFilter} 
       GROUP BY credit_account`,
      params
    );

    // Map into lists
    const debitMap = {};
    debitRows.forEach(row => {
      debitMap[row.debit_account] = parseFloat(row.total || 0);
    });

    const creditMap = {};
    creditRows.forEach(row => {
      creditMap[row.credit_account] = parseFloat(row.total || 0);
    });

    // Build complete debit accounts list
    let totalDebit = 0;
    const debitList = DEBIT_ACCOUNTS.map(account => {
      const amount = debitMap[account] || 0;
      totalDebit += amount;
      return { account, amount };
    });

    // Build complete credit accounts list
    let totalCredit = 0;
    const creditList = CREDIT_ACCOUNTS.map(account => {
      const amount = creditMap[account] || 0;
      totalCredit += amount;
      return { account, amount };
    });

    // Also include any custom accounts not in standard list if any
    debitRows.forEach(row => {
      if (!DEBIT_ACCOUNTS.includes(row.debit_account)) {
        const amount = parseFloat(row.total || 0);
        totalDebit += amount;
        debitList.push({ account: row.debit_account, amount });
      }
    });

    creditRows.forEach(row => {
      if (!CREDIT_ACCOUNTS.includes(row.credit_account)) {
        const amount = parseFloat(row.total || 0);
        totalCredit += amount;
        creditList.push({ account: row.credit_account, amount });
      }
    });

    res.json({
      debitList,
      creditList,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      difference: totalDebit - totalCredit
    });
  } catch (error) {
    console.error('Get neraca summary error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat data neraca' });
  }
});

// Get journal entries
app.get('/api/neraca/journal', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { start_date, end_date, debit_account, credit_account, reference_type, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT j.*, u.name as created_by_name
      FROM accounting_journal_entries j
      LEFT JOIN users u ON j.created_by = u.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM accounting_journal_entries j
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (start_date && end_date) {
      query += ' AND j.entry_date BETWEEN ? AND ?';
      countQuery += ' AND j.entry_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
      countParams.push(start_date, end_date);
    }

    if (debit_account) {
      query += ' AND j.debit_account = ?';
      countQuery += ' AND j.debit_account = ?';
      params.push(debit_account);
      countParams.push(debit_account);
    }

    if (credit_account) {
      query += ' AND j.credit_account = ?';
      countQuery += ' AND j.credit_account = ?';
      params.push(credit_account);
      countParams.push(credit_account);
    }

    if (reference_type) {
      query += ' AND j.reference_type = ?';
      countQuery += ' AND j.reference_type = ?';
      params.push(reference_type);
      countParams.push(reference_type);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total || 0;

    query += ' ORDER BY j.entry_date DESC, j.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [entries] = await pool.query(query, params);

    res.json({
      entries,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get journal entries error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat jurnal' });
  }
});

// Create manual journal entry
app.post('/api/neraca/journal', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { entry_date, description, debit_account, credit_account, amount } = req.body;

    if (!entry_date || !description || !debit_account || !credit_account || !amount) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }

    const [result] = await pool.query(
      `INSERT INTO accounting_journal_entries 
       (entry_date, reference_type, description, debit_account, credit_account, amount, created_by) 
       VALUES (?, 'manual', ?, ?, ?, ?, ?)`,
      [entry_date, description, debit_account, credit_account, parseFloat(amount), req.user.id]
    );

    res.status(201).json({
      message: 'Jurnal berhasil ditambahkan',
      id: result.insertId
    });
  } catch (error) {
    console.error('Create journal entry error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menambahkan jurnal' });
  }
});

// ========================================
// COMPANY SETTINGS ENDPOINTS
// ========================================

// Get company settings
app.get('/api/company-settings', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM company_settings WHERE id = 1');

    if (settings.length === 0) {
      // Return default settings
      res.json({
        id: 1,
        company_name: 'Al Hakim Catering',
        company_address: null,
        company_phone: null,
        company_email: null,
        company_logo_url: null,
        tax_id: null,
        bank_name: null,
        bank_account_number: null,
        bank_account_name: null
      });
    } else {
      res.json(settings[0]);
    }
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Update company settings
app.put('/api/company-settings', authenticateToken, authorizeRole('admin'), upload.single('logo'), async (req, res) => {
  try {
    const {
      company_name,
      company_address,
      company_phone,
      company_email,
      tax_id,
      bank_name,
      bank_account_number,
      bank_account_name
    } = req.body;

    let logo_url = null;
    if (req.file) {
      logo_url = `/uploads/${req.file.filename}`;
    }

    // Check if settings exist
    const [existing] = await pool.query('SELECT id FROM company_settings WHERE id = 1');

    if (existing.length === 0) {
      // Insert new settings
      await pool.query(
        `INSERT INTO company_settings (
          id, company_name, company_address, company_phone, company_email,
          company_logo_url, tax_id, bank_name, bank_account_number, bank_account_name, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1, company_name, company_address, company_phone, company_email,
          logo_url, tax_id, bank_name, bank_account_number, bank_account_name, req.user.id
        ]
      );
    } else {
      // Update existing settings
      const updateFields = [];
      const updateParams = [];

      if (company_name !== undefined) {
        updateFields.push('company_name = ?');
        updateParams.push(company_name);
      }
      if (company_address !== undefined) {
        updateFields.push('company_address = ?');
        updateParams.push(company_address);
      }
      if (company_phone !== undefined) {
        updateFields.push('company_phone = ?');
        updateParams.push(company_phone);
      }
      if (company_email !== undefined) {
        updateFields.push('company_email = ?');
        updateParams.push(company_email);
      }
      if (logo_url) {
        updateFields.push('company_logo_url = ?');
        updateParams.push(logo_url);
      }
      if (tax_id !== undefined) {
        updateFields.push('tax_id = ?');
        updateParams.push(tax_id);
      }
      if (bank_name !== undefined) {
        updateFields.push('bank_name = ?');
        updateParams.push(bank_name);
      }
      if (bank_account_number !== undefined) {
        updateFields.push('bank_account_number = ?');
        updateParams.push(bank_account_number);
      }
      if (bank_account_name !== undefined) {
        updateFields.push('bank_account_name = ?');
        updateParams.push(bank_account_name);
      }

      updateFields.push('updated_by = ?');
      updateParams.push(req.user.id);

      if (updateFields.length > 1) {
        updateParams.push(1);
        await pool.query(
          `UPDATE company_settings SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );
      }
    }

    res.json({ message: 'Pengaturan perusahaan berhasil diupdate' });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// ========================================
// INVOICE ENDPOINTS
// ========================================

// Get invoice data for an order
app.get('/api/orders/:id/invoice', authenticateToken, authorizeRole('admin', 'marketing'), async (req, res) => {
  try {
    const orderId = req.params.id;

    // Build query with role-based access control
    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone, u.address as customer_address
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const params = [orderId];

    // If user is marketing, only allow access to their own orders
    if (req.user.role === 'marketing') {
      query += ' AND o.marketing_id = ?';
      params.push(req.user.id);
    }

    const [orders] = await pool.query(query, params);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    // Get company settings
    const [companySettings] = await pool.query('SELECT * FROM company_settings WHERE id = 1');
    const company = companySettings.length > 0 ? companySettings[0] : {
      company_name: 'Al Hakim Catering',
      company_address: null,
      company_phone: null,
      company_email: null,
      company_logo_url: null,
      tax_id: null,
      bank_name: null,
      bank_account_number: null,
      bank_account_name: null
    };

    // Use guest customer info if available
    const customerName = order.guest_customer_name || order.customer_name;
    const customerPhone = order.guest_wa_number_1 || order.customer_phone;
    const customerEmail = order.customer_email;
    const customerAddress = order.delivery_address;

    res.json({
      order: {
        ...order,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress
      },
      items,
      company
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// ========================================
// INVENTORY, PURCHASING & LABA RUGI ROUTES
// ========================================

// ==========================================
// 1. MASTER STOK PERSEDIAAN & TRACKING ROUTES
// ==========================================
// ==========================================
// 1. MASTER STOK PERSEDIAAN
// ==========================================

// Get distinct categories
app.get('/api/inventory/categories', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');
    res.json(rows.map(r => r.category));
  } catch (error) {
    console.error('Get inventory categories error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat kategori' });
  }
});

// Get inventory items list
app.get('/api/inventory/items', authenticateToken, async (req, res) => {
  try {
    const { category, search, low_stock } = req.query;

    let query = `
        SELECT ii.*, 
               (ii.stock <= ii.min_stock) as is_low_stock
        FROM inventory_items ii 
        WHERE 1=1
      `;
    const params = [];

    if (category) {
      query += ' AND ii.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (ii.name LIKE ? OR ii.category LIKE ? OR ii.notes LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (low_stock === 'true' || low_stock === '1') {
      query += ' AND ii.stock <= ii.min_stock';
    }

    query += ' ORDER BY ii.category ASC, ii.name ASC';

    const [items] = await pool.query(query, params);
    res.json(items);
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat stok persediaan' });
  }
});

// Add new inventory item
app.post('/api/inventory/items', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { category, name, unit = 'Pcs', stock = 0, min_stock = 0, last_price = 0, notes } = req.body;

    if (!category || !name) {
      await connection.rollback();
      return res.status(400).json({ message: 'Kategori dan nama barang wajib diisi' });
    }

    const initialStock = parseFloat(stock) || 0;
    const minStock = parseFloat(min_stock) || 0;
    const price = parseFloat(last_price) || 0;

    const [result] = await connection.query(
      `INSERT INTO inventory_items (category, name, unit, stock, min_stock, last_price, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category.trim(), name.trim(), unit, initialStock, minStock, price, notes || null]
    );

    const newItemId = result.insertId;

    // Log initial stock if > 0
    if (initialStock > 0) {
      await connection.query(
        `INSERT INTO inventory_stock_logs 
           (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
           VALUES (?, CURRENT_DATE, 0, ?, 0, ?, 'Saldo awal persediaan', 'manual', ?, ?)`,
        [newItemId, initialStock, initialStock, newItemId, req.user.id]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Barang persediaan berhasil ditambahkan',
      itemId: newItemId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create inventory item error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menambahkan barang persediaan' });
  } finally {
    connection.release();
  }
});

// Update inventory item
app.put('/api/inventory/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, unit, min_stock, last_price, notes } = req.body;

    const [items] = await pool.query('SELECT id FROM inventory_items WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ message: 'Barang persediaan tidak ditemukan' });
    }

    await pool.query(
      `UPDATE inventory_items 
         SET category = ?, name = ?, unit = ?, min_stock = ?, last_price = ?, notes = ? 
         WHERE id = ?`,
      [
        category.trim(),
        name.trim(),
        unit,
        parseFloat(min_stock) || 0,
        parseFloat(last_price) || 0,
        notes || null,
        id
      ]
    );

    res.json({ message: 'Data barang persediaan berhasil diperbarui' });
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui barang persediaan' });
  }
});

// Delete inventory item
app.delete('/api/inventory/items/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [items] = await pool.query('SELECT id FROM inventory_items WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ message: 'Barang persediaan tidak ditemukan' });
    }

    await pool.query('DELETE FROM inventory_items WHERE id = ?', [id]);
    res.json({ message: 'Barang persediaan berhasil dihapus' });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ message: 'Gagal menghapus barang, kemungkinan terdapat riwayat transaksi yang terkait' });
  }
});

// ==========================================
// 2. TRACKING STOK PERSEDIAAN (KARTU STOK)
// ==========================================

// Get stock logs (Kartu Stok)
app.get('/api/inventory/stock-logs', authenticateToken, async (req, res) => {
  try {
    const {
      item_id,
      category,
      search,
      start_date,
      end_date,
      limit = 20,
      offset = 0
    } = req.query;

    let query = `
        SELECT isl.*, 
               ii.name as item_name, 
               ii.category as item_category, 
               ii.unit as item_unit, 
               u.name as created_by_name
        FROM inventory_stock_logs isl
        JOIN inventory_items ii ON isl.inventory_item_id = ii.id
        LEFT JOIN users u ON isl.created_by = u.id
        WHERE 1=1
      `;

    let countQuery = `
        SELECT COUNT(*) as total
        FROM inventory_stock_logs isl
        JOIN inventory_items ii ON isl.inventory_item_id = ii.id
        WHERE 1=1
      `;

    const params = [];
    const countParams = [];

    if (item_id) {
      query += ' AND isl.inventory_item_id = ?';
      countQuery += ' AND isl.inventory_item_id = ?';
      params.push(item_id);
      countParams.push(item_id);
    }

    if (category) {
      query += ' AND ii.category = ?';
      countQuery += ' AND ii.category = ?';
      params.push(category);
      countParams.push(category);
    }

    if (search) {
      query += ' AND (ii.name LIKE ? OR isl.notes LIKE ?)';
      countQuery += ' AND (ii.name LIKE ? OR isl.notes LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
      countParams.push(pattern, pattern);
    }

    if (start_date && end_date) {
      query += ' AND isl.date BETWEEN ? AND ?';
      countQuery += ' AND isl.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
      countParams.push(start_date, end_date);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total || 0;

    query += ' ORDER BY isl.date DESC, isl.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.query(query, params);

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get stock logs error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat kartu stok' });
  }
});

// Manual stock adjustment
app.post('/api/inventory/stock-logs/adjust', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { inventory_item_id, adjustment_type, quantity, notes } = req.body;

    if (!inventory_item_id || !adjustment_type || !quantity || parseFloat(quantity) <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Item, jenis penyesuaian, dan jumlah valid wajib diisi' });
    }

    const qty = parseFloat(quantity);

    const [items] = await connection.query(
      'SELECT id, name, unit, stock FROM inventory_items WHERE id = ? FOR UPDATE',
      [inventory_item_id]
    );

    if (items.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Barang persediaan tidak ditemukan' });
    }

    const item = items[0];
    const stockInitial = parseFloat(item.stock);
    let stockIn = 0;
    let stockOut = 0;
    let stockFinal = stockInitial;

    if (adjustment_type === 'in') {
      stockIn = qty;
      stockFinal = stockInitial + qty;
    } else if (adjustment_type === 'out') {
      stockOut = qty;
      stockFinal = Math.max(0, stockInitial - qty);
    } else {
      await connection.rollback();
      return res.status(400).json({ message: 'Jenis penyesuaian tidak valid (in atau out)' });
    }

    await connection.query(
      'UPDATE inventory_items SET stock = ? WHERE id = ?',
      [stockFinal, inventory_item_id]
    );

    await connection.query(
      `INSERT INTO inventory_stock_logs 
         (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
         VALUES (?, CURRENT_DATE, ?, ?, ?, ?, ?, 'manual', NULL, ?)`,
      [inventory_item_id, stockInitial, stockIn, stockOut, stockFinal, notes || 'Penyesuaian stok manual', req.user.id]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Penyesuaian stok berhasil dicatat',
      newStock: stockFinal
    });
  } catch (error) {
    await connection.rollback();
    console.error('Adjust stock error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyesuaikan stok' });
  } finally {
    connection.release();
  }
});

// ==========================================
// 3. STOK OPNAME
// ==========================================

// Get stok opname list
app.get('/api/inventory/opname', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, item_id, limit = 20, offset = 0 } = req.query;

    let query = `
        SELECT io.*, 
               ii.name as item_name, 
               ii.category as item_category, 
               ii.unit as item_unit, 
               u.name as checked_by_name
        FROM inventory_opname io
        JOIN inventory_items ii ON io.inventory_item_id = ii.id
        LEFT JOIN users u ON io.checked_by = u.id
        WHERE 1=1
      `;
    let countQuery = `
        SELECT COUNT(*) as total
        FROM inventory_opname io
        WHERE 1=1
      `;

    const params = [];
    const countParams = [];

    if (item_id) {
      query += ' AND io.inventory_item_id = ?';
      countQuery += ' AND io.inventory_item_id = ?';
      params.push(item_id);
      countParams.push(item_id);
    }

    if (start_date && end_date) {
      query += ' AND io.date BETWEEN ? AND ?';
      countQuery += ' AND io.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
      countParams.push(start_date, end_date);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total || 0;

    query += ' ORDER BY io.date DESC, io.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [opnames] = await pool.query(query, params);

    res.json({
      opnames,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get opname list error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat stok opname' });
  }
});

// Create stok opname entry
app.post('/api/inventory/opname', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { inventory_item_id, date, physical_stock, notes, sync_stock = false } = req.body;

    if (!inventory_item_id || physical_stock === undefined || physical_stock === null) {
      await connection.rollback();
      return res.status(400).json({ message: 'Item persediaan dan stok fisik wajib diisi' });
    }

    const [items] = await connection.query(
      'SELECT id, name, unit, stock FROM inventory_items WHERE id = ? FOR UPDATE',
      [inventory_item_id]
    );

    if (items.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Barang persediaan tidak ditemukan' });
    }

    const item = items[0];
    const systemStock = parseFloat(item.stock);
    const physicalStock = parseFloat(physical_stock);
    const difference = physicalStock - systemStock;
    const opnameDate = date || new Date().toISOString().split('T')[0];

    // Insert opname record
    const [opnameRes] = await connection.query(
      `INSERT INTO inventory_opname 
         (inventory_item_id, date, system_stock, physical_stock, difference, notes, checked_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [inventory_item_id, opnameDate, systemStock, physicalStock, difference, notes || null, req.user.id]
    );

    // If sync_stock is true and there is a difference, adjust system stock to match physical stock
    if (sync_stock && difference !== 0) {
      await connection.query(
        'UPDATE inventory_items SET stock = ? WHERE id = ?',
        [physicalStock, inventory_item_id]
      );

      let stockIn = 0;
      let stockOut = 0;
      if (difference > 0) {
        stockIn = difference;
      } else {
        stockOut = Math.abs(difference);
      }

      await connection.query(
        `INSERT INTO inventory_stock_logs 
           (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 'opname', ?, ?)`,
        [
          inventory_item_id,
          opnameDate,
          systemStock,
          stockIn,
          stockOut,
          physicalStock,
          `Penyesuaian stok opname (${difference > 0 ? '+' : ''}${difference})${notes ? ': ' + notes : ''}`,
          opnameRes.insertId,
          req.user.id
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Stok opname berhasil disimpan',
      opnameId: opnameRes.insertId,
      difference,
      synced: Boolean(sync_stock)
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create opname error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan stok opname' });
  } finally {
    connection.release();
  }
});

// ==========================================
// 2. PURCHASING (PEMBELIAN) ROUTES
// ==========================================
// 1. Get purchases list
app.get('/api/purchases', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const {
      status,
      payment_status,
      payment_method,
      supplier,
      search,
      start_date,
      end_date,
      limit = 20,
      offset = 0
    } = req.query;

    let query = `
        SELECT p.*, 
               pr.request_no,
               u.name as created_by_name,
               ii.stock as current_inventory_stock
        FROM purchases p
        LEFT JOIN purchase_requests pr ON p.request_id = pr.id
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN inventory_items ii ON p.inventory_item_id = ii.id
        WHERE 1=1
      `;
    let countQuery = `
        SELECT COUNT(*) as total 
        FROM purchases p 
        WHERE 1=1
      `;

    const params = [];
    const countParams = [];

    if (status) {
      query += ' AND p.status = ?';
      countQuery += ' AND p.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (payment_status) {
      query += ' AND p.payment_status = ?';
      countQuery += ' AND p.payment_status = ?';
      params.push(payment_status);
      countParams.push(payment_status);
    }

    if (payment_method) {
      query += ' AND p.payment_method = ?';
      countQuery += ' AND p.payment_method = ?';
      params.push(payment_method);
      countParams.push(payment_method);
    }

    if (supplier) {
      query += ' AND p.supplier = ?';
      countQuery += ' AND p.supplier = ?';
      params.push(supplier);
      countParams.push(supplier);
    }

    if (search) {
      query += ' AND (p.purchase_no LIKE ? OR p.item_name LIKE ? OR p.supplier LIKE ? OR p.category LIKE ?)';
      countQuery += ' AND (p.purchase_no LIKE ? OR p.item_name LIKE ? OR p.supplier LIKE ? OR p.category LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
      countParams.push(pattern, pattern, pattern, pattern);
    }

    if (start_date && end_date) {
      query += ' AND p.purchase_date BETWEEN ? AND ?';
      countQuery += ' AND p.purchase_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
      countParams.push(start_date, end_date);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total || 0;

    query += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [purchases] = await pool.query(query, params);

    res.json({
      purchases,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat data pembelian' });
  }
});

// 2. Get purchase detail
app.get('/api/purchases/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, 
                pr.request_no,
                u.name as created_by_name,
                ii.stock as current_inventory_stock
         FROM purchases p
         LEFT JOIN purchase_requests pr ON p.request_id = pr.id
         LEFT JOIN users u ON p.created_by = u.id
         LEFT JOIN inventory_items ii ON p.inventory_item_id = ii.id
         WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Get purchase detail error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// 3. Create purchase (Fitur Pembelian)
app.post('/api/purchases', authenticateToken, authorizeRole('admin'), upload.single('invoice_proof'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      request_id,
      purchase_date,
      supplier,
      category,
      item_name,
      inventory_item_id,
      specification,
      qty,
      unit,
      total_price,
      payment_method = 'Tunai',
      dp_amount = 0,
      due_date,
      status = 'Dipesan',
      notes
    } = req.body;

    if (!supplier || !category || !item_name || !qty || !total_price) {
      await connection.rollback();
      return res.status(400).json({ message: 'Supplier, kategori, nama barang, jumlah, dan total harga wajib diisi' });
    }

    const parsedQty = parseFloat(qty);
    const parsedTotal = parseFloat(total_price);
    const unitPrice = parsedQty > 0 ? (parsedTotal / parsedQty) : 0;
    const parsedDp = payment_method === 'DP' ? (parseFloat(dp_amount) || 0) : 0;
    const remainingPayment = payment_method === 'DP' ? Math.max(0, parsedTotal - parsedDp) : 0;
    const paymentStatus = payment_method === 'DP' ? (remainingPayment > 0 ? (parsedDp > 0 ? 'partial' : 'unpaid') : 'paid') : 'paid';

    let invoiceProofUrl = null;
    if (req.file) {
      invoiceProofUrl = `/uploads/${req.file.filename}`;
    }

    const purchaseNo = await generatePurchaseNo(connection);
    const pDate = purchase_date || new Date().toISOString().split('T')[0];

    // Auto-link / create inventory item
    let itemId = inventory_item_id ? parseInt(inventory_item_id) : null;
    if (!itemId) {
      const [found] = await connection.query(
        'SELECT id FROM inventory_items WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [item_name.trim()]
      );
      if (found.length > 0) {
        itemId = found[0].id;
      } else {
        const [created] = await connection.query(
          'INSERT INTO inventory_items (category, name, unit, stock, min_stock, last_price, notes) VALUES (?, ?, ?, 0, 0, ?, ?)',
          [category.trim(), item_name.trim(), unit.trim(), unitPrice, `Dibuat dari pembelian #${purchaseNo}`]
        );
        itemId = created.insertId;
      }
    }

    // Update item's last_price in master inventory
    if (itemId && unitPrice > 0) {
      await connection.query('UPDATE inventory_items SET last_price = ? WHERE id = ?', [unitPrice, itemId]);
    }

    // Insert purchase
    const [insertRes] = await connection.query(
      `INSERT INTO purchases 
         (purchase_no, request_id, purchase_date, supplier, category, item_name, inventory_item_id, specification, qty, unit, total_price, unit_price, invoice_proof_url, payment_method, dp_amount, remaining_payment, due_date, payment_status, status, notes, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseNo,
        request_id ? parseInt(request_id) : null,
        pDate,
        supplier.trim(),
        category.trim(),
        item_name.trim(),
        itemId,
        specification || null,
        parsedQty,
        unit.trim(),
        parsedTotal,
        unitPrice,
        invoiceProofUrl,
        payment_method,
        parsedDp,
        remainingPayment,
        due_date || null,
        paymentStatus,
        status,
        notes || null,
        req.user.id
      ]
    );

    const purchaseId = insertRes.insertId;
    const purchaseData = {
      id: purchaseId,
      purchase_no: purchaseNo,
      purchase_date: pDate,
      supplier,
      item_name,
      inventory_item_id: itemId,
      total_price: parsedTotal,
      payment_method,
      dp_amount: parsedDp,
      remaining_payment: remainingPayment,
      invoice_proof_url: invoiceProofUrl
    };

    // 1. Integrasi Keuangan (Neraca & Arus Kas)
    await recordPurchaseFinancials(connection, purchaseData, req.user.id);

    // 2. Jika status langsung 'Diterima' atau 'Selesai', tambahkan stok persediaan
    if (status === 'Diterima' || status === 'Selesai') {
      const [currItem] = await connection.query(
        'SELECT stock FROM inventory_items WHERE id = ? FOR UPDATE',
        [itemId]
      );
      if (currItem.length > 0) {
        const stockInitial = parseFloat(currItem[0].stock);
        const stockFinal = stockInitial + parsedQty;

        await connection.query('UPDATE inventory_items SET stock = ? WHERE id = ?', [stockFinal, itemId]);

        await connection.query(
          `INSERT INTO inventory_stock_logs 
             (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
             VALUES (?, ?, ?, ?, 0, ?, ?, 'purchase', ?, ?)`,
          [
            itemId,
            pDate,
            stockInitial,
            parsedQty,
            stockFinal,
            `Pembelian #${purchaseNo}: ${item_name} (${supplier})`,
            purchaseId,
            req.user.id
          ]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      message: 'Pembelian berhasil dicatat dan terintegrasi ke sistem keuangan',
      purchaseId,
      purchaseNo
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mencatat pembelian' });
  } finally {
    connection.release();
  }
});

// 4. Update purchase status & return handling
app.put('/api/purchases/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      status,
      notes,
      return_amount,
      return_qty,
      return_notes
    } = req.body;

    const [purchases] = await connection.query('SELECT * FROM purchases WHERE id = ? FOR UPDATE', [id]);
    if (purchases.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    }

    const current = purchases[0];
    const previousStatus = current.status;

    // Update purchase record
    await connection.query(
      `UPDATE purchases 
         SET status = ?, notes = ?, return_amount = ?, return_qty = ?, return_notes = ? 
         WHERE id = ?`,
      [
        status || current.status,
        notes !== undefined ? notes : current.notes,
        return_amount !== undefined ? (parseFloat(return_amount) || 0) : current.return_amount,
        return_qty !== undefined ? (parseFloat(return_qty) || 0) : current.return_qty,
        return_notes !== undefined ? return_notes : current.return_notes,
        id
      ]
    );

    // Jika status berubah menjadi 'Diterima' atau 'Selesai' dan sebelumnya belum pernah diterima
    if (
      (status === 'Diterima' || status === 'Selesai') &&
      previousStatus !== 'Diterima' &&
      previousStatus !== 'Selesai' &&
      current.inventory_item_id
    ) {
      const [currItem] = await connection.query(
        'SELECT stock FROM inventory_items WHERE id = ? FOR UPDATE',
        [current.inventory_item_id]
      );
      if (currItem.length > 0) {
        const stockInitial = parseFloat(currItem[0].stock);
        const stockFinal = stockInitial + parseFloat(current.qty);

        await connection.query('UPDATE inventory_items SET stock = ? WHERE id = ?', [stockFinal, current.inventory_item_id]);

        await connection.query(
          `INSERT INTO inventory_stock_logs 
             (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
             VALUES (?, CURRENT_DATE, ?, ?, 0, ?, ?, 'purchase', ?, ?)`,
          [
            current.inventory_item_id,
            stockInitial,
            parseFloat(current.qty),
            stockFinal,
            `Penerimaan pembelian #${current.purchase_no}: ${current.item_name}`,
            id,
            req.user.id
          ]
        );
      }
    }

    // Jika status menjadi 'Direturn' (Halaman 11 PDF)
    if (status === 'Direturn') {
      const retAmount = parseFloat(return_amount) || 0;
      const retQty = parseFloat(return_qty) || 0;
      await recordPurchaseReturnFinancials(connection, current, retAmount, retQty, return_notes, req.user.id);
    }

    await connection.commit();

    res.json({ message: 'Data pembelian berhasil diperbarui' });
  } catch (error) {
    await connection.rollback();
    console.error('Update purchase error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui pembelian' });
  } finally {
    connection.release();
  }
});

// 5. Pelunasan DP Pembelian (Halaman 6 PDF)
app.post('/api/purchases/:id/pay-remaining', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [purchases] = await connection.query('SELECT * FROM purchases WHERE id = ? FOR UPDATE', [id]);
    if (purchases.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    }

    const purchase = purchases[0];
    const remaining = parseFloat(purchase.remaining_payment) || 0;

    if (remaining <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Pembelian ini sudah lunas' });
    }

    // Record Pelunasan (Neraca & Arus Kas)
    await recordPurchaseDpSettlement(connection, purchase, req.user.id);

    // Update purchase record to paid
    await connection.query(
      'UPDATE purchases SET remaining_payment = 0, payment_status = "paid" WHERE id = ?',
      [id]
    );

    await connection.commit();

    res.json({ message: 'Pelunasan sisa pembayaran pembelian berhasil dicatat' });
  } catch (error) {
    await connection.rollback();
    console.error('Pay remaining purchase error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mencatat pelunasan' });
  } finally {
    connection.release();
  }
});

// 6. Delete purchase
app.delete('/api/purchases/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [purchases] = await pool.query('SELECT id FROM purchases WHERE id = ?', [id]);
    if (purchases.length === 0) {
      return res.status(404).json({ message: 'Pembelian tidak ditemukan' });
    }

    await pool.query('DELETE FROM purchases WHERE id = ?', [id]);
    res.json({ message: 'Data pembelian berhasil dihapus' });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus data pembelian' });
  }
});

// ==========================================
// 3. PURCHASE REQUESTS (PENGAJUAN) ROUTES
// ==========================================
// Get purchase requests list
app.get('/api/purchase-requests', authenticateToken, async (req, res) => {
  try {
    const {
      approval_status,
      receipt_status,
      priority,
      search,
      start_date,
      end_date,
      limit = 20,
      offset = 0
    } = req.query;

    let query = `
        SELECT pr.*, 
               u.name as created_by_name, 
               ap.name as approved_by_name,
               ii.stock as current_inventory_stock
        FROM purchase_requests pr
        LEFT JOIN users u ON pr.created_by = u.id
        LEFT JOIN users ap ON pr.approved_by = ap.id
        LEFT JOIN inventory_items ii ON pr.inventory_item_id = ii.id
        WHERE 1=1
      `;
    let countQuery = `
        SELECT COUNT(*) as total 
        FROM purchase_requests pr 
        WHERE 1=1
      `;

    const params = [];
    const countParams = [];

    if (approval_status) {
      query += ' AND pr.approval_status = ?';
      countQuery += ' AND pr.approval_status = ?';
      params.push(approval_status);
      countParams.push(approval_status);
    }

    if (receipt_status) {
      query += ' AND pr.receipt_status = ?';
      countQuery += ' AND pr.receipt_status = ?';
      params.push(receipt_status);
      countParams.push(receipt_status);
    }

    if (priority) {
      query += ' AND pr.priority = ?';
      countQuery += ' AND pr.priority = ?';
      params.push(priority);
      countParams.push(priority);
    }

    if (search) {
      query += ' AND (pr.request_no LIKE ? OR pr.item_name LIKE ? OR pr.category LIKE ? OR pr.reason LIKE ?)';
      countQuery += ' AND (pr.request_no LIKE ? OR pr.item_name LIKE ? OR pr.category LIKE ? OR pr.reason LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
      countParams.push(pattern, pattern, pattern, pattern);
    }

    if (start_date && end_date) {
      query += ' AND pr.request_date BETWEEN ? AND ?';
      countQuery += ' AND pr.request_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
      countParams.push(start_date, end_date);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total || 0;

    query += ' ORDER BY pr.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [requests] = await pool.query(query, params);

    res.json({
      requests,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get purchase requests error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat pengajuan pembelian' });
  }
});

// Get purchase request detail
app.get('/api/purchase-requests/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pr.*, 
                u.name as created_by_name, 
                ap.name as approved_by_name,
                ii.stock as current_inventory_stock
         FROM purchase_requests pr
         LEFT JOIN users u ON pr.created_by = u.id
         LEFT JOIN users ap ON pr.approved_by = ap.id
         LEFT JOIN inventory_items ii ON pr.inventory_item_id = ii.id
         WHERE pr.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pengajuan pembelian tidak ditemukan' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Get purchase request detail error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// Create new purchase request (Dapur, Operasional, Admin)
app.post('/api/purchase-requests', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      request_date,
      category,
      item_name,
      inventory_item_id,
      specification,
      qty,
      unit,
      needed_date,
      reason,
      priority = 'Normal'
    } = req.body;

    if (!category || !item_name || !qty || !unit) {
      await connection.rollback();
      return res.status(400).json({ message: 'Kategori, nama barang, jumlah, dan satuan wajib diisi' });
    }

    const requestNo = await generateRequestNo(connection);
    const reqDate = request_date || new Date().toISOString().split('T')[0];

    // Auto-link to inventory_item_id if not provided but matches name
    let resolvedItemId = inventory_item_id ? parseInt(inventory_item_id) : null;
    if (!resolvedItemId) {
      const [matched] = await connection.query(
        'SELECT id FROM inventory_items WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [item_name.trim()]
      );
      if (matched.length > 0) {
        resolvedItemId = matched[0].id;
      }
    }

    const [result] = await connection.query(
      `INSERT INTO purchase_requests 
         (request_no, request_date, category, item_name, inventory_item_id, specification, qty, unit, needed_date, reason, priority, approval_status, receipt_status, created_by, created_role) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu', 'Belum Diterima', ?, ?)`,
      [
        requestNo,
        reqDate,
        category.trim(),
        item_name.trim(),
        resolvedItemId,
        specification || null,
        parseFloat(qty),
        unit.trim(),
        needed_date || null,
        reason || null,
        priority,
        req.user.id,
        req.user.role || 'dapur'
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Pengajuan pembelian berhasil dibuat',
      requestId: result.insertId,
      requestNo
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase request error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat membuat pengajuan pembelian' });
  } finally {
    connection.release();
  }
});

// Update purchase request (Only if still Menunggu or by Admin)
app.put('/api/purchase-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      item_name,
      inventory_item_id,
      specification,
      qty,
      unit,
      needed_date,
      reason,
      priority
    } = req.body;

    const [rows] = await pool.query('SELECT * FROM purchase_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pengajuan pembelian tidak ditemukan' });
    }

    await pool.query(
      `UPDATE purchase_requests 
         SET category = ?, item_name = ?, inventory_item_id = ?, specification = ?, qty = ?, unit = ?, needed_date = ?, reason = ?, priority = ? 
         WHERE id = ?`,
      [
        category.trim(),
        item_name.trim(),
        inventory_item_id || null,
        specification || null,
        parseFloat(qty),
        unit.trim(),
        needed_date || null,
        reason || null,
        priority,
        id
      ]
    );

    res.json({ message: 'Pengajuan pembelian berhasil diperbarui' });
  } catch (error) {
    console.error('Update purchase request error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui pengajuan pembelian' });
  }
});

// Approval Update - Admin only (Halaman 5 PDF)
// Status: Dibatalkan / Menunggu / Disetujui / Ditolak / Ditunda
app.put('/api/purchase-requests/:id/approval', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_status, approval_notes } = req.body;

    const validStatuses = ['Menunggu', 'Disetujui', 'Ditolak', 'Ditunda', 'Dibatalkan'];
    if (!validStatuses.includes(approval_status)) {
      return res.status(400).json({ message: 'Status approval tidak valid' });
    }

    const [rows] = await pool.query('SELECT id FROM purchase_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pengajuan pembelian tidak ditemukan' });
    }

    await pool.query(
      `UPDATE purchase_requests 
         SET approval_status = ?, approval_notes = ?, approved_by = ? 
         WHERE id = ?`,
      [approval_status, approval_notes || null, req.user.id, id]
    );

    res.json({ message: `Status approval berhasil diperbarui menjadi ${approval_status}` });
  } catch (error) {
    console.error('Approval update error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui status approval' });
  }
});

// Receipt Update - Dapur, Operasional, Admin (Halaman 5 & 11 PDF)
// Status penerimaan: Diterima sebagian, Diterima, Ditolak
// Apabila barang diterima, otomatis stok di sistem bertambah (stok persediaan & tracking kartu stok)
app.put('/api/purchase-requests/:id/receipt', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { receipt_status, received_qty, receipt_notes, update_stock = true } = req.body;

    const validStatuses = ['Belum Diterima', 'Diterima Sebagian', 'Diterima', 'Ditolak'];
    if (!validStatuses.includes(receipt_status)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Status penerimaan tidak valid' });
    }

    const [rows] = await connection.query('SELECT * FROM purchase_requests WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pengajuan pembelian tidak ditemukan' });
    }

    const request = rows[0];
    const previousReceiptStatus = request.receipt_status;
    const qtyReceived = received_qty !== undefined && received_qty !== null ? parseFloat(received_qty) : parseFloat(request.qty);

    await connection.query(
      `UPDATE purchase_requests 
         SET receipt_status = ?, received_qty = ?, receipt_notes = ? 
         WHERE id = ?`,
      [receipt_status, qtyReceived, receipt_notes || null, id]
    );

    // Jika barang diterima dan update_stock aktif, tambahkan ke stok persediaan
    if (
      update_stock &&
      (receipt_status === 'Diterima' || receipt_status === 'Diterima Sebagian') &&
      previousReceiptStatus !== 'Diterima' &&
      qtyReceived > 0
    ) {
      let itemId = request.inventory_item_id;

      // Jika belum ada inventory_item_id, buat atau cari item
      if (!itemId) {
        const [found] = await connection.query(
          'SELECT id, stock FROM inventory_items WHERE LOWER(name) = LOWER(?) LIMIT 1',
          [request.item_name.trim()]
        );
        if (found.length > 0) {
          itemId = found[0].id;
        } else {
          const [created] = await connection.query(
            'INSERT INTO inventory_items (category, name, unit, stock, min_stock, notes) VALUES (?, ?, ?, 0, 0, ?)',
            [request.category, request.item_name, request.unit, `Dibuat dari pengajuan #${request.request_no}`]
          );
          itemId = created.insertId;
        }
        await connection.query('UPDATE purchase_requests SET inventory_item_id = ? WHERE id = ?', [itemId, id]);
      }

      const [itemRows] = await connection.query(
        'SELECT stock FROM inventory_items WHERE id = ? FOR UPDATE',
        [itemId]
      );

      if (itemRows.length > 0) {
        const stockInitial = parseFloat(itemRows[0].stock);
        const stockFinal = stockInitial + qtyReceived;

        await connection.query(
          'UPDATE inventory_items SET stock = ? WHERE id = ?',
          [stockFinal, itemId]
        );

        await connection.query(
          `INSERT INTO inventory_stock_logs 
             (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
             VALUES (?, CURRENT_DATE, ?, ?, 0, ?, ?, 'purchase', ?, ?)`,
          [
            itemId,
            stockInitial,
            qtyReceived,
            stockFinal,
            `Penerimaan pengajuan pembelian #${request.request_no}: ${request.item_name}`,
            id,
            req.user.id
          ]
        );
      }
    }

    await connection.commit();

    res.json({ message: 'Status penerimaan barang berhasil diperbarui' });
  } catch (error) {
    await connection.rollback();
    console.error('Receipt update error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui status penerimaan' });
  } finally {
    connection.release();
  }
});

// Delete purchase request
app.delete('/api/purchase-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM purchase_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pengajuan pembelian tidak ditemukan' });
    }

    if (req.user.role !== 'admin' && rows[0].created_by !== req.user.id) {
      return res.status(403).json({ message: 'Anda tidak memiliki hak untuk menghapus pengajuan ini' });
    }

    await pool.query('DELETE FROM purchase_requests WHERE id = ?', [id]);
    res.json({ message: 'Pengajuan pembelian berhasil dihapus' });
  } catch (error) {
    console.error('Delete purchase request error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus pengajuan pembelian' });
  }
});

// ==========================================
// 4. ORDER COSTS & MATERIALS (HPP) ROUTES
// ==========================================
// 1. Get all costs (Modal Langsung) for an order
app.get('/api/orders/:id/costs', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const [costs] = await pool.query(
      `SELECT oc.*, u.name as created_by_name 
         FROM order_costs oc 
         LEFT JOIN users u ON oc.created_by = u.id 
         WHERE oc.order_id = ? 
         ORDER BY oc.id ASC`,
      [orderId]
    );
    res.json(costs);
  } catch (error) {
    console.error('Get order costs error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat biaya modal pesanan' });
  }
});

// 2. Add a cost (Modal Langsung) for an order
app.post('/api/orders/:id/costs', authenticateToken, upload.single('receipt'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = req.params.id;
    const { amount, description } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Harga/biaya modal harus lebih dari 0' });
    }

    const costAmount = parseFloat(amount);
    const costDesc = description || `Biaya modal pesanan #${orderId}`;
    let proofImageUrl = null;

    if (req.file) {
      proofImageUrl = `/uploads/${req.file.filename}`;
    }

    // Check order
    const [orders] = await connection.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    // Integrasi ke Keuangan (Halaman 8 PDF):
    // 1. Neraca: Debit: HPP, Kredit: Kas
    const [journalRes] = await connection.query(
      `INSERT INTO accounting_journal_entries 
         (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
         VALUES (CURRENT_DATE, 'order_cost', ?, ?, 'HPP', 'Kas', ?, ?)`,
      [orderId, `Modal pesanan #${orderId}: ${costDesc}`, costAmount, req.user.id]
    );
    const journalId = journalRes.insertId;

    // 2. Arus Kas: Kategori Operasi - Biaya Operasional (Pengeluaran)
    const [cfRes] = await connection.query(
      `INSERT INTO cash_flow_transactions 
         (type, activity_category, sub_category, debit_account, credit_account, amount, description, order_id, proof_image_url, created_by) 
         VALUES ('expense', 'operasi', 'Biaya operasional', 'HPP', 'Kas', ?, ?, ?, ?, ?)`,
      [costAmount, `Biaya modal pesanan #${orderId}: ${costDesc}`, orderId, proofImageUrl, req.user.id]
    );
    const cashFlowId = cfRes.insertId;

    await connection.query(
      `INSERT INTO cash_flow_edit_history 
         (transaction_id, changed_by, new_type, new_amount, new_description, new_activity_category, new_sub_category, new_debit_account, new_credit_account, change_type) 
         VALUES (?, ?, 'expense', ?, ?, 'operasi', 'Biaya operasional', 'HPP', 'Kas', 'created')`,
      [cashFlowId, req.user.id, costAmount, `Biaya modal pesanan #${orderId}: ${costDesc}`]
    );

    // 3. Simpan ke order_costs
    const [costRes] = await connection.query(
      `INSERT INTO order_costs 
         (order_id, amount, description, proof_image_url, cash_flow_id, journal_id, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, costAmount, costDesc, proofImageUrl, cashFlowId, journalId, req.user.id]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Biaya modal berhasil ditambahkan',
      costId: costRes.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Add order cost error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menambahkan biaya modal' });
  } finally {
    connection.release();
  }
});

// 3. Delete a cost (Modal Langsung) for an order
app.delete('/api/orders/:id/costs/:costId', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id: orderId, costId } = req.params;

    const [costs] = await connection.query(
      'SELECT * FROM order_costs WHERE id = ? AND order_id = ?',
      [costId, orderId]
    );

    if (costs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Data modal tidak ditemukan' });
    }

    const cost = costs[0];

    // Remove associated journal entry
    if (cost.journal_id) {
      await connection.query('DELETE FROM accounting_journal_entries WHERE id = ?', [cost.journal_id]);
    }

    // Remove associated cash flow entry
    if (cost.cash_flow_id) {
      await connection.query('DELETE FROM cash_flow_transactions WHERE id = ?', [cost.cash_flow_id]);
    }

    // Delete record
    await connection.query('DELETE FROM order_costs WHERE id = ?', [costId]);

    await connection.commit();
    res.json({ message: 'Biaya modal berhasil dihapus' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete order cost error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus biaya modal' });
  } finally {
    connection.release();
  }
});

// 4. Get all materials used (Bahan Baku Persediaan) for an order
app.get('/api/orders/:id/materials', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const [materials] = await pool.query(
      `SELECT om.*, ii.stock as current_stock, u.name as created_by_name 
         FROM order_materials om 
         LEFT JOIN inventory_items ii ON om.inventory_item_id = ii.id 
         LEFT JOIN users u ON om.created_by = u.id 
         WHERE om.order_id = ? 
         ORDER BY om.id ASC`,
      [orderId]
    );
    res.json(materials);
  } catch (error) {
    console.error('Get order materials error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat bahan baku pesanan' });
  }
});

// 5. Add material used (Bahan Baku Persediaan) for an order
app.post('/api/orders/:id/materials', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = req.params.id;
    const { inventory_item_id, quantity } = req.body;

    if (!inventory_item_id || !quantity || parseFloat(quantity) <= 0) {
      return res.status(400).json({ message: 'Barang persediaan dan jumlah valid wajib dipilih' });
    }

    const qty = parseFloat(quantity);

    // Check item in inventory
    const [items] = await connection.query(
      'SELECT id, name, category, unit, stock, last_price FROM inventory_items WHERE id = ? FOR UPDATE',
      [inventory_item_id]
    );

    if (items.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Barang persediaan tidak ditemukan' });
    }

    const item = items[0];
    const stockInitial = parseFloat(item.stock);
    const stockFinal = stockInitial - qty;
    const unitPrice = parseFloat(item.last_price || 0);
    const subtotal = qty * unitPrice;

    // 1. Kurangi stok persediaan
    await connection.query(
      'UPDATE inventory_items SET stock = ? WHERE id = ?',
      [stockFinal, inventory_item_id]
    );

    // 2. Tracking Stok Persediaan (inventory_stock_logs)
    await connection.query(
      `INSERT INTO inventory_stock_logs 
         (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
         VALUES (?, CURRENT_DATE, ?, 0, ?, ?, ?, 'order', ?, ?)`,
      [inventory_item_id, stockInitial, qty, stockFinal, `Bahan baku pesanan #${orderId}`, orderId, req.user.id]
    );

    // 3. Neraca: Debit: HPP, Kredit: Persediaan (jika subtotal > 0)
    let journalId = null;
    if (subtotal > 0) {
      const [jRes] = await connection.query(
        `INSERT INTO accounting_journal_entries 
           (entry_date, reference_type, reference_id, description, debit_account, credit_account, amount, created_by) 
           VALUES (CURRENT_DATE, 'order', ?, ?, 'HPP', 'Persediaan', ?, ?)`,
        [orderId, `Pemakaian bahan baku pesanan #${orderId}: ${item.name} (${qty} ${item.unit})`, subtotal, req.user.id]
      );
      journalId = jRes.insertId;
    }

    // 4. Simpan ke order_materials
    const [matRes] = await connection.query(
      `INSERT INTO order_materials 
         (order_id, inventory_item_id, item_name, category, quantity, unit, unit_price, subtotal, journal_id, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, inventory_item_id, item.name, item.category, qty, item.unit, unitPrice, subtotal, journalId, req.user.id]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Bahan baku berhasil dicatat dan stok berhasil dikurangi',
      materialId: matRes.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Add order material error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menambahkan bahan baku' });
  } finally {
    connection.release();
  }
});

// 6. Delete material used for an order (Kembalikan stok)
app.delete('/api/orders/:id/materials/:materialId', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id: orderId, materialId } = req.params;

    const [materials] = await connection.query(
      'SELECT * FROM order_materials WHERE id = ? AND order_id = ?',
      [materialId, orderId]
    );

    if (materials.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Data bahan baku tidak ditemukan' });
    }

    const mat = materials[0];

    // Kembalikan stok di inventory_items
    const [items] = await connection.query(
      'SELECT stock FROM inventory_items WHERE id = ? FOR UPDATE',
      [mat.inventory_item_id]
    );

    if (items.length > 0) {
      const stockInitial = parseFloat(items[0].stock);
      const qty = parseFloat(mat.quantity);
      const stockFinal = stockInitial + qty;

      await connection.query(
        'UPDATE inventory_items SET stock = ? WHERE id = ?',
        [stockFinal, mat.inventory_item_id]
      );

      // Catat pengembalian di kartu stok
      await connection.query(
        `INSERT INTO inventory_stock_logs 
           (inventory_item_id, date, stock_initial, stock_in, stock_out, stock_final, notes, reference_type, reference_id, created_by) 
           VALUES (?, CURRENT_DATE, ?, ?, 0, ?, ?, 'manual', ?, ?)`,
        [mat.inventory_item_id, stockInitial, qty, stockFinal, `Batal pemakaian bahan pesanan #${orderId}`, orderId, req.user.id]
      );
    }

    // Hapus jurnal jika ada
    if (mat.journal_id) {
      await connection.query('DELETE FROM accounting_journal_entries WHERE id = ?', [mat.journal_id]);
    }

    // Hapus record
    await connection.query('DELETE FROM order_materials WHERE id = ?', [materialId]);

    await connection.commit();
    res.json({ message: 'Bahan baku berhasil dihapus dan stok dikembalikan' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete order material error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus bahan baku' });
  } finally {
    connection.release();
  }
});

// ==========================================
// 5. LABA RUGI ROUTES
// ==========================================
/**
   * Get Laba Rugi Summary & Breakdown
   * Query params:
   * - start_date (YYYY-MM-DD)
   * - end_date (YYYY-MM-DD)
   * - month (1-12)
   * - year (YYYY)
   */
app.get('/api/laba-rugi/summary', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { start_date, end_date, month, year } = req.query;

    let dateFilterOrder = '';
    let dateFilterCosts = '';
    let dateFilterMaterials = '';
    let dateFilterCashFlow = '';
    const orderParams = [];
    const costParams = [];
    const matParams = [];
    const cfParams = [];

    if (start_date && end_date) {
      dateFilterOrder = ' AND DATE(o.created_at) BETWEEN ? AND ?';
      dateFilterCosts = ' AND DATE(oc.created_at) BETWEEN ? AND ?';
      dateFilterMaterials = ' AND DATE(om.created_at) BETWEEN ? AND ?';
      dateFilterCashFlow = ' AND DATE(cft.created_at) BETWEEN ? AND ?';

      orderParams.push(start_date, end_date);
      costParams.push(start_date, end_date);
      matParams.push(start_date, end_date);
      cfParams.push(start_date, end_date);
    } else if (month && year) {
      dateFilterOrder = ' AND MONTH(o.created_at) = ? AND YEAR(o.created_at) = ?';
      dateFilterCosts = ' AND MONTH(oc.created_at) = ? AND YEAR(oc.created_at) = ?';
      dateFilterMaterials = ' AND MONTH(om.created_at) = ? AND YEAR(om.created_at) = ?';
      dateFilterCashFlow = ' AND MONTH(cft.created_at) = ? AND YEAR(cft.created_at) = ?';

      orderParams.push(month, year);
      costParams.push(month, year);
      matParams.push(month, year);
      cfParams.push(month, year);
    } else if (year) {
      dateFilterOrder = ' AND YEAR(o.created_at) = ?';
      dateFilterCosts = ' AND YEAR(oc.created_at) = ?';
      dateFilterMaterials = ' AND YEAR(om.created_at) = ?';
      dateFilterCashFlow = ' AND YEAR(cft.created_at) = ?';

      orderParams.push(year);
      costParams.push(year);
      matParams.push(year);
      cfParams.push(year);
    }

    // 1. PENDAPATAN
    // Pesanan aktif (bukan batal)
    const [orderRows] = await pool.query(
      `SELECT 
           COALESCE(SUM(o.final_amount), 0) as gross_sales,
           COUNT(*) as order_count
         FROM orders o
         WHERE o.status != 'dibatalkan' ${dateFilterOrder}`,
      orderParams
    );
    const grossSales = parseFloat(orderRows[0].gross_sales || 0);
    const orderCount = parseInt(orderRows[0].order_count || 0);

    // Pembatalan penjualan (dana yang dikembalikan jika ada)
    const [refundRows] = await pool.query(
      `SELECT 
           COALESCE(SUM(o.refund_amount), 0) as total_refunds,
           COUNT(*) as cancelled_count
         FROM orders o
         WHERE o.status = 'dibatalkan' AND o.refund_amount > 0 ${dateFilterOrder}`,
      orderParams
    );
    const totalRefunds = parseFloat(refundRows[0].total_refunds || 0);
    const cancelledCount = parseInt(refundRows[0].cancelled_count || 0);

    const netSales = Math.max(0, grossSales - totalRefunds);

    // Rincian Pesanan Penjualan
    const [ordersList] = await pool.query(
      `SELECT 
           o.id, 
           o.final_amount, 
           o.payment_method, 
           o.payment_status, 
           o.status, 
           o.created_at,
           COALESCE(o.guest_customer_name, u.name, 'Customer') as customer_name,
           o.guest_event_name as event_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.status != 'dibatalkan' ${dateFilterOrder}
         ORDER BY o.created_at DESC LIMIT 50`,
      orderParams
    );

    // 2. BEBAN
    // A. HPP Bahan (Modal Langsung Pesanan dari order_costs)
    const [directCostRows] = await pool.query(
      `SELECT 
           COALESCE(SUM(oc.amount), 0) as total_direct_costs,
           COUNT(*) as direct_cost_count
         FROM order_costs oc
         WHERE 1=1 ${dateFilterCosts}`,
      costParams
    );
    const totalDirectCosts = parseFloat(directCostRows[0].total_direct_costs || 0);
    const directCostCount = parseInt(directCostRows[0].direct_cost_count || 0);

    const [directCostsList] = await pool.query(
      `SELECT oc.*, u.name as created_by_name
         FROM order_costs oc
         LEFT JOIN users u ON oc.created_by = u.id
         WHERE 1=1 ${dateFilterCosts}
         ORDER BY oc.created_at DESC LIMIT 50`,
      costParams
    );

    // B. Bahan Persediaan Terpakai (order_materials)
    const [materialRows] = await pool.query(
      `SELECT 
           COALESCE(SUM(om.subtotal), 0) as total_inventory_used,
           COUNT(*) as material_count
         FROM order_materials om
         WHERE 1=1 ${dateFilterMaterials}`,
      matParams
    );
    const totalInventoryUsed = parseFloat(materialRows[0].total_inventory_used || 0);
    const materialCount = parseInt(materialRows[0].material_count || 0);

    const [materialsList] = await pool.query(
      `SELECT om.*, u.name as created_by_name
         FROM order_materials om
         LEFT JOIN users u ON om.created_by = u.id
         WHERE 1=1 ${dateFilterMaterials}
         ORDER BY om.created_at DESC LIMIT 50`,
      matParams
    );

    // Total HPP (Beban Pokok Penjualan)
    const totalHPP = totalDirectCosts + totalInventoryUsed;
    const grossProfit = netSales - totalHPP;

    // C. Biaya Operasional (Arus Kas: type='expense', activity_category='operasi', sub_category='Biaya operasional' ATAU order_id IS NULL)
    const [opExpenseRows] = await pool.query(
      `SELECT 
           COALESCE(SUM(cft.amount), 0) as total_operational_expense,
           COUNT(*) as op_expense_count
         FROM cash_flow_transactions cft
         WHERE cft.type = 'expense' 
           AND cft.activity_category = 'operasi'
           AND (cft.sub_category = 'Biaya operasional' OR cft.sub_category IS NULL)
           AND cft.order_id IS NULL ${dateFilterCashFlow}`,
      cfParams
    );
    const totalOperationalExpense = parseFloat(opExpenseRows[0].total_operational_expense || 0);
    const opExpenseCount = parseInt(opExpenseRows[0].op_expense_count || 0);

    const [opExpensesList] = await pool.query(
      `SELECT cft.*, u.name as created_by_name
         FROM cash_flow_transactions cft
         LEFT JOIN users u ON cft.created_by = u.id
         WHERE cft.type = 'expense' 
           AND cft.activity_category = 'operasi'
           AND (cft.sub_category = 'Biaya operasional' OR cft.sub_category IS NULL)
           AND cft.order_id IS NULL ${dateFilterCashFlow}
         ORDER BY cft.created_at DESC LIMIT 50`,
      cfParams
    );

    // 3. LABA / RUGI BERSIH
    // Total Beban = HPP + Biaya Operasional
    const totalBeban = totalHPP + totalOperationalExpense;
    const labaBersih = netSales - totalBeban;
    const profitMargin = netSales > 0 ? (labaBersih / netSales) * 100 : 0;
    const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    res.json({
      summary: {
        netSales,
        grossSales,
        totalRefunds,
        orderCount,
        cancelledCount,
        // Beban HPP
        totalDirectCosts,
        directCostCount,
        totalInventoryUsed,
        materialCount,
        totalHPP,
        grossProfit,
        grossMargin,
        // Beban Operasional
        totalOperationalExpense,
        opExpenseCount,
        // Laba Bersih
        totalBeban,
        labaBersih,
        isProfit: labaBersih >= 0,
        profitMargin
      },
      breakdown: {
        orders: ordersList,
        directCosts: directCostsList,
        materialsUsed: materialsList,
        operationalExpenses: opExpensesList
      }
    });
  } catch (error) {
    console.error('Get laba rugi summary error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memuat data laba rugi' });
  }
});


// Helper function to return default operasional checklist structure
function getDefaultOperasionalChecklist() {
  return {
    sections: [
      {
        id: 'section1',
        title: '1. CEK DASHBOARD UTAMA SETIAP AWAL SHIFT',
        items: [
          { id: 'item_1', text: 'Login ke dashboard admin operasional menggunakan akun resmi.', checked: false },
          { id: 'item_2', text: 'Periksa tampilan ringkasan: Jumlah pesanan baru hari ini, Pesanan yang sedang diproses, Pesanan dalam pengiriman, Pesanan selesai, Jumlah review yang masuk', checked: false },
          { id: 'item_3', text: 'Pastikan tidak ada error data atau status yang tidak sinkron antar dashboard.', checked: false },
        ]
      },
      {
        id: 'section2',
        title: '2. MONITOR PESANAN BARU',
        items: [
          { id: 'item_1', text: 'Cek tab Pesanan Baru di dashboard.', checked: false },
          { id: 'item_2', text: 'Verifikasi data pelanggan & pesanan (tanggal, lokasi, jumlah, jenis produk).', checked: false },
          { id: 'item_3', text: 'Cek status pembayaran: lunas / DP / belum bayar.', checked: false },
          { id: 'item_4', text: 'Tugaskan ke tim untuk memproses pesanan', checked: false },
          { id: 'item_5', text: 'Pastikan status otomatis berubah ke "Sedang Diproses" apabila pesanan selesai diproses.', checked: false },
          { id: 'item_6', text: 'Kirim konfirmasi ke pelanggan melalui WhatsApp, jika perlu.', checked: false },
        ]
      },
      {
        id: 'section3',
        title: '3. MONITOR PROSES DAPUR',
        items: [
          { id: 'item_1', text: 'Cek status bahan & progress (persiapan, masak, siap kemas).', checked: false },
          { id: 'item_2', text: 'Pastikan tidak ada pesanan yang tertahan lebih dari batas waktu SOP.', checked: false },
          { id: 'item_3', text: 'Jika ada kendala (bahan habis, alat rusak, dll) segera diselesaikan', checked: false },
          { id: 'item_4', text: 'Tandai pesanan "Siap Dikirim" setelah diverifikasi kualitas & jumlahnya.', checked: false },
        ]
      },
      {
        id: 'section4',
        title: '🚚 4. MONITOR PENGIRIMAN',
        items: [
          { id: 'item_1', text: 'Pastikan dashboard kurir sudah menerima notifikasi "Siap Dikirim".', checked: false },
          { id: 'item_2', text: 'Tentukan kurir yang bertugas & rute (cek fitur assign kurir).', checked: false },
          { id: 'item_3', text: 'Pastikan kurir: Membawa nota & nomor pelanggan, Menyiapkan jas hujan, plastik pelindung, dan perlengkapan keamanan', checked: false },
          { id: 'item_4', text: 'Pastikan status berubah otomatis ke "Dalam Pengiriman".', checked: false },
          { id: 'item_5', text: 'Konfirmasi penerimaan dari pembeli saat pesanan sampai.', checked: false },
        ]
      },
      {
        id: 'section5',
        title: '5. MONITOR PESANAN SELESAI',
        items: [
          { id: 'item_1', text: 'Cek tab Selesai di dashboard.', checked: false },
          { id: 'item_2', text: 'Pastikan kurir sudah mengunggah bukti serah terima (foto & waktu).', checked: false },
          { id: 'item_3', text: 'Kirim pesan ucapan terima kasih & permintaan review ke pembeli.', checked: false },
        ]
      },
      {
        id: 'section6',
        title: '6. MONITOR REVIEW PEMBELI',
        items: [
          { id: 'item_1', text: 'Cek tab Review / Feedback di dashboard.', checked: false },
          { id: 'item_2', text: 'Klasifikasikan review: positif / negatif / saran.', checked: false },
          { id: 'item_3', text: 'Jika review negatif → buat tiket keluhan dan teruskan ke tim terkait (dapur / kurir).', checked: false },
          { id: 'item_4', text: 'Balas review positif dengan ucapan terima kasih.', checked: false },
        ]
      },
      {
        id: 'section7',
        title: '7. KOORDINASI & KESINKRONAN DASHBOARD',
        items: [
          { id: 'item_1', text: 'Pastikan semua dashboard (Admin – Dapur – Kurir) sinkron real time.', checked: false },
          { id: 'item_2', text: 'Cek bahwa setiap perubahan status otomatis muncul di semua pihak.', checked: false },
          { id: 'item_3', text: 'Laporkan ke IT jika dashboard lambat / tidak update.', checked: false },
          { id: 'item_4', text: 'Lakukan refresh data setiap 30 menit selama jam operasional.', checked: false },
        ]
      },
      {
        id: 'section8',
        title: '8. EVALUASI & LAPORAN AKHIR HARI',
        items: [
          { id: 'item_1', text: 'Catat keterlambatan atau kendala jika ada (dapur, kurir, pembayaran).', checked: false },
          { id: 'item_2', text: 'Buat laporan singkat untuk pimpinan / manajer operasional.', checked: false },
          { id: 'item_3', text: 'Update SOP bila ditemukan pola masalah yang berulang.', checked: false },
        ]
      },
    ]
  };
}

// Helper function to return default kurir checklist structure
function getDefaultKurirChecklist() {
  return {
    sections: [
      {
        id: 'section1',
        title: 'PERSIAPAN SEBELUM BERANGKAT',
        items: [
          { id: 'item_1', text: 'Terima informasi pengiriman dari Tim dapur & admin operasional', checked: false },
          { id: 'item_2', text: 'Cek alamat tujuan, waktu kirim, dan kontak penerima', checked: false },
          { id: 'item_3', text: 'Pastikan jenis kendaraan sesuai jumlah & jenis barang', checked: false },
          { id: 'item_4', text: 'Cek kebersihan kendaraan (bebas debu, bau, dan sisa makanan)', checked: false },
          { id: 'item_5', text: 'Isi bahan bakar secukupnya untuk seluruh rute', checked: false },
          { id: 'item_6', text: 'Siapkan alat bantu: keranjang, troli, dus besar, plastik pelindung dll', checked: false },
          { id: 'item_7', text: 'Pastikan HP aktif, baterai penuh, dan ada paket data', checked: false },
          { id: 'item_8', text: 'Gunakan seragam, dan perlengkapan kerja lengkap', checked: false }
        ]
      },
      {
        id: 'section2',
        title: 'PERLENGKAPAN KEAMANAN & ANTISIPASI CUACA',
        items: [
          { id: 'item_1', text: 'Siapkan jas hujan / mantel (khusus pengiriman outdoor/motor)', checked: false },
          { id: 'item_2', text: 'Siapkan plastik besar / terpal untuk menutup barang dari hujan', checked: false },
          { id: 'item_3', text: 'Siapkan tali pengikat / pengaman untuk barang besar', checked: false },
          { id: 'item_4', text: 'Pastikan helm & jaket safety dalam kondisi baik', checked: false },
          { id: 'item_5', text: 'Cek ban, rem, dan lampu kendaraan sebelum jalan', checked: false }
        ]
      },
      {
        id: 'section3',
        title: 'PENGECEKAN BARANG SEBELUM MUAT',
        items: [
          { id: 'item_1', text: 'Cocokkan jumlah barang dengan nota dapur / packing list', checked: false },
          { id: 'item_2', text: 'Pastikan kemasan utuh, tidak bocor, tidak penyok', checked: false },
          { id: 'item_3', text: 'Pisahkan menu panas, dingin, dan perlengkapan hajatan', checked: false },
          { id: 'item_4', text: 'Packing/Lindungi makanan atau barang mudah rusak dengan plastik tambahan', checked: false },
          { id: 'item_5', text: 'Pastikan semua barang sudah difoto sebelum dimuat / upload resi jika dikirim dengan expedisi', checked: false }
        ]
      },
      {
        id: 'section4',
        title: 'PROSES PEMUATAN',
        items: [
          { id: 'item_1', text: 'Muat barang sesuai urutan pengantaran (rute jauh di belakang, dekat di depan)', checked: false },
          { id: 'item_2', text: 'Gunakan alas bersih di dalam kendaraan', checked: false },
          { id: 'item_3', text: 'Pastikan posisi stabil (tidak miring / mudah terguncang)', checked: false },
          { id: 'item_4', text: 'Gunakan tali pengikat bila perlu', checked: false },
          { id: 'item_5', text: 'Lindungi kemasan dengan plastik / terpal bila cuaca tidak menentu', checked: false }
        ]
      },
      {
        id: 'section5',
        title: 'SELAMA PERJALANAN',
        items: [
          { id: 'item_1', text: 'Berkendara hati-hati dan stabil (hindari rem mendadak)', checked: false },
          { id: 'item_2', text: 'Hindari rute bergelombang bila memungkinkan', checked: false },
          { id: 'item_3', text: 'Update posisi ke admin bila pengiriman jauh atau terhambat hujan', checked: false },
          { id: 'item_4', text: 'Pastikan suhu & kondisi barang aman selama perjalanan', checked: false },
          { id: 'item_5', text: 'Berhenti sejenak bila hujan deras untuk melindungi barang', checked: false }
        ]
      },
      {
        id: 'section6',
        title: 'SESAMPAINYA DI LOKASI / PELANGGAN',
        items: [
          { id: 'item_1', text: 'Cek kembali nama & alamat penerima', checked: false },
          { id: 'item_2', text: 'Serahkan barang dengan sopan dan ramah', checked: false },
          { id: 'item_3', text: 'Pastikan pelanggan menerima pesanan dalam kondisi baik', checked: false },
          { id: 'item_4', text: 'Tunjukkan nota / bukti pengiriman', checked: false },
          { id: 'item_5', text: 'Foto bukti serah terima (barang + lokasi/penerima)', checked: false },
          { id: 'item_6', text: 'Catat jika ada komplain, kekurangan, atau kerusakan', checked: false }
        ]
      },
      {
        id: 'section7',
        title: 'SETELAH PENGIRIMAN',
        items: [
          { id: 'item_1', text: 'Laporkan jika ada kendala pengiriman di lapangan', checked: false },
          { id: 'item_2', text: 'Bersihkan kendaraan dari sisa barang atau kotoran', checked: false },
          { id: 'item_3', text: 'Isi bahan bakar bila perlu untuk kesiapan berikutnya', checked: false },
          { id: 'item_4', text: 'Cek kondisi perlengkapan (jas hujan, plastik, tali, alat bantu)', checked: false }
        ]
      }
    ]
  };
}

// ========================================
// OPERASIONAL CHECKLIST ENDPOINTS
// ========================================
app.get('/api/operasional/checklist/:date', authenticateToken, async (req, res) => {
  try {
    const shiftDate = req.params.date;
    const userId = req.user.id;

    const [checklists] = await pool.query(
      'SELECT * FROM operasional_checklists WHERE shift_date = ? AND saved_by = ? ORDER BY created_at DESC LIMIT 1',
      [shiftDate, userId]
    );

    if (checklists.length === 0) {
      // Return default empty checklist if none exists
      return res.json({ checklist_data: getDefaultOperasionalChecklist(), shift_date: shiftDate });
    }

    // Parse checklist_data if it's a string
    let checklistData = checklists[0].checklist_data;
    if (typeof checklistData === 'string') {
      checklistData = JSON.parse(checklistData);
    }

    res.json({
      ...checklists[0],
      checklist_data: checklistData
    });
  } catch (error) {
    console.error('Get operasional checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/operasional/checklist/:date', authenticateToken, async (req, res) => {
  try {
    const { checklist_data } = req.body;
    const shiftDate = req.params.date;
    const userId = req.user.id;

    // Insert or update checklist
    const [result] = await pool.query(
      'INSERT INTO operasional_checklists (shift_date, checklist_data, saved_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE checklist_data = ?, updated_at = NOW()',
      [shiftDate, JSON.stringify(checklist_data), userId, JSON.stringify(checklist_data)]
    );

    res.status(201).json({
      message: 'Checklist berhasil disimpan',
      checklist_id: result.insertId || result.affectedRows
    });
  } catch (error) {
    console.error('Save operasional checklist error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan checklist' });
  }
});

// Helper function to return default checklist structure
function getDefaultChecklist() {
  return {
    sections: [
      {
        id: 'prep_bahan',
        title: 'PERSIAPAN BAHAN & BARANG',
        items: [
          { id: 'prep_1', text: 'Lakukan persiapan produksi sebelum tanggal acara', checked: false },
          { id: 'prep_2', text: 'Cek stok bahan/produk di gudang / kulkas', checked: false },
          { id: 'prep_3', text: 'Pisahkan bahan mentah, produk jadi, dan perlengkapan non-makanan', checked: false },
          { id: 'prep_4', text: 'Catat kebutuhan pembelian barang', checked: false },
          { id: 'prep_5', text: 'Beli barang sesuai kebutuhan', checked: false },
          { id: 'prep_6', text: 'Koordinasi dengan admin operasional untuk catat pengeluaran di arus kas', checked: false },
          { id: 'prep_7', text: 'Siapkan kemasan dan label sesuai jenis produk', checked: false },
          { id: 'prep_8', text: 'Pastikan semua alat dan area kerja bersih sebelum digunakan', checked: false }
        ]
      },
      {
        id: 'penataan_produksi',
        title: 'PENATAAN & PRODUKSI UMUM',
        items: [
          { id: 'prod_1', text: 'Siapkan dan produksi produk sesuai pesanan', checked: false },
          { id: 'prod_2', text: 'Pastikan setiap item sesuai standar dan kualitas baik', checked: false },
          { id: 'prod_3', text: 'Cek kelengkapan item', checked: false },
          { id: 'prod_4', text: 'Gunakan area kerja bersih dan rapi', checked: false },
          { id: 'prod_5', text: 'Pisahkan produk yang rusak, kotor, atau tidak layak pakai', checked: false }
        ]
      },
      {
        id: 'kebersihan_higienis',
        title: 'KEBERSIHAN & HIGIENIS',
        items: [
          { id: 'hygiene_1', text: 'Gunakan sarung tangan, masker, dan celemek saat bekerja', checked: false },
          { id: 'hygiene_2', text: 'Bersihkan alat, meja, dan lantai secara rutin', checked: false },
          { id: 'hygiene_3', text: 'Simpan bahan dan produk di tempat tertutup & aman', checked: false },
          { id: 'hygiene_4', text: 'Pastikan kemasan, wadah, dan perlengkapan bersih sebelum digunakan', checked: false },
          { id: 'hygiene_5', text: 'Buang sampah dan sisa produksi ke tempat tertutup', checked: false }
        ]
      },
      {
        id: 'pengemasan',
        title: 'PENGEMASAN',
        items: [
          { id: 'pack_1', text: 'Siapkan area pengemasan khusus (bersih, kering, bebas debu)', checked: false },
          { id: 'pack_2', text: 'Gunakan kemasan yang sesuai', checked: false },
          { id: 'pack_3', text: 'Pastikan isi lengkap dan sesuai pesanan', checked: false },
          { id: 'pack_4', text: 'Kemas dengan rapi dan aman', checked: false }
        ]
      },
      {
        id: 'persiapan_pengiriman',
        title: 'PERSIAPAN PENGIRIMAN / SERAH TERIMA',
        items: [
          { id: 'ship_1', text: 'Cek ulang jumlah pesanan dan jenis produk', checked: false },
          { id: 'ship_2', text: 'Foto dokumentasi hasil akhir sebelum dikirim', checked: false },
          { id: 'ship_3', text: 'Konfirmasi ke bagian kurir dan admin operasional bahwa pesanan siap dikirim', checked: false }
        ]
      },
      {
        id: 'penutup_evaluasi',
        title: 'PENUTUP & EVALUASI',
        items: [
          { id: 'close_1', text: 'Bersihkan seluruh area kerja dan alat', checked: false },
          { id: 'close_2', text: 'Simpan bahan sisa yang masih layak pakai', checked: false },
          { id: 'close_3', text: 'Catat bahan atau perlengkapan yang perlu diisi ulang', checked: false },
          { id: 'close_4', text: 'Beli barang sesuai kebutuhan', checked: false },
          { id: 'close_5', text: 'Koordinasi dengan admin operasional untuk catat pengeluaran di arus kas', checked: false },
          { id: 'close_6', text: 'Apabila ada kendala, segera selesaikan', checked: false }
        ]
      }
    ]
  };
}

module.exports = app;


// app.listen(PORT, () => {
//   console.log(`Server berjalan di http://localhost:${PORT}`);
// });