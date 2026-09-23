import '../css/Spinner.css'

export default function Spinner({ size = 'sm', label }) {
  return (
    <span
      className={`spinner spinner--${size}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    />
  )
}
