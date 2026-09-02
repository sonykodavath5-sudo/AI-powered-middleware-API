/**
 * Label + control + error message, wired up for screen readers.
 * `children` is a render function so the field owns the ids it hands down.
 */
export function Field({ id, label, hint, error, children }) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}

      {hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}

      {error && (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
