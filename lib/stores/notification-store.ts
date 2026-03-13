import { create } from 'zustand'
import { StateCreator } from 'zustand'

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    source?: string;
    read?: boolean;
    timestamp?: number;
    progress?: number;
    actions?: Array<{ label: string; action: () => void }>;
}

export interface NotificationState {
    notifications: Notification[];
    doNotDisturb: boolean;
    push: (notification: Notification) => void;
    info: (title: string, message: string, source?: string) => void;
    warn: (title: string, message: string, source?: string) => void;
    error: (title: string, message: string, source?: string) => void;
    success: (title: string, message: string, source?: string) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    dismiss: (id: string) => void;
    clear: () => void;
    toggleDoNotDisturb: () => void;
}
export const useNotifications = create<NotificationState>((set, get) => ({
    notifications: [],
    doNotDisturb: false,
    push: (notification: Notification) => {
        const id = notification.id || Math.random().toString(36).substr(2, 9);
        set((state) => {
            // Deduplicate: if a notification with this id already exists, skip.
            if (state.notifications.some(n => n.id === id)) return state;
            return {
                notifications: [
                    { ...notification, id, timestamp: Date.now(), read: false },
                    ...state.notifications
                ]
            };
        });
        // Auto-dismiss if specified
        if ((notification as any).autoDismissMs) {
            setTimeout(() => {
                set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== id),
                }));
            }, (notification as any).autoDismissMs);
        }
    },
    info: (title: string, message: string, source?: string) => {
        get().push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'info',
            title,
            message,
            source,
            timestamp: Date.now(),
            read: false
        });
    },
    warn: (title: string, message: string, source?: string) => {
        get().push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'warning',
            title,
            message,
            source,
            timestamp: Date.now(),
            read: false
        });
    },
    error: (title: string, message: string, source?: string) => {
        get().push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'error',
            title,
            message,
            source,
            timestamp: Date.now(),
            read: false
        });
    },
    success: (title: string, message: string, source?: string) => {
        get().push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'success',
            title,
            message,
            source,
            timestamp: Date.now(),
            read: false
        });
    },
    markRead: (id: string) => set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    })),
    markAllRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
    dismiss: (id: string) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
    })),
    clear: () => set(() => ({ notifications: [] })),
    toggleDoNotDisturb: () => set((state) => ({ doNotDisturb: !state.doNotDisturb })),
}));
