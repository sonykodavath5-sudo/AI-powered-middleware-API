import { describe, expect, it } from 'vitest'

import { CLIENT_ERROR_CODE, fieldIssues, normalizeError } from './errors'

describe('normalizeError', () => {
  it('reads the structured envelope the API sends', () => {
    const result = normalizeError({
      status: 400,
      data: {
        error: 'INVALID_LANGUAGE',
        message: 'Target language is not supported',
        details: { supportedLanguages: ['en', 'es'] },
      },
    })

    expect(result.code).toBe('INVALID_LANGUAGE')
    expect(result.status).toBe(400)
    expect(result.details.supportedLanguages).toEqual(['en', 'es'])
  })

  it('turns a transport failure into a network error', () => {
    const result = normalizeError({ status: 'FETCH_ERROR', error: 'failed' })
    expect(result.code).toBe(CLIENT_ERROR_CODE.NETWORK_ERROR)
    expect(result.message).toMatch(/backend is running/i)
  })

  it('reports an unreadable body', () => {
    expect(normalizeError({ status: 'PARSING_ERROR' }).code).toBe(
      CLIENT_ERROR_CODE.BAD_RESPONSE,
    )
  })

  it('falls back for a response that is not our envelope', () => {
    const result = normalizeError({ status: 502, data: 'Bad Gateway' })
    expect(result.code).toBe('HTTP_502')
    expect(result.message).toBe('Bad Gateway')
  })

  it('handles being called with nothing', () => {
    expect(normalizeError(undefined).code).toBe(CLIENT_ERROR_CODE.UNKNOWN_ERROR)
  })

  it('always produces a message', () => {
    expect(normalizeError({ status: 400, data: { error: 'BRAND_NEW_CODE' } }).message)
      .toBeTruthy()
  })
})

describe('fieldIssues', () => {
  it('returns the field list when the API sent one', () => {
    const issues = fieldIssues({
      details: { fields: [{ field: 'prompt', issue: 'required' }] },
    })
    expect(issues).toHaveLength(1)
  })

  it('returns an empty list otherwise', () => {
    expect(fieldIssues(null)).toEqual([])
    expect(fieldIssues({ details: null })).toEqual([])
  })
})
