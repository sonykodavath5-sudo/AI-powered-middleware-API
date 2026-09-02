export function Spinner({ label = 'Loading', size = 16 }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    />
  )
}
