const fs = require("fs");
const path = require("path");

const files = fs.readdirSync("src/components").filter(f => f.endsWith(".tsx")).map(f => path.join("src/components", f));
files.push("src/App.tsx");

console.log("=== VIEW CONTAINERS & MAX-WIDTHS ===");
files.forEach(f => {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes("max-w-") || line.includes("px-") || line.includes("py-") || line.includes("p-")) {
      if (line.includes("mx-auto") || line.includes("container") || line.includes("min-h-screen") || line.includes("fixed inset-0") || line.includes("rounded-card") || line.includes("rounded-modal")) {
        console.log(`${f}:${idx + 1} -> ${line.trim().substring(0, 120)}`);
      }
    }
  });
});
