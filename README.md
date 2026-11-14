# KaamSetu · काम सेतु

**Local work. Clear terms. Dono ki Baat Pakki.**

KaamSetu is a Hindi/English local hiring prototype for painters, plumbers and electricians in Ghaziabad. Contractors publish jobs, workers find relevant opportunities, and both accept the same version of the job terms before a booking is confirmed.

Built for the **Great Indian AI Internship Challenge by Gnani AI**.

[Read the one-page solution pitch](SOLUTION_PITCH.md)

## What you can do

- **Post a job** with wages, working hours, location, payment timing and tools/materials responsibilities. Voice input produces an editable draft with follow-up questions.
- **Find work** by skill, locality, date and minimum wage. View filter-match reasons and synchronized job/map results.
- **Review and accept terms** before sending interest. Contractor confirmation creates the booking.
- **See the same Baat Pakki card** from worker and contractor accounts, including booking reference and agreed terms.
- Save jobs, review applications and bookings, and receive in-app notifications.
- Explore fictional demo accounts and listings, isolated from real-user transactions.

### Dono ki Baat Pakki

The backend versions job terms and records acceptances. Confirmation requires acceptance of the current version. It also checks duplicate applications and remaining capacity. Confirmed bookings prevent changes to their job terms until cancelled.

## Gnani AI integration

| Component | Implementation |
| --- | --- |
| Speech recognition | Gnani Prisma v3.0, short WAV recordings sent through an authenticated server function |
| Speech playback | Gnani Timbre v2.5, spoken job details and terms |
| Intent extraction | Separate Lovable AI Gateway step extracts structured job details and filters |
| Matching and booking | Application code and PostgreSQL functions enforce deterministic rules |

API credentials stay on the server. The voice implementation is in `src/lib/voice.functions.ts`; structured extraction is in `src/lib/ai.functions.ts`.

## Technology

React 19 · TanStack Start · TypeScript · Vite · Tailwind CSS 4 · Supabase-compatible PostgreSQL/auth on Lovable Cloud · Leaflet · OpenStreetMap

## Run locally

Install Bun, then run:

```bash
bun install
cp .env.example .env
# Enter your own backend configuration and server credentials in .env.
bun run dev
```

```bash
bun run test
bun run build
```

Use `.env.example` for required variables. Never commit `.env` or private credentials. A working database with the project schema, auth configuration and RPCs is required. See `drizzle/migrations/` for schema history. Set up migrations through your backend administration workflow.

## Deployment

The app uses server rendering and server functions. Vercel must run the application server as well as serve assets. The existing build configuration selects Vercel output when built there.

Configure the browser-visible `VITE_SUPABASE_*` variables and the server-side `SUPABASE_*`, `GNANI_API_KEY` and `LOVABLE_API_KEY` values on the deployment host.

- **Google sign-in** requires custom Google OAuth credentials in the backend provider settings, its exact callback registered in Google Cloud, and the deployment return URL allowed by the backend.
- **Demo sign-in** needs the existing demo account password as `DEMO_ACCOUNT_PASSWORD`. Already provisioned demo accounts can sign in without an admin key when their demo profiles and roles exist. Initial provisioning requires backend administration access.
- Deploying the app does not migrate its hosted database or authentication settings.

## Demonstration and verification

The recorded browser demonstration used fictional accounts and demonstrated form-based posting, filter search, worker acceptance, contractor confirmation, and matching booking cards. Gnani TTS playback was observed through media playback events. The recorded run did not test microphone input, speech recognition, spoken corrections, or pronunciation quality.

The Vercel production build was successful. This is separate from verifying every authenticated/voice feature on that host. Current behavior also depends on configured credentials and backend settings.

Demo listings and map pins are fictional. A booking records agreed terms and does not guarantee payment or verify identity.

## Project layout

```text
src/components/              Interface, maps, voice controls and booking cards
src/routes/                  Worker, contractor, auth and activity pages
src/lib/voice.functions.ts    Gnani speech integration
src/lib/ai.functions.ts       Structured extraction
src/lib/kaam.ts               Matching and date helpers
src/integrations/supabase/    Backend clients and auth middleware
drizzle/migrations/           Database schema history
```

Map attribution: © OpenStreetMap contributors. Third-party packages and assets retain their respective licenses.
