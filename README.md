# AI Insights Console

A middleware API plus the React client that talks to it.

The service sits between a frontend and an AI provider. It checks the incoming
request, works out whether the prompt is worth sending downstream at all, and
pages the results. There's no real LLM behind it. The brief said to use dummy
data, so a mock generator fills that slot, sitting behind the same interface a
real provider client would use.

```
python project/
├── backend/          FastAPI + SQLite
│   ├── app/
│   │   ├── api/          routes
│   │   ├── core/         config, error envelope, localised copy
│   │   ├── data/         insight templates (dummy data) + the SQLite file
│   │   ├── db/           connection handling, repository
│   │   ├── schemas/      request/response models
│   │   └── services/     validation, clarification, mock AI, orchestration
│   └── tests/
└── frontend/         React + Redux Toolkit + RTK Query + Zod
    └── src/
        ├── api/          transport, error normalising
        ├── app/          store and layout
        ├── components/   presentational bits
        ├── constants/    shared values
        ├── features/     insights, prompt, session
        └── hooks/
```

## Running it

Two processes. Backend first.

From `backend/`:

```bash
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs on `http://127.0.0.1:8000`. Swagger docs at `/docs`. The SQLite file gets
created on first start at `backend/app/data/middleware.db`.

From `frontend/`:

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. Vite proxies `/api` through to the backend, which
keeps CORS out of the picture in dev and means no absolute URL ends up in the build.

Tests:

```bash
cd backend  && pytest      # 47 tests
cd frontend && npm test    # 44 tests
```

## API

Base path `/api/v1`.

### POST /insights

```jsonc
{
  "prompt": "Analyse churn drivers for enterprise accounts",
  "targetLanguage": "en",       // en, es, fr, de
  "contextId": "uuid",          // optional, continues a conversation
  "page": 1,                    // optional
  "pageSize": 10                // optional, max 50
}
```

Unknown fields are rejected instead of ignored, so a misspelled key fails loudly
rather than silently doing nothing.

Three possible outcomes.

**Success** (200):

```jsonc
{
  "status": "SUCCESS",
  "contextId": "...",
  "targetLanguage": "en",
  "prompt": "...",
  "data": {
    "topic": "Churn Drivers Enterprise",
    "summary": "Found 24 insights for \"Churn Drivers Enterprise\".",
    "insights": [
      {
        "id": "ins_000_churn-risk",
        "title": "Churn risk concentrated in Churn Drivers Enterprise",
        "content": "Accounts that engage ... churn at 22%, roughly double the baseline.",
        "category": "risk",
        "categoryLabel": "Risk",
        "tags": ["churn", "accounts", "retention"],
        "source": "lifecycle-model",
        "segment": null,
        "confidence": 0.82,
        "language": "en",
        "createdAt": "2026-08-19T11:04:00+00:00"
      }
    ],
    "pagination": {
      "page": 1, "pageSize": 10, "totalItems": 24, "totalPages": 3,
      "hasNextPage": true, "hasPreviousPage": false, "paginated": true
    }
  },
  "meta": {
    "generatedAt": "...", "model": "mock-insight-engine-v1",
    "cached": false, "processingTimeMs": 6, "turnCount": 1
  }
}
```

