import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'

import { fieldIssues } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import {
  EXAMPLE_PROMPTS,
  LANGUAGES,
  PAGE_SIZE_OPTIONS,
  PROMPT_MAX_LENGTH,
} from '../../constants'
import { useSubmitPromptMutation } from '../insights/insightsApi'
import {
  resetSession,
  selectContextId,
  selectSessionError,
} from '../session/sessionSlice'
import { defaultPromptValues, promptSchema } from './promptSchema'

export function PromptForm() {
  const dispatch = useDispatch()
  const contextId = useSelector(selectContextId)
  const sessionError = useSelector(selectSessionError)
  const [submitPrompt, { isLoading }] = useSubmitPromptMutation()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(promptSchema),
    defaultValues: defaultPromptValues,
    mode: 'onChange',
  })

  const promptValue = watch('prompt') ?? ''

  // If the API rejected a specific field, show it on that field rather than
  // only in the banner above the results.
  const serverIssues = fieldIssues(sessionError)
  const serverIssueFor = (name) =>
    serverIssues.find((issue) => issue.field === name)?.issue

  const onSubmit = handleSubmit((values) => {
    submitPrompt({
      prompt: values.prompt,
      targetLanguage: values.targetLanguage,
      pageSize: values.pageSize,
      // Only sent when the user asked to keep the same conversation.
      contextId:
        values.continueConversation && contextId ? contextId : undefined,
    })
  })

  const handleReset = useCallback(() => {
    reset(defaultPromptValues)
    dispatch(resetSession())
  }, [dispatch, reset])

  const applyExample = useCallback(
    (prompt) => setValue('prompt', prompt, { shouldValidate: true, shouldDirty: true }),
    [setValue],
  )

  return (
    <form className="prompt-form" onSubmit={onSubmit} noValidate>
      <div className="prompt-form__intro">
        <h2>Ask the service</h2>
        <p>
          The request is validated here and again by the API. Vague prompts come
          back asking for more detail instead of burning an AI call.
        </p>
      </div>

      <Field
        id="prompt"
        label="Prompt"
        error={errors.prompt?.message || serverIssueFor('prompt')}
      >
        {(fieldProps) => (
          <textarea
            {...fieldProps}
            {...register('prompt')}
            className="input input--textarea"
            rows={5}
            placeholder="Analyse churn drivers for enterprise accounts over the last quarter"
            maxLength={PROMPT_MAX_LENGTH + 1}
          />
        )}
      </Field>

      <div className="prompt-form__counter">
        <span className="examples__label">Try:</span>
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example.label}
            type="button"
            className="chip"
            onClick={() => applyExample(example.prompt)}
          >
            {example.label}
          </button>
        ))}
        <span
          className={
            promptValue.length > PROMPT_MAX_LENGTH
              ? 'counter counter--over'
              : 'counter'
          }
        >
          {promptValue.length} / {PROMPT_MAX_LENGTH}
        </span>
      </div>

      <div className="prompt-form__row">
        <Field
          id="targetLanguage"
          label="Target language"
          error={errors.targetLanguage?.message || serverIssueFor('targetLanguage')}
        >
          {(fieldProps) => (
            <select
              {...fieldProps}
              {...register('targetLanguage')}
              className="input"
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label} ({language.native})
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          id="pageSize"
          label="Results per page"
          hint="Applied by the API, not in the browser."
          error={errors.pageSize?.message || serverIssueFor('pageSize')}
        >
          {(fieldProps) => (
            <select {...fieldProps} {...register('pageSize')} className="input">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {contextId && (
        <label className="checkbox">
          <input type="checkbox" {...register('continueConversation')} />
          <span>
            Continue this conversation
            <code className="checkbox__code">{contextId.slice(0, 8)}</code>
          </span>
        </label>
      )}

      <div className="prompt-form__actions">
        <Button type="submit" disabled={!isValid} loading={isLoading}>
          {isLoading ? 'Submitting' : 'Submit prompt'}
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset}>
          Clear
        </Button>
      </div>
    </form>
  )
}
