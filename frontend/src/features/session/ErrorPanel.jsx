import { Callout } from '../../components/ui/Callout'
import { fieldIssues } from '../../api/errors'

/**
 * Renders the structured error envelope: the code stays visible because it
 * is the thing worth quoting in a bug report.
 */
export function ErrorPanel({ error }) {
  if (!error) return null

  const issues = fieldIssues(error)
  const supported = error.details?.supportedLanguages

  return (
    <Callout tone="danger" icon="!" title={error.message}>
      <p className="callout__code">
        <code>{error.code}</code>
        {error.status ? <span className="muted"> · HTTP {error.status}</span> : null}
      </p>

      {issues.length > 0 && (
        <ul className="callout__list">
          {issues.map((issue) => (
            <li key={`${issue.field}-${issue.issue}`}>
              <strong>{issue.field}</strong> — {issue.issue}
            </li>
          ))}
        </ul>
      )}

      {Array.isArray(supported) && (
        <p className="muted">Supported languages: {supported.join(', ')}</p>
      )}
    </Callout>
  )
}
