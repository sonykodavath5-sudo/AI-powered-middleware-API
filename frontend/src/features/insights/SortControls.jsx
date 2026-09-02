import { useDispatch, useSelector } from 'react-redux'

import { SORT_DIRECTIONS, SORT_FIELDS } from '../../constants'
import {
  selectSortDirection,
  selectSortField,
  setSortDirection,
  setSortField,
} from './insightsViewSlice'

export function SortControls() {
  const dispatch = useDispatch()
  const sortField = useSelector(selectSortField)
  const sortDirection = useSelector(selectSortDirection)

  return (
    <div className="sort">
      <div className="sort__group">
        <label className="search__label" htmlFor="sort-field">
          Sort by
        </label>
        <select
          id="sort-field"
          className="input input--compact"
          value={sortField}
          onChange={(event) => dispatch(setSortField(event.target.value))}
        >
          {SORT_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sort__group">
        <label className="search__label" htmlFor="sort-direction">
          Order
        </label>
        <select
          id="sort-direction"
          className="input input--compact"
          value={sortDirection}
          onChange={(event) => dispatch(setSortDirection(event.target.value))}
        >
          {SORT_DIRECTIONS.map((direction) => (
            <option key={direction.value} value={direction.value}>
              {sortField === 'confidence'
                ? direction.value === 'asc'
                  ? 'Low → High'
                  : 'High → Low'
                : direction.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
