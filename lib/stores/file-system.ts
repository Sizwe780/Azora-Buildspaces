import { create } from 'zustand'
import { projectTemplates } from '../templates/project-templates'

export type FileType = 'file' | 'directory'

export interface FileNode {
    id: string
    name: string
    type: FileType
    content?: string
    children?: string[] // IDs of children
    parentId?: string | null
    isOpen?: boolean
    path: string
    lastModified?: number
}

interface FileSystemState {
    rootId: string | null
    activeFileId: string | null
    openFiles: string[] // Array of file IDs
    fileMap: Record<string, FileNode> // Quick lookup by ID
    workspaceId: string | null // The active workspace ID for API calls

    // File watching
    fileWatchers: Set<string> // Set of file paths being watched
    fileWatcherInterval: NodeJS.Timeout | null
    externalChanges: Record<string, { timestamp: number; action: 'modified' | 'deleted' | 'created' }> // Track external changes

    // Actions
    createFile: (parentId: string | null, name: string, content?: string) => Promise<string>
    createDirectory: (parentId: string | null, name: string) => Promise<string>
    readFile: (id: string) => string | undefined
    fetchFileContent: (id: string) => Promise<void>
    writeFile: (id: string, content: string) => Promise<void>
    deleteNode: (id: string) => Promise<void>
    renameNode: (id: string, newName: string) => Promise<void>
    moveNode: (id: string, newParentId: string | null) => void
    openFile: (id: string) => void
    closeFile: (id: string) => void
    setActiveFile: (id: string) => void
    restoreSessionState: (openFiles: string[], activeFileId: string | null) => void

    // File watching actions
    startFileWatching: () => void
    stopFileWatching: () => void
    watchFile: (filePath: string) => void
    unwatchFile: (filePath: string) => void
    checkForExternalChanges: () => Promise<void>
    acknowledgeExternalChange: (filePath: string) => void

    // Project Management
    isLoading: boolean
    loadProject: (projectId: string) => Promise<void>
    saveProject: () => Promise<void>
}

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9)

interface FileSnapshotEntry {
    path: string
    content: string
}

const buildFileMapFromSnapshot = (files: FileSnapshotEntry[]) => {
    const rootId = 'root'
    const fileMap: Record<string, FileNode> = {
        [rootId]: {
            id: rootId,
            name: 'root',
            type: 'directory',
            path: '',
            children: [],
            isOpen: true,
            parentId: null,
        },
    }

    for (const file of files) {
        const normalized = file.path.startsWith('/') ? file.path.slice(1) : file.path
        const parts = normalized.split('/').filter(Boolean)
        const fileName = parts.pop()
        if (!fileName) continue

        let currentId = rootId
        let currentPath = ''

        for (const part of parts) {
            const parentNode = fileMap[currentId]
            let childId = parentNode.children?.find(
                (id) => fileMap[id]?.name === part && fileMap[id]?.type === 'directory'
            )
            if (!childId) {
                childId = generateId()
                const newPath = currentPath ? `${currentPath}/${part}` : part
                fileMap[childId] = {
                    id: childId,
                    name: part,
                    type: 'directory',
                    path: newPath,
                    children: [],
                    parentId: currentId,
                    isOpen: false,
                }
                parentNode.children = [...(parentNode.children || []), childId]
            }
            currentId = childId
            currentPath = fileMap[currentId].path
        }

        const fileId = generateId()
        const fileNode: FileNode = {
            id: fileId,
            name: fileName,
            type: 'file',
            path: currentPath ? `${currentPath}/${fileName}` : fileName,
            content: file.content,
            parentId: currentId,
        }
        fileMap[fileId] = fileNode
        fileMap[currentId].children = [...(fileMap[currentId].children || []), fileId]
    }

    return { rootId, fileMap }
}

/**
 * Build a fileMap from the /api/fs/tree response format:
 * [{ path: "src/app/page.tsx", type: "file", size: 1234 }, ...]
 */
