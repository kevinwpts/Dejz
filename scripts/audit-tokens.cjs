const fs = require("fs");
const path = require("path");

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getAllFiles("src");

let centralBorders = 0;
let hardcodedBorders = 0;

let centralDividers = 0;
let hardcodedDividers = 0;

let centralShadows = 0;
let legacyShadows = 0;

let centralRings = 0;
let localRings = 0;

const hardcodedBorderList = [];
const hardcodedDividerList = [];
const legacyShadowList = [];
const localRingList = [];

files.forEach(file => {
  const code = fs.readFileSync(file, "utf8");
  
  // Clean tokens
  const tokens = code.split(/[\s"'`><={}(),]/);
  
  tokens.forEach(t => {
    if (!t) return;
    
    // Central borders
    if (["border-subtle", "border-control", "border-strong", "border-divider"].includes(t)) {
      centralBorders++;
    } 
    // Hardcoded color borders
    else if (/^border-(slate|gray|zinc|neutral|stone|red|green|blue|black|white|yellow|emerald|indigo|violet|purple|pink|rose|amber|cyan|sky|teal|lime|orange|rgba?|#|\[#)/.test(t)) {
      hardcodedBorders++;
      hardcodedBorderList.push(`${path.basename(file)}: ${t}`);
    }
    
    // Central Dividers
    if (["divide-subtle", "divide-divider"].includes(t)) {
      centralDividers++;
    }
    else if (/^divide-(slate|gray|zinc|neutral|stone|red|green|blue|black|white|yellow|emerald|indigo|violet|purple|pink|rose|amber|cyan|sky|teal|lime|orange|rgba?|#|\[#)/.test(t)) {
      hardcodedDividers++;
      hardcodedDividerList.push(`${path.basename(file)}: ${t}`);
    }
    
    // Central Shadows
    if (["shadow-modal", "shadow-subtle", "shadow-none"].includes(t)) {
      centralShadows++;
    }
    else if (/^shadow-(2xs|xs|sm|md|lg|xl|2xl|inner)/.test(t)) {
      legacyShadows++;
      legacyShadowList.push(`${path.basename(file)}: ${t}`);
    }
    
    // Central Rings
    if (["ring-focus", "ring-control", "ring-accent"].includes(t)) {
      centralRings++;
    }
    else if (/^ring-(1|2|4|8|slate|gray|zinc|neutral|stone|red|green|blue|black|white)/.test(t)) {
      localRings++;
      localRingList.push(`${path.basename(file)}: ${t}`);
    }
  });
});

console.log("=== CENTRAL VS LOCAL INVENTORY ===");
console.log(`Central Semantic Borders (border-subtle, border-control, etc.): ${centralBorders}`);
console.log(`Hardcoded/Local Borders: ${hardcodedBorders}`, hardcodedBorderList);
console.log(`Central Semantic Dividers (divide-subtle, divide-divider): ${centralDividers}`);
console.log(`Hardcoded/Local Dividers: ${hardcodedDividers}`, hardcodedDividerList);
console.log(`Central Semantic Shadows (shadow-modal, shadow-subtle, shadow-none): ${centralShadows}`);
console.log(`Legacy/Uncentralized Shadows: ${legacyShadows}`, legacyShadowList);
console.log(`Central Focus/Ring Utilities (ring-focus, ring-control, ring-accent): ${centralRings}`);
console.log(`Local Ring/Outline Utilities: ${localRings}`, localRingList);
