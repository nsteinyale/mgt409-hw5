# Twilight Desk: dashboard design

The Campus Customs dashboard (`frontend/`, React + Vite + TypeScript, `npm run dev` → http://localhost:5173) is a dark, Twilight-realm-style desk where the five agents read as an adventuring party, tickets are quests, and the checking balance is a rupee wallet. It's built so a shop owner can tell what's happening at a glance and actually enjoys watching the agents work.

## Layout

Three columns under a sticky top bar, read left to right like a story:

| Area | What's there | Why |
|---|---|---|
| **Top bar** | Title, shop date, the **rupee wallet** (checking balance), and the **Banish the Twilight (reset)** button | Money and the reset are always in view, never buried. Reset asks for confirmation first. |
| **Left: Quest Board** | The three tickets as cards: quest name, real subject and requester, SKU/size/qty or lease, and a state pill | Pick a ticket with one click. The state is readable from across the room. |
| **Center: the quest** | The selected ticket with the **Draw the sword: send the party** button (runs the agent team), the run id, the Boss's finding and decision, the customer draft, then **Seals for your hand** (approvals), then **The Chronicle** (live feed) | Everything about *this* ticket sits in one column in the order it happens: start → decide → approve → read the story. |
| **Right: The Party** | The five agents. While running it shows who is acting; after the run, what each one actually did | You can compare the real run with the plan in `desk_tickets.html`: who joined, who stayed at camp. |

On narrower screens the Party drops under the other two columns, and on a phone everything stacks.

## How the agents read differently

Each agent has its own **emblem, color and title**, used everywhere it appears (Party cards, every Chronicle line, and its left border stripe). You can follow a hand-off just by color:

| Agent | On the board | Color | Why this pairing |
|---|---|---|---|
| Boss | **The Hero** (sword) | gold | Leads the party and chooses who goes on each quest |
| Inventory | **Goron Stockkeeper** | amber | Gorons are stone-solid and know every rock: here, every shelf and size |
| Accounting | **Zora Treasurer** | river blue | Calm and exact; "counts rupees like river stones, never spends one" (agents can't pay) |
| Facilities | **Epona of the Ranch** | chestnut | The ranch and stable stand for the shop's home ground: the lease and the landlord |
| Customer Service | **Ocarina Herald** | violet | The shop's voice; "plays the customer a true song, never a false promise" |
| *(guardrails)* | **Ganondorf** | blood red | Appears whenever a rule stops the party (a refused delegation, an error, or a customer draft sent back for leaking internal details). The villain is the *rules catching mistakes*, so it's clear something was blocked. |
| *(you)* | **Human** with a rupee | green | Your approvals show up in the same feed, so the story includes the human's decisions |

**The Chronicle** turns the audit trail into readable lines:
- **Speech** ("speaks") is shown in a parchment serif.
- **Tool use** ("acts") becomes chips with a friendly label plus the real MCP name and arguments, e.g. *check the shelf* `check_stock` CC-TEE-WHITE · S. The fun label is readable, and the real tool name stays visible so it's still auditable.
- **Hand-offs** read as "The Hero *summons* Goron Stockkeeper" with the exact task in italics, and "*hears back from*" with the reply.
- **Nested work is indented**, so a specialist asking another specialist is visibly one level deeper.
- The Boss's final **quest report** is highlighted in gold.

**The Party panel** has two modes. During a run, the acting agent's card glows in its color, bobs, and shows an **ACTING** tag. After the run, each card shows what that agent *actually did*: who summoned it and who it summoned, which tools it used (with counts), how many notes it wrote, how many items it left for you, and its own one-line summary. Agents that weren't needed fade to grey with "Stayed at camp. This quest didn't need them." That makes a plan that wastefully sends everyone easy to spot.

## How resolved tickets show up

Unresolved and resolved tickets look like night and day:

- **Not resolved:** the card has a dark diagonal **Twilight** pattern and a teal portal icon. The state pill reads *Shrouded in Twilight* (open), *Party on the road* (running: the pill pulses and the portal spins), or *Awaiting your seal* (the run finished and approvals are waiting).
- **Resolved:** the card turns warm gold with a glow and a **Triforce** icon, and the pill reads *Light restored*. The ticket header shows a gold "Light restored. This ticket is resolved." banner, and the run button changes to *Quest complete*.

A ticket is resolved **once the run is done and every approval it raised is signed** (`POST /api/runs/{id}/approvals/{i}`). If a run needs no approvals, it resolves when the run finishes. Declining an item leaves the ticket unresolved, so a person can re-run it.

## How cash shows up

- The checking balance is a **green rupee wallet** in the top bar. The rupee glows and bobs gently.
- Every approval card has a kind tag. **Payments and purchases are green with a rupee and the dollar amount**; everything else (discount, customer message, verify) is gold with a Triforce.
- Approving money takes **two clicks**: *Approve payment* → *"Pay $840.00 from checking?" Yes, pay it*. You must type your name in **Signing as** first; that name is what `approved_by` records, and agent names are refused by the server.
- After an approved payment, the wallet **counts down** to the new balance and a red **−$840.00** floats up and fades, so the drop is impossible to miss. The payment also appears in the Chronicle as a green human entry with the new balance.

## The creative touches (and why people will enjoy them)

- **Twilight particles:** small black and teal squares drift up the screen like the Twilight Realm. It's pure CSS, so it's cheap and never blocks clicks, and it makes the desk feel alive even while idle.
- **Quest names** for the tickets: *The Missing Tee*, *The Landlord's Letter*, *The Hoodie Hoard*. The real subject and requester still sit right under each one.
- **Original hand-drawn SVG emblems** (sword, Goron, Zora, Epona, ocarina, Ganondorf, rupee, Triforce, portal), all made from simple shapes in `src/components/Art.tsx`. No game sprites or copyrighted images are used.
- **Playful verbs that stay honest:** "Draw the sword: send the party", "Seals for your hand", "Banish the Twilight (reset)". Each button still says plainly what it does, in a tooltip or small print.
- **Typography:** a storybook serif for names, speech and reports, and a clean sans-serif for data. The look feels like a game, but the numbers stay easy to read.
- **Light vs. dark as the story arc:** the whole board moves from teal-and-black Twilight toward gold light as tickets resolve, so finishing work feels like a small win.

## The intro (a video-game opening)

The board starts like a game, with an 11-second cinematic drawn and animated in code (`src/components/Intro.tsx` + `intro.css`: SVG and CSS keyframes, no video file). It stays sharp at any size and loads instantly.

1. **Title screen:** a gold Triforce floats over a slowly turning Twilight portal above **CAMPUS CUSTOMS ~ Twilight Desk ~**, with a blinking **— PRESS START —**. The click is needed anyway, because browsers only allow sound after a click or key press, so it doubles as the "start" of the game.
2. **First light in the woods:** night lifts into dawn as the sun rises behind the hills, with fireflies and letterbox bars. The Hero is asleep under a tree, Zzz floating up. Caption: *Ordon Woods · first light*.
3. **He wakes:** an "!" pops and he springs up to his feet.
4. **The walk:** he walks to a stone pedestal where the sword stands glowing, with footsteps in the sound.
5. **The pull:** he grips the hilt and draws the blade out of the stone. Rays of light fan out, there's a *shing*, and an original fanfare plays as he raises the sword overhead. Caption: *The blade that wakes the Twilight Desk…*
6. **The dive:** the camera zooms into the blade and flashes white. The gold title card appears, then dissolves into the dashboard.

**Cinematic pass, aiming for a painted Twilight Princess look in code only (no image files):**
- **Atmosphere:** clouds and two drifting fog banks generated from fractal noise (`feTurbulence`); blurred, screen-blended **crepuscular rays** from the sun through the trees; and holy god rays that flare up from the pedestal when the sword is drawn.
- **Depth of field:** far hills and the castle are soft-focus, the clearing is sharp, and ferns right in front of the "lens" are heavily blurred. A **parallax camera** pans with the Hero, sliding each layer by a different amount.
- **Material and light:** tree and stone edges are roughened with a displacement filter so they look hand-painted, not vector-clean. The Hero is shaded with gradients and **rim-lit** warm from the sunrise, and he casts a soft shadow. The blade has a bright edge, a groove, an engraved emblem by the guard, and a streak of light that runs down it during the zoom.
- **Detail:** a distant castle on the ridge; a fading crescent moon and a flock of birds; tiered pines; an old oak with bark, roots, leaf clusters and hanging vines; a ruined temple ring of mossy, ivy-wrapped broken pillars around a weathered, cracked pedestal with steps; a worn path; rocks, wildflowers and red mushrooms. The Hero has a chainmail hem and sleeve, leather gloves, a belt pouch, a stitched belt, brows, and a crest on his shield.
- **The Twilight lifting:** a canvas particle layer (`IntroMotes.tsx`) starts the scene with black, teal-edged **Twilight shards** that rise and dissolve as dawn breaks. Then come warm dust motes that glow brighter in the sunlight and the sword's beam, pulsing fireflies, and big out-of-focus bokeh.
- **Post-processing:** a Twilight colour grade that fades into dawn, warm **bloom** that surges at the pull, a **lens-flare** chain, a contrast and saturation grade, a vignette, and animated **film grain**.
- **Second detail pass:**
  - *Sky:* snow-capped mountains in blue haze behind the hills; clouds with warm sunlit rims; and a **Twilight portal** in the night sky. Its rings of black-and-teal shards spin, and it closes and vanishes as dawn breaks.
  - *Distance:* the castle has flickering windows, fluttering banners and a stone bridge. A village sits at its foot with chimney smoke curling up, and **Epona** grazes on the far hill, her head dipping and lifting.
  - *Clearing:*
    - a **pond** that reflects the dawn sky (it stays dark until sunrise), with shimmer, ripples, lily pads, a water lily, reeds and cattails;
    - moss and a hollow on the oak, where an **owl** dozes, startles awake at the Hero's "!", and flaps off over the trees;
    - grass, reeds and foreground ferns that bend in the breeze, and a **gust** when the sword comes free;
    - **runes** on the pedestal that light up one by one as he walks toward it;
    - a shaft of dawn light falling on the stone.
  - *The Hero:* a sapphire earring, loose hair strands, a cap band and a cap tip that moves in the wind, boot cuffs, and leg wraps.
  - *Particles:* tumbling **leaves** that the gust throws up and away from the sword, **butterflies** that wake with the sun over the flowers, and **dew** twinkling on the grass.
- Earlier versions are kept in `src/components/classic/` (`-1` = first drawing, `-2` = first cinematic pass).

Practical touches: **Skip intro ▸▸** in the corner and **Esc** jump straight to the board. **▶ Replay intro** in the footer plays it again, and `?nointro` in the URL turns it off while developing. The dashboard loads its data underneath while the intro plays, so nothing waits on it. The Hero and the scene are original drawings (green tunic, long cap) inspired by the game, not game art.

**Choose your path:** when the intro ends, or when you press Skip or Esc, a choice screen appears with two big buttons. **Tickets Dashboard** (key 1) opens the board. **Pinball-Style Agentic Dashboard Replays** (key 2) opens the board with the Pinball view already up, where #101 / #102 / #103 buttons pick which run to replay.

**A flicker-free dive:** the zoom scales the scene 16×. From the moment the dive starts, the noise-generated clouds and fog, the blurred rays and the light shaft fade out, and every other filter inside the camera switches off. Plain shapes scale cleanly, while filters would be re-rendered bigger on every frame, and that was what made the background pop and pulse. The bloom burst now finishes before the dive begins.

## Admin · Twilight Pinball (watch the agents ping each other)

The **⚔ Admin · Pinball** button in the top bar opens a full-screen view of the agent team. It's built on the pinball org chart from Lecture 10 and reworked for this team and theme.

- **The table is a pentagon, not a tree.** In the lecture the boss sat on top with workers below. Here every agent can call every other one (full connectivity), so the Hero sits at the top, the four specialists sit around a Twilight portal, and **a wire joins every pair (10 wires)**. A hand-off between two specialists gets its own wire, so you can see it isn't routed through the Boss.
- **Arrows go out, Octoroks come back.** A delegation (`delegation_start`) fires a **Hero's arrow** in the caller's color from caller to teammate, and the wire lights up and pulses. The answer (`delegation_end`) rides back the other way as an **Octorok**, followed by the rocks it spits. Watching a busy ticket really does look like a pinball bouncing back and forth.
- **Bumpers:** each agent's emblem flashes like a pinball bumper when it calls a tool, and the tool's name pops above it ("check the shelf", "read the invoice"). What an agent *says* pops in italic.
- **Ganondorf** rises out of the center portal whenever a guardrail stops something: a refused delegation, an error, or a customer draft sent back for leaking internal details. A **rupee** drops into the portal when a human approves a payment. The Boss's final report gets a gold "quest report!" pop.
- **Scoreboard:** arrows fired (delegations), Octoroks back (answers), bumper hits (tool calls), and Ganondorf stops (guardrails). Next to it is a **ping log** that lists each hand-off in words: "The Hero ➶ Goron Stockkeeper: Ticket 101: check…".
- **Sound (synthesized, no audio files),** using the same tiny scheduler idea as the lecture's `sfx.ts` so bursts come out as a cascade instead of a mush: a bowstring twang and whoosh for arrows, an Octorok "ploop" for answers, a soft rune tick for tools, a low growl for Ganondorf, a rupee jingle for approvals, and an original four-note ocarina chime when the Boss finishes. Each agent has its own pitch, so you can hear who's talking. A 🔊 button mutes it, and the setting is remembered.
- **Live or replay:** during a run, new steps arrive every 1.5 s and play on a steady beat, so hand-offs don't all land at once. After a run, **▶ Replay this run** plays the whole run again at 1×, 2× or 4×. Steps that already happened don't fire when you open the view, so the table never floods. Press Esc or ✕ to close.

## Practical choices

- The board polls `GET /api/events?run_id=&since_seq=` every 1.5 s while a run is going (only new steps), then pulls `GET /api/runs/{id}/agents` for the per-agent summary and refreshes tickets and cash.
- Run state is saved in `output/runs.json`, so refreshing the page or restarting the backend doesn't lose a finished run or its pending approvals.
- If the backend is down, a red banner shows the exact command to start it. Errors from the server (like "Not enough cash") show as a dismissible banner, so nothing fails silently.
- The backend allows the Vite origin (`http://localhost:5173`, and any localhost port) through CORS, and the frontend calls `http://localhost:8000`, which can be changed with `VITE_API_URL`.
