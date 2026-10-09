const fs = require("fs");
const path = require("path");

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist") {
        results = results.concat(getAllFiles(fullPath));
      }
    } else if (file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".css")) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getAllFiles("src");

let counts = {
  centralDsUsage: 0,
  centralCssVarUsage: 0,
  tailwindPadding: 0,
  tailwindMargin: 0,
  tailwindGap: 0,
  tailwindSpace: 0,
  tailwindMaxW: 0,
  arbitrarySpacing: 0,
  inlineSpacing: 0,
  responsiveSpacing: 0
};

let filesWithArbitrary = new Set();
let filesWithInlineSpacing = new Set();
let filesWithResponsive = new Set();
let fileCounts = {
  p: new Set(),
  m: new Set(),
  gap: new Set(),
  space: new Set(),
  maxW: new Set(),
  ds: new Set()
};

let arbitraryDetails = [];
let inlineDetails = [];
let maxWDetails = [];
let pagePaddingDetails = [];

files.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, lineIdx) => {
    // Central DS usage
    if (line.includes("DS.spacing") || line.includes("DS.heights") || line.includes("designSystem.spacing")) {
      counts.centralDsUsage++;
      fileCounts.ds.add(file);
    }
    if (line.includes("var(--space-") || line.includes("var(--height-")) {
      counts.centralCssVarUsage++;
      fileCounts.ds.add(file);
    }

    // Inline style for spacing
    if (/style=\{\{.*(padding|margin|gap|width|maxWidth|height|minHeight|maxHeight|top|bottom|left|right).*\}\}/.test(line)) {
      counts.inlineSpacing++;
      filesWithInlineSpacing.add(file);
      inlineDetails.push({ file: path.relative(process.cwd(), file), line: lineIdx + 1, code: line.trim() });
    }

    // Page container or outer padding check
    if (line.includes("max-w-") || line.includes("px-") || line.includes("p-")) {
      if (file.includes("App.tsx") || file.includes("View") || file.includes("Page") || file.includes("Modal") || file.includes("Dashboard")) {
        // check for page container patterns
        const outerMatch = line.match(/\b(px-[0-9\.]+|p-[0-9\.]+|max-w-[a-z0-9\.\-\[\]]+)\b/g);
        if (outerMatch && (line.includes("min-h") || line.includes("mx-auto") || line.includes("container") || line.includes("flex-1"))) {
          pagePaddingDetails.push({ file: path.relative(process.cwd(), file), line: lineIdx + 1, matches: outerMatch });
        }
      }
    }

    // Class string scanning
    const classAttrMatches = line.match(/className=(?:["`'][^"`']*["`']|\{[^}]*\})/g);
    if (classAttrMatches) {
      classAttrMatches.forEach(str => {
        // Arbitrary spacing like p-[13px], gap-[7px], w-[320px], max-w-[400px], mt-[12px]
        const arbitraryMatches = str.match(/\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|max-w|min-h|max-h)-\[\d+px\]/g);
        if (arbitraryMatches) {
          counts.arbitrarySpacing += arbitraryMatches.length;
          filesWithArbitrary.add(file);
          arbitraryMatches.forEach(m => arbitraryDetails.push({ file: path.relative(process.cwd(), file), line: lineIdx + 1, match: m, code: line.trim() }));
        }

        // Responsive spacing classes
        const respMatches = str.match(/\b(sm|md|lg|xl|2xl):(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|max-w)-\S+/g);
        if (respMatches) {
          counts.responsiveSpacing += respMatches.length;
          filesWithResponsive.add(file);
        }

        // Standard Tailwind classes
        const paddings = str.match(/\b(p|px|py|pt|pb|pl|pr)-\w+/g);
        if (paddings) { counts.tailwindPadding += paddings.length; fileCounts.p.add(file); }

        const margins = str.match(/\b(m|mx|my|mt|mb|ml|mr)-\w+/g);
        if (margins) { counts.tailwindMargin += margins.length; fileCounts.m.add(file); }

        const gaps = str.match(/\b(gap|gap-x|gap-y)-\w+/g);
        if (gaps) { counts.tailwindGap += gaps.length; fileCounts.gap.add(file); }

        const spaces = str.match(/\b(space-x|space-y)-\w+/g);
        if (spaces) { counts.tailwindSpace += spaces.length; fileCounts.space.add(file); }

        const maxWs = str.match(/\bmax-w-[a-zA-Z0-9\-\[\]]+/g);
        if (maxWs) {
          counts.tailwindMaxW += maxWs.length;
          fileCounts.maxW.add(file);
          maxWs.forEach(m => maxWDetails.push({ file: path.relative(process.cwd(), file), line: lineIdx + 1, match: m }));
        }
      });
    }
  });
});

console.log("=== QUANTITATIVE INVENTORY ===");
console.log(JSON.stringify(counts, null, 2));
console.log("\nUnique File Counts:");
console.log("DS Files:", fileCounts.ds.size);
console.log("Padding Files:", fileCounts.p.size);
console.log("Margin Files:", fileCounts.m.size);
console.log("Gap Files:", fileCounts.gap.size);
console.log("Space Files:", fileCounts.space.size);
console.log("Max-W Files:", fileCounts.maxW.size);
console.log("Arbitrary Files:", filesWithArbitrary.size);
console.log("Inline Spacing Files:", filesWithInlineSpacing.size);
console.log("Responsive Spacing Files:", filesWithResponsive.size);

console.log("\n=== ARBITRARY SPACING DETAILS ===");
console.log(arbitraryDetails);

console.log("\n=== INLINE SPACING DETAILS ===");
console.log(inlineDetails.slice(0, 20));

console.log("\n=== MAX-W BREAKDOWN ===");
let maxWCounts = {};
maxWDetails.forEach(d => { maxWCounts[d.match] = (maxWCounts[d.match] || 0) + 1; });
console.log(maxWCounts);

console.log("\n=== PAGE OUTER CONTAINER SAMPLES ===");
console.log(pagePaddingDetails.slice(0, 25));
