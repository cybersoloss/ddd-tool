import { create } from 'zustand'

// Content domain store — filters, selections, realtime updates
interface ContentFilters {
  status?: string
  category?: string
  sourceType?: string
  search?: string
  cursor?: string
}

interface ContentItem {
  id: string
  title: string
  status: string
  category: string
  qualityScore?: number | null
  sourceType: string
  createdAt: string
}

interface ContentStore {
  items: ContentItem[]
  filters: ContentFilters
  selectedId: string | null
  hasMore: boolean
  cursor: string | null

  setItems: (items: ContentItem[]) => void
  appendItems: (items: ContentItem[]) => void
  updateItem: (id: string, patch: Partial<ContentItem>) => void
  removeItem: (id: string) => void
  setFilters: (filters: Partial<ContentFilters>) => void
  resetFilters: () => void
  select: (id: string | null) => void
  setPagination: (cursor: string | null, hasMore: boolean) => void
}

export const useContentStore = create<ContentStore>((set) => ({
  items: [],
  filters: {},
  selectedId: null,
  hasMore: false,
  cursor: null,

  setItems: (items) => set({ items }),
  appendItems: (items) => set((s) => ({ items: [...s.items, ...items] })),
  updateItem: (id, patch) =>
    set((s) => ({ items: s.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((item) => item.id !== id) })),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters }, cursor: null })),
  resetFilters: () => set({ filters: {}, cursor: null }),
  select: (id) => set({ selectedId: id }),
  setPagination: (cursor, hasMore) => set({ cursor, hasMore }),
}))
