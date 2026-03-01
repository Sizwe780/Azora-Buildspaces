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
}

interface FileSystemState {
    rootId: string | null
    activeFileId: string | null
    openFiles: string[] // Array of file IDs
    fileMap: Record<string, FileNode> // Quick lookup by ID
    workspaceId: string | null // The active workspace ID for API calls

    // Actions
    createFile: (parentId: string | null, name: string, content?: string) => Promise<string>
    createDirectory: (parentId: string | null, name: string) => Promise<string>
    readFile: (id: string) => string | undefined
    fetchFileContent: (id: string) => Promise<void>
    writeFile: (id: string, content: string) => Promise<void>
    deleteNode: (id: string) => Promise<void>
    renameNode: (id: string, newName: string) => Promise<void>
    openFile: (id: string) => void
    closeFile: (id: string) => void
    setActiveFile: (id: string) => void

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

// Helper to create mock file system from template
const createMockFileSystem = () => {
    const template = projectTemplates?.[0]; // Default to Next.js template
    
     const rootId = 'root';
    const fileMap: Record<string, FileNode> = {
        [rootId]: {
            id: rootId,
            name: 'root',
            type: 'directory',
            path: '',
            children: [],
            isOpen: true,
            parentId: null
        }
    };

    if (!template) {
        return { rootId, fileMap };
    }

    Object.entries(template.files).forEach(([filePath, fileData]) => {
        const parts = filePath.split('/');
        const fileName = parts.pop()!;
        const dirParts = parts;

        // Traverse/Create directories
        let currentId = rootId;
        let currentPath = '';

        for (const part of dirParts) {
            const parentNode = fileMap[currentId];
            const children = parentNode.children || [];
            
            // Find existing directory child
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            const _temp = parentNode.children || [];
            let childId = parentNode.children?.find(id => fileMap[id]?.name === part && fileMap[id]?.type === 'directory');
            
            if (!childId) {
                childId = generateId();
                const newPath = currentPath ? `${currentPath}/${part}` : part;
                
                fileMap[childId] = {
                    id: childId,
                    name: part,
                    type: 'directory',
                    path: newPath,
                    children: [],
                    parentId: currentId,
                    isOpen: false
                };
                
                parentNode.children = [...(parentNode.children || []), childId];
            }
            
            currentId = childId;
            // Bug fix: Update currentPath correctly
            currentPath = fileMap[currentId].path;
        }

        // Create file
        const fileId = generateId();
        const fileNode: FileNode = {
            id: fileId,
            name: fileName,
            type: 'file', // template.files entries are 'file' usually, but can be 'directory' too if empty
            path: filePath,
            content: fileData.content,
            parentId: currentId
        };
        
        // Handle explicit directory entries in template
        if (fileData.type === 'directory') {
             fileNode.type = 'directory';
             fileNode.children = [];
             fileNode.isOpen = false;
        }

        fileMap[fileId] = fileNode;
        fileMap[currentId].children = [...(fileMap[currentId].children || []), fileId];
    });

    return { rootId, fileMap };
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
            // 1) Try loading real file tree from /api/fs/tree (disk-backed workspace)
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

            // 3) Final fallback: local mock file system for offline/demo
            console.warn("[file-system] No backend available — using template mock for demo mode")
            const { rootId, fileMap } = createMockFileSystem()
            set({ fileMap, rootId, isLoading: false })
        } catch (error) {
            console.error("Failed to load project:", error)
            const { rootId, fileMap } = createMockFileSystem()
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

    setActiveFile: (id) => set({ activeFileId: id })
}))
