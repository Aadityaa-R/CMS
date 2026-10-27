import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CollectionName } from '../types/storage';
import { Identifiable, Repository, BrowserRepository } from './repository';

const TABLE_NAME_MAP: Partial<Record<CollectionName, string>> = {
  claimRequests: 'claim_requests',
  assignments: 'patient_assignments',
  leave: 'leave_requests',
};

// Tracks whether unified table 'clinic_data' is present in Supabase
let useUnifiedTable: boolean | null = null;

export class SupabaseRepository<T extends Identifiable> implements Repository<T> {
  private readonly collection: CollectionName;
  private readonly specificTableName: string;
  private readonly fallbackRepo: BrowserRepository<T>;
  private isTableMissing: boolean = false;

  constructor(collection: CollectionName) {
    this.collection = collection;
    this.specificTableName = TABLE_NAME_MAP[collection] || collection;
    this.fallbackRepo = new BrowserRepository<T>(collection);
  }

  private getItemRowId(id: string): string {
    return `${this.collection}__${id}`;
  }

  async list(): Promise<T[]> {
    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return this.fallbackRepo.list();
    }

    try {
      // 1. Try unified table first if detected or unknown
      if (useUnifiedTable !== false) {
        const { data, error } = await supabase
          .from('clinic_data')
          .select('data')
          .eq('collection', this.collection);

        if (!error && data) {
          useUnifiedTable = true;
          const items = data.map((r: any) => r.data as T).filter(Boolean);
          await this.fallbackRepo.replaceAll(items);
          return items;
        }

        if (error && error.code === 'PGRST205') {
          useUnifiedTable = false;
        }
      }

      // 2. Try specific table (e.g. patients, appointments)
      const { data, error } = await supabase
        .from(this.specificTableName)
        .select('data')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          this.isTableMissing = true;
        }
        return this.fallbackRepo.list();
      }

      const items = (data || []).map((row: any) => row.data as T).filter(Boolean);
      await this.fallbackRepo.replaceAll(items);
      return items;
    } catch {
      return this.fallbackRepo.list();
    }
  }

  async get(id: string): Promise<T | null> {
    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return this.fallbackRepo.get(id);
    }

    try {
      if (useUnifiedTable) {
        const { data, error } = await supabase
          .from('clinic_data')
          .select('data')
          .eq('id', this.getItemRowId(id))
          .maybeSingle();

        if (!error && data) {
          return (data as any).data as T;
        }
        return this.fallbackRepo.get(id);
      }

      const { data, error } = await supabase
        .from(this.specificTableName)
        .select('data')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        return this.fallbackRepo.get(id);
      }

      return (data as any).data as T;
    } catch {
      return this.fallbackRepo.get(id);
    }
  }

  async create(item: T): Promise<T> {
    await this.fallbackRepo.create(item);

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return item;
    }

    try {
      if (useUnifiedTable) {
        await supabase
          .from('clinic_data')
          .upsert({
            id: this.getItemRowId(item.id),
            collection: this.collection,
            data: item,
            updated_at: new Date().toISOString(),
          });
        return item;
      }

      const { error } = await supabase
        .from(this.specificTableName)
        .upsert({
          id: item.id,
          data: item,
          updated_at: new Date().toISOString(),
        });

      if (error && error.code === 'PGRST205') {
        this.isTableMissing = true;
      }
    } catch {
      // Ignore
    }

    return item;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const updated = await this.fallbackRepo.update(id, updates);

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return updated;
    }

    try {
      if (useUnifiedTable) {
        await supabase
          .from('clinic_data')
          .update({
            data: updated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', this.getItemRowId(id));
        return updated;
      }

      const { error } = await supabase
        .from(this.specificTableName)
        .update({
          data: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error && error.code === 'PGRST205') {
        this.isTableMissing = true;
      }
    } catch {
      // Ignore
    }

    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this.fallbackRepo.remove(id);

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return removed;
    }

    try {
      if (useUnifiedTable) {
        await supabase
          .from('clinic_data')
          .delete()
          .eq('id', this.getItemRowId(id));
        return removed;
      }

      const { error } = await supabase
        .from(this.specificTableName)
        .delete()
        .eq('id', id);

      if (error && error.code === 'PGRST205') {
        this.isTableMissing = true;
      }
    } catch {
      // Ignore
    }

    return removed;
  }

  async replaceAll(items: T[]): Promise<void> {
    await this.fallbackRepo.replaceAll(items);

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return;
    }

    try {
      if (useUnifiedTable) {
        await supabase
          .from('clinic_data')
          .delete()
          .eq('collection', this.collection);

        if (items.length > 0) {
          const rows = items.map((item) => ({
            id: this.getItemRowId(item.id),
            collection: this.collection,
            data: item,
            updated_at: new Date().toISOString(),
          }));
          await supabase.from('clinic_data').upsert(rows);
        }
        return;
      }

      await supabase.from(this.specificTableName).delete().neq('id', '');
      if (items.length > 0) {
        const rows = items.map((item) => ({
          id: item.id,
          data: item,
          updated_at: new Date().toISOString(),
        }));
        await supabase.from(this.specificTableName).upsert(rows);
      }
    } catch {
      // Ignore
    }
  }

  async count(): Promise<number> {
    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return this.fallbackRepo.count();
    }

    try {
      if (useUnifiedTable) {
        const { count } = await supabase
          .from('clinic_data')
          .select('*', { count: 'exact', head: true })
          .eq('collection', this.collection);
        return typeof count === 'number' ? count : this.fallbackRepo.count();
      }

      const { count } = await supabase
        .from(this.specificTableName)
        .select('*', { count: 'exact', head: true });

      return typeof count === 'number' ? count : this.fallbackRepo.count();
    } catch {
      return this.fallbackRepo.count();
    }
  }

  async clear(): Promise<void> {
    await this.fallbackRepo.clear();

    if (!isSupabaseConfigured || !supabase || this.isTableMissing) {
      return;
    }

    try {
      if (useUnifiedTable) {
        await supabase.from('clinic_data').delete().eq('collection', this.collection);
        return;
      }
      await supabase.from(this.specificTableName).delete().neq('id', '');
    } catch {
      // Ignore
    }
  }
}
