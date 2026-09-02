import { describe, expect, it } from 'vitest'

import {
  filterInsights,
  foldText,
  selectVisibleInsights,
  sortInsights,
} from './selectors'

const insight = (overrides) => ({
  id: 'ins_000',
  title: 'Adoption trend',
  content: 'Weekly usage grew.',
  category: 'adoption',
  categoryLabel: 'Adoption',
  tags: ['growth'],
  source: 'usage-analytics',
  segment: null,
  confidence: 0.7,
  language: 'en',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

const ADOPTION = insight({ id: 'a', title: 'Adoption trend', confidence: 0.9 })
const CHURN = insight({
  id: 'b',
  title: 'Churn risk',
  content: 'Accounts churn faster.',
  category: 'risk',
  categoryLabel: 'Riesgo',
  tags: ['churn', 'retention'],
  source: 'lifecycle-model',
  confidence: 0.5,
})
const MOBILE = insight({
  id: 'c',
  title: 'Sesiones móviles',
  content: 'El uso móvil creció.',
  segment: 'mobile sessions',
  confidence: 0.7,
})

const ALL = [ADOPTION, CHURN, MOBILE]

describe('foldText', () => {
  it('strips accents and case', () => {
    expect(foldText('Móvil')).toBe('movil')
    expect(foldText('ÉCART')).toBe('ecart')
  })

  it('survives null and undefined', () => {
    expect(foldText(null)).toBe('')
    expect(foldText(undefined)).toBe('')
  })
})

describe('filterInsights', () => {
  it('returns the original array when there is no term', () => {
    expect(filterInsights(ALL, '')).toBe(ALL)
    expect(filterInsights(ALL, '   ')).toBe(ALL)
  })

  it('matches on title', () => {
    expect(filterInsights(ALL, 'churn').map((i) => i.id)).toEqual(['b'])
  })

  it('matches on content', () => {
    expect(filterInsights(ALL, 'faster').map((i) => i.id)).toEqual(['b'])
  })

  it('matches on metadata: tags, source, category and segment', () => {
    expect(filterInsights(ALL, 'lifecycle-model').map((i) => i.id)).toEqual(['b'])
    expect(filterInsights(ALL, 'retention').map((i) => i.id)).toEqual(['b'])
    expect(filterInsights(ALL, 'riesgo').map((i) => i.id)).toEqual(['b'])
    expect(filterInsights(ALL, 'mobile sessions').map((i) => i.id)).toEqual(['c'])
  })

  it('ignores case and accents', () => {
    expect(filterInsights(ALL, 'MOVIL').map((i) => i.id)).toEqual(['c'])
  })

  it('requires every term to match', () => {
    expect(filterInsights(ALL, 'churn accounts').map((i) => i.id)).toEqual(['b'])
    expect(filterInsights(ALL, 'churn adoption')).toEqual([])
  })
})

describe('sortInsights', () => {
  it('sorts A to Z by title', () => {
    expect(sortInsights(ALL, 'title', 'asc').map((i) => i.title)).toEqual([
      'Adoption trend',
      'Churn risk',
      'Sesiones móviles',
    ])
  })

  it('sorts Z to A by title', () => {
    expect(sortInsights(ALL, 'title', 'desc').map((i) => i.title)).toEqual([
      'Sesiones móviles',
      'Churn risk',
      'Adoption trend',
    ])
  })

  it('sorts by content', () => {
    expect(sortInsights(ALL, 'content', 'asc')[0].id).toBe('b')
  })

  it('sorts confidence numerically, not as text', () => {
    expect(sortInsights(ALL, 'confidence', 'desc').map((i) => i.confidence)).toEqual([
      0.9, 0.7, 0.5,
    ])
  })

  it('does not mutate its input', () => {
    const original = [...ALL]
    sortInsights(ALL, 'title', 'desc')
    expect(ALL).toEqual(original)
  })

  it('keeps the same objects, so memoized rows stay memoized', () => {
    const sorted = sortInsights(ALL, 'title', 'desc')
    expect(sorted).toContain(ADOPTION)
  })
})

describe('selectVisibleInsights', () => {
  const view = { searchTerm: '', sortField: 'title', sortDirection: 'asc' }

  it('filters and then sorts', () => {
    const result = selectVisibleInsights(ALL, {
      ...view,
      searchTerm: 'churn',
      sortDirection: 'desc',
    })
    expect(result.map((i) => i.id)).toEqual(['b'])
  })

  it('sorts everything when no filter is applied', () => {
    const result = selectVisibleInsights(ALL, { ...view, sortDirection: 'desc' })
    expect(result.map((i) => i.id)).toEqual(['c', 'b', 'a'])
  })

  it('returns the identical array for repeated identical input', () => {
    const first = selectVisibleInsights(ALL, view)
    const second = selectVisibleInsights(ALL, view)
    expect(second).toBe(first)
  })
})
