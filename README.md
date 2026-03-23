# THE-WINEPRESS-OFF

The project is now structured so the frontend and backend can run together on Vercel.

## Local development

```bash
npm install
npm start
```

Then open `http://127.0.0.1:3000`.

## Vercel deployment

- Static pages live at the project root
- API routes live in `api/[...path].js`
- Shared backend logic lives in `backend/app.js`
- Local development stores submissions in `backend/data/*.json`
- Vercel uses Blob storage when `BLOB_READ_WRITE_TOKEN` is configured

Set these Vercel environment variables:

- `ADMIN_PIN`
- `ADMIN_SESSION_SECRET`
- `BLOB_READ_WRITE_TOKEN`
