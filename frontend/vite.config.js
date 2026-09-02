import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The app calls /api/v1/... on its own origin; Vite forwards that to the
    // FastAPI process. Keeps dev free of CORS surprises and means the
    // production build works unchanged behind any reverse proxy.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    // Node by default: the store, selector, schema and error tests are all
    // pure logic and run an order of magnitude faster without a DOM. The one
    // hook test opts into jsdom with a `@vitest-environment` pragma.
    //
    // It also sidesteps a jsdom/undici clash: fetchBaseQuery's abort signal
    // is created from jsdom's AbortController, which Node's fetch rejects with
    // an instanceof check. Under the node environment fetch, Request and
    // AbortController are the same implementation and agree.
    environment: 'node',
    globals: true,
    css: false,
    // Node's fetch has no document origin, so it needs an absolute base URL.
    // The mocked fetch in the store tests ignores it; it just has to parse.
    env: { VITE_API_BASE_URL: 'http://localhost/api/v1' },
  },
})
