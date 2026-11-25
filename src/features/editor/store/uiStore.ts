import { create } from 'zustand'
import { getTheme, setTheme, type Theme } from '../../../shared/theme/theme'

export type SidebarPanel = 'palette' | 'functions' | 'variables' | 'source' | 'settings' | null
export type InspectorTab = 'properties' | 'functions' | 'variables' | 'callstack' | 'source'
export type ConsoleMode = 'chat' | 'plain'

export interface LayoutState {
  railCollapsed: boolean
  railNavOpen: boolean
  paletteOpen: boolean
  sideOpen: boolean
  consoleOpen: boolean
  paletteWidth: number
  sideWidth: number
  consoleWidth: number
  consoleHeight: number
}

export const LAYOUT_DEFAULTS: LayoutState = {
  railCollapsed: false,
  railNavOpen: true,
  paletteOpen: true,
  sideOpen: true,
  consoleOpen: false,
  paletteWidth: 196,
  sideWidth: 280,
  consoleWidth: 600,
  consoleHeight: 240,
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
    return {
      railCollapsed: saved.railCollapsed ?? LAYOUT_DEFAULTS.railCollapsed,
      railNavOpen: saved.railNavOpen ?? LAYOUT_DEFAULTS.railNavOpen,
      paletteOpen: saved.paletteOpen ?? LAYOUT_DEFAULTS.paletteOpen,
      sideOpen: saved.sideOpen ?? LAYOUT_DEFAULTS.sideOpen,
      // The terminal is summoned by running or by the toolbar, never on reload.
      consoleOpen: LAYOUT_DEFAULTS.consoleOpen,
      paletteWidth: clamp(saved.paletteWidth ?? LAYOUT_DEFAULTS.paletteWidth, 170, 340),
      sideWidth: clamp(saved.sideWidth ?? LAYOUT_DEFAULTS.sideWidth, 250, 460),
      consoleWidth: clamp(saved.consoleWidth ?? LAYOUT_DEFAULTS.consoleWidth, 360, 900),
      consoleHeight: clamp(saved.consoleHeight ?? LAYOUT_DEFAULTS.consoleHeight, 160, 560),
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
    railNavOpen: state.railNavOpen,
    paletteOpen: state.paletteOpen,
    sideOpen: state.sideOpen,
    consoleOpen: state.consoleOpen,
    paletteWidth: state.paletteWidth,
    sideWidth: state.sideWidth,
    consoleWidth: state.consoleWidth,
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
  nodeCardOpen: boolean
  selectedFunction: string
  selectedPath: string | null
  setSidebarPanel: (panel: SidebarPanel) => void
  setInspectorTab: (tab: InspectorTab) => void
  togglePinned: () => void
  setConsoleMode: (mode: ConsoleMode) => void
  setCommandOpen: (open: boolean) => void
  setNodeCardOpen: (open: boolean) => void
  select: (path: string | null) => void
  setSelectedFunction: (name: string) => void
  setTheme: (theme: Theme) => void
  setLayout: (patch: Partial<LayoutState>) => void
  toggleRail: () => void
  toggleRailNav: () => void
  togglePalette: () => void
  toggleSide: () => void
  toggleConsole: () => void
  openConsole: () => void
  resetLayout: () => void
}

export const useUiStore = create<UiState>((set) => ({
  ...initialLayout,
  theme: getTheme(),
  sidebarPanel: null,
  inspectorTab: 'functions',
  inspectorPinned: false,
  consoleMode: 'chat',
  commandOpen: false,
  nodeCardOpen: true,
  selectedFunction: 'Main',
  selectedPath: null,

  setSidebarPanel: (sidebarPanel) => set({ sidebarPanel }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  togglePinned: () => set((state) => ({ inspectorPinned: !state.inspectorPinned })),
  setConsoleMode: (consoleMode) => set({ consoleMode }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setNodeCardOpen: (nodeCardOpen) => set({ nodeCardOpen }),
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
        railNavOpen: patch.railNavOpen ?? state.railNavOpen,
        paletteOpen: patch.paletteOpen ?? state.paletteOpen,
        sideOpen: patch.sideOpen ?? state.sideOpen,
        consoleOpen: patch.consoleOpen ?? state.consoleOpen,
        paletteWidth:
          patch.paletteWidth !== undefined ? clamp(patch.paletteWidth, 170, 340) : state.paletteWidth,
        sideWidth: patch.sideWidth !== undefined ? clamp(patch.sideWidth, 250, 460) : state.sideWidth,
        consoleWidth:
          patch.consoleWidth !== undefined ? clamp(patch.consoleWidth, 360, 900) : state.consoleWidth,
        consoleHeight:
          patch.consoleHeight !== undefined ? clamp(patch.consoleHeight, 160, 560) : state.consoleHeight,
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
  toggleRailNav: () =>
    set((state) => {
      const next = { ...layoutOf(state), railNavOpen: !state.railNavOpen }
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
  openConsole: () =>
    set((state) => {
      if (state.consoleOpen) return state
      const next = { ...layoutOf(state), consoleOpen: true }
      saveLayout(next)
      return next
    }),
  resetLayout: () => {
    saveLayout(LAYOUT_DEFAULTS)
    set({ ...LAYOUT_DEFAULTS })
  },
}))
