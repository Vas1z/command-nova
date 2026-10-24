import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock } from './components/Clock'
import { GripIcon, MoonIcon, SlidersIcon, SunIcon } from './components/Icons'
import { SearchBar } from './components/SearchBar'
import { SettingsPanel } from './components/SettingsPanel'
import { SiteDialog } from './components/SiteDialog'
import { SiteGrid } from './components/SiteGrid'
import { TileMenu } from './components/TileMenu'
import { Toast } from './components/Toast'
import { getDefaultSettings } from './defaults'
import { useTheme } from './hooks/useTheme'
import {
  STORAGE_KEY,
  buildExport,
  loadSettings,
  parseSettingsPayload,
  sanitizeSettings,
  saveSettings,
} from './storage'
import type { Settings, Site, ToastKind, ToastMessage } from './types'
import { downloadJson, isMacPlatform, moveItem, readTextFile } from './utils'

interface SiteDialogState {
  site?: Site
}

interface MenuState {
  siteId: string
  x: number
  y: number
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [siteDialog, setSiteDialog] = useState<SiteDialogState | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const toastIdRef = useRef(0)

  const effectiveTheme = useTheme(settings.theme)
  const shortcut = isMacPlatform() ? '⌘ K' : 'Ctrl K'

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }))
    },
    [],
  )

  const notify = useCallback(
    (
      message: string,
      kind: ToastKind = 'info',
      actionLabel?: string,
      onAction?: () => void,
    ) => {
      toastIdRef.current += 1
      setToast({
        id: toastIdRef.current,
        message,
        kind,
        actionLabel,
        onAction,
      })
    },
    [],
  )

  const closeToast = useCallback(() => setToast(null), [])

  // Debounced autosave. Sites and appearance settings are persisted.  
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const result = saveSettings(settings)
      if (!result.ok) notify(result.error ?? 'Не удалось сохранить настройки.', 'error')
    }, 260)
    return () => window.clearTimeout(timeout)
  }, [settings, notify])

  // Keep multiple open new-tab pages in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const next = sanitizeSettings(JSON.parse(event.newValue))
        setSettings((current) =>
          JSON.stringify(current) === JSON.stringify(next) ? current : next,
        )
      } catch {
        // Ignore malformed data from another context; this page stays intact.
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (settingsOpen || siteDialog) return
      const target = event.target as HTMLElement | null
      const isTyping = Boolean(
        target?.closest('input, textarea, select, [contenteditable="true"]'),
      )
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else if (event.key === '/' && !isTyping) {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [settingsOpen, siteDialog])

  const activeMenuSite = menu
    ? settings.sites.find((site) => site.id === menu.siteId)
    : undefined

  function handleReorder(from: number, to: number) {
    setSettings((current) => ({
      ...current,
      sites: moveItem(current.sites, from, to),
    }))
  }

  function handleSaveSite(site: Site) {
    const isEditing = Boolean(siteDialog?.site)
    setSettings((current) => {
      const existingIndex = current.sites.findIndex((item) => item.id === site.id)
      if (existingIndex === -1) {
        return { ...current, sites: [...current.sites, site] }
      }
      const sites = [...current.sites]
      sites[existingIndex] = site
      return { ...current, sites }
    })
    setSiteDialog(null)
    notify(isEditing ? 'Сайт обновлён' : 'Сайт добавлен', 'success')
  }

  function handleDeleteSite(site: Site) {
    const index = settings.sites.findIndex((item) => item.id === site.id)
    if (index === -1) return
    setMenu(null)
    setSiteDialog(null)
    setSettings((current) => ({
      ...current,
      sites: current.sites.filter((item) => item.id !== site.id),
    }))
    notify(`«${site.title}» удалён`, 'info', 'Вернуть', () => {
      setSettings((current) => {
        if (current.sites.some((item) => item.id === site.id)) return current
        const sites = [...current.sites]
        sites.splice(Math.min(index, sites.length), 0, site)
        return { ...current, sites }
      })
    })
  }

  async function handleImport(file: File): Promise<void> {
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Файл настроек слишком большой.')
      }
      const text = await readTextFile(file)
      const parsed = parseSettingsPayload(JSON.parse(text))
      setSettings(parsed)
      setMenu(null)
      notify('Настройки импортированы', 'success')
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось импортировать настройки.',
        'error',
      )
    }
  }

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10)
    downloadJson(buildExport(settings), `command-nova-settings-${date}.json`)
    notify('Файл настроек сохранён', 'success')
  }

  function handleReset() {
    setSettings(getDefaultSettings())
    setMenu(null)
    setSiteDialog(null)
    notify('Настройки сброшены', 'success')
  }

  return (
    <div className="app">
      <div className="page">
        <header className="topbar">
          <div className="brand" aria-label="Command Nova">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__name">command nova</span>
            <span className="brand__suffix" aria-hidden="true">
              / workspace
            </span>
          </div>
          <div className="dev-status">
            <span className="dev-status__dot" aria-hidden="true" />
            <span>workspace</span>
            <span className="dev-status__separator" aria-hidden="true">
              /
            </span>
            <span>{settings.sites.length} links</span>
            <kbd>{shortcut}</kbd>
          </div>
        </header>

        <main className="main">
          <div className="hero">
            <Clock
              showClock={settings.showClock}
              showDate={settings.showDate}
              clock24h={settings.clock24h}
            />
            <SearchBar inputRef={searchInputRef} />
          </div>

          <SiteGrid
            sites={settings.sites}
            columns={settings.columns}
            iconScale={settings.iconScale}
            openInNewTab={settings.openInNewTab}
            onOpenMenu={(site, position) => {
              setMenu({ siteId: site.id, x: position.x, y: position.y })
            }}
            onAdd={() => {
              setMenu(null)
              setSiteDialog({})
            }}
            onReorder={handleReorder}
          />
        </main>

        <footer className="footer">
          <p className="footer__hint">
            <span className="footer__keys">
              <kbd>{shortcut}</kbd>
            </span>
            <span>поиск</span>
            <span className="footer__separator" aria-hidden="true">
              ·
            </span>
            <GripIcon size={12} />
            <span>перетащите, чтобы изменить порядок</span>
          </p>

          <div className="dock" aria-label="Быстрые настройки">
            <button
              className="dock__icon-button"
              type="button"
              onClick={() => updateSetting('theme', effectiveTheme === 'dark' ? 'light' : 'dark')}
              aria-label={
                effectiveTheme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
              }
              title={effectiveTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {effectiveTheme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>
            <span className="dock__divider" aria-hidden="true" />
            <button
              className="dock__settings"
              type="button"
              onClick={() => {
                setMenu(null)
                setSettingsOpen(true)
              }}
              aria-label="Открыть настройки"
            >
              <SlidersIcon size={17} />
              <span>Настройки</span>
            </button>
          </div>
        </footer>
      </div>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onChange={updateSetting}
          onImport={handleImport}
          onExport={handleExport}
          onReset={handleReset}
        />
      )}

      {siteDialog && (
        <SiteDialog
          site={siteDialog.site}
          onClose={() => setSiteDialog(null)}
          onSave={handleSaveSite}
          onDelete={handleDeleteSite}
        />
      )}

      {menu && activeMenuSite && (
        <TileMenu
          site={activeMenuSite}
          position={{ x: menu.x, y: menu.y }}
          onClose={() => setMenu(null)}
          onEdit={(site) => {
            setMenu(null)
            setSiteDialog({ site })
          }}
          onDelete={handleDeleteSite}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}
