/**
 * Store-level tests for the three outcomes the API can return, plus the
 * cache behaviour that makes "load more" cost one request.
 *
 * These drive the real store and the real RTK Query slice with only
 * `fetch` replaced, so the wiring between the mutation, the session slice
 * and the query cache is actually exercised.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAppStore } from '../../app/store'
import { SESSION_STATUS } from '../../constants'
import { insightsApi } from '../insights/insightsApi'
import { loadNextPage } from './sessionSlice'

const CONTEXT_ID = '11111111-2222-3333-4444-555555555555'
const TOTAL_ITEMS = 24

function makeInsights(page, pageSize) {
  const start = (page - 1) * pageSize
  return Array.from({ length: pageSize }, (_, offset) => ({
    id: `ins_${String(start + offset).padStart(3, '0')}`,
    title: `Insight ${start + offset}`,
    content: 'Some finding about the topic.',
    category: 'adoption',
    categoryLabel: 'Adoption',
    tags: ['growth'],
    source: 'usage-analytics',
    segment: null,
    confidence: 0.8,
    language: 'en',
    createdAt: '2026-01-01T00:00:00Z',
  }))
}

function makeSuccess(page = 1, pageSize = 10) {
  return {
    status: 'SUCCESS',
    contextId: CONTEXT_ID,
    targetLanguage: 'en',
    prompt: 'Analyse churn drivers',
    data: {
      topic: 'Churn Drivers',
      summary: `Found ${TOTAL_ITEMS} insights for “Churn Drivers”.`,
      insights: makeInsights(page, pageSize),
      pagination: {
        page,
        pageSize,
        totalItems: TOTAL_ITEMS,
        totalPages: Math.ceil(TOTAL_ITEMS / pageSize),
        hasNextPage: page < Math.ceil(TOTAL_ITEMS / pageSize),
        hasPreviousPage: page > 1,
        paginated: true,
      },
    },
    meta: {
      generatedAt: '2026-01-01T00:00:00.000Z',
      model: 'mock-insight-engine-v1',
      cached: false,
      processingTimeMs: 4,
      turnCount: 1,
    },
  }
}

const CLARIFICATION = {
  status: 'NEEDS_CLARIFICATION',
  contextId: CONTEXT_ID,
  targetLanguage: 'en',
  prompt: 'hi',
  message: 'Please provide more details',
  reasons: [{ code: 'PROMPT_TOO_SHORT', message: 'The prompt is too short.' }],
  suggestions: ['Name the product you want analysed.'],
  meta: {
    generatedAt: '2026-01-01T00:00:00.000Z',
    model: 'mock-insight-engine-v1',
    cached: false,
    processingTimeMs: 1,
    turnCount: 1,
  },
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Lets the onQueryStarted cache seeding settle before we assert on it. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const submit = (store, args = {}) =>
  store.dispatch(
    insightsApi.endpoints.submitPrompt.initiate({
      prompt: 'Analyse churn drivers',
      targetLanguage: 'en',
      pageSize: 10,
      ...args,
    }),
  )

let store
let fetchMock

beforeEach(() => {
  store = createAppStore()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('a successful submission', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse(makeSuccess()))
  })

  it('records the request and the outcome in the session slice', async () => {
    await submit(store)

    const { session } = store.getState()
    expect(session.status).toBe(SESSION_STATUS.SUCCESS)
    expect(session.contextId).toBe(CONTEXT_ID)
    expect(session.request.prompt).toBe('Analyse churn drivers')
    expect(session.request.targetLanguage).toBe('en')
    expect(session.response.topic).toBe('Churn Drivers')
    expect(session.error).toBeNull()
    expect(session.page).toBe(1)
  })

  it('seeds page one into the query cache instead of fetching it twice', async () => {
    await submit(store)
    await flush()

    const cached = insightsApi.endpoints.insightsPage.select({
      contextId: CONTEXT_ID,
      page: 1,
      pageSize: 10,
    })(store.getState())

    expect(cached.data.data.insights).toHaveLength(10)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('a clarification response', () => {
  it('is treated as a successful outcome, not an error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(CLARIFICATION))

    await submit(store, { prompt: 'hi' })

    const { session } = store.getState()
    expect(session.status).toBe(SESSION_STATUS.CLARIFICATION)
    expect(session.error).toBeNull()
    expect(session.clarification.message).toBe('Please provide more details')
    expect(session.clarification.reasons[0].code).toBe('PROMPT_TOO_SHORT')
    expect(session.clarification.suggestions).toHaveLength(1)
  })
})

describe('an error response', () => {
  it('normalizes the envelope into the session slice', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: 'INVALID_LANGUAGE',
          message: 'Target language is not supported',
          details: { supportedLanguages: ['en', 'es', 'fr', 'de'] },
        },
        400,
      ),
    )

    await submit(store, { targetLanguage: 'zz' })

    const { session } = store.getState()
    expect(session.status).toBe(SESSION_STATUS.ERROR)
    expect(session.error.code).toBe('INVALID_LANGUAGE')
    expect(session.error.status).toBe(400)
    expect(session.contextId).toBeNull()
  })

  it('handles the API being unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await submit(store)

    expect(store.getState().session.error.code).toBe('NETWORK_ERROR')
  })
})

describe('loading another page', () => {
  it('appends onto the same cache entry', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeSuccess(1, 10)))
    await submit(store)
    await flush()

    fetchMock.mockResolvedValueOnce(jsonResponse(makeSuccess(2, 10)))
    store.dispatch(loadNextPage())
    await store.dispatch(
      insightsApi.endpoints.insightsPage.initiate(
        { contextId: CONTEXT_ID, page: 2, pageSize: 10 },
        { forceRefetch: true },
      ),
    )

    const cached = insightsApi.endpoints.insightsPage.select({
      contextId: CONTEXT_ID,
      page: 2,
      pageSize: 10,
    })(store.getState())

    expect(store.getState().session.page).toBe(2)
    expect(cached.data.data.insights).toHaveLength(20)
    expect(cached.data.data.pagination.page).toBe(2)

    const ids = cached.data.data.insights.map((insight) => insight.id)
    expect(new Set(ids).size).toBe(20)

    // One POST plus one GET — no re-fetch of page one.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('starting a new request', () => {
  it('clears any search and sort left over from the previous one', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeSuccess()))

    store.dispatch({ type: 'insightsView/setSearchTerm', payload: 'churn' })
    store.dispatch({ type: 'insightsView/setSortDirection', payload: 'desc' })

    await submit(store)

    expect(store.getState().insightsView).toEqual({
      searchTerm: '',
      sortField: 'title',
      sortDirection: 'asc',
    })
  })
})
