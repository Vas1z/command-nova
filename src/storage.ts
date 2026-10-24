import { getDefaultSettings } from './defaults'
import type { IconScale, Settings, SettingsExport, Site, ThemeMode } from './types'
import { clamp, createId, isSite, normalizeUrl, titleFromUrl } from './utils'

export const STORAGE_KEY = 'commandnova.settings.v1'
const MAX_SITES = 80

interface SaveResult {
  ok: boolean
  error?: string
}

export function loadSettings(): Settings {
  if (typeof localStorage === 'undefined') return getDefaultSettings()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultSettings()
    return sanitizeSettings(JSON.parse(raw))
  } catch {
    return getDefaultSettings()
  }
}

export function saveSettings(settings: Settings): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return { ok: true }
  } catch (error) {
    const isQuota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    return {
      ok: false,
      error: isQuota
        ? 'В хранилище браузера закончилось место.'
        : 'Не удалось сохранить настройки в этом браузере.',
    }
  }
}

export function buildExport(settings: Settings): SettingsExport {
  return {
    app: 'commandnova',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
  }
}

/**
 * Validates and repairs untrusted JSON (imported file or localStorage).
 * Unknown/invalid fields fall back to safe defaults.
 */
export function parseSettingsPayload(input: unknown): Settings {
  if (!input || typeof input !== 'object') {
    throw new Error('Файл не похож на резервную копию Command Nova.')
  }

  const record = input as Record<string, unknown>
  const rawSettings =
    record.settings && typeof record.settings === 'object'
      ? (record.settings as Record<string, unknown>)
      : record

  if (!('sites' in rawSettings) && !('theme' in rawSettings) && !('columns' in rawSettings)) {
    throw new Error('В файле нет настроек Command Nova.')
  }

  return sanitizeSettings(rawSettings)
}

export function sanitizeSettings(input: unknown): Settings {
  const defaults = getDefaultSettings()
  if (!input || typeof input !== 'object') return defaults
  const raw = input as Record<string, unknown>

  return {
    version: 1,
    sites: sanitizeSites(raw.sites, defaults.sites),
    theme: sanitizeTheme(raw.theme, defaults.theme),
    columns: sanitizeInteger(raw.columns, 3, 8, defaults.columns),
    iconScale: sanitizeIconScale(raw.iconScale, defaults.iconScale),
    showClock: sanitizeBoolean(raw.showClock, defaults.showClock),
    showDate: sanitizeBoolean(raw.showDate, defaults.showDate),
    clock24h: sanitizeBoolean(raw.clock24h, defaults.clock24h),
    openInNewTab: sanitizeBoolean(raw.openInNewTab, defaults.openInNewTab),
  }
}

function sanitizeSites(input: unknown, fallback: Site[]): Site[] {
  if (!Array.isArray(input)) return fallback.map((site) => ({ ...site }))

  const seenIds = new Set<string>()
  const sites: Site[] = []

  for (const item of input.slice(0, MAX_SITES)) {
    if (!isSite(item)) continue
    const url = normalizeUrl(item.url)
    if (!url) continue
    let id = item.id.trim() || createId()
    if (seenIds.has(id)) id = createId()
    seenIds.add(id)
    const title = item.title.trim().slice(0, 60) || titleFromUrl(url)
    sites.push({ id, title, url })
  }

  return sites
}

function sanitizeTheme(input: unknown, fallback: ThemeMode): ThemeMode {
  return input === 'light' || input === 'dark' || input === 'system' ? input : fallback
}

function sanitizeIconScale(input: unknown, fallback: IconScale): IconScale {
  return input === 'sm' || input === 'md' || input === 'lg' ? input : fallback
}

function sanitizeBoolean(input: unknown, fallback: boolean): boolean {
  return typeof input === 'boolean' ? input : fallback
}

function sanitizeInteger(input: unknown, min: number, max: number, fallback: number): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) return fallback
  return Math.round(clamp(input, min, max))
}
