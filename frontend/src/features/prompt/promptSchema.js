import { z } from 'zod'

import {
  DEFAULT_LANGUAGE,
  DEFAULT_PAGE_SIZE,
  LANGUAGE_CODES,
  PROMPT_MAX_LENGTH,
  PROMPT_MIN_LENGTH,
} from '../../constants'

/**
 * Client-side validation covers what is structurally wrong with a request:
 * an empty prompt, an over-long one, a language the API does not accept.
 *
 * It deliberately stops short of judging whether a prompt has *enough
 * context* — the backend owns that rule (its threshold is 5 characters plus
 * a real subject) and answers with NEEDS_CLARIFICATION. Duplicating the
 * heuristic here would mean two places to keep in sync, and the UI would
 * never be able to show the clarification flow at all.
 */
export const promptSchema = z.object({
  prompt: z
    .string({ required_error: 'Enter a prompt.' })
    .trim()
    .min(PROMPT_MIN_LENGTH, `Enter at least ${PROMPT_MIN_LENGTH} characters.`)
    .max(PROMPT_MAX_LENGTH, `Keep the prompt under ${PROMPT_MAX_LENGTH} characters.`),

  targetLanguage: z.enum(LANGUAGE_CODES, {
    errorMap: () => ({ message: 'Choose a supported language.' }),
  }),

  // Comes off a <select>, so it arrives as a string.
  pageSize: z.coerce
    .number({ invalid_type_error: 'Choose a page size.' })
    .int()
    .min(1)
    .max(50),

  continueConversation: z.boolean(),
})

export const defaultPromptValues = {
  prompt: '',
  targetLanguage: DEFAULT_LANGUAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  continueConversation: false,
}
