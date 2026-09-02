import { memo } from 'react'

import { InsightRow } from './InsightRow'

function InsightsTableComponent({ insights }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="visually-hidden">
          Insights returned by the AI service
        </caption>
        <thead>
          <tr>
            <th scope="col">Insight</th>
            <th scope="col">Category</th>
            <th scope="col">Confidence</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {insights.map((insight) => (
            <InsightRow key={insight.id} insight={insight} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const InsightsTable = memo(InsightsTableComponent)