**Needs clarification** (200, since it's an outcome and not a failure):

```jsonc
{
  "status": "NEEDS_CLARIFICATION",
  "contextId": "...",
  "message": "Please provide more details",
  "reasons": [{ "code": "PROMPT_TOO_SHORT", "message": "The prompt is shorter than 5 characters." }],
  "suggestions": ["Name the product, team or metric you want analysed.", "..."]
}
```

**Error** (4xx):

```jsonc
{
  "error": "INVALID_LANGUAGE",
  "message": "Target language is not supported",
  "details": { "received": "zz", "supportedLanguages": ["en", "es", "fr", "de"] }
}
```

Everything that fails comes back in that envelope. Ours, FastAPI's own request
validation errors, and anything unhandled. One shape to parse means the client
only needs one error branch.

| Code | Status | When |
|---|---|---|
| `MISSING_PROMPT` / `MISSING_LANGUAGE` | 400 | Required field absent |
| `INVALID_PROMPT` | 400 | Empty or whitespace-only prompt |
| `PROMPT_TOO_LONG` | 400 | Over 2000 characters |
| `INVALID_LANGUAGE` | 400 | Not a two-letter code, or not supported |
| `INVALID_CONTEXT_ID` | 400 | Not a UUID |
| `INVALID_PAGINATION` | 400 | `page` or `pageSize` out of bounds |
| `PAGE_OUT_OF_RANGE` | 400 | Past the last page |
| `CONTEXT_NOT_FOUND` | 404 | Paging a context with nothing stored |
| `VALIDATION_ERROR` | 400 | Anything else structural, includes a `fields` list |
| `INTERNAL_ERROR` | 500 | Unhandled. Logged, not leaked to the client |

### Other endpoints

- `GET /insights/{contextId}?page=&pageSize=` — next page of an existing result set.
  Reads from storage, doesn't call the AI service again.
- `DELETE /insights/{contextId}` — drop a conversation.
- `GET /languages`, `GET /health`.

## Notes on the design

### Pagination: backend pages, frontend loads more

The brief left this open, so here's my reasoning. Insights get generated once and
written to SQLite. Every page after that is a `LIMIT`/`OFFSET` query, so page 3 is
an actual database read rather than a slice of something regenerated in memory.
This is the version that still works when a result set is too big to send in one
response.

On the client side pages accumulate. Each one merges into a single RTK Query cache
entry, so "Load more" grows one list rather than flipping between separate page
views. Search and sort then run over whatever has been loaded so far. The toolbar
shows "Showing 8 of 20 loaded, 24 on the server" so it's obvious the filter hasn't
seen everything yet. Silently filtering only the fetched rows would be worse.

If a result set is 10 items or fewer it comes back whole with `paginated: false`,
and the client hides the pagination controls.

### Validation is split between client and server

The client checks the structural stuff: empty prompt, prompt too long, language the
API won't accept. That's where it stops. Deciding whether a prompt has enough
*context* is the backend's call.

There's a reason for that split beyond tidiness. If the Zod schema also enforced the
five-character minimum, the clarification flow would be impossible to reach from the
UI, because the form would block exactly the prompts the feature is meant to handle.
So the client's floor is 3 characters, the server's is 5, and `NEEDS_CLARIFICATION`
lives in the gap. The "Too short" example button in the form demonstrates it.

### Clarification runs before any downstream call

`services/clarification.py` sits between validation and the AI call. If the prompt is
too short, has no real words, or is nothing but stop-words ("tell me more please"),
it returns straight away with reasons and suggestions in whichever language was
requested. Nothing gets generated, nothing gets stored. There's a test that swaps out
the generate function with one that raises, to prove it isn't reached.

### One request per page, first page included

The POST response already contains page 1, so `onQueryStarted` pushes it into the
query cache with `upsertQueryData`. The results view then mounts against a cache
entry that's already populated. Submitting is one request, each "Load more" is one
more. There's a pytest case and a Vitest store case covering this.

The cache key is just the context id (`serializeQueryArgs` drops the page), so all
pages of a conversation share one entry and `merge` appends to it.

### Global state keeps the request and outcome, not a copy of the list

`sessionSlice` holds what was sent, what came back, and the current page. The
insights stay in the RTK Query cache, which is part of the same store anyway.
Copying a server-owned list into a second slice is how the two end up out of sync.

### Re-render handling

The search box keeps its own text in local state and debounces for 300ms, so it's
the only component re-rendering while you type. The store only hears the final term.

`InsightRow` is wrapped in `memo`, and because filtering and sorting reuse the same
insight objects, re-sorting 28 rows re-renders the table shell but none of the rows.
`ResultsHeader` reads its own state and takes no props, so it doesn't re-render at
all. Derived data goes through `createSelector` inside a `useMemo`. The query hook
uses `selectFromResult` so the component subscribes to four fields rather than
everything RTK Query tracks.

### The mock AI is deterministic

Output is seeded from a hash of the normalised prompt plus language, so the same
question always gives the same insights. Makes the API testable and the caching
behaviour easy to follow. Result counts range from 4 to 28, which puts most prompts
over the pagination threshold and some under it.

Insight text is properly translated in all four languages. `category`, `tags` and
`source` stay in English since they're machine values, with a localised
`categoryLabel` alongside for display.

Swapping in a real provider means rewriting `ai_client.generate` and nothing else.

## Things I'd add with more time

- Rate limiting and a request id on every response. Both belong in middleware rather
  than in the route handlers.
- Server-side search, once result sets get bigger than is reasonable to hold in the
  browser. Client-side filtering is fine for tens of rows, not for thousands.
- Row virtualisation if the loaded list is ever allowed past a few hundred items.
- A component test covering the whole form-to-table journey. The current suite covers
  the store wiring and the pure logic, which is where most bugs live, but the rendered
  flow is worth pinning down too.
