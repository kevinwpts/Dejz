const fs = require("fs");
const path = require("path");

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  let results = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(searchFiles(full));
    } else if (f.endsWith(".tsx") || f.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

const allFiles = searchFiles("src");

console.log("=== CONTAINER MAX WIDTH USAGES ===");
allFiles.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (/max-w-(md|xl|2xl|lg|sm|3xl|4xl|5xl)/.test(line) && !line.includes("DS.spacing") && !line.includes("pageContainer")) {
      console.log(`${file}:${idx + 1}: ${line.trim().substring(0, 120)}`);
    }
  });
});

console.log("\n=== MODAL / SHEET CONTAINER & PADDING USAGES ===");
allFiles.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if ((/BottomSheet/.test(file) || /Modal/.test(file)) && /p-[0-9]|px-[0-9]|py-[0-9]/.test(line) && !line.includes("DS.")) {
      console.log(`${file}:${idx + 1}: ${line.trim().substring(0, 120)}`);
    }
  });
});
