import { create } from 'zustand'
import { getTheme, setTheme, type Theme } from '../../../shared/theme/theme'

export type SidebarPanel = 'palette' | 'functions' | 'variables' | 'source' | 'settings' | null
export type InspectorTab = 'properties' | 'functions' | 'variables' | 'callstack' | 'source'
export type ConsoleMode = 'chat' | 'plain'

export interface LayoutState {
  railCollapsed: boolean
  paletteOpen: boolean
  sideOpen: boolean
  consoleOpen: boolean
  paletteWidth: number
  sideWidth: number
  consoleHeight: number
}

export const LAYOUT_DEFAULTS: LayoutState = {
  railCollapsed: false,
  paletteOpen: true,
  sideOpen: true,
  consoleOpen: true,
  paletteWidth: 196,
  sideWidth: 264,
  consoleHeight: 186,
}

const LAYOUT_KEY = 'marcoflow.layout'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function readLayout(): LayoutState {
  if (typeof localStorage === 'undefined') return LAYOUT_DEFAULTS
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    const saved = raw ? (JSON.parse(raw) as Partial<LayoutState>) : {}
    const legacyConsole = localStorage.getItem('marcoflow.console')
    return {
      railCollapsed: saved.railCollapsed ?? LAYOUT_DEFAULTS.railCollapsed,
      paletteOpen: saved.paletteOpen ?? LAYOUT_DEFAULTS.paletteOpen,
      sideOpen: saved.sideOpen ?? LAYOUT_DEFAULTS.sideOpen,
      consoleOpen: saved.consoleOpen ?? legacyConsole !== 'closed',
      paletteWidth: clamp(saved.paletteWidth ?? LAYOUT_DEFAULTS.paletteWidth, 150, 340),
      sideWidth: clamp(saved.sideWidth ?? LAYOUT_DEFAULTS.sideWidth, 220, 440),
      consoleHeight: clamp(saved.consoleHeight ?? LAYOUT_DEFAULTS.consoleHeight, 120, 420),
    }
  } catch {
    return LAYOUT_DEFAULTS
  }
}

function saveLayout(state: LayoutState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(state))
}

function layoutOf(state: LayoutState): LayoutState {
  return {
    railCollapsed: state.railCollapsed,
    paletteOpen: state.paletteOpen,
    sideOpen: state.sideOpen,
    consoleOpen: state.consoleOpen,
    paletteWidth: state.paletteWidth,
    sideWidth: state.sideWidth,
    consoleHeight: state.consoleHeight,
  }
}

const initialLayout = readLayout()

interface UiState extends LayoutState {
  theme: Theme
  sidebarPanel: SidebarPanel
  inspectorTab: InspectorTab
  inspectorPinned: boolean
  consoleMode: ConsoleMode
  commandOpen: boolean
  selectedFunction: string
  selectedPath: string | null
  setSidebarPanel: (panel: SidebarPanel) => void
  setInspectorTab: (tab: InspectorTab) => void
  togglePinned: () => void
  setConsoleMode: (mode: ConsoleMode) => void
  setCommandOpen: (open: boolean) => void
  select: (path: string | null) => void
  setSelectedFunction: (name: string) => void
  setTheme: (theme: Theme) => void
  setLayout: (patch: Partial<LayoutState>) => void
  toggleRail: () => void
  togglePalette: () => void
  toggleSide: () => void
  toggleConsole: () => void
  resetLayout: () => void
}

export const useUiStore = create<UiState>((set) => ({
  ...initialLayout,
  theme: getTheme(),
  sidebarPanel: null,
  inspectorTab: 'properties',
  inspectorPinned: false,
  consoleMode: 'chat',
  commandOpen: false,
  selectedFunction: 'Main',
  selectedPath: null,

  setSidebarPanel: (sidebarPanel) => set({ sidebarPanel }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  togglePinned: () => set((state) => ({ inspectorPinned: !state.inspectorPinned })),
  setConsoleMode: (consoleMode) => set({ consoleMode }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  select: (selectedPath) => set({ selectedPath }),
  setSelectedFunction: (selectedFunction) => set({ selectedFunction, selectedPath: null }),
  setTheme: (theme) => {
    setTheme(theme)
    set({ theme })
  },
  setLayout: (patch) =>
    set((state) => {
      const next: LayoutState = {
        railCollapsed: patch.railCollapsed ?? state.railCollapsed,
        paletteOpen: patch.paletteOpen ?? state.paletteOpen,
        sideOpen: patch.sideOpen ?? state.sideOpen,
        consoleOpen: patch.consoleOpen ?? state.consoleOpen,
        paletteWidth: patch.paletteWidth !== undefined ? clamp(patch.paletteWidth, 150, 340) : state.paletteWidth,
        sideWidth: patch.sideWidth !== undefined ? clamp(patch.sideWidth, 220, 440) : state.sideWidth,
        consoleHeight:
          patch.consoleHeight !== undefined ? clamp(patch.consoleHeight, 120, 420) : state.consoleHeight,
      }
      saveLayout(next)
      return next
    }),
  toggleRail: () =>
    set((state) => {
      const next = { ...layoutOf(state), railCollapsed: !state.railCollapsed }
      saveLayout(next)
      return next
    }),
  togglePalette: () =>
    set((state) => {
      const next = { ...layoutOf(state), paletteOpen: !state.paletteOpen }
      saveLayout(next)
      return next
    }),
  toggleSide: () =>
    set((state) => {
      const next = { ...layoutOf(state), sideOpen: !state.sideOpen }
      saveLayout(next)
      return next
    }),
  toggleConsole: () =>
    set((state) => {
      const next = { ...layoutOf(state), consoleOpen: !state.consoleOpen }
      saveLayout(next)
      return next
    }),
  resetLayout: () => {
    saveLayout(LAYOUT_DEFAULTS)
    set({ ...LAYOUT_DEFAULTS })
  },
}))
