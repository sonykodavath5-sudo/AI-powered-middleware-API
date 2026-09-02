import { memo } from 'react'
import { useSelector } from 'react-redux'

import { selectRequest, selectResponse } from '../session/sessionSlice'

/**
 * Reads its own state instead of taking props, so re-rendering the list
 * around it costs nothing — `memo` with no props never re-renders.
 */
function ResultsHeaderComponent() {
  const response = useSelector(selectResponse)
  const request = useSelector(selectRequest)

  if (!response) return null

  const { meta } = response

  return (
    <header className="results__header">
      <div className="results__headline">
        <h2 className="results__title">{response.summary}</h2>
        {request?.prompt && <p className="quoted">“{request.prompt}”</p>}
      </div>

      <dl className="results__meta">
        <div>
          <dt>Language</dt>
          <dd>{response.targetLanguage}</dd>
        </div>
        <div>
          <dt>Served from</dt>
          <dd>{meta.cached ? 'cache' : 'AI service'}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{meta.model}</dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd>{meta.processingTimeMs} ms</dd>
        </div>
        <div>
          <dt>Turn</dt>
          <dd>{meta.turnCount}</dd>
        </div>
      </dl>
    </header>
  )
}

export const ResultsHeader = memo(ResultsHeaderComponent)
