/**
 * seedProducts.js
 *
 * Seeds the MongoDB "products" collection with your REAL products,
 * loaded from products.json (exported from your live PRODUCTS array
 * in App.js), mapped to match the Product schema.
 *
 * Usage:
 *   node seedProducts.js
 */
 
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const rawProducts = require('./products.json'); // must be in the same folder as this file
 
const MONGO_URI = process.env.MONGO_URI;
 
if (!MONGO_URI) {
  console.error('❌ No MONGO_URI found in environment variables.');
  process.exit(1);
}
 
// Map your local field names (img, desc, badge, badgeColor, stars, reviews)
// to the database schema's field names.
const sampleProducts = rawProducts.map((p) => ({
  name: p.name,
  description: p.desc || p.description || '',
  price: p.price,
  category: p.category || '',
  unit: p.unit || '',
  image: p.img || p.image || '',
  badge: p.badge || '',
  badgeColor: p.badgeColor || '',
  stars: p.stars || 5,
  reviews: p.reviews || 0,
  stock: p.stock ?? 100,
  isActive: true,
}));
 
async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.');
 
    console.log(`📦 Loaded ${sampleProducts.length} products from products.json`);
 
    console.log('🧹 Clearing existing products...');
    const deleted = await Product.deleteMany({});
    console.log(`   Removed ${deleted.deletedCount} existing product(s).`);
 
    console.log('🌱 Inserting real products...');
    const inserted = await Product.insertMany(sampleProducts);
    console.log(`✅ Inserted ${inserted.length} products:`);
    inserted.forEach((p) => console.log(`   - ${p.name} (${p._id})`));
 
    console.log('🎉 Seeding complete.');
  } catch (err) {
    console.error('❌ Error while seeding products:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}
 
seed();