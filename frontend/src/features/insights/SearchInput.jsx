import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { SEARCH_DEBOUNCE_MS } from '../../constants'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { selectSearchTerm, setSearchTerm } from './insightsViewSlice'

/**
 * The debounce lives here, and this is the only component that re-renders
 * while someone is typing. The store — and therefore the table — hears the
 * term once, after the keystrokes stop.
 */
export function SearchInput({ resultCount }) {
  const dispatch = useDispatch()
  const storedTerm = useSelector(selectSearchTerm)

  const [text, setText] = useState(storedTerm)
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS)

  // What the store last heard from us, so we can tell our own updates apart
  // from an external reset (a new prompt clears the view slice).
  const lastSyncedRef = useRef(storedTerm)

  useEffect(() => {
    if (debounced !== lastSyncedRef.current) {
      lastSyncedRef.current = debounced
      dispatch(setSearchTerm(debounced))
    }
  }, [debounced, dispatch])

  useEffect(() => {
    if (storedTerm !== lastSyncedRef.current) {
      lastSyncedRef.current = storedTerm
      setText(storedTerm)
    }
  }, [storedTerm])

  const isPending = text !== storedTerm

  return (
    <div className="search">
      <label className="search__label" htmlFor="insight-search">
        Search
      </label>
      <div className="search__control">
        <input
          id="insight-search"
          type="search"
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Filter by text, category, tag or source"
          autoComplete="off"
        />
        {text && (
          <button
            type="button"
            className="search__clear"
            onClick={() => setText('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <p className="search__status" aria-live="polite">
        {isPending
          ? 'Filtering…'
          : storedTerm
            ? `${resultCount} matching`
            : 'No filter applied'}
      </p>
    </div>
  )
}
