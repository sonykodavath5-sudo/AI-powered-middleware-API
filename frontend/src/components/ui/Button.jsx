import { Spinner } from './Spinner'

export function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`button button--${variant}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      <span>{children}</span>
    </button>
  )
}
