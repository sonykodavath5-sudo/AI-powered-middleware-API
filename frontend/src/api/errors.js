/**
 * One error shape for the whole app.
 *
 * RTK Query hands back several different error objects depending on where
 * the request died — a transport failure, a JSON parse failure, or a real
 * HTTP response. Components should not have to know the difference, so
 * everything is flattened here into { code, message, details, status }.
 */

export const CLIENT_ERROR_CODE = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  BAD_RESPONSE: 'BAD_RESPONSE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

/**
 * Friendlier copy for the codes we know about. Anything unmapped falls back
 * to the message the server sent, which is already human-readable.
 */
const FRIENDLY_MESSAGES = {
  MISSING_PROMPT: 'Enter a prompt before submitting.',
  INVALID_PROMPT: 'That prompt is empty. Type a question and try again.',
  PROMPT_TOO_LONG: 'That prompt is too long. Shorten it and try again.',
  MISSING_LANGUAGE: 'Choose a target language.',
  INVALID_LANGUAGE: 'That language is not supported by the service.',
  INVALID_CONTEXT_ID: 'The conversation reference was not valid. Start a new request.',
  CONTEXT_NOT_FOUND: 'These results have expired. Submit the prompt again.',
  PAGE_OUT_OF_RANGE: 'There are no more results to load.',
  VALIDATION_ERROR: 'The request was rejected. Check the highlighted fields.',
  [CLIENT_ERROR_CODE.NETWORK_ERROR]:
    'Could not reach the API. Check that the backend is running.',
  [CLIENT_ERROR_CODE.TIMEOUT]: 'The request took too long. Try again.',
  [CLIENT_ERROR_CODE.BAD_RESPONSE]: 'The server sent a response we could not read.',
  [CLIENT_ERROR_CODE.UNKNOWN_ERROR]: 'Something went wrong. Try again.',
}

const TRANSPORT_CODES = {
  FETCH_ERROR: CLIENT_ERROR_CODE.NETWORK_ERROR,
  TIMEOUT_ERROR: CLIENT_ERROR_CODE.TIMEOUT,
  PARSING_ERROR: CLIENT_ERROR_CODE.BAD_RESPONSE,
  CUSTOM_ERROR: CLIENT_ERROR_CODE.UNKNOWN_ERROR,
}

function build(code, message, { details = null, status = null } = {}) {
  return {
    code,
    message: message || FRIENDLY_MESSAGES[code] || 'Something went wrong.',
    details,
    status,
  }
}

export function normalizeError(error) {
  if (!error) {
    return build(CLIENT_ERROR_CODE.UNKNOWN_ERROR)
  }

  // Transport-level failure: the request never produced an HTTP response.
  if (typeof error.status === 'string') {
    const code = TRANSPORT_CODES[error.status] ?? CLIENT_ERROR_CODE.UNKNOWN_ERROR
    return build(code, FRIENDLY_MESSAGES[code], { status: error.status })
  }

  const body = error.data

  // Our own envelope: { error, message, details }
  if (body && typeof body === 'object' && typeof body.error === 'string') {
    return build(body.error, FRIENDLY_MESSAGES[body.error] || body.message, {
      details: body.details ?? null,
      status: error.status ?? null,
    })
  }

  // Anything else with an HTTP status — a proxy error page, for instance.
  return build(
    `HTTP_${error.status ?? 'ERROR'}`,
    typeof body === 'string' && body ? body : 'The server rejected the request.',
    { status: error.status ?? null },
  )
}

/**
 * Field-level issues, when the server sent them. Used to annotate the form
 * rather than only showing a banner.
 */
export function fieldIssues(normalized) {
  const fields = normalized?.details?.fields
  return Array.isArray(fields) ? fields : []
}
