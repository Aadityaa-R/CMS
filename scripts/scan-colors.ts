import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Matches raw hex color codes: #rgb, #rgba, #rrggbb, #rrggbbaa
// Ensures not preceded by letters/numbers/hyphens and not followed by non-hex identifier characters
const HEX_COLOR_REGEX = /(?<![a-zA-Z0-9_-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F_-])/;

// Matches rgb(...) or rgba(...) color expressions
const RGB_COLOR_REGEX = /\brgba?\s*\(/;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Token files where raw colors and variables are legitimately defined
const ALLOWED_TOKEN_FILES = new Set([
  path.normalize(path.join(projectRoot, 'src', 'index.css')),
  path.normalize(path.join(projectRoot, 'tailwind.config.js')),
]);

interface Finding {
  file: string;
  line: number;
  match: string;
  lineContent: string;
}

const findings: Finding[] = [];

function scanFile(filePath: string): void {
  const normalized = path.normalize(filePath);
  if (ALLOWED_TOKEN_FILES.has(normalized)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const hexMatch = line.match(HEX_COLOR_REGEX);
    if (hexMatch) {
      findings.push({
        file: path.relative(projectRoot, filePath),
        line: idx + 1,
        match: hexMatch[0],
        lineContent: line.trim(),
      });
      return;
    }

    const rgbMatch = line.match(RGB_COLOR_REGEX);
    if (rgbMatch) {
      findings.push({
        file: path.relative(projectRoot, filePath),
        line: idx + 1,
        match: rgbMatch[0],
        lineContent: line.trim(),
      });
    }
  });
}

function scanDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?|css)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

// Scan src directory
scanDir(path.join(projectRoot, 'src'));

if (findings.length === 0) {
  console.log('[PASS] Color Scan: 0 raw hex or rgb colors found outside token files.');
  process.exit(0);
} else {
  console.error(`[FAIL] Color Scan: Found ${findings.length} raw color instance(s) outside token files:`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line} -> "${f.match}" in: ${f.lineContent}`);
  }
  process.exit(1);
}

