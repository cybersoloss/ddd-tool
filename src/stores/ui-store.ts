import { create } from 'zustand';

interface UiState {
  minimapVisible: boolean;
  toggleMinimap: () => void;
  isLocked: boolean;
  toggleLock: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  minimapVisible: true,
  toggleMinimap: () => set((s) => ({ minimapVisible: !s.minimapVisible })),
  isLocked: false,
  toggleLock: () => set((s) => ({ isLocked: !s.isLocked })),
}));
