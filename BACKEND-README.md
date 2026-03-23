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

If your website is running on a different port or host than the backend, set `window.WINEPRESS_API_BASE` in [assets/js/site-config.js](/Users/sarbahrichmond/Desktop/THE%20WINEPRESS%20OFF/assets/js/site-config.js) so public forms post to the backend explicitly. For Vercel, leave it blank so the frontend uses same-origin `/api`.

## Data storage

Submitted form data is stored in JSON files inside:

`backend/data/`

That keeps the project simple for local development.

## Important note for deployment

This project is now set up to work in two modes:

- Local mode: uses `backend/data/*.json`
- Vercel mode: uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is available

## Deploying to Vercel

1. Push this project to GitHub.
2. Import the repo into Vercel.
3. In Vercel Storage, create a Blob store and connect it to this project.
4. Add these environment variables in Vercel:

- `ADMIN_PIN`
- `ADMIN_SESSION_SECRET`
- `BLOB_READ_WRITE_TOKEN`

5. Deploy.

After deploy:

- static pages are served by Vercel
- API routes are handled by `api/[...path].js`
- form submissions are stored in Vercel Blob
- admin login uses a signed cookie that works across Vercel Functions

The current backend no longer stores email addresses for subscriptions or form submissions.

If you want email notifications for new submissions, set your Web3Forms access key in [assets/js/site-config.js](/Users/sarbahrichmond/Desktop/THE%20WINEPRESS%20OFF/assets/js/site-config.js).
