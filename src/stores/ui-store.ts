import { create } from 'zustand';

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
}

export const useUiStore = create<UiState>((set) => ({
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
}));
