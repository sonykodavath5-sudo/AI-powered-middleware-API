import { API_BASE_URL } from '../api/apiSlice'
import { PromptForm } from '../features/prompt/PromptForm'
import { ResultsPanel } from '../features/session/ResultsPanel'

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">AI Insights Console</h1>
          <p className="app__subtitle">
            A client for the middleware API — it submits prompts, handles the
            clarification and error branches, and pages through results.
          </p>
        </div>
        <code className="app__endpoint">{API_BASE_URL}</code>
      </header>

      <main className="app__main">
        <section className="panel panel--form" aria-label="Request">
          <PromptForm />
        </section>

        <section className="panel panel--results" aria-label="Response">
          <ResultsPanel />
        </section>
      </main>
    </div>
  )
}