const buildFileMapFromTree = (entries: { path: string; type: 'file' | 'directory'; size: number }[]) => {
    const rootId = 'root'
    const fileMap: Record<string, FileNode> = {
        [rootId]: {
            id: rootId,
            name: 'root',
            type: 'directory',
            path: '',
            children: [],
            isOpen: true,
            parentId: null,
        },
    }

    for (const entry of entries) {
        const parts = entry.path.split('/').filter(Boolean)
        const name = parts.pop()
        if (!name) continue

        let currentId = rootId
        let currentPath = ''

        // Traverse / create parent directories
        for (const part of parts) {
            const parentNode = fileMap[currentId]
            let childId = parentNode.children?.find(
                (id) => fileMap[id]?.name === part && fileMap[id]?.type === 'directory'
            )
            if (!childId) {
                childId = generateId()
                const newPath = currentPath ? `${currentPath}/${part}` : part
                fileMap[childId] = {
                    id: childId,
                    name: part,
                    type: 'directory',
                    path: newPath,
                    children: [],
                    parentId: currentId,
                    isOpen: false,
                }
                parentNode.children = [...(parentNode.children || []), childId]
            }
            currentId = childId
            currentPath = fileMap[currentId].path
        }

        // Create the entry node
        const nodeId = generateId()
        const nodePath = currentPath ? `${currentPath}/${name}` : name

        if (entry.type === 'directory') {
            // Only add if not already created by traversal
            const existing = fileMap[currentId]?.children?.find(
                id => fileMap[id]?.name === name && fileMap[id]?.type === 'directory'
            )
            if (!existing) {
                fileMap[nodeId] = {
                    id: nodeId,
                    name,
                    type: 'directory',
                    path: nodePath,
                    children: [],
                    parentId: currentId,
                    isOpen: false,
                }
                fileMap[currentId].children = [...(fileMap[currentId].children || []), nodeId]
            }
        } else {
            fileMap[nodeId] = {
                id: nodeId,
                name,
                type: 'file',
                path: nodePath,
                parentId: currentId,
                // content will be lazy-loaded
            }
            fileMap[currentId].children = [...(fileMap[currentId].children || []), nodeId]
        }
    }

    return { rootId, fileMap }
}

