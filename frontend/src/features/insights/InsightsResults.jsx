import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { ErrorPanel } from '../session/ErrorPanel'
import {
  loadNextPage,
  selectContextId,
  selectPage,
  selectPageSize,
} from '../session/sessionSlice'
import { useInsightsPageQuery } from './insightsApi'
import { InsightsTable } from './InsightsTable'
import { InsightsToolbar } from './InsightsToolbar'
import { selectSearchTerm } from './insightsViewSlice'
import { LoadMore } from './LoadMore'
import { ResultsHeader } from './ResultsHeader'
import { NoMatches, ResultsSkeleton } from './ResultsPlaceholders'
import { useVisibleInsights } from './useVisibleInsights'

/** One stable empty array, so "no data yet" never looks like a change. */
const EMPTY_INSIGHTS = []

export function InsightsResults() {
  const dispatch = useDispatch()
  const contextId = useSelector(selectContextId)
  const page = useSelector(selectPage)
  const pageSize = useSelector(selectPageSize)
  const searchTerm = useSelector(selectSearchTerm)

  // Page 1 was seeded into this cache entry by the submit mutation, so
  // mounting costs no request. Bumping `page` fetches exactly one more.
  const { insights, pagination, isFetching, error } = useInsightsPageQuery(
    { contextId, page, pageSize },
    {
      skip: !contextId,
      // Narrow the subscription: this component re-renders for these four
      // values, not for every field RTK Query tracks.
      selectFromResult: ({ data, isFetching: fetching, error: queryError }) => ({
        insights: data?.data?.insights ?? EMPTY_INSIGHTS,
        pagination: data?.data?.pagination,
        isFetching: fetching,
        error: queryError,
      }),
    },
  )

  const visible = useVisibleInsights(insights)

  const handleLoadMore = useCallback(() => {
    dispatch(loadNextPage())
  }, [dispatch])

  if (insights.length === 0 && isFetching) {
    return <ResultsSkeleton />
  }

  return (
    <section className="results">
      <ResultsHeader />

      <InsightsToolbar
        visibleCount={visible.length}
        loadedCount={insights.length}
        totalCount={pagination?.totalItems ?? insights.length}
      />

      {visible.length === 0 ? (
        <NoMatches term={searchTerm} />
      ) : (
        <InsightsTable insights={visible} />
      )}

      <LoadMore
        pagination={pagination}
        isFetching={isFetching}
        onLoadMore={handleLoadMore}
      />

      {/* A failure while paging, distinct from a failed submission. */}
      {error && <ErrorPanel error={error} />}
    </section>
  )
}
