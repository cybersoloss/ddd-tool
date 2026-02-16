import { create } from 'zustand';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface UiState {
  minimapVisible: boolean;
  toggleMinimap: () => void;
  isLocked: boolean;
  toggleLock: () => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  syncFlash: boolean;
  flashSync: () => void;
  viewports: Record<string, Viewport>;
  setViewport: (key: string, vp: Viewport) => void;
  getViewport: (key: string) => Viewport | undefined;
}

export const useUiStore = create<UiState>((set, get) => ({
  minimapVisible: true,
  toggleMinimap: () => set((s) => ({ minimapVisible: !s.minimapVisible })),
  isLocked: false,
  toggleLock: () => set((s) => ({ isLocked: !s.isLocked })),
  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  syncFlash: false,
  flashSync: () => {
    set({ syncFlash: true });
    setTimeout(() => set({ syncFlash: false }), 2000);
  },
  viewports: {},
  setViewport: (key, vp) =>
    set((s) => ({ viewports: { ...s.viewports, [key]: vp } })),
  getViewport: (key) => get().viewports[key],
}));
