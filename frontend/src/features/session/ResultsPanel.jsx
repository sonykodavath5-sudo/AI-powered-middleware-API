import { useSelector } from 'react-redux'

import { SESSION_STATUS } from '../../constants'
import { InsightsResults } from '../insights/InsightsResults'
import {
  EmptyState,
  ResultsSkeleton,
} from '../insights/ResultsPlaceholders'
import { ClarificationNotice } from './ClarificationNotice'
import { ErrorPanel } from './ErrorPanel'
import { selectSessionError, selectSessionStatus } from './sessionSlice'

/**
 * The one place that decides which of the backend's outcomes is on screen.
 * Every branch the API can return is handled here and nowhere else.
 */
export function ResultsPanel() {
  const status = useSelector(selectSessionStatus)
  const error = useSelector(selectSessionError)

  switch (status) {
    case SESSION_STATUS.LOADING:
      return <ResultsSkeleton />
    case SESSION_STATUS.ERROR:
      return <ErrorPanel error={error} />
    case SESSION_STATUS.CLARIFICATION:
      return <ClarificationNotice />
    case SESSION_STATUS.SUCCESS:
      return <InsightsResults />
    default:
      return <EmptyState />
  }
}
