const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "../dist");

function getAllJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllJsFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

let count = 0;
for (const file of getAllJsFiles(distDir)) {
  const content = fs.readFileSync(file, "utf8");
  const updated = content.replace(
    /from ["'](\.\.?\/[^"']+?)(?<!\.js)["']/g,
    'from "$1.js"'
  );
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    count++;
  }
}
console.log(`fix-esm-imports: patched ${count} files`);
