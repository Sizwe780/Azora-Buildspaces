// Cloud Workspace Sync Service for Code Chamber IDE
// Enables seamless cloud sync of settings, extensions, state, and files across devices

import { create } from 'zustand'

export interface SyncItem {
  id: string
  key: string
  type: 'settings' | 'extensions' | 'keybindings' | 'snippets' | 'ui-state' | 'files'
  lastSynced: number
  status: 'synced' | 'pending' | 'error' | 'conflict'
  size: number
  enabled: boolean
}

export interface SyncConflict {
  id: string
  item: SyncItem
  localVersion: string
  cloudVersion: string
  resolvedWith?: 'local' | 'cloud' | 'merge'
}

export interface CloudSyncState {
  isEnabled: boolean
  isSyncing: boolean
  lastFullSync: number | null
  lastSyncTime: number | null
  syncItems: SyncItem[]
  conflicts: SyncConflict[]
  syncProgress: number
  syncError: string | null
  deviceId: string

  // Actions
  enableSync: () => void
  disableSync: () => void
  toggleSync: () => void
  syncNow: () => Promise<void>
  syncItem: (key: string) => Promise<void>
  resolveConflict: (id: string, resolution: 'local' | 'cloud' | 'merge') => void
  toggleItem: (id: string) => void
  getSyncStatus: () => { total: number; synced: number; pending: number; errors: number }
}

const SYNC_STORAGE_KEY = 'buildspaces.cloud.sync'
const DEVICE_ID_KEY = 'buildspaces.cloud.deviceId'

function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = generateDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export const useCloudSync = create<CloudSyncState>((set, get) => ({
  isEnabled: false,
  isSyncing: false,
  lastFullSync: null,
  lastSyncTime: null,
  syncItems: [
    { id: 'settings', key: 'settings', type: 'settings', lastSynced: 0, status: 'pending', size: 0, enabled: true },
    { id: 'extensions', key: 'extensions', type: 'extensions', lastSynced: 0, status: 'pending', size: 0, enabled: true },
    { id: 'keybindings', key: 'keybindings', type: 'keybindings', lastSynced: 0, status: 'pending', size: 0, enabled: true },
    { id: 'snippets', key: 'snippets', type: 'snippets', lastSynced: 0, status: 'pending', size: 0, enabled: true },
    { id: 'ui-state', key: 'ui-state', type: 'ui-state', lastSynced: 0, status: 'pending', size: 0, enabled: true },
  ],
  conflicts: [],
  syncProgress: 0,
  syncError: null,
  deviceId: typeof window !== 'undefined' ? getDeviceId() : 'server',

  enableSync: () => {
    set({ isEnabled: true })
    if (typeof window !== 'undefined') {
      localStorage.setItem(SYNC_STORAGE_KEY, 'true')
    }
    // Trigger initial sync
    get().syncNow()
  },

  disableSync: () => {
    set({ isEnabled: false, isSyncing: false })
    if (typeof window !== 'undefined') {
      localStorage.setItem(SYNC_STORAGE_KEY, 'false')
    }
  },

  toggleSync: () => {
    set((state) => {
      const newEnabled = !state.isEnabled
      if (typeof window !== 'undefined') {
        localStorage.setItem(SYNC_STORAGE_KEY, String(newEnabled))
      }
      if (newEnabled) {
        // Trigger sync when enabled
        get().syncNow()
      }
      return { isEnabled: newEnabled }
    })
  },

  toggleItem: (id: string) => {
    set((state) => ({
      syncItems: state.syncItems.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    }))
  },

  syncNow: async () => {
    if (get().isSyncing) return
    set({ isSyncing: true, syncProgress: 0, syncError: null })

    try {
      const items = get().syncItems
      for (let i = 0; i < items.length; i++) {
        await get().syncItem(items[i].key)
        set({ syncProgress: Math.round(((i + 1) / items.length) * 100) })
      }
      set({ lastFullSync: Date.now(), isSyncing: false, syncProgress: 100 })
    } catch (err) {
      set({ syncError: String(err), isSyncing: false })
    }
  },

  syncItem: async (key: string) => {
    // Collect local data
    let localData: string | null = null
    if (typeof window !== 'undefined') {
      localData = localStorage.getItem(`buildspaces.${key}`)
    }

    try {
      // Push to cloud API
      const response = await fetch('/api/cloud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          deviceId: get().deviceId,
          data: localData,
          timestamp: Date.now(),
        }),
      })

      if (response.ok) {
        const result = await response.json()

        if (result.conflict) {
          set((state) => ({
            conflicts: [...state.conflicts, {
              id: `conflict-${Date.now()}`,
              item: state.syncItems.find(i => i.key === key)!,
              localVersion: localData || '',
              cloudVersion: result.cloudData || '',
            }],
            syncItems: state.syncItems.map(i =>
              i.key === key ? { ...i, status: 'conflict' as const } : i
            ),
          }))
        } else {
          // Apply cloud data if newer
          if (result.data && typeof window !== 'undefined') {
            localStorage.setItem(`buildspaces.${key}`, result.data)
          }
          set((state) => ({
            syncItems: state.syncItems.map(i =>
              i.key === key ? { ...i, status: 'synced' as const, lastSynced: Date.now(), size: (localData || '').length } : i
            ),
          }))
        }
      } else {
        set((state) => ({
          syncItems: state.syncItems.map(i =>
            i.key === key ? { ...i, status: 'error' as const } : i
          ),
        }))
      }
    } catch {
      // API not available, mark as pending
      set((state) => ({
        syncItems: state.syncItems.map(i =>
          i.key === key ? { ...i, status: 'pending' as const } : i
        ),
      }))
    }
  },

  resolveConflict: (id: string, resolution: 'local' | 'cloud' | 'merge') => {
    set((state) => {
      const conflict = state.conflicts.find(c => c.id === id)
      if (!conflict) return state

      // Apply resolution
      if (typeof window !== 'undefined') {
        const data = resolution === 'local' ? conflict.localVersion : conflict.cloudVersion
        localStorage.setItem(`buildspaces.${conflict.item.key}`, data)
      }

      return {
        conflicts: state.conflicts.filter(c => c.id !== id),
        syncItems: state.syncItems.map(i =>
          i.key === conflict.item.key ? { ...i, status: 'synced' as const, lastSynced: Date.now() } : i
        ),
      }
    })
  },

  getSyncStatus: () => {
    const items = get().syncItems
    return {
      total: items.length,
      synced: items.filter(i => i.status === 'synced').length,
      pending: items.filter(i => i.status === 'pending').length,
      errors: items.filter(i => i.status === 'error' || i.status === 'conflict').length,
    }
  },
}))
