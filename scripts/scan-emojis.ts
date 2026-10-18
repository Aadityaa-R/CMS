import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Regex for emoji characters using Unicode property escapes
// Checks for Extended_Pictographic characters while allowing standard legal marks
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

// Allowed symbols: (c) / ©, (R) / ®, (TM) / ™
const ALLOWED_CHARS = new Set([
  '\u00A9', // Copyright ©
  '\u00AE', // Registered ®
  '\u2122', // Trade Mark ™
  '©',
  '®',
  '™',
]);

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
  '.mjs',
  '.cjs',
  '.svg',
  '.yml',
  '.yaml',
  '.txt',
]);

interface Finding {
  file: string;
  line: number;
  column: number;
  char: string;
  lineContent: string;
}

const findings: Finding[] = [];

function isAllowedFile(fileName: string): boolean {
  if (fileName.startsWith('.env')) {
    return true;
  }
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

function scanFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check each character or code point
      for (const char of line) {
        if (EMOJI_REGEX.test(char) && !ALLOWED_CHARS.has(char)) {
          findings.push({
            file: filePath,
            line: i + 1,
            column: line.indexOf(char) + 1,
            char,
            lineContent: line.trim(),
          });
          break;
        }
      }
    }
  } catch (err: any) {
    // If file cannot be read as utf-8 text (e.g. binary asset), skip safely
  }
}

function scanDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      if (isAllowedFile(entry.name)) {
        scanFile(fullPath);
      }
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Scan designated directories: src, scripts, tests, docs, public
const targetDirs = [
  path.join(projectRoot, 'src'),
  path.join(projectRoot, 'scripts'),
  path.join(projectRoot, 'tests'),
  path.join(projectRoot, 'docs'),
  path.join(projectRoot, 'public'),
];

for (const dir of targetDirs) {
  scanDirectory(dir);
}

// Scan root directory files (index.html, configs, markdown, etc.)
const rootEntries = fs.readdirSync(projectRoot, { withFileTypes: true });
for (const entry of rootEntries) {
  if (entry.isFile() && isAllowedFile(entry.name)) {
    scanFile(path.join(projectRoot, entry.name));
  }
}

if (findings.length === 0) {
  console.log('[PASS] Emoji Scan: 0 emojis found across source, scripts, tests, docs, public, and root configs.');
  process.exit(0);
} else {
  console.error(`[FAIL] Emoji Scan: Found ${findings.length} emoji instance(s):`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}:${f.column} -> "${f.char}" in "${f.lineContent}"`);
  }
  process.exit(1);
}
