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

## Game architecture
- Game rules (movement, spawning, collisions, scoring) live in `src/game/engine.ts` with no React/three imports; the R3F scene only draws `runtime.game`. Why: rules stay testable and tweakable without touching rendering.
- Per-frame state lives in `runtime.game`; the zustand store holds only screen/UI/save data (persisted to localStorage). Why: avoids 60fps React re-renders on budget phones.
- Sounds and music are synthesized with Web Audio in `src/game/audio.ts`. Why: no paid or external assets.
- itch.io exports use `scripts/export-itchio.mjs` to bundle the existing scene and UI into a temporary static HTML5 package with relative asset paths; never embed the hosted app in an iframe. Why: uploads run independently of Lovable hosting without changing gameplay.
