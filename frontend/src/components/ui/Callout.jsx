/** Coloured message block used for errors, clarifications and empty states. */
export function Callout({ tone = 'neutral', title, icon, children, actions }) {
  return (
    <div className={`callout callout--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <div className="callout__head">
        {icon && (
          <span className="callout__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <h3 className="callout__title">{title}</h3>
      </div>
      <div className="callout__body">{children}</div>
      {actions && <div className="callout__actions">{actions}</div>}
    </div>
  )
}
