import { useSelector } from 'react-redux'

import { Button } from '../../components/ui/Button'
import { Callout } from '../../components/ui/Callout'
import { selectClarification, selectRequest } from './sessionSlice'

function focusPromptField() {
  const field = document.getElementById('prompt')
  if (field) {
    field.focus()
    field.setSelectionRange?.(field.value.length, field.value.length)
  }
}

/**
 * NEEDS_CLARIFICATION is a successful response, not an error — the service
 * decided the prompt was not worth an AI call yet. The UI says so plainly
 * and hands back the reasons it gave.
 */
export function ClarificationNotice() {
  const clarification = useSelector(selectClarification)
  const request = useSelector(selectRequest)

  if (!clarification) return null

  return (
    <Callout
      tone="warning"
      icon="?"
      title={clarification.message}
      actions={
        <Button variant="secondary" onClick={focusPromptField}>
          Refine the prompt
        </Button>
      }
    >
      {request?.prompt && (
        <p className="quoted">“{request.prompt}”</p>
      )}

      {clarification.reasons.length > 0 && (
        <>
          <p className="callout__lead">Why the service asked:</p>
          <ul className="callout__list">
            {clarification.reasons.map((reason) => (
              <li key={reason.code}>
                {reason.message} <code>{reason.code}</code>
              </li>
            ))}
          </ul>
        </>
      )}

      {clarification.suggestions.length > 0 && (
        <>
          <p className="callout__lead">What would help:</p>
          <ul className="callout__list">
            {clarification.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </>
      )}
    </Callout>
  )
}
