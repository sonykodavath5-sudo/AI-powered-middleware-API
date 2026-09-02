import { memo } from 'react'

import { SearchInput } from './SearchInput'
import { SortControls } from './SortControls'

function InsightsToolbarComponent({ visibleCount, loadedCount, totalCount }) {
  const hasMoreOnServer = totalCount > loadedCount

  return (
    <div className="toolbar">
      <SearchInput resultCount={visibleCount} />
      <SortControls />

      <p className="toolbar__count">
        Showing <strong>{visibleCount}</strong> of {loadedCount} loaded
        {hasMoreOnServer && <> · {totalCount} on the server</>}
      </p>
    </div>
  )
}

export const InsightsToolbar = memo(InsightsToolbarComponent)
