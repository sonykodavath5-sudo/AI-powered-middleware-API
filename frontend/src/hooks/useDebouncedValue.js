import { useEffect, useState } from 'react'

/**
 * Returns `value` only after it has stopped changing for `delay` ms.
 *
 * Used by the search box: the input itself stays fully responsive on every
 * keystroke, while the store — and therefore the list — only hears about
 * the term once typing settles.
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (value === debounced) return undefined
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay, debounced])

  return debounced
}
