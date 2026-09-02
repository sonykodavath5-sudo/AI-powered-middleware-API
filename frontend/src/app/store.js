import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import { apiSlice } from '../api/apiSlice'
import insightsViewReducer from '../features/insights/insightsViewSlice'
import sessionReducer from '../features/session/sessionSlice'

/**
 * Exported as a factory as well as a singleton: tests build a throwaway
 * store per case instead of sharing module state between them.
 */
export function createAppStore(preloadedState) {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      session: sessionReducer,
      insightsView: insightsViewReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
    preloadedState,
  })
}

export const store = createAppStore()

// Enables refetchOnFocus / refetchOnReconnect if they are ever switched on.
setupListeners(store.dispatch)
