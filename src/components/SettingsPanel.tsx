import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { IconScale, Settings, ThemeMode } from '../types'
import { useDialog } from '../hooks/useDialog'
import {
  ClockIcon,
  DownloadIcon,
  GridIcon,
  LinkIcon,
  MonitorIcon,
  MoonIcon,
  ResetIcon,
  SunIcon,
  UploadIcon,
  XIcon,
} from './Icons'

interface SettingsPanelProps {
  settings: Settings
  onClose: () => void
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  onImport: (file: File) => Promise<void>
  onExport: () => void
  onReset: () => void
}

export function SettingsPanel({
  settings,
  onClose,
  onChange,
  onImport,
  onExport,
  onReset,
}: SettingsPanelProps) {
  const panelRef = useDialog<HTMLElement>(true, onClose)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const themeOptions: { value: ThemeMode; label: string; icon: ReactNode }[] = [
    { value: 'light', label: 'Светлая', icon: <SunIcon size={15} /> },
    { value: 'dark', label: 'Тёмная', icon: <MoonIcon size={15} /> },
    { value: 'system', label: 'Авто', icon: <MonitorIcon size={15} /> },
  ]

  const scaleOptions: { value: IconScale; label: string }[] = [
    { value: 'sm', label: 'Мелкие' },
    { value: 'md', label: 'Средние' },
    { value: 'lg', label: 'Крупные' },
  ]

  async function handleImport(file: File) {
    setImporting(true)
    try {
      await onImport(file)
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  return (
    <div className="settings-layer">
      <div className="settings-backdrop" onMouseDown={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
      >
        <header className="settings-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2 id="settings-title">Настройки</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Закрыть настройки"
            data-autofocus
          >
            <XIcon size={18} />
          </button>
        </header>

        <div className="settings-body">
          <section className="settings-section">
            <div className="settings-section__title">
              <SunIcon size={17} />
              <h3>Тема</h3>
            </div>
            <Segmented
              label="Тема оформления"
              value={settings.theme}
              options={themeOptions}
              onChange={(value) => onChange('theme', value)}
            />
            <p className="settings-note">«Авто» следует настройкам macOS или Windows.</p>
          </section>

          <section className="settings-section">
            <div className="settings-section__title">
              <GridIcon size={17} />
              <h3>Сетка</h3>
            </div>
            <RangeControl
              label="Колонок на компьютере"
              value={settings.columns}
              min={3}
              max={8}
              step={1}
              display={`${settings.columns}`}
              onChange={(value) => onChange('columns', value)}
            />
            <div className="settings-row settings-row--stacked">
              <span className="settings-row__label">Размер иконок</span>
              <Segmented
                label="Размер иконок"
                value={settings.iconScale}
                options={scaleOptions}
                onChange={(value) => onChange('iconScale', value)}
              />
            </div>
            <p className="settings-note">На телефоне и планшете сетка адаптируется автоматически.</p>
          </section>

          <section className="settings-section">
            <div className="settings-section__title">
              <ClockIcon size={17} />
              <h3>Часы</h3>
            </div>
            <ToggleRow
              label="Показывать часы"
              checked={settings.showClock}
              onChange={(value) => onChange('showClock', value)}
            />
            <ToggleRow
              label="Показывать дату"
              checked={settings.showDate}
              onChange={(value) => onChange('showDate', value)}
            />
            <ToggleRow
              label="24-часовой формат"
              checked={settings.clock24h}
              onChange={(value) => onChange('clock24h', value)}
              disabled={!settings.showClock}
            />
          </section>

          <section className="settings-section">
            <div className="settings-section__title">
              <LinkIcon size={17} />
              <h3>Поведение</h3>
            </div>
            <ToggleRow
              label="Открывать сайты в новой вкладке"
              checked={settings.openInNewTab}
              onChange={(value) => onChange('openInNewTab', value)}
            />
          </section>

          <section className="settings-section settings-section--data">
            <div className="settings-section__title">
              <DownloadIcon size={17} />
              <h3>Данные</h3>
            </div>
            <p className="settings-note settings-note--before-actions">
              Резервная копия содержит сайты, тему, часы и настройки сетки.
            </p>
            <div className="data-actions">
              <button className="button button--soft" type="button" onClick={onExport}>
                <DownloadIcon size={16} />
                Экспорт
              </button>
              <button
                className="button button--soft"
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
              >
                <UploadIcon size={16} />
                {importing ? 'Импорт…' : 'Импорт'}
              </button>
            </div>
            <input
              ref={importInputRef}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleImport(file)
              }}
            />

            {!confirmReset ? (
              <button
                className="text-button text-button--danger reset-button"
                type="button"
                onClick={() => setConfirmReset(true)}
              >
                <ResetIcon size={15} />
                Сбросить настройки
              </button>
            ) : (
              <div className="reset-confirm" role="alertdialog" aria-label="Подтверждение сброса">
                <p>Вернуть всё к исходному состоянию? Сайты тоже будут сброшены.</p>
                <div>
                  <button
                    className="button button--compact"
                    type="button"
                    onClick={() => setConfirmReset(false)}
                  >
                    Отмена
                  </button>
                  <button
                    className="button button--danger"
                    type="button"
                    onClick={() => {
                      onReset()
                      setConfirmReset(false)
                    }}
                  >
                    Сбросить
                  </button>
                </div>
              </div>
            )}
          </section>

          <p className="autosave-note">
            <span className="autosave-note__dot" />
            Все изменения сохраняются автоматически
          </p>
          <p className="version-note">Command Nova 1.2 · Firefox, Chrome и Chromium</p>
        </div>
      </aside>
    </div>
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T) => void
}

function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segmented__item${option.value === value ? ' is-active' : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

interface ToggleRowProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleRow({ label, checked, onChange, disabled = false }: ToggleRowProps) {
  return (
    <div className={`settings-row${disabled ? ' is-disabled' : ''}`}>
      <span className="settings-row__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  )
}

interface RangeControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: RangeControlProps) {
  const filled = ((value - min) / (max - min)) * 100
  return (
    <label className="range-row">
      <span className="range-row__head">
        <span>{label}</span>
        <span className="range-row__value">{display}</span>
      </span>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--range-fill': `${filled}%` } as CSSProperties}
        aria-label={label}
      />
    </label>
  )
}
