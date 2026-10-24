import type { Settings, Site } from './types'

export const DEFAULT_SITES: Site[] = [
  { id: 'default-google', title: 'Google', url: 'https://www.google.com/' },
  { id: 'default-youtube', title: 'YouTube', url: 'https://www.youtube.com/' },
  { id: 'default-github', title: 'GitHub', url: 'https://github.com/' },
  { id: 'default-notion', title: 'Notion', url: 'https://www.notion.so/' },
  { id: 'default-figma', title: 'Figma', url: 'https://www.figma.com/' },
  { id: 'default-gmail', title: 'Gmail', url: 'https://mail.google.com/' },
  { id: 'default-telegram', title: 'Telegram', url: 'https://web.telegram.org/' },
  { id: 'default-spotify', title: 'Spotify', url: 'https://open.spotify.com/' },
  { id: 'default-chatgpt', title: 'ChatGPT', url: 'https://chatgpt.com/' },
]

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  sites: DEFAULT_SITES,
  theme: 'system',
  columns: 5,
  iconScale: 'md',
  showClock: true,
  showDate: true,
  clock24h: true,
  openInNewTab: false,
}

export function getDefaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    sites: DEFAULT_SITES.map((site) => ({ ...site })),
  }
}
