<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Booking/application state changes go through SECURITY DEFINER Postgres functions (publish_job, apply_to_job, confirm_worker, update_job_terms, set_*_status); client never writes those tables directly — keeps duplicate/overbooking/version checks server-side.
- Terms are versioned in job_terms; any change bumps jobs.terms_version and requires fresh acceptances in term_acceptances.
- Demo identities use the reserved `@demo.kaamsetu.app` domain, flagged is_demo by trigger; RLS hides real jobs from demo users and apply_to_job blocks demo/real mixing.
- Voice: Gnani Prisma (STT) and Timbre (TTS) are called only from src/lib/voice.functions.ts; browser records short 16 kHz WAV clips. Intent extraction is a separate Lovable AI Gateway step (src/lib/ai.functions.ts); date words resolve in Asia/Kolkata in code, not by the model.
- Matching is deterministic in src/lib/kaam.ts (matchJob); hourly and daily wages are never converted.
- Leaflet is loaded only via src/components/MapView.tsx (lazy, client-only) with OpenStreetMap tiles.
