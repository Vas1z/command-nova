import { useEffect, useState } from 'react'
import type { EffectiveTheme, ThemeMode } from '../types'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function useTheme(mode: ThemeMode): EffectiveTheme {
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(() =>
    typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light',
  )

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }
    setSystemTheme(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme: EffectiveTheme = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = theme === 'dark' ? '#0b0b0d' : '#f5f5f7'
  }, [theme])

  return theme
}
