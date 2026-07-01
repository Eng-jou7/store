const express  = require('express');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const path     = require('path');
 
const app  = express();
const PORT = 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'yousef77';
 

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/login-app';
 
mongoose.connect(MONGO_URI)
  .then(async () => {
    await ensureBaseCategories();
    console.log('✅ Connected to MongoDB');
  })
  .catch(err => { console.error('❌ MongoDB connection error:', err); process.exit(1); });
 

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
}, { timestamps: true });
 
// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
 

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};
 
const User = mongoose.model('User', userSchema);


const orderSchema = new mongoose.Schema({
  productId:   { type: String, required: true, trim: true },
  productName: { type: String, required: true, trim: true },
  price:       { type: Number, required: true, min: 0 },
  name:        { type: String, required: true, trim: true },
  phone:       { type: String, required: true, trim: true },
  email:       { type: String, required: true, lowercase: true, trim: true },
  address:     { type: String, required: true, trim: true },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);


const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price:       { type: Number, required: true, min: 0 },
  category:    { type: String, required: true, trim: true, lowercase: true },
  imageUrl:    { type: String, required: true, trim: true },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// ── Category Schema ─────────────────────────────────────────────
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, lowercase: true },
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
const BASE_CATEGORIES = ['new', 'men', 'women', 'accessories'];

async function ensureBaseCategories() {
  for (const name of BASE_CATEGORIES) {
    await Category.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
}
 
// ── Middleware ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
 
// ── Routes ──────────────────────────────────────────────────────
 
// POST /api/register — create new account
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
 
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'All fields are required.' });
 
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
 
  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email already registered.' });
 
    const user = await User.create({ name, email, password });
 
    res.status(201).json({
      success: true,
      message: `Account created! Welcome, ${user.name}.`,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});
 
// POST /api/login — sign in
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
 
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
 
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
 
    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
 
    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST /api/orders - create a customer order
app.post('/api/orders', async (req, res) => {
  const { productId, productName, price, name, phone, email, address } = req.body;

  if (!productId || !productName || price == null || !name || !phone || !email || !address) {
    return res.status(400).json({ success: false, message: 'All order fields are required.' });
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  try {
    const order = await Order.create({
      productId,
      productName,
      price,
      name,
      phone,
      email,
      address,
    });

    res.status(201).json({
      success: true,
      message: 'Order submitted successfully.',
      order: {
        id: order._id,
        productId: order.productId,
        productName: order.productName,
        price: order.price,
        name: order.name,
        phone: order.phone,
        email: order.email,
        address: order.address,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// GET /api/products - public catalog
app.get('/api/products', async (_req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// GET /api/categories - public categories list
app.get('/api/categories', async (_req, res) => {
  try {
    const categories = await Category.find({}).select('name -_id').sort({ name: 1 }).lean();
    const normalized = categories
      .map((c) => String(c?.name || '').trim().toLowerCase())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    res.json({ success: true, categories: normalized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// GET /api/products/:id - public single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Invalid product id.' });
  }
});

// GET /api/orders - admin only
app.get('/api/orders', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden: admin access only.' });
  }

  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST /api/products - admin only
app.post('/api/products', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden: admin access only.' });
  }

  const { name, description, price, category, imageUrl } = req.body;
  if (!name || !description || price == null || !category || !imageUrl) {
    return res.status(400).json({ success: false, message: 'All product fields are required.' });
  }

  try {
    const normalizedCategory = String(category).trim().toLowerCase();
    const product = await Product.create({
      name,
      description,
      price: Number(price),
      category: normalizedCategory,
      imageUrl,
    });
    await Category.updateOne(
      { name: normalizedCategory },
      { $setOnInsert: { name: normalizedCategory } },
      { upsert: true }
    );
    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// PUT /api/products/:id - admin only
app.put('/api/products/:id', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden: admin access only.' });
  }

  const { name, description, price, category, imageUrl } = req.body;
  if (!name || !description || price == null || !category || !imageUrl) {
    return res.status(400).json({ success: false, message: 'All product fields are required.' });
  }

  try {
    const normalizedCategory = String(category).trim().toLowerCase();
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, price: Number(price), category: normalizedCategory, imageUrl },
      { new: true, runValidators: true }
    ).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await Category.updateOne(
      { name: normalizedCategory },
      { $setOnInsert: { name: normalizedCategory } },
      { upsert: true }
    );

    res.json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Invalid product data or id.' });
  }
});

// DELETE /api/products/:id - admin only
app.delete('/api/products/:id', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden: admin access only.' });
  }

  try {
    const deleted = await Product.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Invalid product id.' });
  }
});

// POST /api/admin/login - simple admin auth
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }
  if (password !== ADMIN_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid admin password.' });
  }
  return res.json({ success: true, message: 'Admin authenticated.', adminKey: ADMIN_KEY });
});
 
// Serve login page for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
 
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});