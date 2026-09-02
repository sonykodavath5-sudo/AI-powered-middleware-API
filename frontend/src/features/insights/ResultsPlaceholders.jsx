/** The two non-data states of the results pane. */

export function EmptyState() {
  return (
    <div className="placeholder">
      <p className="placeholder__title">No request yet</p>
      <p className="placeholder__body">
        Submit a prompt and the response will appear here — a list of insights,
        a request for more detail, or a structured error.
      </p>
    </div>
  )
}

export function NoMatches({ term }) {
  return (
    <div className="placeholder">
      <p className="placeholder__title">Nothing matches “{term}”</p>
      <p className="placeholder__body">
        The filter runs over the insights already loaded. If more pages are
        still on the server, load them and search again.
      </p>
    </div>
  )
}

export function ResultsSkeleton({ rows = 6 }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton__row" key={index}>
          <span className="skeleton__bar skeleton__bar--title" />
          <span className="skeleton__bar" />
          <span className="skeleton__bar skeleton__bar--short" />
        </div>
      ))}
    </div>
  )
}
