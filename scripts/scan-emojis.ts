import * as fs from 'fs';
import * as path from 'path';

// Regex for emoji characters using Unicode property escapes
// Checks for Extended_Pictographic characters
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.system_generated',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.html',
  '.md',
]);

interface Finding {
  file: string;
  line: number;
  column: number;
  char: string;
  lineContent: string;
}

const findings: Finding[] = [];

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTENSIONS.has(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line contains emoji
    if (EMOJI_REGEX.test(line)) {
      // Find character details
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (EMOJI_REGEX.test(char)) {
          findings.push({
            file: filePath,
            line: i + 1,
            column: c + 1,
            char,
            lineContent: line.trim(),
          });
          break;
        }
      }
    }
  }
}

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Scan src, scripts, and key root files
const targetDirs = [
  path.join(projectRoot, 'src'),
  path.join(projectRoot, 'scripts'),
];

for (const dir of targetDirs) {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
}

// Root files
const rootFiles = [
  path.join(projectRoot, 'PROJECT_SPECIFICATION_AND_RULES.md'),
  path.join(projectRoot, 'package.json'),
];

for (const rf of rootFiles) {
  if (fs.existsSync(rf)) {
    scanFile(rf);
  }
}

if (findings.length === 0) {
  console.log('[PASS] Emoji Scan: 0 emojis found across source, scripts, and documentation.');
  process.exit(0);
} else {
  console.error(`[FAIL] Emoji Scan: Found ${findings.length} emoji instance(s):`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}:${f.column} -> "${f.char}" in "${f.lineContent}"`);
  }
  process.exit(1);
}
