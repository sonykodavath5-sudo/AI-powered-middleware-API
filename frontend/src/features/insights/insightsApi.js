/**
 * Insight endpoints.
 *
 * Two endpoints, and the interesting part is how they cooperate:
 *
 *   submitPrompt  POST /insights            — the mutation the form calls
 *   insightsPage  GET  /insights/{context}  — pages of an existing result set
 *
 * The cache key for `insightsPage` is the context id alone, so every page of
 * a conversation lands in one cache entry and `merge` appends onto it. That
 * gives "load more" behaviour without the component ever holding a page
 * array in local state.
 *
 * The POST already returns page 1, so `onQueryStarted` seeds that straight
 * into the query cache. The result: submitting the form costs exactly one
 * request, and each "Load more" costs exactly one more.
 */

import { defaultSerializeQueryArgs } from '@reduxjs/toolkit/query'

import { apiSlice } from '../../api/apiSlice'
import { RESPONSE_STATUS } from '../../constants'

export const insightsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    submitPrompt: builder.mutation({
      query: ({ prompt, targetLanguage, contextId, page = 1, pageSize }) => ({
        url: '/insights',
        method: 'POST',
        body: {
          prompt,
          targetLanguage,
          page,
          pageSize,
          ...(contextId ? { contextId } : {}),
        },
      }),

      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data?.status !== RESPONSE_STATUS.SUCCESS) return

          // Seed page 1 into the query cache so the results view can read it
          // without issuing a second request for data we already have.
          dispatch(
            insightsApi.util.upsertQueryData(
              'insightsPage',
              { contextId: data.contextId, page: 1, pageSize: arg.pageSize },
              data,
            ),
          )
        } catch {
          // The rejected mutation is already in the store; the session slice
          // picks it up from there.
        }
      },
    }),

    insightsPage: builder.query({
      query: ({ contextId, page, pageSize }) => ({
        url: `/insights/${contextId}`,
        params: { page, pageSize },
      }),

      // One cache entry per conversation, not per page.
      serializeQueryArgs: ({ queryArgs, endpointDefinition, endpointName }) =>
        defaultSerializeQueryArgs({
          endpointName,
          endpointDefinition,
          queryArgs: { contextId: queryArgs.contextId },
        }),

      merge: (cache, incoming, { arg }) => {
        cache.status = incoming.status
        cache.meta = incoming.meta
        cache.data.summary = incoming.data.summary
        cache.data.pagination = incoming.data.pagination

        if (!arg || arg.page <= 1) {
          cache.data.insights = incoming.data.insights
          return
        }

        // Append, skipping anything already held. Guards against a double
        // "load more" click racing itself.
        const known = new Set(cache.data.insights.map((insight) => insight.id))
        for (const insight of incoming.data.insights) {
          if (!known.has(insight.id)) cache.data.insights.push(insight)
        }
      },

      // Args no longer include the page, so ask for a fetch when it changes.
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.page !== previousArg?.page,

      providesTags: (result, _error, arg) =>
        result ? [{ type: 'Insights', id: arg.contextId }] : [],
    }),

    discardContext: builder.mutation({
      query: (contextId) => ({ url: `/insights/${contextId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, contextId) => [
        { type: 'Insights', id: contextId },
      ],
    }),
  }),
})

export const {
  useSubmitPromptMutation,
  useInsightsPageQuery,
  useDiscardContextMutation,
} = insightsApi
