# Condex

Single-page site for uploading a zipped folder of PDFs to Vercel Blob storage,
plus a standalone script to process those uploads into markdown.

## Web app

- Next.js (App Router, TypeScript)
- Uses [`@vercel/blob/client`](https://vercel.com/docs/storage/vercel-blob/client-upload) client uploads,
  so large zip files bypass the platform's 4.5MB request body limit.
- The upload API route (`app/api/upload/route.ts`) checks a passcode against the
  `UPLOAD_PASSCODE` environment variable before issuing an upload token.
- Only `.zip` files are accepted, blobs get a random suffix, and uploads are capped at 500MB.

### Local development

```bash
npm install
npm run dev
```

Create a `.env.local` (see `.env.example`) with `UPLOAD_PASSCODE` set, and run
`vercel env pull .env.local` once the project is linked to Vercel so
`BLOB_READ_WRITE_TOKEN` is available locally too.

## Processing script

`process_uploads.py` runs on your own computer (not on Vercel). It:

1. Lists blobs in your Blob store using `BLOB_READ_WRITE_TOKEN`.
2. Downloads any `uploads/*.zip` it hasn't processed before (state tracked in `processed_state.json`).
3. Unzips each one and extracts text from every PDF with PyMuPDF.
4. Writes one markdown file per PDF into `processed/<zip name>/`.

```bash
pip install -r requirements.txt
python process_uploads.py
```
