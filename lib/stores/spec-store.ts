import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { SpecType } from '@/lib/spec-kit'

/* ─── Types ─── */
export interface SpecDocument {
  id: string
  title: string
  type: SpecType
  content: string
  status: 'draft' | 'review' | 'approved' | 'archived'
  version: string
  lastModified: string
  author: string
}

export interface AcceptanceCriterion {
  id: string
  text: string
  checked: boolean
}

export interface Stakeholder {
  id: string
  name: string
  role: string
  status: 'pending' | 'approved' | 'rejected'
  updatedAt?: string
}

export interface SpecVersion {
  id: string
  version: string
  author: string
  timestamp: string
  description: string
  content: string
}

export interface SpecReviewComment {
  id: string
  author: string
  text: string
  lineRef?: number
  timestamp: string
  resolved: boolean
}

/* ─── State Interface ─── */
interface SpecState {
  // Active spec editing
  activeSpecId: string | null
  activeType: SpecType
  content: string
  isSaved: boolean
  generatedCode: string

  // Saved specs (persistent)
  specs: SpecDocument[]

  // Acceptance Criteria (persistent per-spec)
  acceptanceCriteria: Record<string, AcceptanceCriterion[]>

  // Stakeholder Sign-Off (persistent per-spec)
  stakeholders: Record<string, Stakeholder[]>

  // Version History (persistent per-spec)
  versionHistory: Record<string, SpecVersion[]>

  // Review Comments (persistent per-spec)
  reviewComments: Record<string, SpecReviewComment[]>

  // Actions – spec editing
  setActiveType: (type: SpecType) => void
  setContent: (content: string) => void
  setIsSaved: (saved: boolean) => void
  setGeneratedCode: (code: string) => void
  setActiveSpecId: (id: string | null) => void

  // Actions – spec CRUD
  saveSpec: (spec: Omit<SpecDocument, 'id' | 'lastModified'>) => SpecDocument
  updateSpec: (id: string, updates: Partial<SpecDocument>) => void
  deleteSpec: (id: string) => void
  loadSpec: (id: string) => void

  // Actions – acceptance criteria
  addCriterion: (specId: string, text: string) => void
  toggleCriterion: (specId: string, criterionId: string) => void
  removeCriterion: (specId: string, criterionId: string) => void

  // Actions – stakeholders
  addStakeholder: (specId: string, name: string, role: string) => void
  updateStakeholderStatus: (specId: string, stakeholderId: string, status: 'pending' | 'approved' | 'rejected') => void
  removeStakeholder: (specId: string, stakeholderId: string) => void

  // Actions – version history
  createVersion: (specId: string, description: string, author?: string) => void

  // Actions – review comments
  addReviewComment: (specId: string, text: string, lineRef?: number, author?: string) => void
  editReviewComment: (specId: string, commentId: string, newText: string) => void
  resolveReviewComment: (specId: string, commentId: string) => void
  deleteReviewComment: (specId: string, commentId: string) => void

  // Actions – data migration
  migrateUnsavedData: (newSpecId: string) => void
}

/* ─── Default stakeholders for new specs ─── */
const DEFAULT_STAKEHOLDERS: Omit<Stakeholder, 'id'>[] = [
  { name: 'Tech Lead', role: 'Engineering', status: 'pending' },
  { name: 'Product Manager', role: 'Product', status: 'pending' },
  { name: 'QA Lead', role: 'Quality', status: 'pending' },
]

/* ─── Version counter helper ─── */
function nextVersion(versions: SpecVersion[]): string {
  if (versions.length === 0) return 'v1.0'
  const latest = versions[0].version
  const match = latest.match(/v(\d+)\.(\d+)/)
  if (!match) return 'v1.0'
  return `v${match[1]}.${parseInt(match[2]) + 1}`
}

