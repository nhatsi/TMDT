require('dotenv').config({ path: 'be/.env' });
const { News } = require('../src/models');

async function sync() {
  try {
    await News.sync({ alter: true });
    console.log('News table synced successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing News table:', error);
    process.exit(1);
  }
}

sync();
