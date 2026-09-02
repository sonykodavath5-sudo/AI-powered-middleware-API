import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { selectInsightsView } from './insightsViewSlice'
import { selectVisibleInsights } from './selectors'

/**
 * The list as it should be rendered: filtered by the search term, then
 * sorted. Two layers of memoization on purpose — `useMemo` skips the call
 * entirely when neither input changed, and `createSelector` skips the work
 * when a different component asks for the same combination.
 */
export function useVisibleInsights(insights) {
  const view = useSelector(selectInsightsView)
  return useMemo(() => selectVisibleInsights(insights, view), [insights, view])
}
