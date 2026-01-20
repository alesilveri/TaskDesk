const fs = require('node:fs');
const path = require('node:path');

const docPath = path.join(__dirname, '..', '..', '..', 'docs', 'dev', 'SMOKE_TEST.md');
if (fs.existsSync(docPath)) {
  const content = fs.readFileSync(docPath, 'utf8');
  console.log(content);
} else {
  console.log('Smoke test doc not found:', docPath);
}
