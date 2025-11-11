const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

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
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'al_hakim_catering',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Email atau password salah' });
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
        cashback_balance: user.cashback_balance
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
      'SELECT id, name, email, phone, address, role, cashback_balance FROM users WHERE id = ?',
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
    const { name, description, category, price, discount_percentage, is_promo, stock } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO products (name, description, category, price, discount_percentage, is_promo, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, category, price, discount_percentage || 0, is_promo || false, stock || 0, image_url]
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
    const { name, description, category, price, discount_percentage, is_promo, stock } = req.body;
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
      'UPDATE products SET name = ?, description = ?, category = ?, price = ?, discount_percentage = ?, is_promo = ?, stock = ?, image_url = ? WHERE id = ?',
      [name, description, category, price, discount_percentage || 0, is_promo || false, stock || 0, image_url, req.params.id]
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
    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'pembeli') {
      query += ' AND o.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'marketing') {
      query += ' AND o.marketing_id = ?';
      params.push(req.user.id);
    }

    // Support comma-separated status values
    if (req.query.status) {
      const statuses = req.query.status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query += ' AND o.status = ?';
        params.push(statuses[0]);
      } else {
        query += ` AND o.status IN (${statuses.map(() => '?').join(',')})`;
        params.push(...statuses);
      }
    }

    query += ' ORDER BY o.created_at DESC';

    if (req.query.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(req.query.limit));
    }

    const [orders] = await pool.query(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
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
    const delivery_notes = req.body.delivery_notes || '';
    const payment_method = req.body.payment_method || 'transfer';

    // Parse delivery_notes JSON untuk extract data ke kolom terpisah
    let guestData = {};
    try {
      guestData = typeof delivery_notes === 'string' ? JSON.parse(delivery_notes) : delivery_notes;
    } catch (e) {
      console.error('Error parsing delivery_notes:', e);
    }

    let total_amount = 0;
    const orderItems = [];

    for (const item of items) {
      const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [item.product_id]);

      if (products.length === 0) {
        throw new Error('Produk tidak ditemukan');
      }

      const product = products[0];
      let price = product.discounted_price || product.price;
      
      // Add variant price adjustment if variant is selected
      if (item.variant_id) {
        const [variants] = await connection.query('SELECT price_adjustment FROM product_variants WHERE id = ? AND product_id = ?', [item.variant_id, item.product_id]);
        if (variants.length > 0) {
          price += variants[0].price_adjustment;
        }
      }
      
      const subtotal = price * item.quantity;
      total_amount += subtotal;

      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: product.name,
        variant_name: item.variant_name || null,
        quantity: item.quantity,
        price: price,
        subtotal: subtotal
      });
    }

    const final_amount = total_amount;

    // Parse event_date dan event_time untuk kolom terpisah
    let eventDate = null;
    let eventTime = null;
    if (guestData.event_date) {
      eventDate = guestData.event_date;
    }
    if (guestData.event_time) {
      eventTime = guestData.event_time;
    }

    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        user_id, total_amount, discount_amount, cashback_used, final_amount, 
        payment_method, delivery_address, delivery_notes,
        guest_customer_name, guest_wa_number_1, guest_wa_number_2,
        guest_reference, guest_reference_detail,
        guest_event_name, guest_event_date, guest_event_time,
        guest_sharelok_link, guest_landmark, guest_delivery_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guestUserId, total_amount, 0, 0, final_amount, 
        payment_method, delivery_address, delivery_notes,
        guestData.customer_name || null,
        guestData.wa_number_1 || null,
        guestData.wa_number_2 || null,
        guestData.reference || null,
        guestData.reference_detail || null,
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
        'INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.variant_id, item.product_name, item.variant_name, item.quantity, item.price, item.subtotal]
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
      } catch (e) {
        // If not JSON, treat as plain text
        guestData = {};
      }
    }

    let total_amount = 0;
    const orderItems = [];

    for (const item of items) {
      const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [item.product_id]);

      if (products.length === 0) {
        throw new Error('Produk tidak ditemukan');
      }

      const product = products[0];
      let price = product.discounted_price || product.price;
      
      // Add variant price adjustment if variant is selected
      if (item.variant_id) {
        const [variants] = await connection.query('SELECT price_adjustment FROM product_variants WHERE id = ? AND product_id = ?', [item.variant_id, item.product_id]);
        if (variants.length > 0) {
          price += variants[0].price_adjustment;
        }
      }
      
      const subtotal = price * item.quantity;
      total_amount += subtotal;

      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: product.name,
        variant_name: item.variant_name || null,
        quantity: item.quantity,
        price: price,
        subtotal: subtotal
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

    const final_amount = total_amount - discount_amount - (cashback_used || 0);

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

    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        user_id, voucher_id, total_amount, discount_amount, cashback_used, final_amount, 
        payment_method, delivery_address, delivery_notes,
        guest_customer_name, guest_wa_number_1, guest_wa_number_2,
        guest_reference, guest_reference_detail,
        guest_event_name, guest_event_date, guest_event_time,
        guest_sharelok_link, guest_landmark, guest_delivery_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, voucher_id, total_amount, discount_amount, cashback_used || 0, final_amount,
        payment_method, delivery_address, deliveryNotesJson,
        guestData.customer_name || null,
        guestData.wa_number_1 || null,
        guestData.wa_number_2 || null,
        guestData.reference || null,
        guestData.reference_detail || null,
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
        'INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.variant_id, item.product_name, item.variant_name, item.quantity, item.price, item.subtotal]
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

    const cashback_earned = final_amount * 0.01;
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

