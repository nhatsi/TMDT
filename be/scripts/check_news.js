require('dotenv').config({ path: 'be/.env' });
const { News } = require('../src/models');

async function check() {
  try {
    const count = await News.count();
    const all = await News.findAll({ limit: 5 });
    console.log('Total news count:', count);
    console.log('Sample data:', JSON.stringify(all, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
check();
