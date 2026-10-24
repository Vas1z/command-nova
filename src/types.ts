export type ThemeMode = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'
export type IconScale = 'sm' | 'md' | 'lg'

export interface Site {
  id: string
  title: string
  url: string
}

export interface Settings {
  version: 1
  sites: Site[]
  theme: ThemeMode
  /** Number of columns on desktop, 3–8. */
  columns: number
  iconScale: IconScale
  showClock: boolean
  showDate: boolean
  clock24h: boolean
  openInNewTab: boolean
}

export interface SettingsExport {
  app: 'commandnova'
  version: 1
  exportedAt: string
  settings: Settings
}

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastMessage {
  id: number
  message: string
  kind: ToastKind
  actionLabel?: string
  onAction?: () => void
}
