import { describe, expect, it } from 'vitest'

import { defaultPromptValues, promptSchema } from './promptSchema'

const valid = {
  prompt: 'Analyse churn drivers for enterprise accounts',
  targetLanguage: 'en',
  pageSize: 10,
  continueConversation: false,
}

describe('promptSchema', () => {
  it('accepts a well-formed request', () => {
    expect(promptSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects an empty prompt', () => {
    const result = promptSchema.safeParse({ ...valid, prompt: '   ' })
    expect(result.success).toBe(false)
  })

  it('trims the prompt before sending it', () => {
    const result = promptSchema.parse({ ...valid, prompt: '  spaced out  ' })
    expect(result.prompt).toBe('spaced out')
  })

  it('rejects a prompt over the length limit', () => {
    expect(promptSchema.safeParse({ ...valid, prompt: 'a'.repeat(2001) }).success).toBe(
      false,
    )
  })

  it('rejects an unsupported language', () => {
    expect(promptSchema.safeParse({ ...valid, targetLanguage: 'zz' }).success).toBe(
      false,
    )
  })

  it('coerces the page size coming off a select element', () => {
    expect(promptSchema.parse({ ...valid, pageSize: '20' }).pageSize).toBe(20)
  })

  it('rejects a page size outside the API limits', () => {
    expect(promptSchema.safeParse({ ...valid, pageSize: 500 }).success).toBe(false)
    expect(promptSchema.safeParse({ ...valid, pageSize: 0 }).success).toBe(false)
  })

  it('leaves the "needs more context" judgement to the API', () => {
    // 'hi' is long enough for the client but the backend will ask for detail.
    expect(promptSchema.safeParse({ ...valid, prompt: 'hi!' }).success).toBe(true)
  })

  it('does not consider the empty default form valid', () => {
    expect(promptSchema.safeParse(defaultPromptValues).success).toBe(false)
  })
})
