'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GrazeList, Place, User, DietType, ImportJob } from '@/types'
import { diffLists } from '@/lib/utils'

interface GrazeStore {
  // Auth
  user: User | null
  setUser: (u: User | null) => void
  updateDiet: (diet: DietType[]) => void

  // Lists
  lists: GrazeList[]
  activeListId: string | null
  setLists: (l: GrazeList[]) => void
  mergeLists: (incoming: GrazeList[]) => number // returns newCount
  setActiveList: (id: string | null) => void
  markVisited: (listId: string, placeId: string, v: boolean) => void
  updateNote: (listId: string, placeId: string, note: string) => void
  updateEnrichment: (placeId: string, data: Partial<Place>) => void
  addPlaceToList: (listId: string, place: Place) => void
  createList: (name: string, color: string) => string // returns new list id

  // Import
  importJob: ImportJob
  setImportJob: (j: Partial<ImportJob>) => void
  resetImport: () => void

  // UI
  activeView: 'lists' | 'map' | 'discover' | 'profile'
  setActiveView: (v: GrazeStore['activeView']) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  importPending: boolean
  setImportPending: (v: boolean) => void
  dietFilter: DietType | 'all'
  setDietFilter: (d: DietType | 'all') => void
  visitedFilter: 'all' | 'unvisited' | 'visited'
  setVisitedFilter: (v: GrazeStore['visitedFilter']) => void
}

const EMPTY_JOB: ImportJob = {
  status: 'idle', progress: 0, phase: '',
  totalPlaces: 0, doneCount: 0, newCount: 0,
}

export const useStore = create<GrazeStore>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),
      updateDiet: (diet) => set(s => ({
        user: s.user ? { ...s.user, diet } : s.user
      })),

      // Lists
      lists: [],
      activeListId: null,
      setLists: (lists) => set({ lists }),

      mergeLists: (incoming) => {
        const { merged, newCount } = diffLists(incoming, get().lists)
        set({ lists: merged })
        return newCount
      },

      setActiveList: (id) => set({ activeListId: id, activeView: 'lists' }),

      markVisited: (listId, placeId, v) => set(s => ({
        lists: s.lists.map(l => l.id !== listId ? l : {
          ...l, places: l.places.map(p => p.id !== placeId ? p : {
            ...p, visited: v, visitedAt: v ? new Date().toISOString() : undefined
          })
        })
      })),

      updateNote: (listId, placeId, note) => set(s => ({
        lists: s.lists.map(l => l.id !== listId ? l : {
          ...l, places: l.places.map(p => p.id !== placeId ? p : { ...p, userNote: note })
        })
      })),

      updateEnrichment: (placeId, data) => set(s => ({
        lists: s.lists.map(l => ({
          ...l, places: l.places.map(p =>
            p.id !== placeId ? p : { ...p, ...data, enriched: true }
          )
        }))
      })),

      addPlaceToList: (listId, place) => set(s => ({
        lists: s.lists.map(l => l.id !== listId ? l : {
          ...l, places: [place, ...l.places]
        })
      })),

      createList: (name, color) => {
        const id = crypto.randomUUID()
        set(s => ({
          lists: [...s.lists, {
            id, name, color, places: [],
            source: 'manual',
            createdAt: new Date().toISOString(),
          }],
          activeListId: id,
        }))
        return id
      },

      // Import
      importJob: EMPTY_JOB,
      setImportJob: (j) => set(s => ({ importJob: { ...s.importJob, ...j } })),
      resetImport: () => set({ importJob: EMPTY_JOB }),

      // UI
      activeView: 'lists',
      setActiveView: (v) => set({ activeView: v }),
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
      importPending: false,
      setImportPending: (v) => set({ importPending: v }),
      dietFilter: 'all',
      setDietFilter: (d) => set({ dietFilter: d }),
      visitedFilter: 'all',
      setVisitedFilter: (v) => set({ visitedFilter: v }),
    }),
    {
      name: 'graze-v1',
      partialize: (s) => ({ user: s.user, lists: s.lists, importPending: s.importPending }),
    }
  )
)