export const useFileSystem = create<FileSystemState>((set, get) => ({
    rootId: null,
    activeFileId: null,
    openFiles: [],
    fileMap: {},
    isLoading: false,
    workspaceId: null,

    loadProject: async (_projectId: string) => {
        set({ isLoading: true, workspaceId: _projectId })
        try {
            const treeRes = await fetch(`/api/fs/tree?workspaceId=${encodeURIComponent(_projectId)}`)
            if (treeRes.ok) {
                const treeData = await treeRes.json()

                if (treeData.exists && treeData.entries && treeData.entries.length > 0) {
                    const entries: { path: string; type: 'file' | 'directory'; size: number }[] = treeData.entries
                    const { rootId, fileMap } = buildFileMapFromTree(entries)
                    set({ fileMap, rootId, isLoading: false })

                    // Lazy-load content for small files (< 100KB), cap at 50
                    const filesToLoad = entries
                        .filter(e => e.type === 'file' && e.size < 100_000)
                        .slice(0, 50)

                    const batchSize = 10
                    for (let i = 0; i < filesToLoad.length; i += batchSize) {
                        const batch = filesToLoad.slice(i, i + batchSize)
                        await Promise.all(batch.map(async (entry) => {
                            try {
                                const contentRes = await fetch(
                                    `/api/fs/content?path=${encodeURIComponent(entry.path)}&workspaceId=${encodeURIComponent(_projectId)}`
                                )
                                if (contentRes.ok) {
                                    const { content } = await contentRes.json()
                                    const state = get()
                                    const nodeId = Object.keys(state.fileMap).find(
                                        id => state.fileMap[id]?.path === entry.path
                                    )
                                    if (nodeId) {
                                        set(s => ({
                                            fileMap: {
                                                ...s.fileMap,
                                                [nodeId]: { ...s.fileMap[nodeId], content }
                                            }
                                        }))
                                    }
                                }
                            } catch { /* skip */ }
                        }))
                    }
                    return
                }

                // Workspace doesn't exist yet — scaffold from template if it matches
                const isTemplate = projectTemplates.some(t => t.id === _projectId)
                if (isTemplate) {
                    const scaffoldRes = await fetch('/api/fs/scaffold', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ templateId: _projectId, workspaceId: _projectId })
                    })

                    if (scaffoldRes.ok) {
                        // Re-fetch the tree now that files exist
                        const retryRes = await fetch(`/api/fs/tree?workspaceId=${encodeURIComponent(_projectId)}`)
                        if (retryRes.ok) {
                            const retryData = await retryRes.json()
                            if (retryData.entries?.length > 0) {
                                const { rootId, fileMap } = buildFileMapFromTree(retryData.entries)
                                set({ fileMap, rootId, isLoading: false })
                                // Load file contents
                                const filesToLoad = retryData.entries
                                    .filter((e: any) => e.type === 'file' && e.size < 100_000)
                                    .slice(0, 50)
                                for (const entry of filesToLoad) {
                                    try {
                                        const contentRes = await fetch(
                                            `/api/fs/content?path=${encodeURIComponent(entry.path)}&workspaceId=${encodeURIComponent(_projectId)}`
                                        )
                                        if (contentRes.ok) {
                                            const { content } = await contentRes.json()
                                            const state = get()
                                            const nodeId = Object.keys(state.fileMap).find(
                                                id => state.fileMap[id]?.path === entry.path
                                            )
                                            if (nodeId) {
                                                set(s => ({
                                                    fileMap: {
                                                        ...s.fileMap,
                                                        [nodeId]: { ...s.fileMap[nodeId], content }
                                                    }
                                                }))
                                            }
                                        }
                                    } catch { /* skip */ }
                                }
                                return
                            }
                        }
                    }
                }
            }

            // 2) Firestore snapshot as secondary fallback
            try {
                const snapshotRes = await fetch(`/api/projects/${_projectId}/snapshot`)
                if (snapshotRes.ok) {
                    const snapshot = await snapshotRes.json()
                    if (snapshot?.files && snapshot.files.length > 0) {
                        const { rootId, fileMap } = buildFileMapFromSnapshot(snapshot.files)
                        set({ fileMap, rootId, isLoading: false })
                        return
                    }
                }
            } catch { /* Firestore not configured */ }

            // 3) Final fallback: empty workspace root only
            console.warn("[file-system] No backend data available — initializing empty workspace")
            const { rootId, fileMap } = buildFileMapFromSnapshot([])
            set({ fileMap, rootId, isLoading: false })
        } catch (error) {
            console.error("Failed to load project:", error)
            const { rootId, fileMap } = buildFileMapFromSnapshot([])
            set({ fileMap, rootId, isLoading: false })
        }
    },

    saveProject: async () => {
        const state = get()
        const wsId = state.workspaceId
        if (!wsId) return

        const fileNodes = Object.values(state.fileMap).filter(
            n => n.type === 'file' && n.content !== undefined
        )
        for (const node of fileNodes) {
            try {
                await fetch('/api/fs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        operation: 'write',
                        path: node.path,
                        content: node.content,
                        workspaceId: wsId
                    })
                })
            } catch (e) {
                console.error(`Failed to save ${node.path}:`, e)
            }
        }
    },

    createFile: async (parentId, name, content = '') => {
        const id = generateId()
        const parent = get().fileMap[parentId || 'root']
        const filePath = parent.path ? `${parent.path}/${name}` : name

        const newNode: FileNode = {
            id,
            name,
            type: 'file',
            content,
            parentId: parentId || 'root',
            path: filePath
        }

        set(state => {
            const newFileMap = { ...state.fileMap, [id]: newNode }
            if (parent) {
                const newParent = { ...parent, children: [...(parent.children || []), id] }
                newFileMap[parent.id] = newParent
            }
            return { fileMap: newFileMap }
        })

        // Sync to disk
        const wsId = get().workspaceId
        if (wsId) {
            try {
                await fetch('/api/fs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: 'write', path: filePath, content, workspaceId: wsId })
                })
            } catch (e) {
                console.error("Failed to create file on disk:", e)
            }
        }

        return id
    },

    createDirectory: async (parentId, name) => {
        const id = generateId()
        const parent = get().fileMap[parentId || 'root']
        const dirPath = parent.path ? `${parent.path}/${name}` : name

        const newNode: FileNode = {
            id,
            name,
            type: 'directory',
            children: [],
            parentId: parentId || 'root',
            path: dirPath
        }

        set(state => {
            const newFileMap = { ...state.fileMap, [id]: newNode }
            if (parent) {
                const newParent = { ...parent, children: [...(parent.children || []), id] }
                newFileMap[parent.id] = newParent
            }
            return { fileMap: newFileMap }
        })

        // Sync to disk
        const wsId = get().workspaceId
        if (wsId) {
            try {
                await fetch('/api/fs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: 'mkdir', path: dirPath, workspaceId: wsId })
                })
            } catch (e) {
                console.error("Failed to create directory on disk:", e)
            }
        }

        return id
    },

    readFile: (id) => {
        const node = get().fileMap[id]
        return node?.content
    },

    fetchFileContent: async (id: string) => {
        const node = get().fileMap[id]
        if (!node || node.type !== 'file') return

        const wsId = get().workspaceId
        if (!wsId) return

        try {
            const res = await fetch(
                `/api/fs/content?path=${encodeURIComponent(node.path)}&workspaceId=${encodeURIComponent(wsId)}`
            )
            if (res.ok) {
                const { content } = await res.json()
                set(state => ({
                    fileMap: {
                        ...state.fileMap,
                        [id]: { ...state.fileMap[id], content }
                    }
                }))
            }
        } catch (e) {
            console.error("Failed to fetch content:", e)
        }
    },

    writeFile: async (id, content) => {
        const node = get().fileMap[id]
        if (!node) return

        set(state => ({
            fileMap: {
                ...state.fileMap,
                [id]: { ...state.fileMap[id], content }
            }
        }))

        // Sync to disk
        const wsId = get().workspaceId
        if (wsId) {
            try {
                await fetch('/api/fs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: 'write', path: node.path, content, workspaceId: wsId })
                })
            } catch (e) {
                console.error("Failed to save file:", e)
            }
        }
    },

    deleteNode: async (id) => {
        const node = get().fileMap[id]
        const wsId = get().workspaceId

        set(state => {
            const newFileMap = { ...state.fileMap }

            if (node.parentId && newFileMap[node.parentId]) {
                const parent = newFileMap[node.parentId]
                newFileMap[node.parentId] = {
                    ...parent,
                    children: parent.children?.filter(childId => childId !== id)
                }
            }

            delete newFileMap[id]

            return {
                fileMap: newFileMap,
                openFiles: state.openFiles.filter(f => f !== id),
                activeFileId: state.activeFileId === id ? null : state.activeFileId
            }
        })

        // Sync to disk
        if (wsId && node) {
            try {
                await fetch('/api/fs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: 'delete', path: node.path, workspaceId: wsId })
                })
            } catch (e) {
                console.error("Failed to delete on disk:", e)
            }
        }
    },

    renameNode: async (id, newName) => {
        const node = get().fileMap[id]
        const parent = get().fileMap[node.parentId!]
        const oldPath = node.path
        const newPath = parent.path ? `${parent.path}/${newName}` : newName
        const wsId = get().workspaceId

        set(state => ({
            fileMap: {
                ...state.fileMap,
                [id]: { ...node, name: newName, path: newPath }
            }
        }))

        // Sync to disk
        if (wsId) {
            try {
                await fetch('/api/fs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: 'rename', path: oldPath, oldPath, newPath, workspaceId: wsId })
                })
            } catch (e) {
                console.error("Failed to rename on disk:", e)
            }
        }
    },

    openFile: (id) => {
        const state = get()
        const node = state.fileMap[id]
        // Lazy-load content if not yet fetched
        if (node && node.type === 'file' && node.content === undefined) {
            get().fetchFileContent(id)
        }

        set(s => {
            if (!s.openFiles.includes(id)) {
                return { openFiles: [...s.openFiles, id], activeFileId: id }
            }
            return { activeFileId: id }
        })
    },

    moveNode: (id, newParentId) => {
        const state = get()
        const node = state.fileMap[id]
        if (!node) return
        // Prevent moving into itself or its own subtree
        if (id === newParentId) return
        const oldParent = node.parentId
        if (oldParent === newParentId) return

        const newParent = newParentId ? state.fileMap[newParentId] : null
        if (newParent && newParent.type !== 'directory') return

        const newPath = newParent ? `${newParent.path}/${node.name}` : node.name

        set(st => {
            const updated = { ...st.fileMap }
            // Remove from old parent's children
            if (oldParent && updated[oldParent]?.children) {
                updated[oldParent] = {
                    ...updated[oldParent],
                    children: updated[oldParent].children!.filter(c => c !== id),
                }
            }
            // Add to new parent's children
            if (newParentId && updated[newParentId]) {
                updated[newParentId] = {
                    ...updated[newParentId],
                    children: [...(updated[newParentId].children || []), id],
                }
            }
            // Update node
            updated[id] = { ...node, parentId: newParentId, path: newPath }
            return { fileMap: updated }
        })
    },

    closeFile: (id) => {
        set(state => {
            const newOpenFiles = state.openFiles.filter(f => f !== id)
            let newActiveId = state.activeFileId
            if (state.activeFileId === id) {
                newActiveId = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null
            }
            return { openFiles: newOpenFiles, activeFileId: newActiveId }
        })
    },

    setActiveFile: (id) => set({ activeFileId: id }),

    restoreSessionState: (openFiles, activeFileId) => {
        set({ openFiles, activeFileId })
    },

    // File watching functionality
    fileWatchers: new Set(),
    fileWatcherInterval: null,
    externalChanges: {},

    startFileWatching: () => {
        const state = get()
        if (state.fileWatcherInterval) return

        const interval = setInterval(async () => {
            await get().checkForExternalChanges()
        }, 2000) // Check every 2 seconds

        set({ fileWatcherInterval: interval })
    },

    stopFileWatching: () => {
        const state = get()
        if (state.fileWatcherInterval) {
            clearInterval(state.fileWatcherInterval)
            set({ fileWatcherInterval: null, fileWatchers: new Set(), externalChanges: {} })
        }
    },

    watchFile: (filePath: string) => {
        set(state => ({
            fileWatchers: new Set([...state.fileWatchers, filePath])
        }))
    },

    unwatchFile: (filePath: string) => {
        set(state => {
            const newWatchers = new Set(state.fileWatchers)
            newWatchers.delete(filePath)
            return { fileWatchers: newWatchers }
        })
    },

    checkForExternalChanges: async () => {
        const state = get()
        if (state.fileWatchers.size === 0 || !state.workspaceId) return

        try {
            const response = await fetch(`/api/fs/tree?workspaceId=${encodeURIComponent(state.workspaceId)}`)
            if (!response.ok) return

            const data = await response.json()
            if (!data.entries) return

            const currentFiles = new Map<string, { size: number; mtime?: number }>()
            data.entries.forEach((entry: any) => {
                currentFiles.set(entry.path, { size: entry.size, mtime: entry.mtime })
            })

            const changes: Record<string, { timestamp: number; action: 'modified' | 'deleted' | 'created' }> = {}

            // Check for modifications and deletions
            for (const watchedPath of state.fileWatchers) {
                const current = currentFiles.get(watchedPath)
                const nodeId = Object.keys(state.fileMap).find(id => state.fileMap[id]?.path === watchedPath)
                const node = nodeId ? state.fileMap[nodeId] : null

                if (!current && node) {
                    // File was deleted externally
                    changes[watchedPath] = { timestamp: Date.now(), action: 'deleted' }
                } else if (current && node) {
                    // Check if file was modified externally (different size or newer mtime)
                    if (current.size !== (node.content?.length || 0) ||
                        (current.mtime && (!node.lastModified || current.mtime > node.lastModified))) {
                        changes[watchedPath] = { timestamp: Date.now(), action: 'modified' }
                    }
                }
            }

            // Check for new files
            for (const [path, info] of currentFiles) {
                if (!state.fileWatchers.has(path)) {
                    const nodeId = Object.keys(state.fileMap).find(id => state.fileMap[id]?.path === path)
                    if (!nodeId) {
                        changes[path] = { timestamp: Date.now(), action: 'created' }
                    }
                }
            }

            if (Object.keys(changes).length > 0) {
                set(state => ({
                    externalChanges: { ...state.externalChanges, ...changes }
                }))

                // Notify about external changes
                Object.entries(changes).forEach(([path, change]) => {
                    console.log(`External change detected: ${change.action} ${path}`)
                    // Could dispatch events or show notifications here
                })
            }
        } catch (error) {
            console.error('Error checking for external changes:', error)
        }
    },

    acknowledgeExternalChange: (filePath: string) => {
        set(state => {
            const newChanges = { ...state.externalChanges }
            delete newChanges[filePath]
            return { externalChanges: newChanges }
        })
    },
}))
