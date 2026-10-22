import { Appointment, InAppNotification } from '@/types';

export type RealtimeEvent =
  | {
      type: 'APPOINTMENT_BOOKED';
      appointment: Appointment;
      notification: InAppNotification;
    }
  | {
      type: 'PATIENT_CHECKED_IN';
      appointment: Appointment;
      notification: InAppNotification;
    }
  | {
      type: 'CONSULTATION_COMPLETED';
      appointment: Appointment;
      notification: InAppNotification;
    }
  | {
      type: 'NOTIFICATION_ADDED';
      notification: InAppNotification;
    }
  | {
      type: 'SYNC_COLLECTION';
      collection: string;
    };

const CHANNEL_NAME = 'cms_realtime_channel';
const STORAGE_PING_KEY = 'cms_realtime_ping';

class RealtimeHub {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(event: RealtimeEvent) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (e: MessageEvent<RealtimeEvent>) => {
            if (e && e.data) {
              this.notify(e.data);
            }
          };
        }
      } catch {
        this.channel = null;
      }

      // Local storage fallback for cross-tab sync
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === STORAGE_PING_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && parsed.event) {
              this.notify(parsed.event);
            }
          } catch {
            // ignore
          }
        }
      });
    }
  }

  private notify(event: RealtimeEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Realtime listener error:', err);
      }
    });
  }

  public broadcast(event: RealtimeEvent): void {
    // 1. Notify listeners in current window/tab immediately
    this.notify(event);

    // 2. Broadcast to other tabs via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // Fallback to storage event
      }
    }

    // 3. Storage event fallback for other windows
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          STORAGE_PING_KEY,
          JSON.stringify({ event, t: Date.now() + Math.random() })
        );
      } catch {
        // ignore
      }
    }
  }

  public subscribe(handler: (event: RealtimeEvent) => void): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }
}

export const realtimeHub = new RealtimeHub();

export function broadcastRealtimeEvent(event: RealtimeEvent): void {
  realtimeHub.broadcast(event);
}

export function subscribeRealtimeEvent(handler: (event: RealtimeEvent) => void): () => void {
  return realtimeHub.subscribe(handler);
}
