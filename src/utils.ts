import type { Site } from './types'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `site_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Accepts "example.com", "www.example.com/path" and full http(s) URLs.
 * Returns a normalized absolute URL or null for anything unsafe/invalid.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(withProtocol)
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null
    if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const COMMON_SUBDOMAINS = new Set([
  'app',
  'beta',
  'developer',
  'docs',
  'mail',
  'open',
  'play',
  'support',
  'web',
])

/** Compact host for dense UI cards: mail.google.com → google.com. */
export function shortHostname(url: string): string {
  const host = hostnameOf(url)
  const parts = host.split('.')
  if (parts.length > 2 && COMMON_SUBDOMAINS.has(parts[0])) {
    return parts.slice(1).join('.')
  }
  return host
}

export function titleFromUrl(url: string): string {
  const host = hostnameOf(url)
  const parts = host.split('.').filter(Boolean)
  const secondLevel = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu'])
  let index = 0
  if (parts.length >= 3) {
    index = parts.length - 2
    if (secondLevel.has(parts[index]) && parts.length >= 4) index -= 1
  }
  const core = parts[index] || parts[0] || host
  return core
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    hostnameOf(url),
  )}&sz=128`
}

export function isSite(value: unknown): value is Site {
  if (!value || typeof value !== 'object') return false
  const site = value as Record<string, unknown>
  return (
    typeof site.id === 'string' &&
    typeof site.title === 'string' &&
    typeof site.url === 'string'
  )
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function formatTime(date: Date, use24h: boolean): string {
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')

  if (use24h) {
    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }

  const suffix = hours < 12 ? 'AM' : 'PM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${minutes} ${suffix}`
}

export function formatDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 5) return 'Доброй ночи'
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export function isMacPlatform(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.platform)
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'))
    reader.readAsText(file)
  })
}
