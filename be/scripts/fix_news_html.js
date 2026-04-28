require('dotenv').config({ path: 'be/.env' });
const { News } = require('../src/models');
function simpleUnescape(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

async function fix() {
  try {
    const list = await News.findAll();
    for (const item of list) {
      if (item.content.includes('product-embed-card') && !item.content.includes('not-prose')) {
        console.log(`Adding not-prose to: ${item.title}`);
        const fixed = item.content.replace(/class="product-embed-card"/g, 'class="product-embed-card not-prose"');
        await item.update({ content: fixed });
      }
    }
    console.log('Finished fixing news content.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
fix();
