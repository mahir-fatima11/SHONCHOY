import { jsxRenderer } from 'hono/jsx-renderer'

/**
 * The single HTML shell for $honchoy.
 *
 * The page is a client-rendered app: the shell only carries the <head>, the
 * navigation chrome and mount points. All numbers come from `engine.ts`, which
 * is bundled for the browser as well as run in the Worker, so the UI can
 * recalculate instantly without a round trip.
 */
export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#ec4899" />
        <title>$honchoy — money engine</title>
        <meta
          name="description"
          content="$honchoy turns income, expenses and debt into one clear monthly plan: what to pay, what to save and what is safe to spend."
        />
        <link rel="icon" href="/static/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/static/style.css" />
      </head>
      <body>
        <a class="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <script type="module" src="/static/app.js"></script>
      </body>
    </html>
  )
})
