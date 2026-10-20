import { execSync } from 'child_process';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

// Allowed symbols: (c) / ©, (R) / ®, (TM) / ™
const ALLOWED_CHARS = new Set([
  '\u00A9',
  '\u00AE',
  '\u2122',
  '©',
  '®',
  '™',
]);

interface CommitFinding {
  hash: string;
  char: string;
  message: string;
}

const findings: CommitFinding[] = [];

try {
  // Retrieve last 100 commit logs with hash and full commit body
  const rawLog = execSync('git log -n 100 --format="COMMIT_START%H%n%B%nCOMMIT_END"', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  const commits = rawLog.split('COMMIT_START').filter((c) => c.trim().length > 0);

  for (const block of commits) {
    const endIdx = block.indexOf('COMMIT_END');
    const content = endIdx !== -1 ? block.slice(0, endIdx) : block;
    const lines = content.split('\n');
    const hash = lines[0].trim();
    const bodyLines = lines.slice(1);

    for (const line of bodyLines) {
      for (const char of line) {
        if (EMOJI_REGEX.test(char) && !ALLOWED_CHARS.has(char)) {
          findings.push({
            hash,
            char,
            message: line.trim(),
          });
          break;
        }
      }
    }
  }

  if (findings.length === 0) {
    console.log(`[PASS] Commit Messages Scan: 0 emojis found across last ${commits.length} commits.`);
    process.exit(0);
  } else {
    console.error(`[FAIL] Commit Messages Scan: Found ${findings.length} emoji instance(s) in commit messages:`);
    for (const f of findings) {
      console.error(`  Commit ${f.hash.slice(0, 8)} -> "${f.char}" in "${f.message}"`);
    }
    process.exit(1);
  }
} catch (err: any) {
  console.error('[ERROR] Failed to scan git commit messages:', err.message);
  process.exit(1);
}