/* ─── Store ─── */
export const useSpecStore = create<SpecState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeSpecId: null,
      activeType: 'component' as SpecType,
      content: '',
      isSaved: true,
      generatedCode: '',
      specs: [],
      acceptanceCriteria: {},
      stakeholders: {},
      versionHistory: {},
      reviewComments: {},

      // Editing actions
      setActiveType: (type) => set({ activeType: type }),
      setContent: (content) => set({ content, isSaved: false }),
      setIsSaved: (saved) => set({ isSaved: saved }),
      setGeneratedCode: (code) => set({ generatedCode: code }),
      setActiveSpecId: (id) => set({ activeSpecId: id }),

      // CRUD
      saveSpec: (spec) => {
        const id = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const newSpec: SpecDocument = {
          ...spec,
          id,
          lastModified: new Date().toISOString(),
        }
        set((state) => {
          // Initialize stakeholders for new spec
          const newStakeholders = { ...state.stakeholders }
          if (!newStakeholders[id]) {
            newStakeholders[id] = DEFAULT_STAKEHOLDERS.map((s, i) => ({
              ...s,
              id: `sh-${id}-${i}`,
            }))
          }
          return {
            specs: [newSpec, ...state.specs],
            activeSpecId: id,
            isSaved: true,
            stakeholders: newStakeholders,
          }
        })
        return { ...newSpec }
      },

      updateSpec: (id, updates) =>
        set((state) => ({
          specs: state.specs.map((s) =>
            s.id === id ? { ...s, ...updates, lastModified: new Date().toISOString() } : s
          ),
          isSaved: true,
        })),

      deleteSpec: (id) =>
        set((state) => {
          const { [id]: _ac, ...restCriteria } = state.acceptanceCriteria
          const { [id]: _sh, ...restStakeholders } = state.stakeholders
          const { [id]: _vh, ...restVersions } = state.versionHistory
          const { [id]: _rc, ...restComments } = state.reviewComments
          return {
            specs: state.specs.filter((s) => s.id !== id),
            activeSpecId: state.activeSpecId === id ? null : state.activeSpecId,
            acceptanceCriteria: restCriteria,
            stakeholders: restStakeholders,
            versionHistory: restVersions,
            reviewComments: restComments,
          }
        }),

      loadSpec: (id) => {
        const spec = get().specs.find((s) => s.id === id)
        if (spec) {
          set({
            activeSpecId: id,
            activeType: spec.type,
            content: spec.content,
            isSaved: true,
          })
        }
      },

      // Acceptance Criteria
      addCriterion: (specId, text) =>
        set((state) => {
          const existing = state.acceptanceCriteria[specId] || []
          return {
            acceptanceCriteria: {
              ...state.acceptanceCriteria,
              [specId]: [
                ...existing,
                { id: `ac-${Date.now()}`, text, checked: false },
              ],
            },
          }
        }),

      toggleCriterion: (specId, criterionId) =>
        set((state) => ({
          acceptanceCriteria: {
            ...state.acceptanceCriteria,
            [specId]: (state.acceptanceCriteria[specId] || []).map((c) =>
              c.id === criterionId ? { ...c, checked: !c.checked } : c
            ),
          },
        })),

      removeCriterion: (specId, criterionId) =>
        set((state) => ({
          acceptanceCriteria: {
            ...state.acceptanceCriteria,
            [specId]: (state.acceptanceCriteria[specId] || []).filter(
              (c) => c.id !== criterionId
            ),
          },
        })),

      // Stakeholders
      addStakeholder: (specId, name, role) =>
        set((state) => {
          const existing = state.stakeholders[specId] || []
          return {
            stakeholders: {
              ...state.stakeholders,
              [specId]: [
                ...existing,
                { id: `sh-${Date.now()}`, name, role, status: 'pending' as const },
              ],
            },
          }
        }),

      updateStakeholderStatus: (specId, stakeholderId, status) =>
        set((state) => ({
          stakeholders: {
            ...state.stakeholders,
            [specId]: (state.stakeholders[specId] || []).map((s) =>
              s.id === stakeholderId
                ? { ...s, status, updatedAt: new Date().toISOString() }
                : s
            ),
          },
        })),

      removeStakeholder: (specId, stakeholderId) =>
        set((state) => ({
          stakeholders: {
            ...state.stakeholders,
            [specId]: (state.stakeholders[specId] || []).filter(
              (s) => s.id !== stakeholderId
            ),
          },
        })),

      // Version History (max 50 per spec to prevent unbounded localStorage growth)
      createVersion: (specId, description, author) => {
        const MAX_VERSIONS = 50
        const state = get()
        const existing = state.versionHistory[specId] || []
        const version = nextVersion(existing)
        const newEntry: SpecVersion = {
          id: `ver-${Date.now()}`,
          version,
          author: author || 'Anonymous',
          timestamp: new Date().toISOString(),
          description,
          content: state.content,
        }
        const updated = [newEntry, ...existing].slice(0, MAX_VERSIONS)
        set({
          versionHistory: {
            ...state.versionHistory,
            [specId]: updated,
          },
        })
      },

      // Review Comments
      addReviewComment: (specId, text, lineRef, author) =>
        set((state) => {
          const existing = state.reviewComments[specId] || []
          return {
            reviewComments: {
              ...state.reviewComments,
              [specId]: [
                ...existing,
                {
                  id: `rc-${Date.now()}`,
                  author: author || 'Anonymous',
                  text,
                  lineRef,
                  timestamp: new Date().toISOString(),
                  resolved: false,
                },
              ],
            },
          }
        }),

      resolveReviewComment: (specId, commentId) =>
        set((state) => ({
          reviewComments: {
            ...state.reviewComments,
            [specId]: (state.reviewComments[specId] || []).map((c) =>
              c.id === commentId ? { ...c, resolved: true } : c
            ),
          },
        })),

      editReviewComment: (specId, commentId, newText) =>
        set((state) => ({
          reviewComments: {
            ...state.reviewComments,
            [specId]: (state.reviewComments[specId] || []).map((c) =>
              c.id === commentId ? { ...c, text: newText } : c
            ),
          },
        })),

      deleteReviewComment: (specId, commentId) =>
        set((state) => ({
          reviewComments: {
            ...state.reviewComments,
            [specId]: (state.reviewComments[specId] || []).filter(
              (c) => c.id !== commentId
            ),
          },
        })),

      migrateUnsavedData: (newSpecId) =>
        set((state) => {
          const unsaved = '_unsaved'
          const newAC = { ...state.acceptanceCriteria }
          const newSH = { ...state.stakeholders }
          const newVH = { ...state.versionHistory }
          const newRC = { ...state.reviewComments }

          // Move _unsaved keyed data to the new spec ID
          if (newAC[unsaved]?.length) { newAC[newSpecId] = [...(newAC[newSpecId] || []), ...newAC[unsaved]]; delete newAC[unsaved] }
          if (newSH[unsaved]?.length) { newSH[newSpecId] = [...(newSH[newSpecId] || []), ...newSH[unsaved]]; delete newSH[unsaved] }
          if (newVH[unsaved]?.length) { newVH[newSpecId] = [...(newVH[newSpecId] || []), ...newVH[unsaved]]; delete newVH[unsaved] }
          if (newRC[unsaved]?.length) { newRC[newSpecId] = [...(newRC[newSpecId] || []), ...newRC[unsaved]]; delete newRC[unsaved] }

          return {
            acceptanceCriteria: newAC,
            stakeholders: newSH,
            versionHistory: newVH,
            reviewComments: newRC,
          }
        }),
    }),
    {
      name: 'spec-chamber-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        specs: state.specs,
        content: state.content,
        generatedCode: state.generatedCode,
        acceptanceCriteria: state.acceptanceCriteria,
        stakeholders: state.stakeholders,
        versionHistory: state.versionHistory,
        reviewComments: state.reviewComments,
        activeSpecId: state.activeSpecId,
        activeType: state.activeType,
      }),
    }
  )
)