app.put('/api/orders/:id/status', authenticateToken, upload.single('proof'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const proof_image_url = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    const [users] = await pool.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const handlerName = users.length > 0 ? users[0].name : 'Unknown';

    await pool.query(
      'INSERT INTO order_status_logs (order_id, status, handler_id, handler_name, notes, proof_image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, status, req.user.id, handlerName, notes, proof_image_url]
    );

    res.json({ message: 'Status pesanan berhasil diupdate' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/orders/:id/review', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.query(
      'INSERT INTO reviews (order_id, user_id, rating, comment, image_url) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, rating, comment, image_url]
    );

    res.status(201).json({ message: 'Review berhasil ditambahkan' });
  } catch (error) {
    console.error('Add review error:', error);
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
    const { name, price_adjustment, stock } = req.body;

    const [result] = await pool.query(
      'INSERT INTO product_variants (product_id, name, price_adjustment, stock) VALUES (?, ?, ?, ?)',
      [req.params.id, name, price_adjustment || 0, stock || 0]
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
    const [vouchers] = await pool.query(
      'SELECT * FROM vouchers WHERE is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()'
    );
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
    const [result] = await pool.query(
      `SELECT
        SUM(CASE WHEN status = 'completed' THEN commission_amount ELSE 0 END) as balance,
        SUM(CASE WHEN status = 'completed' AND MONTH(created_at) = MONTH(NOW()) THEN commission_amount ELSE 0 END) as thisMonth,
        SUM(CASE WHEN status = 'completed' THEN commission_amount ELSE 0 END) as totalEarned
       FROM commissions
       WHERE marketing_id = ?`,
      [req.user.id]
    );

    res.json({
      balance: result[0]?.balance || 0,
      thisMonth: result[0]?.thisMonth || 0,
      totalEarned: result[0]?.totalEarned || 0
    });
  } catch (error) {
    console.error('Get commission balance error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.get('/api/commission/orders', authenticateToken, authorizeRole('marketing'), async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, c.commission_amount, c.status as commission_status
       FROM orders o
       LEFT JOIN commissions c ON o.id = c.order_id
       WHERE o.marketing_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json(orders);
  } catch (error) {
    console.error('Get commission orders error:', error);
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

app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const [cart] = await pool.query(
      `SELECT c.*, p.name, p.price, p.discounted_price, p.image_url, pv.name as variant_name
       FROM cart c
       JOIN products p ON c.product_id = p.id
       LEFT JOIN product_variants pv ON c.variant_id = pv.id
       WHERE c.user_id = ?`,
      [req.user.id]
    );

    res.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const { product_id, variant_id, quantity } = req.body;

    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [req.user.id, product_id, variant_id, variant_id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE cart SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart (user_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)',
        [req.user.id, product_id, variant_id, quantity]
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

    await pool.query(
      'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, req.params.id, req.user.id]
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
    const [users] = await pool.query(
      'SELECT id, name, email, phone, address, role, cashback_balance, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
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

app.get('/', (req, res) => {
  res.json({ message: 'API Al Hakim Catering berjalan dengan baik!' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
