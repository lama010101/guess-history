const fs = require('fs');
const path = require('path');

const heroDir = path.join(__dirname, '../public/images/hero');
const outputPath = path.join(__dirname, '../src/data/heroImages.json');

const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

try {
  const files = fs.readdirSync(heroDir)
    .filter((file) => allowedExt.includes(path.extname(file).toLowerCase()))
    .map((file) => `/images/hero/${encodeURIComponent(file)}`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(files, null, 2));
  console.log(`✅ Generated heroImages.json with ${files.length} images.`);
} catch (err) {
  console.error('Failed to generate heroImages.json:', err);
  process.exit(1);
}
