const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function load(files, globals = {}) {
  const context = vm.createContext({console, Date, Intl, Set, Map, ...globals});
  for (const file of files) {
    const full = path.join(__dirname, '..', 'apps-script', file);
    if (!fs.existsSync(full)) continue;
    let source = fs.readFileSync(full, 'utf8');
    if (file.endsWith('.html')) source = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
    vm.runInContext(source, context, {filename:file});
  }
  return context;
}
module.exports = {load};
