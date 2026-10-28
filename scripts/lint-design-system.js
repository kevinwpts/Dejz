/**
 * Dejz Design System Linter (Phase 5)
 * 
 * Scans the codebase for hardcoded design values to protect the central design system
 * from future drift. It categorizes violations into:
 * - ERRORS (Critical): Hardcoded layout radii (12px, 14px, 16px) and primary layout/canvas colors.
 * - WARNINGS: Micro-radii (4px, 6px, 8px, 10px) and static text/border hex fallbacks.
 * 
 * Blocks the build (Exit code 1) only if the `--fail-on-errors` flag is specified.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Regex patterns to identify hardcoded design values (including directional modifiers)
const PATTERNS = {
  // Capture any rounded-[NUMBERpx]
  radius: /rounded-(?:(?:t|b|l|r|tl|tr|bl|br)-)?\[([0-9]+)px\]/g,
  // Capture any hex color inside brackets [#[0-9a-fA-F]]
  hexColor: /(?:bg|text|border|from|to|via|ring|outline|decoration)-(?:(?:t|b|l|r|tl|tr|bl|br)-)?\[(#(?:[0-9a-fA-F]{3,8}))\]/g,
  // Inline styling patterns
  inlineStyleRadius: /borderRadius\s*:\s*['"`]([0-9]+px)['"`]/g,
  inlineStyleColor: /(?:backgroundColor|color|borderColor)\s*:\s*['"`](#(?:[0-9a-fA-F]{3,8}))['"`]/g
};

// Files or directories that are exempt from style rules due to database definitions, color pickers, or demo data configuration
const EXEMPT_FILES = [
  'designSystem.ts', // Single source of truth defining fallback hex values
  'index.css', // Defines actual CSS variables
  'src/constants.ts', // Database categories definition with static colors
  'src/utils/demoData.ts', // Large seed database with mock transaction objects and category colors
  'src/utils/appCache.ts', // Local storage cache, default categories and payment methods
  'src/utils/logoVisuals.ts', // Data lookup maps and logo constants
  'src/App.tsx', // Contains basic mock categories definition mapping
  'src/components/AnalysisView.tsx', // Legitimate database/fallback colors for Recharts slices
  'src/components/SettingsView.tsx', // Legitimate database/fallback colors for default payment method records
  'src/components/LandingPage.tsx', // Marketing and editorial landing page with unique phone frames
];

const LEGITIMATE_EXCEPTIONS = [
  // Chart configurations, third-party libraries, dynamic categories colors
  'Recharts',
  'ResponsiveContainer',
  'PieChart',
  'customCategory',
  'iconColor',
  'logoUrl',
];

// Critical colors that should NEVER be hardcoded in views/components
const CRITICAL_LAYOUT_COLORS = [
  '#FAF8F5', '#EFECE6', '#EAE6DE', // Light mode core surfaces/canvas
  '#191919', '#1C1C1C', // Dark mode core surfaces/canvas
  '#0A0A0A', '#121212', // Black mode core surfaces/canvas
  '#3B82F6', '#2563EB', // Primary accent colors
];

let totalErrors = 0;
let totalWarnings = 0;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip ignored folders
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }

    // Skip the UI primitives directory as they contain low-level default configurations
    if (entry.name === 'ui' && dir.endsWith('components')) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.tsx', '.ts', '.css'].includes(ext)) {
        // Check if file is explicitly exempted
        const relative = path.relative(ROOT_DIR, fullPath);
        if (EXEMPT_FILES.some(exempt => relative === exempt || fullPath.endsWith(exempt))) {
          continue;
        }
        checkFile(fullPath);
      }
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(ROOT_DIR, filePath);
  let fileErrors = [];
  let fileWarnings = [];

  lines.forEach((line, index) => {
    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      return;
    }

    // 1. Check Tailwind arbitrary border-radius
    let match;
    while ((match = PATTERNS.radius.exec(line)) !== null) {
      const radiusValue = parseInt(match[1], 10);
      const isCritical = radiusValue >= 12; // any arbitrary layout radius (>=12px) should be a central token
      
      const log = {
        line: index + 1,
        match: match[0],
        message: isCritical 
          ? `CRITICAL ERROR: Hardcoded layout corner radius '${match[0]}'. Use semantic DS tokens (e.g., rounded-card, rounded-btn, rounded-modal) instead.`
          : `Warning: Hardcoded micro corner radius '${match[0]}' (fine for small icons/badges, but consider DS tokens where possible).`
      };

      if (isCritical) {
        fileErrors.push(log);
      } else {
        fileWarnings.push(log);
      }
    }

    // 2. Check Tailwind arbitrary hex color
    while ((match = PATTERNS.hexColor.exec(line)) !== null) {
      const hex = match[1].toUpperCase();
      const isCriticalColor = CRITICAL_LAYOUT_COLORS.some(c => hex.includes(c.toUpperCase()));
      
      const log = {
        line: index + 1,
        match: match[0],
        message: isCriticalColor
          ? `CRITICAL ERROR: Hardcoded core surface/accent color '${match[0]}'. Use CSS variables (e.g., bg-[var(--surface-color)]) instead.`
          : `Warning: Hardcoded minor/accent hex color '${match[0]}'. Consider moving to variables.`
      };

      if (isCriticalColor) {
        fileErrors.push(log);
      } else {
        fileWarnings.push(log);
      }
    }

    // 3. Check Inline Style Radius
    while ((match = PATTERNS.inlineStyleRadius.exec(line)) !== null) {
      const radiusValue = parseInt(match[1], 10);
      const isCritical = radiusValue >= 12;
      
      const log = {
        line: index + 1,
        match: match[0],
        message: isCritical
          ? `CRITICAL ERROR: Inline layout corner radius '${match[0]}'. Use CSS variables like 'var(--radius-card)' instead.`
          : `Warning: Inline micro corner radius '${match[0]}' detected.`
      };

      if (isCritical) {
        fileErrors.push(log);
      } else {
        fileWarnings.push(log);
      }
    }

    // 4. Check Inline Style Color
    while ((match = PATTERNS.inlineStyleColor.exec(line)) !== null) {
      const isExempt = LEGITIMATE_EXCEPTIONS.some(exc => line.includes(exc));
      if (!isExempt) {
        const hex = match[1].toUpperCase();
        const isCriticalColor = CRITICAL_LAYOUT_COLORS.some(c => hex.includes(c.toUpperCase()));
        
        const log = {
          line: index + 1,
          match: match[0],
          message: isCriticalColor
            ? `CRITICAL ERROR: Inline core layout color '${match[0]}'. Use CSS variables instead.`
            : `Warning: Inline hex color fallback '${match[0]}' detected.`
        };

        if (isCriticalColor) {
          fileErrors.push(log);
        } else {
          fileWarnings.push(log);
        }
      }
    }
  });

  if (fileErrors.length > 0 || fileWarnings.length > 0) {
    if (fileErrors.length > 0) {
      console.log(`\x1b[31m❌ Design system violations in: ${relativePath}\x1b[0m`);
      fileErrors.forEach(v => {
        console.log(`  Line ${v.line}: [ERROR] \x1b[31m${v.match}\x1b[0m\n    -> ${v.message}`);
      });
      totalErrors += fileErrors.length;
    }
    
    if (fileWarnings.length > 0) {
      console.log(`\x1b[33m⚠️  Design system warnings in: ${relativePath}\x1b[0m`);
      fileWarnings.forEach(v => {
        console.log(`  Line ${v.line}: [WARN] \x1b[33m${v.match}\x1b[0m\n    -> ${v.message}`);
      });
      totalWarnings += fileWarnings.length;
    }
    console.log();
  }
}

console.log('🔍 Starting Dejz Design System linting...');
scanDirectory(SRC_DIR);

console.log(`📊 Scan summary: ${totalErrors} Critical Errors, ${totalWarnings} Warnings.`);

if (totalErrors > 0) {
  console.log(`\x1b[31m❌ Design system check failed with ${totalErrors} critical violations.\x1b[0m`);
  console.log('Please migrate the above hardcoded layout values to the central Design System tokens.');
  process.exit(1);
} else {
  console.log('\x1b[32m✅ Design system check completed successfully!\x1b[0m');
  process.exit(0);
}
