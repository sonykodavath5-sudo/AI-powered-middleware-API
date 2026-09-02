/**
 * Values shared across features. Kept here so a change to the supported
 * language list touches one file rather than the form, the schema and the
 * results header separately.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
]

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code)

export const DEFAULT_LANGUAGE = 'en'
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

/**
 * Prompts that exercise each response branch, offered as one-click fills.
 * Handy in review: clarification and success are both a click away.
 */
export const EXAMPLE_PROMPTS = [
  {
    label: 'A good prompt',
    prompt: 'Analyse churn drivers for enterprise accounts over the last quarter',
  },
  { label: 'Too short', prompt: 'hi' },
  { label: 'No subject', prompt: 'tell me more please' },
]

export const PROMPT_MIN_LENGTH = 3
export const PROMPT_MAX_LENGTH = 2000

/** How long the search box waits after the last keystroke. */
export const SEARCH_DEBOUNCE_MS = 300

export const SORT_FIELDS = [
  { value: 'title', label: 'Title' },
  { value: 'content', label: 'Content' },
  { value: 'confidence', label: 'Confidence' },
]

export const SORT_DIRECTIONS = [
  { value: 'asc', label: 'A → Z' },
  { value: 'desc', label: 'Z → A' },
]

/** Response statuses the backend can return with a 200. */
export const RESPONSE_STATUS = {
  SUCCESS: 'SUCCESS',
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
}

/** Local UI phases for the current session. */
export const SESSION_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  CLARIFICATION: 'clarification',
  ERROR: 'error',
}
