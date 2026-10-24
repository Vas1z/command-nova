import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { faviconUrl, hostnameOf } from '../utils'

interface FaviconProps {
  url: string
  title: string
  size?: number
  className?: string
}

type Source = 'google' | 'duckduckgo' | 'letter'

function hashHue(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 360
  }
  return hash
}

export function Favicon({ url, title, size = 32, className = '' }: FaviconProps) {
  const [source, setSource] = useState<Source>('google')

  useEffect(() => {
    setSource('google')
  }, [url])

  const hue = useMemo(() => hashHue(hostnameOf(url) || title), [title, url])
  const host = hostnameOf(url)

  if (source === 'letter') {
    return (
      <span
        className={`favicon favicon--letter ${className}`}
        style={{ '--fav-hue': hue, width: size, height: size, fontSize: size * 0.42 } as CSSProperties}
        aria-hidden="true"
      >
        {(title.trim().charAt(0) || host.charAt(0) || '·').toUpperCase()}
      </span>
    )
  }

  const src =
    source === 'google'
      ? faviconUrl(url)
      : `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`

  return (
    <img
      className={`favicon ${className}`}
      src={src}
      width={size}
      height={size}
      alt=""
      draggable={false}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setSource((current) => (current === 'google' ? 'duckduckgo' : 'letter'))}
    />
  )
}
