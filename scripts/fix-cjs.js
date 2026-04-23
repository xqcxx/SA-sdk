const fs = require('fs');
const path = require('path');
const dir = 'dist/cjs';
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
for (const entry of fs.readdirSync(dir, { recursive: true })) {
  const name = entry.toString();
  const full = path.join(dir, name);
  if (name.endsWith('.js')) {
    let code = fs.readFileSync(full, 'utf8');
    fs.renameSync(full, full.replace(/\.js$/, '.cjs'));
  } else if (name.endsWith('.js.map')) {
    const map = JSON.parse(fs.readFileSync(full, 'utf8'));
    map.file = map.file.replace(/\.js$/, '.cjs');
    fs.writeFileSync(full, JSON.stringify(map));
  }
}
for (const entry of fs.readdirSync(dir, { recursive: true })) {
  const name = entry.toString();
  const full = path.join(dir, name);
  if (name.endsWith('.cjs')) {
    let code = fs.readFileSync(full, 'utf8');
    code = code.replace(/require\("\.\/([^"]+)\.js"\)/g, 'require("./$1.cjs")');
    code = code.replace(/require\("\.\.\/([^"]+)\.js"\)/g, 'require("../$1.cjs")');
    fs.writeFileSync(full, code);
  }
}
