import { create } from 'zustand'
import { getTheme, setTheme, type Theme } from '../../../shared/theme/theme'

export type SidebarPanel = 'palette' | 'functions' | 'variables' | 'source' | 'settings' | null
export type InspectorTab = 'properties' | 'variables' | 'callstack' | 'source'
export type ConsoleMode = 'chat' | 'plain'

interface UiState {
  theme: Theme
  sidebarPanel: SidebarPanel
  inspectorTab: InspectorTab
  inspectorPinned: boolean
  consoleMode: ConsoleMode
  selectedFunction: string
  selectedPath: string | null
  setSidebarPanel: (panel: SidebarPanel) => void
  setInspectorTab: (tab: InspectorTab) => void
  togglePinned: () => void
  setConsoleMode: (mode: ConsoleMode) => void
  select: (path: string | null) => void
  setSelectedFunction: (name: string) => void
  setTheme: (theme: Theme) => void
}

export const useUiStore = create<UiState>((set) => ({
  theme: getTheme(),
  sidebarPanel: null,
  inspectorTab: 'properties',
  inspectorPinned: false,
  consoleMode: 'chat',
  selectedFunction: 'Main',
  selectedPath: null,

  setSidebarPanel: (sidebarPanel) => set({ sidebarPanel }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  togglePinned: () => set((state) => ({ inspectorPinned: !state.inspectorPinned })),
  setConsoleMode: (consoleMode) => set({ consoleMode }),
  select: (selectedPath) => set({ selectedPath }),
  setSelectedFunction: (selectedFunction) => set({ selectedFunction, selectedPath: null }),
  setTheme: (theme) => {
    setTheme(theme)
    set({ theme })
  },
}))
