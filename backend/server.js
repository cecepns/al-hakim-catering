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

    // Extract payment amount and partner info from delivery_notes
    const payment_amount = guestData.payment_amount ? parseFloat(guestData.payment_amount) : null;
    const partner_business_name = guestData.partner_business_name || null;
    const partner_wa_number = guestData.partner_wa_number || null;

    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        user_id, total_amount, discount_amount, cashback_used, final_amount, 
        payment_method, payment_amount, delivery_address, delivery_notes,
        guest_customer_name, guest_wa_number_1, guest_wa_number_2,
        guest_reference, guest_reference_detail, partner_business_name, partner_wa_number,
        guest_event_name, guest_event_date, guest_event_time,
        guest_sharelok_link, guest_landmark, guest_delivery_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guestUserId, total_amount, 0, 0, final_amount, 
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

    // Calculate base_amount (before margin) and final_amount (with margin)
    const base_amount = total_amount - discount_amount - (cashback_used || 0);
    const final_amount = base_amount + margin_amount;

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // Create commission record if user is marketing
    if (marketing_id) {
      // Get commission_percentage from user
      const [users] = await connection.query('SELECT commission_percentage FROM users WHERE id = ?', [marketing_id]);
      const commission_percentage = users.length > 0 && users[0].commission_percentage ? parseFloat(users[0].commission_percentage) : 0;
      
      // Calculate commission: (base_amount * commission_percentage / 100) + margin_amount
      const admin_commission = (base_amount * commission_percentage) / 100;
      const commission_amount = admin_commission + margin_amount;

      await connection.query(
        `INSERT INTO commissions (marketing_id, order_id, base_amount, commission_percentage, commission_amount, status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [marketing_id, orderId, base_amount, commission_percentage, commission_amount]
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

app.get('/', (req, res) => {
  res.json({ message: 'API Al Hakim Catering berjalan dengan baik!' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
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
