/**
 * seedProducts.js
 *
 * Seeds the MongoDB "products" collection with sample dairy products
 * matching the CNN Milk Product schema (name, description, price,
 * category, stock, image, isActive).
 *
 * Place this file in your backend project root, alongside server.js,
 * so that the "./models/Product" require path resolves correctly.
 *
 * Usage:
 *   node seedProducts.js
 *
 * Requires:
 *   - MONGO_URI set in your .env (same one server.js uses)
 *   - mongoose + dotenv installed (npm install mongoose dotenv)
 */
 
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
 
const MONGO_URI = process.env.MONGO_URI;
 
if (!MONGO_URI) {
  console.error('❌ No MONGO_URI found in environment variables.');
  process.exit(1);
}
 
const sampleProducts = [
  {
    name: 'Full Cream Milk (1L)',
    description: 'Fresh, full cream cow milk delivered daily. Rich in taste and nutrition.',
    price: 60,
    category: 'Milk',
    stock: 100,
    image: 'https://placehold.co/600x400?text=Full+Cream+Milk',
    isActive: true,
  },
  {
    name: 'Toned Milk (1L)',
    description: 'Light and healthy toned milk, perfect for everyday use.',
    price: 52,
    category: 'Milk',
    stock: 100,
    image: 'https://placehold.co/600x400?text=Toned+Milk',
    isActive: true,
  },
  {
    name: 'Farm Fresh Paneer (250g)',
    description: 'Soft, homemade-style paneer made from fresh cow milk.',
    price: 90,
    category: 'Paneer',
    stock: 40,
    image: 'https://placehold.co/600x400?text=Paneer',
    isActive: true,
  },
  {
    name: 'Pure Cow Ghee (500ml)',
    description: 'Traditionally prepared ghee with rich aroma and flavor.',
    price: 350,
    category: 'Ghee',
    stock: 25,
    image: 'https://placehold.co/600x400?text=Cow+Ghee',
    isActive: true,
  },
  {
    name: 'Curd / Dahi (400g)',
    description: 'Thick, creamy curd set the traditional way.',
    price: 45,
    category: 'Curd',
    stock: 60,
    image: 'https://placehold.co/600x400?text=Curd',
    isActive: true,
  },
  {
    name: 'Butter (200g)',
    description: 'Farm-fresh white butter, unsalted.',
    price: 110,
    category: 'Butter',
    stock: 30,
    image: 'https://placehold.co/600x400?text=Butter',
    isActive: true,
  },
  {
    name: 'Buttermilk / Chaas (500ml)',
    description: 'Refreshing spiced buttermilk, great for summer.',
    price: 30,
    category: 'Buttermilk',
    stock: 50,
    image: 'https://placehold.co/600x400?text=Buttermilk',
    isActive: true,
  },
  {
    name: 'Flavoured Yogurt - Mango (100g)',
    description: 'Sweet mango flavoured yogurt cup, a kids favorite.',
    price: 25,
    category: 'Yogurt',
    stock: 0,
    image: 'https://placehold.co/600x400?text=Mango+Yogurt',
    isActive: false, // out of stock example — tests your isActive filtering
  },
];
 
async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.');
 
    console.log('🧹 Clearing existing products...');
    const deleted = await Product.deleteMany({});
    console.log(`   Removed ${deleted.deletedCount} existing product(s).`);
 
    console.log('🌱 Inserting sample products...');
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