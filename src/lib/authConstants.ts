// Authentication, Session, and Storage Constants (Milestone M5)

export const SESSION_STANDARD_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_REMEMBER_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const PASSWORD_MIN_LENGTH = 10;
export const PBKDF2_ITERATIONS = 100000;

export const STORAGE_KEY_PREFIX = 'cms_v1_';
export const SCHEMA_VERSION = 2;
export const STORAGE_SETTINGS_KEY = 'cms_v1_settings';
export const STORAGE_BACKUP_UNDO_KEY = 'cms_v1_backup_undo';
export const SESSION_STORAGE_KEY = 'cms_v1_session';
