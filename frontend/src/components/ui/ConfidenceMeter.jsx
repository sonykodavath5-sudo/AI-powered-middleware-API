import { memo } from 'react'

/** Confidence as a bar plus its numeric value, so it reads either way. */
function ConfidenceMeterComponent({ value }) {
  const percent = Math.round((value ?? 0) * 100)
  const tone = percent >= 80 ? 'high' : percent >= 65 ? 'medium' : 'low'

  return (
    <div className="meter" title={`Confidence ${percent}%`}>
      <div
        className={`meter__track meter__track--${tone}`}
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Confidence"
      >
        <span className="meter__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="meter__value">{percent}%</span>
    </div>
  )
}

export const ConfidenceMeter = memo(ConfidenceMeterComponent)
