import { useState, type FormEvent } from 'react'
import type { Site } from '../types'
import { useDialog } from '../hooks/useDialog'
import { createId, hostnameOf, normalizeUrl, titleFromUrl } from '../utils'
import { Favicon } from './Favicon'
import { TrashIcon, XIcon } from './Icons'

interface SiteDialogProps {
  site?: Site
  onClose: () => void
  onSave: (site: Site) => void
  onDelete?: (site: Site) => void
}

export function SiteDialog({ site, onClose, onSave, onDelete }: SiteDialogProps) {
  const [title, setTitle] = useState(site?.title ?? '')
  const [url, setUrl] = useState(site?.url ?? '')
  const [error, setError] = useState('')
  const dialogRef = useDialog<HTMLDivElement>(true, onClose)
  const isEditing = Boolean(site)

  const normalizedPreview = normalizeUrl(url) ?? site?.url ?? ''
  const previewTitle = title.trim() || (normalizedPreview ? titleFromUrl(normalizedPreview) : 'Новый сайт')
  const previewHost = normalizedPreview ? hostnameOf(normalizedPreview) : 'Введите адрес сайта'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setError('Проверьте адрес: нужен сайт вида example.com или https://example.com.')
      return
    }
    const finalTitle = title.trim() || titleFromUrl(normalized)
    if (finalTitle.length > 60) {
      setError('Название длиннее 60 символов. Сократите его.')
      return
    }

    onSave({
      id: site?.id ?? createId(),
      title: finalTitle,
      url: normalized,
    })
  }

  return (
    <div
      className="modal-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="site-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-dialog-title"
        tabIndex={-1}
      >
        <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Закрыть">
          <XIcon size={18} />
        </button>

        <div className="site-dialog__preview">
          <span className="site-dialog__favicon">
            {normalizedPreview ? (
              <Favicon url={normalizedPreview} title={previewTitle} size={32} />
            ) : (
              <span className="site-dialog__placeholder" aria-hidden="true">
                {previewTitle.charAt(0)}
              </span>
            )}
          </span>
          <span className="site-dialog__identity">
            <span className="site-dialog__name">{previewTitle}</span>
            <span className="site-dialog__host">{previewHost}</span>
          </span>
        </div>

        <div className="site-dialog__heading">
          <p className="eyebrow">{isEditing ? 'Изменить сайт' : 'Новая иконка'}</p>
          <h2 id="site-dialog-title">{isEditing ? 'Настройки сайта' : 'Добавить сайт'}</h2>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">Адрес</span>
            <input
              className="field__input"
              data-autofocus
              type="text"
              inputMode="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value)
                setError('')
              }}
              placeholder="example.com"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(error)}
            />
          </label>

          <label className="field">
            <span className="field__label">Название</span>
            <input
              className="field__input"
              type="text"
              value={title}
              maxLength={60}
              onChange={(event) => {
                setTitle(event.target.value)
                setError('')
              }}
              placeholder="Можно оставить пустым"
              autoComplete="off"
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="site-dialog__actions">
            {isEditing && onDelete && site ? (
              <button
                className="text-button text-button--danger"
                type="button"
                onClick={() => onDelete(site)}
              >
                <TrashIcon size={16} />
                Удалить
              </button>
            ) : (
              <span />
            )}
            <div className="site-dialog__primary-actions">
              <button className="button button--ghost" type="button" onClick={onClose}>
                Отмена
              </button>
              <button className="button button--primary" type="submit">
                {isEditing ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
