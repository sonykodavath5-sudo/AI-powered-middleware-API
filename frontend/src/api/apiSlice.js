/**
 * The single RTK Query API definition.
 *
 * Endpoints are injected from feature folders rather than declared here, so
 * this file stays a thin transport concern and features stay self-contained.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { normalizeError } from './errors'

/**
 * Relative by default so the Vite proxy handles dev and a reverse proxy
 * handles production. Override with VITE_API_BASE_URL when the API is on
 * another origin.
 */
export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/** Wraps the transport so every failure reaches components pre-normalized. */
const baseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  if (result.error) {
    return { ...result, error: normalizeError(result.error) }
  }
  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Insights'],
  // Generated result sets are stable for a given context, so there is no
  // reason to re-fetch them just because a component remounted.
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  keepUnusedDataFor: 300,
  endpoints: () => ({}),
})
