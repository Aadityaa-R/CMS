import { beforeEach, afterEach } from 'vitest';

declare const process: any;

// Fail test on unhandled promise rejections
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason: unknown) => {
    throw new Error(`Unhandled Promise Rejection: ${String(reason)}`);
  });
}

let originalError: typeof console.error;
let originalWarn: typeof console.warn;
let loggedErrors: string[] = [];
let loggedWarns: string[] = [];

beforeEach(() => {
  loggedErrors = [];
  loggedWarns = [];
  originalError = console.error;
  originalWarn = console.warn;

  console.error = (...args: any[]) => {
    // If a spy is active or mock was set in the test, don't record if it was suppressed
    const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    loggedErrors.push(msg);
    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    loggedWarns.push(msg);
    originalWarn(...args);
  };
});

afterEach(() => {
  const currentErrors = [...loggedErrors];
  const currentWarns = [...loggedWarns];
  console.error = originalError;
  console.warn = originalWarn;

  if (currentErrors.length > 0) {
    throw new Error(`Test produced console.error:\n${currentErrors.join('\n')}`);
  }
  if (currentWarns.length > 0) {
    throw new Error(`Test produced console.warn:\n${currentWarns.join('\n')}`);
  }
});
