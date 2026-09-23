import '../css/SegmentedControl.css'

/**
 * Control segmentado (radio group en píldoras) usado en los ajustes.
 *
 * @param {{ options: Array<{ value: string, label: string, icon?: import('react').ReactNode }>,
 *           value: string, onChange: (value: string) => void, label?: string }} props
 */
export default function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={`segmented__option${value === option.value ? ' is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
