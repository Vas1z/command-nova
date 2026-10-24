import { useState, type FormEvent, type RefObject } from 'react'
import { isMacPlatform } from '../utils'
import { SearchIcon, XIcon } from './Icons'

interface SearchBarProps {
  inputRef: RefObject<HTMLInputElement>
}

export function SearchBar({ inputRef }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const shortcut = isMacPlatform() ? '⌘ K' : 'Ctrl K'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = query.trim()
    if (!term) {
      inputRef.current?.focus()
      return
    }
    window.location.assign(`https://www.google.com/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <form className="search" role="search" onSubmit={handleSubmit}>
      <span className="search__icon">
        <SearchIcon size={20} />
      </span>
      <span className="search__prompt" aria-hidden="true">
        &gt;
      </span>
      <input
        ref={inputRef}
        className="search__input"
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (query) {
              setQuery('')
            } else {
              event.currentTarget.blur()
            }
          }
        }}
        placeholder="Поиск в Google"
        aria-label="Поиск в Google"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      <div className="search__trailing">
        {query ? (
          <button
            className="search__clear"
            type="button"
            aria-label="Очистить запрос"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          >
            <XIcon size={15} />
          </button>
        ) : (
          <kbd className="search__shortcut" aria-hidden="true">
            {shortcut}
          </kbd>
        )}
      </div>
    </form>
  )
}
