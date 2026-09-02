/**
 * What the app is currently looking at.
 *
 * The insight list itself lives in the RTK Query cache — which is part of
 * the same store — so it is deliberately not duplicated here. Copying a
 * server-owned list into a second slice is how the two drift apart. What
 * this slice does own is the request we sent, the outcome of that request,
 * and which page we have paged up to.
 */

import { createSlice } from '@reduxjs/toolkit'

import {
  DEFAULT_LANGUAGE,
  DEFAULT_PAGE_SIZE,
  RESPONSE_STATUS,
  SESSION_STATUS,
} from '../../constants'
import { insightsApi } from '../insights/insightsApi'

const initialState = {
  /** Exactly what we sent, echoed back for the results header. */
  request: null,
  /** Server-assigned conversation id; the cache key for every page. */
  contextId: null,
  status: SESSION_STATUS.IDLE,
  /** Populated only for NEEDS_CLARIFICATION. */
  clarification: null,
  /** Populated only for a 4xx/5xx or transport failure. */
  error: null,
  /** Non-list parts of a successful response. */
  response: null,
  /** Highest page requested so far — "load more" increments it. */
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  receivedAt: null,
}

const submit = insightsApi.endpoints.submitPrompt

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    loadNextPage(state) {
      state.page += 1
    },
    resetSession() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(submit.matchPending, (state, action) => {
        const request = action.meta.arg.originalArgs ?? {}
        state.status = SESSION_STATUS.LOADING
        state.request = {
          prompt: request.prompt ?? '',
          targetLanguage: request.targetLanguage ?? DEFAULT_LANGUAGE,
          contextId: request.contextId ?? null,
        }
        state.pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE
        state.page = 1
        state.error = null
        state.clarification = null
        state.response = null
      })
      .addMatcher(submit.matchFulfilled, (state, action) => {
        const payload = action.payload
        state.contextId = payload.contextId
        state.receivedAt = new Date().toISOString()
        state.error = null

        if (payload.status === RESPONSE_STATUS.NEEDS_CLARIFICATION) {
          state.status = SESSION_STATUS.CLARIFICATION
          state.clarification = {
            message: payload.message,
            reasons: payload.reasons ?? [],
            suggestions: payload.suggestions ?? [],
          }
          return
        }

        state.status = SESSION_STATUS.SUCCESS
        state.clarification = null
        state.response = {
          topic: payload.data.topic,
          summary: payload.data.summary,
          targetLanguage: payload.targetLanguage,
          meta: payload.meta,
        }
      })
      .addMatcher(submit.matchRejected, (state, action) => {
        // `payload` is the normalized error from the base query; `error`
        // only appears when the thunk itself threw.
        state.status = SESSION_STATUS.ERROR
        state.error = action.payload ?? {
          code: 'UNKNOWN_ERROR',
          message: action.error?.message ?? 'Something went wrong.',
          details: null,
          status: null,
        }
        state.contextId = null
        state.clarification = null
        state.response = null
      })
  },
})

export const { loadNextPage, resetSession } = sessionSlice.actions
export default sessionSlice.reducer

// --- selectors -------------------------------------------------------------
// Co-located with the slice so the shape of `state.session` stays private.

export const selectSessionStatus = (state) => state.session.status
export const selectContextId = (state) => state.session.contextId
export const selectPage = (state) => state.session.page
export const selectPageSize = (state) => state.session.pageSize
export const selectSessionError = (state) => state.session.error
export const selectClarification = (state) => state.session.clarification
export const selectRequest = (state) => state.session.request
export const selectResponse = (state) => state.session.response
