import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type { IconScale, Site } from '../types'
import { shortHostname } from '../utils'
import { Favicon } from './Favicon'
import { GripIcon, MoreIcon, PlusIcon } from './Icons'

interface SiteGridProps {
  sites: Site[]
  columns: number
  iconScale: IconScale
  openInNewTab: boolean
  onOpenMenu: (site: Site, position: { x: number; y: number }) => void
  onAdd: () => void
  onReorder: (from: number, to: number) => void
}

/**
 * The drag handle sits in the top-left corner of a large tile. Comparing the
 * whole tile's centre to other tiles can make the item jump an entire row down,
 * because the centre is ~60×50 px away from the pointer. While dragging with a
 * pointer, only accept the tile that is actually under the cursor. Keyboard
 * sorting keeps the default closest-centre behaviour.
 */
const pointerAwareCollision: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) return closestCenter(args)
  return pointerWithin(args)
}

export function SiteGrid({
  sites,
  columns,
  iconScale,
  openInNewTab,
  onOpenMenu,
  onAdd,
  onReorder,
}: SiteGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [activeDrag, setActiveDrag] = useState<{ site: Site; width: number } | null>(null)

  const gridStyle = {
    '--grid-columns': columns,
    '--grid-max': `${Math.min(columns, 8) * 128}px`,
  } as CSSProperties

  const totalTiles = sites.length + 1
  const addTileClasses = [
    'site-tile',
    'add-tile',
    totalTiles % columns === 1 ? 'add-tile--center-desktop' : '',
    totalTiles % 4 === 1 ? 'add-tile--center-tablet' : '',
    totalTiles % 3 === 1 ? 'add-tile--center-mobile' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const addTileStyle = {
    '--center-desktop': Math.ceil(columns / 2),
    '--center-tablet': 2,
    '--center-mobile': 2,
  } as CSSProperties

  function handleDragStart(event: DragStartEvent) {
    const site = sites.find((item) => item.id === event.active.id)
    if (!site) return
    const width = event.active.rect.current.initial?.width ?? 116
    setActiveDrag({ site, width })
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = sites.findIndex((site) => site.id === active.id)
    const to = sites.findIndex((site) => site.id === over.id)
    if (from !== -1 && to !== -1) onReorder(from, to)
  }

  return (
    <section className="sites" aria-label="Любимые сайты" data-count={sites.length}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerAwareCollision}
        autoScroll={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <SortableContext items={sites.map((site) => site.id)} strategy={rectSortingStrategy}>
          <div className={`site-grid icon-scale-${iconScale}`} style={gridStyle}>
            {sites.map((site) => (
              <SortableSite
                key={site.id}
                site={site}
                openInNewTab={openInNewTab}
                onOpenMenu={onOpenMenu}
              />
            ))}
            <button
              className={addTileClasses}
              type="button"
              style={addTileStyle}
              onClick={onAdd}
            >
              <span className="site-icon add-tile__icon" aria-hidden="true">
                <PlusIcon size={23} />
              </span>
              <span className="site-copy">
                <span className="site-title">Добавить</span>
              </span>
            </button>
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 190, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
          {activeDrag ? (
            <div className="drag-card" style={{ width: activeDrag.width }}>
              <span className="site-icon drag-card__icon">
                <Favicon url={activeDrag.site.url} title={activeDrag.site.title} size={32} />
              </span>
              <span className="site-copy">
                <span className="site-title">{activeDrag.site.title}</span>
                <span className="site-domain">{shortHostname(activeDrag.site.url)}</span>
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}

interface SortableSiteProps {
  site: Site
  openInNewTab: boolean
  onOpenMenu: (site: Site, position: { x: number; y: number }) => void
}

function SortableSite({ site, openInNewTab, onOpenMenu }: SortableSiteProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: site.id })
  const wasDragging = useRef(false)

  useEffect(() => {
    if (isDragging) {
      wasDragging.current = true
      return
    }
    if (!wasDragging.current) return
    const timeout = window.setTimeout(() => {
      wasDragging.current = false
    }, 260)
    return () => window.clearTimeout(timeout)
  }, [isDragging])

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function openMenuFromButton(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    const buttonRect = event.currentTarget.getBoundingClientRect()
    const shell = event.currentTarget.closest('.site-tile-shell')
    const shellRect = shell?.getBoundingClientRect()
    onOpenMenu(site, {
      x: buttonRect.right - 188,
      y: (shellRect?.bottom ?? buttonRect.bottom) + 8,
    })
  }

  function openMenuFromContext(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    onOpenMenu(site, { x: event.clientX, y: event.clientY })
  }

  return (
    <div
      ref={setNodeRef}
      className={`site-tile-shell${isDragging ? ' is-dragging' : ''}`}
      style={style}
      onContextMenu={openMenuFromContext}
    >
      <a
        className="site-tile"
        href={site.url}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noreferrer noopener' : undefined}
        draggable={false}
        onClick={(event) => {
          if (wasDragging.current) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
      >
        <span className="site-icon">
          <Favicon url={site.url} title={site.title} size={30} />
          <span className="site-icon__glow" aria-hidden="true" />
        </span>
        <span className="site-copy">
          <span className="site-title" title={site.title}>
            {site.title}
          </span>
          <span className="site-domain">{shortHostname(site.url)}</span>
        </span>
      </a>

      <button
        ref={setActivatorNodeRef}
        type="button"
        className="tile-control tile-handle"
        aria-label={`Перетащить «${site.title}»`}
        title="Перетащить"
        {...attributes}
        {...listeners}
      >
        <GripIcon size={14} />
      </button>

      <button
        type="button"
        className="tile-control tile-menu"
        aria-label={`Действия с «${site.title}»`}
        title="Изменить или удалить"
        onClick={openMenuFromButton}
      >
        <MoreIcon size={16} />
      </button>
    </div>
  )
}
