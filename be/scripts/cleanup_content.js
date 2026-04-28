const { Sequelize, DataTypes, Op } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ecommerce_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false,
  }
);

const Category = sequelize.define('Category', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'categories', underscored: true });

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'products', underscored: true });

const ProductCategory = sequelize.define('ProductCategory', {
  productId: { type: DataTypes.UUID, field: 'product_id' },
  categoryId: { type: DataTypes.UUID, field: 'category_id' }
}, { tableName: 'product_categories', underscored: true });

// Categories to remove (broad matching)
const REMOVE_KEYWORDS = [
  'Thoi trang', 'Thời trang', 'Fashion', 
  'Giay dep', 'Giày dép', 'Shoes',
  'My pham', 'Mỹ phẩm', 'Beauty', 'Makeup',
  'Nha cua', 'Nhà cửa', 'Home', 'Furniture',
  'The thao', 'Thể thao', 'Sports',
  'O to', 'Ô tô', 'Car', 'Moto', 'Xe may'
];

async function cleanup() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB.');

    // 1. Find Categories to Remove
    const allCategories = await Category.findAll();
    const categoriesToRemove = allCategories.filter(c => 
      REMOVE_KEYWORDS.some(k => c.name.toLowerCase().includes(k.toLowerCase()))
    );

    console.log(`Found ${categoriesToRemove.length} categories to remove:`, categoriesToRemove.map(c => c.name));

    if (categoriesToRemove.length > 0) {
      const categoryIds = categoriesToRemove.map(c => c.id);

      // 2. Find Products in those categories
      const productCategories = await ProductCategory.findAll({
        where: {
          categoryId: { [Op.in]: categoryIds }
        }
      });
      
      const productIds = productCategories.map(pc => pc.productId);
      
      if (productIds.length > 0) {
        // 3. Delete Products
        const deletedProducts = await Product.destroy({
            where: { id: { [Op.in]: productIds } }
        });
        console.log(`Deleted ${deletedProducts} products.`);
        
        // 4. Delete ProductCategory associations
         await ProductCategory.destroy({
            where: { categoryId: { [Op.in]: categoryIds } }
        });
      }

      // 5. Delete the Categories
      const deletedCats = await Category.destroy({
        where: { id: { [Op.in]: categoryIds } }
      });
      console.log(`Deleted ${deletedCats} categories.`);
    } else {
        console.log("No categories matched for deletion.");
    }

    console.log('Cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanup();
