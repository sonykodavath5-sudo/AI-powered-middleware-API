// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = (initial) =>
    renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: initial },
    })

  it('returns the initial value straight away', () => {
    expect(setup('a').result.current).toBe('a')
  })

  it('holds the old value until the delay has passed', () => {
    const { result, rerender } = setup('a')

    rerender({ value: 'ab' })
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('ab')
  })

  it('only ever settles on the last value typed', () => {
    const { result, rerender } = setup('')

    for (const value of ['c', 'ch', 'chu', 'chur', 'churn']) {
      rerender({ value })
      act(() => vi.advanceTimersByTime(100))
    }

    // Nothing has settled yet — every keystroke restarted the timer.
    expect(result.current).toBe('')

    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('churn')
  })
})
