const sequelize = require('../src/config/sequelize');
const { Product } = require('../src/models');

async function checkProductFaqs() {
  try {
    const products = await Product.findAll({
      limit: 5,
      attributes: ['id', 'name', 'faqs']
    });
    
    console.log('--- Products Check ---');
    products.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`FAQs: ${JSON.stringify(p.faqs)}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error checking products:', error);
  } finally {
    await sequelize.close();
  }
}

checkProductFaqs();
