import { memo } from 'react'

import { ConfidenceMeter } from '../../components/ui/ConfidenceMeter'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
})

function formatDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormatter.format(parsed)
}

function InsightRowComponent({ insight }) {
  return (
    <tr className="row">
      <td className="row__main">
        <p className="row__title">{insight.title}</p>
        <p className="row__content">{insight.content}</p>
        <ul className="row__tags">
          {insight.tags.map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
          {insight.segment && <li className="tag tag--segment">{insight.segment}</li>}
        </ul>
      </td>
      <td>
        <span className={`pill pill--${insight.category}`}>{insight.categoryLabel}</span>
      </td>
      <td>
        <ConfidenceMeter value={insight.confidence} />
      </td>
      <td className="row__meta">
        <span className="row__source">{insight.source}</span>
        <span className="row__date">{formatDate(insight.createdAt)}</span>
      </td>
    </tr>
  )
}

/**
 * Memoized, and the reason it works is that insight objects come straight
 * out of the RTK Query cache. Filtering and sorting build a new array but
 * reuse the same objects, so re-sorting 28 rows re-renders the table shell
 * and none of the rows.
 */
export const InsightRow = memo(InsightRowComponent)
