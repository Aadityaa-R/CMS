import { STORAGE_KEY_PREFIX } from '../lib/authConstants';
import { CollectionName } from '../types/storage';

export interface Identifiable {
  id: string;
}

export interface Repository<T extends Identifiable> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(item: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  remove(id: string): Promise<boolean>;
  replaceAll(items: T[]): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

export class MemoryRepository<T extends Identifiable> implements Repository<T> {
  protected items: T[] = [];

  constructor(initialItems: T[] = []) {
    this.items = [...initialItems];
  }

  async list(): Promise<T[]> {
    return [...this.items];
  }

  async get(id: string): Promise<T | null> {
    const found = this.items.find((item) => item.id === id);
    return found ? { ...found } : null;
  }

  async create(item: T): Promise<T> {
    const existingIndex = this.items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      throw new Error(`Item with id ${item.id} already exists`);
    }
    const copy = { ...item };
    this.items.push(copy);
    return { ...copy };
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Item with id ${id} not found`);
    }
    const updated = { ...this.items[index], ...updates };
    this.items[index] = updated;
    return { ...updated };
  }

  async remove(id: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }

  async replaceAll(items: T[]): Promise<void> {
    this.items = [...items];
  }

  async count(): Promise<number> {
    return this.items.length;
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}

export class BrowserRepository<T extends Identifiable> implements Repository<T> {
  private collectionKey: string;
  private cache: T[] | null = null;
  private writeTimer: any = null;
  private readonly debounceMs: number;

  constructor(collection: CollectionName, debounceMs = 150) {
    this.collectionKey = `${STORAGE_KEY_PREFIX}${collection}`;
    this.debounceMs = debounceMs;
  }

  private readStorage(): T[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return this.cache || [];
    }
    try {
      const raw = window.localStorage.getItem(this.collectionKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      // Unreadable or corrupted JSON fallback
      return [];
    }
  }

  private commitNow(items: T[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const payload = JSON.stringify(items);
      window.localStorage.setItem(this.collectionKey, payload);
    } catch (err: any) {
      // Quota exceeded check
      const isQuota =
        err &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22 ||
          err.code === 1014);
      if (isQuota) {
        throw new Error('Could not save changes');
      }
      throw new Error('Could not save changes');
    }
  }

  private scheduleWrite(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      if (this.cache) {
        try {
          this.commitNow(this.cache);
        } catch {
          // Handled on mutation caller
        }
      }
    }, this.debounceMs);
  }

  async flush(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    if (this.cache) {
      this.commitNow(this.cache);
    }
  }

  async list(): Promise<T[]> {
    if (this.cache === null) {
      this.cache = this.readStorage();
    }
    return [...this.cache];
  }

  async get(id: string): Promise<T | null> {
    const items = await this.list();
    const found = items.find((i) => i.id === id);
    return found ? { ...found } : null;
  }

  async create(item: T): Promise<T> {
    const items = await this.list();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      throw new Error(`Item with id ${item.id} already exists`);
    }
    const copy = { ...item };
    items.push(copy);
    this.cache = items;
    if (this.debounceMs > 0) {
      this.scheduleWrite();
    } else {
      this.commitNow(items);
    }
    return { ...copy };
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const items = await this.list();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Item with id ${id} not found`);
    }
    const updated = { ...items[index], ...updates };
    items[index] = updated;
    this.cache = items;
    if (this.debounceMs > 0) {
      this.scheduleWrite();
    } else {
      this.commitNow(items);
    }
    return { ...updated };
  }

  async remove(id: string): Promise<boolean> {
    const items = await this.list();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    this.cache = items;
    if (this.debounceMs > 0) {
      this.scheduleWrite();
    } else {
      this.commitNow(items);
    }
    return true;
  }

  async replaceAll(items: T[]): Promise<void> {
    this.cache = [...items];
    if (this.debounceMs > 0) {
      this.scheduleWrite();
    } else {
      this.commitNow(this.cache);
    }
  }

  async count(): Promise<number> {
    const items = await this.list();
    return items.length;
  }

  async clear(): Promise<void> {
    this.cache = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(this.collectionKey);
      } catch {
        // Fallback
      }
    }
  }

  // Handle external storage event for cross-tab sync
  invalidateCache(): void {
    this.cache = this.readStorage();
  }
}
