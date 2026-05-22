import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  activeModule: string;
  theme: 'light' | 'dark';
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setActiveModule: (module: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  activeModule: 'dashboard',
  theme: 'dark',
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveModule: (module) => set({ activeModule: module }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
}));
