import { useEffect, useState } from 'react'
import { formatDate, formatTime, greetingFor } from '../utils'

interface ClockProps {
  showClock: boolean
  showDate: boolean
  clock24h: boolean
}

export function Clock({ showClock, showDate, clock24h }: ClockProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeout: number | undefined

    const scheduleNextMinute = () => {
      const remaining = 60_000 - (Date.now() % 60_000) + 30
      timeout = window.setTimeout(() => {
        setNow(new Date())
        scheduleNextMinute()
      }, remaining)
    }

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (timeout) window.clearTimeout(timeout)
      setNow(new Date())
      scheduleNextMinute()
    }

    scheduleNextMinute()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timeout) window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  if (!showClock && !showDate) return null

  const time = formatTime(now, clock24h)
  const [clock, suffix] = time.split(' ')

  return (
    <section className="clock" aria-label="Текущие дата и время">
      {showClock && <p className="clock__greeting">{greetingFor(now)}</p>}
      {showClock && (
        <time className="clock__time" dateTime={now.toISOString()} aria-live="off">
          {clock}
          {suffix && <span className="clock__suffix">{suffix}</span>}
        </time>
      )}
      {showDate && (
        <p className="clock__date">
          <time dateTime={now.toISOString().slice(0, 10)}>{formatDate(now)}</time>
        </p>
      )}
    </section>
  )
}
