/**
 * How the loaded insights are presented: the search term, and the sort.
 *
 * Kept apart from `session` on purpose. Typing in the search box changes
 * this slice only, so nothing subscribed to session state re-renders.
 */

import { createSlice } from '@reduxjs/toolkit'

import { insightsApi } from './insightsApi'

const initialState = {
  searchTerm: '',
  sortField: 'title',
  sortDirection: 'asc',
}

const insightsViewSlice = createSlice({
  name: 'insightsView',
  initialState,
  reducers: {
    setSearchTerm(state, action) {
      state.searchTerm = action.payload
    },
    setSortField(state, action) {
      state.sortField = action.payload
    },
    setSortDirection(state, action) {
      state.sortDirection = action.payload
    },
    toggleSortDirection(state) {
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc'
    },
    resetView() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    // A new prompt means a new result set; carrying the old filter over
    // would hide results the user has not seen yet.
    builder.addMatcher(
      insightsApi.endpoints.submitPrompt.matchPending,
      () => initialState,
    )
  },
})

export const {
  setSearchTerm,
  setSortField,
  setSortDirection,
  toggleSortDirection,
  resetView,
} = insightsViewSlice.actions

export default insightsViewSlice.reducer

/** Stable reference unless something in the view actually changed. */
export const selectInsightsView = (state) => state.insightsView
export const selectSearchTerm = (state) => state.insightsView.searchTerm
export const selectSortField = (state) => state.insightsView.sortField
export const selectSortDirection = (state) => state.insightsView.sortDirection
