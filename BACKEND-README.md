# The Winepress Backend

This project now includes a lightweight Node backend for the whole site.

## What it handles

- `POST /api/subscriptions`
- `POST /api/prayer-requests`
- `POST /api/messages`
- `POST /api/collaborations`
- `POST /api/testimonies`
- `GET /api/prayer-wall`
- `GET /api/health`

## Run locally

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

If your website is running on a different port or host than the backend, set `window.WINEPRESS_API_BASE` in [assets/js/site-config.js](/Users/sarbahrichmond/Desktop/THE%20WINEPRESS%20OFF/assets/js/site-config.js) so public forms post to the backend explicitly.

## Data storage

Submitted form data is stored in JSON files inside:

`backend/data/`

That keeps the project simple for local development.

## Important note for deployment

This file-based backend works well locally or on a traditional Node host. On Vercel, the filesystem is not a durable database, so you would want to swap `backend/data/*.json` for a real datastore such as Supabase, Neon, Postgres, or Firebase before relying on submissions in production.

The current backend no longer stores email addresses for subscriptions or form submissions.

If you want email notifications for new submissions, set your Web3Forms access key in [assets/js/site-config.js](/Users/sarbahrichmond/Desktop/THE%20WINEPRESS%20OFF/assets/js/site-config.js).
