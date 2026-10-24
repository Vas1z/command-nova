import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Site } from '../types'
import { hostnameOf } from '../utils'
import { Favicon } from './Favicon'
import { PencilIcon, TrashIcon } from './Icons'

interface TileMenuProps {
  site: Site
  position: { x: number; y: number }
  onClose: () => void
  onEdit: (site: Site) => void
  onDelete: (site: Site) => void
}

const MENU_WIDTH = 196
const MENU_HEIGHT = 158

export function TileMenu({ site, position, onClose, onEdit, onDelete }: TileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )

  const left = Math.max(12, Math.min(position.x, window.innerWidth - MENU_WIDTH - 12))
  const top = Math.max(12, Math.min(position.y, window.innerHeight - MENU_HEIGHT - 12))

  useEffect(() => {
    firstItemRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    const onViewportChange = () => onClose()

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
      previousFocus.current?.focus()
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      className="tile-popover"
      role="menu"
      aria-label={`Действия с сайтом ${site.title}`}
      style={{ left, top }}
    >
      <div className="tile-popover__head">
        <span className="tile-popover__icon">
          <Favicon url={site.url} title={site.title} size={22} />
        </span>
        <span className="tile-popover__identity">
          <span className="tile-popover__name">{site.title}</span>
          <span className="tile-popover__host">{hostnameOf(site.url)}</span>
        </span>
      </div>
      <div className="tile-popover__separator" />
      <button
        ref={firstItemRef}
        className="tile-popover__item"
        type="button"
        role="menuitem"
        onClick={() => {
          onClose()
          onEdit(site)
        }}
      >
        <PencilIcon size={16} />
        Изменить
      </button>
      <button
        className="tile-popover__item tile-popover__item--danger"
        type="button"
        role="menuitem"
        onClick={() => {
          onClose()
          onDelete(site)
        }}
      >
        <TrashIcon size={16} />
        Удалить
      </button>
    </div>,
    document.body,
  )
}
