# Oryx Carpentry — Website

A modern, fast website (no build step) with an optional admin panel.

## Open locally

- Open `index.html` in your browser.

Optional (recommended for best results):
- Use a local static server (VS Code “Live Server” extension, or any simple web server) so the modal and navigation behave exactly like production.

Admin panel (login/edit/save/upload) requires the Node server:
- Run: `npm install`
- Start: `npm run dev`
- Open: `http://localhost:5173/admin.html`

## Customize

- Main content: `index.html`
- Styles: `styles.css`
- Interactions/data (portfolio cards + modal): `script.js`
- Branding assets: `assets/`

## Notes

- The contact form opens the user’s email client via `mailto:` (no backend required).
- If you have a real domain, update `sitemap.xml` to match it.

## Publish (with /admin.html working)

If you want `https://yourdomain.com/admin.html` to work with login + saving edits, you must deploy the Node server (`server.mjs`). Pure static hosting (like GitHub Pages) will show the admin page but cannot log in or save.

Minimum requirements on your hosting:
- Runs Node.js
- Lets you set environment variables (`ORYX_ADMIN_PASSWORD`, optionally `PORT`)
- Persistent storage for `data/content.json` and uploaded images in `assets/uploads/`

Generic deploy steps (VPS / any Node host):
1) Upload this project to the server
2) Install deps: `npm install`
3) Set admin password (example):
	- Linux: `export ORYX_ADMIN_PASSWORD='your-strong-password'`
	- Windows: `setx ORYX_ADMIN_PASSWORD "your-strong-password"`
4) Start the server: `npm start`
5) Put your domain in front of it and enable HTTPS (recommended)

Notes for production:
- The server only serves public files (html/css/js + `/assets/*`) and does NOT expose `data/content.json` directly.
- For HTTPS + secure cookies behind a reverse proxy, set `NODE_ENV=production` on the host.
- If your host provides a port (common on platforms like Render/Fly), set `PORT`.

URLs after publish:
- Main site: `https://yourdomain.com/`
- Admin: `https://yourdomain.com/admin.html`

## Deploy on Vercel (full version)

Vercel cannot run the long-lived Express server (`server.mjs`) and it cannot write to the project filesystem. For the full admin experience on Vercel, this repo uses:

- Serverless functions in `api/` for `/api/*`
- Vercel Blob for image uploads
- Vercel KV (Upstash Redis) for storing the editable content JSON

### 1) Create the required storages

In Vercel Dashboard:

1) Storage → create a **Blob** store
2) Add a **Redis/KV** integration (Vercel KV is backed by Upstash)

### 2) Set environment variables

In your Vercel Project → Settings → Environment Variables:

- `ORYX_ADMIN_PASSWORD` (your strong admin password)
- `ORYX_ADMIN_TOKEN_SECRET` (a long random string, used to sign the admin cookie)
- `BLOB_READ_WRITE_TOKEN` (from the Blob store)

For KV/Redis, Vercel will normally inject these automatically when you attach the integration:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Also set:

- `NODE_ENV=production`

### 3) Deploy

1) Import the GitHub repo into Vercel
2) Framework preset: **Other** (static)
3) Build command: **None**
4) Output directory: **/** (default)
5) Deploy

After deploy:

- Main site: `https://<your-project>.vercel.app/`
- Admin: `https://<your-project>.vercel.app/admin.html`

Note: Uploaded images will return a public Blob URL (not `/assets/...`). That’s expected on Vercel.
