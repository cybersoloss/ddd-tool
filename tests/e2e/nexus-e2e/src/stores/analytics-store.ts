import { create } from 'zustand'

// Analytics domain store — dashboard metrics, realtime updates
interface DashboardStats {
  ingestedToday: number
  pendingReview: number
  publishedToday: number
  avgQualityScore: number
  pipelineHealth: 'healthy' | 'degraded' | 'down'
}

interface AnalyticsStore {
  stats: DashboardStats | null
  lastUpdated: string | null
  isLoading: boolean

  setStats: (stats: DashboardStats) => void
  updateStat: <K extends keyof DashboardStats>(key: K, value: DashboardStats[K]) => void
  setLoading: (loading: boolean) => void
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  stats: null,
  lastUpdated: null,
  isLoading: false,

  setStats: (stats) => set({ stats, lastUpdated: new Date().toISOString() }),
  updateStat: (key, value) =>
    set((s) => ({
      stats: s.stats ? { ...s.stats, [key]: value } : null,
      lastUpdated: new Date().toISOString(),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}))
