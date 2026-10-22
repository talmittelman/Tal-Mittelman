# Shotbox

A personal AI production tool: characters, environments, storyboards, camera angles and video, in one pipeline. Runs on fal.ai, so one API key covers every model.

## What's inside

**Pipeline** (each step feeds the next through the Library)

1. **Character** – master design, then turnaround, expression and pose sheets from that master.
2. **Environment** – establishing shot, then reverse, aerial, detail and side angles of the same set.
3. **Storyboard** – shot list with shot types, locked characters + set as references, output as final frames, pencil sketches or greyscale animatics.
4. **Camera angles** – re-shoot any frame from 13 camera positions without changing the moment.
5. **Image to video** – start frame, optional end frame, camera move presets, multiple takes.

**Direct**

- **Text to video** – Seedance 2.0 or Veo 3.1.
- **Video to video** – Kling O3 edit: keep the motion, change subject, set or style.

**Across the app**

- **Project look** – one style line added to every prompt, so a whole project stays in one grade.
- **Library** – every output and upload, saved in your browser. Lock the images you want to reuse as references (yellow dot).
- **Prompt preview** – every button shows the exact prompt it sends.
- Result cards have **Re-angle**, **Animate** and **Edit video** to send an output to the next step.

## Setup (10 minutes)

You need [Node.js 20+](https://nodejs.org) and a fal account with credit.

1. Get a key at https://fal.ai/dashboard/keys
2. In this folder:
   ```bash
   cp .env.example .env.local
   # open .env.local and paste your key after FAL_KEY=
   npm install
   npm run dev
   ```
3. Open http://localhost:3000

## Put it online (Vercel, free tier works)

1. Import the `talmittelman/Tal-Mittelman` repo at https://vercel.com/new.
2. Set **Root Directory** to `shotbox` (framework: Next.js is detected automatically).
3. Add environment variables `FAL_KEY` and **`APP_PASSWORD`**. On Vercel the app refuses to run without the password, so a missing variable can't expose your credits.
4. Deploy. The browser asks for the password (any username).

## Costs (fal, pay per use, approximate)

| Step | Model | Cost |
|---|---|---|
| Any image | Nano Banana Pro | ~$0.15 each, 4K is double |
| 5s clip | Seedance 2.0 720p | ~$1.50 |
| 5s clip | Seedance 2.0 Fast 720p | ~$1.20 |
| 5s clip | Veo 3.1 with audio | ~$2.00 |
| 5s edit | Kling O3 Edit Pro | ~$0.84 |

Iterate on frames (cheap), animate only approved ones (expensive). Check current prices on each model's fal page.

## Changing things

- **Models**: `lib/models.ts`. Change an `id` to any fal endpoint and adjust its `build` function to match that model's input schema (listed on its fal page). New endpoints must be in this file, because the server only forwards calls to models listed there.
- **Prompt structures**: `lib/prompts.ts`. Character sheets, environment angles, storyboard frame template, camera angles and camera moves all live here. This is the file to make your own.
- **Look and feel**: `app/globals.css`, colors at the top.

## Notes

- Kling 3.0 Pro (image to video) is set to 5s or 10s. If fal returns a validation error, check its current schema on the model page and update `build` in `lib/models.ts`.
- fal deletes hosted outputs after a while. Download anything you want to keep.
- The library lives in this browser's storage. Clearing site data empties it.
