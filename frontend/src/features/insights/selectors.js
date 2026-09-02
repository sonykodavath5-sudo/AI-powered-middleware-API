/**
 * Filtering and sorting for the loaded insight list.
 *
 * Written as plain functions first and memoized second, so the rules can be
 * unit-tested without a store. `selectVisibleInsights` is the memoized entry
 * point the UI uses; it recomputes only when the list or the view changes,
 * not on every render.
 */

import { createSelector } from '@reduxjs/toolkit'

/** Locale-aware so "Español" sorts sensibly, and "item 2" precedes "item 10". */
const collator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
})

/** Strip accents and case so "movil" finds "móvil". */
export function foldText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * The searchable text for one insight, cached against the object itself.
 * Insight objects are frozen by RTK Query, so an entry stays valid for the
 * lifetime of the object and every keystroke after the first is a lookup.
 */
const haystackCache = new WeakMap()

export function buildHaystack(insight) {
  const cached = haystackCache.get(insight)
  if (cached !== undefined) return cached

  const haystack = foldText(
    [
      insight.title,
      insight.content,
      insight.category,
      insight.categoryLabel,
      insight.source,
      insight.segment,
      Array.isArray(insight.tags) ? insight.tags.join(' ') : '',
    ]
      .filter(Boolean)
      .join(' '),
  )

  haystackCache.set(insight, haystack)
  return haystack
}

/** Every whitespace-separated term must appear somewhere in the insight. */
export function matchesSearch(insight, terms) {
  if (terms.length === 0) return true
  const haystack = buildHaystack(insight)
  return terms.every((term) => haystack.includes(term))
}

export function filterInsights(insights, searchTerm) {
  const terms = foldText(searchTerm).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return insights
  return insights.filter((insight) => matchesSearch(insight, terms))
}

export function compareInsights(a, b, field, direction) {
  const sign = direction === 'desc' ? -1 : 1

  if (field === 'confidence') {
    return sign * ((a.confidence ?? 0) - (b.confidence ?? 0))
  }

  const result = collator.compare(a?.[field] ?? '', b?.[field] ?? '')
  // Ties fall back to id so the order is stable across renders.
  return sign * (result !== 0 ? result : collator.compare(a?.id ?? '', b?.id ?? ''))
}

export function sortInsights(insights, field, direction) {
  return [...insights].sort((a, b) => compareInsights(a, b, field, direction))
}

/**
 * insights + view -> what to render.
 * `createSelector` keeps the last result, so re-rendering for an unrelated
 * reason does not re-run the sort.
 */
export const selectVisibleInsights = createSelector(
  [
    (insights) => insights,
    (_insights, view) => view.searchTerm,
    (_insights, view) => view.sortField,
    (_insights, view) => view.sortDirection,
  ],
  (insights, searchTerm, sortField, sortDirection) =>
    sortInsights(filterInsights(insights, searchTerm), sortField, sortDirection),
)
