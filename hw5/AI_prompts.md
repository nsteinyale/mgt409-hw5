# Homework 5 - AI Prompt Log

Homework 5: Campus Customs Multi-Agent Operations. This file logs what I typed to my vibe coder (Claude Code), one section per problem. I keep it updated as I work.

## Problem 1: Vibe coder prompts

**Prompt I typed:** "5 - NEXT HW Assignment for Yale, ready? https://zlisto.github.io/mgt_409_fa26/hw5/p1.html"

**Follow-up prompt:** "Step one, let's go: we are going to create AI_prompts.md at the start and keep it updated throughout; this is the log of what we are doing. We are going to go one by one, but don't do it for me, just check my work as I go and when I ask you to work. First, we are going to have one section for each problem, and each section must include: the problem number and title; at least one prompt I typed in my own words; and one follow-up prompt if I needed one (and a short sentence on what was lacking after the first that made the follow-up necessary)."

**What was missing after the first prompt:** My first prompt only pointed the assistant at the assignment page without saying what to build, so I had to describe the task in my own words: create this log, what each section must contain, and that the assistant should check my work rather than do it for me.

## Problem 2: Analyze the database

**Prompt I typed:** "Okay, next, open data/campus_customs.db and look through every table and its fields (show me a brief snippet here for verification). Copy the original file to data/campus_customs_new.db (later problems will update this); study the three open tickets so you see how they link to other tables. Start output/harness.md and for each table, list the fields and one short line on why that table matters for the agents. You will keep growing this harness file in later problems."

**Follow-up prompts:**
1. "In the folder for homework 5, can you see it?"
2. "Verified, good. Does it look good to you as well? Any defects/errors in the data re: data hygiene?"

**What was missing after the first prompt:** I hadn't said where the data was. The assistant found only the old HW4 database (which has no tickets), so I had to point it to the `data.zip` in the HOME WORK 5 folder. My first prompt also only asked what the data contains, not whether it was clean, so I followed up with a hygiene check. The data itself was clean, but the check flagged weak spots the agents need to respect: linked-row checks are off in SQLite, there are no limits on status or quantity values, money is stored as decimals rather than whole cents, and date formats are mixed. It also flagged invoice 501 as overdue while still marked "open."

## Problem 3: Build the MCP server

**Prompt I typed:** "Next, write an MCP server in mcp_server/ using FastMCP. It will talk to data/campus_customs_new.db; you do not need to connect or run it in this problem. Every agent in this homework uses the tools in the MCP server, and you will add more tools to it later. For now, write three tools you know you will need for the tickets in the database. Keep the names clear, never invent any data, only use info in the DB. In output/harness.md list each of your three MCP tools. For every tool, include: which table it reads; which ticket it helps unlock (101, 102, 103); and one sentence on why that tool is the right one for that ticket. Vague lines like 'reads inventory' score low; tie the tool to the ticket. Also add a short mcp_server/README.md file that explains what the MCP server is for, which database file it uses, and the three tools it has."

**Follow-up prompt:** None needed yet.

**What was missing after the first prompt:** Nothing major. The prompt named the folder, framework, database, number of tools, the "never invent data" rule, and exactly what the harness and README must say for each tool, so it was done in one pass.

## Problem 4: Connect the MCP server to the vibe coder and test each tool

**Prompt I typed:** "Step four, add the MCP server to vibe coder and test each tool. In your vibe coder (Claude here) add your MCP server to this project so the vibe coder can call the tools. Save the connection JSON text in .mcp.json at the project root (or however it saves the MCP local server lists); now with Claude connected, test each of the three MCP tools and save the evidence in output/mcp_smoke.json. For every tool include: the prompt you asked the vibe coder; the tool name; the tool output (must match the values in data/campus_customs_new.db)."

**Follow-up prompt:** "Are you still working? Did we lose progress when my laptop closed?"

**What was missing after the first prompt:** Nothing in the task itself. My laptop closed mid-run, so I checked that the earlier files were still saved (they were). Claude Code only loads `.mcp.json` when a session starts, so the app had to be restarted before Claude could call the new tools.

**Second follow-up prompt:** "I restarted and approved the campus-customs-ops server. Run the three tool tests and write output/mcp_smoke.json."

**What was missing after that:** Restarting wasn't enough. A resumed session keeps the server list it started with, so the new server still didn't show up in `/mcp`. The tests ran in a new session, which loads `.mcp.json` at startup. There, Claude called `check_stock`, `get_lease` and `get_pricing` over the live connection, and all three outputs matched the database (`output/mcp_smoke.json`).

## Problem 5: Build the agent team and grow the MCP tools

**Prompt I typed:** "Now we are building the team and tools. Build the agentic team for Campus Customs using PydanticAI: Boss, Inventory, Accounting, Facilities, and Customer Service. Include prompts, models, and agent loops so they can delegate work to each other with full connectivity. Put the agent prompts in backend/prompts/, one file per agent. Put data types in backend/models.py and the agent files under backend/ (the layout can vary as long as the five roles are clear). Use your PORTKEY_API_KEY and only this model for every agent. Write each prompt in your own words with the shop rules that agent needs. More detailed prompts that cover all aspects of an agent's work and scope score higher than a short generic prompt. Next, add any tools the agents need to the MCP server so they can work on the open tickets. Shop facts come from the MCP server over data/campus_customs_new.db; do not invent a second shop-tools layer that bypasses MCP. Wire the agents so they append to output/audit_trail.json as they run: for each agent-loop step, record enough to audit later. Append to this file, do not wipe it each run. In output/harness.md, list each agent and each MCP tool (including ones you add in this problem) along with which table the tool uses. Also add a short safety section: the guardrails a real business would want when agents touch real customers and real money, plus limits that keep token use in check. Update mcp_server/README.md so the tool list matches what you have now."

**Follow-up prompt:** "I am a little worried that we are skipping a step or lost something in the transition to this new chat with the MCP server. Can you double check with the original lecture link I sent you and make sure we have done everything step by step?"

**What was missing after the first prompt:** I said "only this model" without naming it, so the assistant had to look up the required model on the assignment page (`gpt-6-luna`). I also wanted to be sure nothing from Problems 1–4 was lost when we moved to a new chat to connect the MCP server. The step-by-step check against each problem page confirmed every deliverable was there. It also pulled the three shop rules the page wants in the prompts: overdue is counted from `desk.date_today`, nothing ships while its invoice is unpaid, and a human handles payments.

**Second follow-up prompt:** "Please fix both those errors you found. Do you need more from me on that?"

**What was missing after that:** The first live run worked, but my prompt never said how agents should share ticket notes or what a customer is allowed to hear. Two agents wrote the same finding twice on one ticket, and the customer draft for ticket 101 told the customer about our unpaid vendor invoice. The fixes are in code, not just the prompts: only the Boss and the teammates it asks directly can write notes, and a check rejects any customer draft that mentions invoices, vendors, payments, rent, costs or margins. I reset the working database and re-ran the team to confirm both fixes.

## Problem 6: Plan the three tickets

**Prompt I typed:** "Six, we are going to plan three tickets. Before we wire the backend, write down what we expect the team to do on each open ticket. Build output/desk_tickets.html, a page we can double-click, with one tab per ticket (101, 102 and 103). Also add empty Cash and Reflection tabs for later problems (leave them blank or with a short 'coming later' note for now). On each ticket tab, fill an Expected section only (leave room for an Actual section you will fill after you run the agents). For each ticket's expected section, write in your own words: who the Boss should call first and why; all the agent obligations you expect (not 'Boss calls everyone'); which MCP tools you expect that run to use. Plans that send every specialist on every ticket score low. You will compare this plan to what actually happens when your agents resolve these three tickets."

**Follow-up prompt:** None needed yet.

**What was missing after the first prompt:** Nothing major. The prompt named the file, the five tabs, and the three things each Expected section must cover, and it warned against sending every specialist to every ticket. The plan uses 8 specialist calls instead of 12. Facilities only works the rent ticket, Inventory and CustomerService skip it, and each ticket's first call has a reason.

## Problem 7: Backend routes

**Prompt I typed:** "7. Backend routes. Now, your React frontend dashboard (the next problem) needs a backend it can call. In backend/main.py, use FastAPI and add routes that do the following: return the three tickets and whether each is open or resolved; take a ticket id and run your agent team on that ticket; return recent agent events (what each agent said and which tools they used) so the board can refresh; approve a payment or purchase after a human clicks approve (agents only prepare the pay: this route is what actually changes cash); return the current checking balance from cash_accounts; reset the database to the original values when you want a fresh run. From the backend/ folder, start the server with: uvicorn main:app --reload --port 8000. This turns on your backend at http://localhost:8000 so the frontend dashboard can call those routes. In output/harness.md, list each route in one line (what URL / what it does)."

**Build notes:** The prompt listed all six routes and the start command. One choice I left open was how approving and resetting should reach the database without breaking the Problem 5 rule that shop data only goes through MCP. Those became human-only MCP tools that no agent can see. Another was that an agent run takes a minute or two, so the run route starts it in the background and returns a `run_id` for the board to poll.

**Follow-up prompt:** "Can you confirm for me which model you are using? I think I didn't understand that, on the Portkey API? What did the homework want us to use? And are you using it?"

**What was missing after the first prompt:** I wasn't sure which AI the model rule covered: the coding assistant or the shop agents. The rule is about the agents, and the homework requires `gpt-6-luna` for all five. A live test call through Portkey confirmed it: the request asked for `gpt-6-luna`, and OpenAI answered from its `gpt-6-luna-global` deployment. The model is fixed in one place in `backend/config.py`, and every agent is built from it.

## Problem 8: Agent dashboard

**Prompt I typed:** "Now the agent dashboard. Now we build the frontend dashboard in frontend/ with React + Vite + TypeScript. The page should call the routes we built in Problem 7. At a minimum the board has to: 1. list all three tickets; 2. let you pick one ticket and start the agent team on it; 3. show each agent and what they say/do while the ticket goes; 4. make a ticket marked resolved when the run is done; 5. show a short summary of what each agent actually did on the ticket; 6. let a human approve a pay or purchase when asked; 7. show the checking balance (it should drop after an approved pay). Make the dashboard look good! We are going to be creative with the layout and feel. Maybe a full Zelda Twilight Princess vibe? Dark theme? Bring some Epona and Zoras and Gorons, Ganondorf and an ocarina and sword. The front end will talk to the back end at http://localhost:8000. On the backend, allow the Vite page origin (could be http://localhost:5173) so the browser is allowed to call those routes. Start the board with: npm run dev. This opens the React desk in the browser so you can pick tickets and watch agents. Write output/design.md with what you chose for the dashboard look (layout, how agents read differently, how resolved tickets and cash show up) and why, including the creative choices that make it feel special and that humans would enjoy."

**Follow-up prompt:** "Can you make sure to add in the full PINBALL effect that we learned about in the lecture, where you can click the ADMIN panel or something and watch the agents and Boss ping each other back and forth?" Then, while it was being built: "Make it Twilight Princess themed", "maybe with arrows going back and forth? Or the Octoroks?", and "maybe one of each?"

**What was missing after the first prompt:** My first prompt asked for a live feed but not the lecture's pinball org chart, where you watch hand-offs fly between agents. The follow-ups asked for it as an Admin view in the same theme, with arrows for one direction and Octoroks for the other. Because our team is fully connected, the table is a pentagon with a wire between every pair of agents instead of the lecture's boss-on-top tree. It also has a Replay button so a finished run can be watched again.

**Second follow-up prompt:** "Make the dashboard start with a video intro of Link waking up, pulling the sword from a stone, and it zooms in on the sword and the dashboard starts up. Like a video game intro. Thanks!"

**What was missing after that:** The board opened straight onto the data, with no game feel at the start. The intro is drawn and animated in code (SVG and CSS, no video file), so it stays sharp and loads instantly. It opens on a PRESS START title screen, because browsers only play sound after a click, so the click doubles as the game's start button. It has Skip and Replay buttons, and the Hero is an original drawing rather than game art.

**Third follow-up prompt:** "This is amazing, can you do more photorealism? Like Twilight Princess?" (I chose "code only for now and then decide soon"), then "add more detail to everything as well."

**What was missing after that:** The first intro was flat cartoon shapes. True photorealism would need generated images (which would cost money on my Portkey key), so for now the intro got a code-only cinematic pass: noise clouds and fog, god rays, depth of field, parallax, rim lighting, particles, bloom, lens flare, grain and a colour grade. It also got far more detail in the scenery and on the Hero. Generated stills are still an option for later.

**Fourth follow-up prompt:** "Add more detail to everything again, this is great."

**What was missing after that:** The scene was atmospheric, but parts of it were still empty or static. This pass added a closing Twilight portal in the night sky, mountains, a lit castle with a village and smoke, a grazing Epona, a reflecting pond, an owl that flies off when the Hero wakes, runes that glow as he approaches, wind in the grass, and falling leaves, butterflies and dew. Earlier versions are saved in `frontend/src/components/classic/`.

**Build notes:** The prompt covered the seven board features and the theme. Two things needed design decisions. First, *when* a ticket becomes resolved: the agents can't resolve tickets, so it resolves once the run is done and a person has signed every approval it raised (or right away if it raised none). Second, the approve button had to know *what* to pay, so the agents now attach `pay_kind` and `ref_id` (invoice id or lease id) to each payment they prepare. The Zelda look uses original hand-drawn SVG emblems rather than game art.

## Problem 9: Resolving tickets

**Prompt I typed:** "Nine: resolving tickets. Now before testing the agents on the full run, reset the working db data/campus_customs_new.db again to start clean. Note the starting balance in the checking. Then run all three tickets on the board (101, 102 and 103) until each is resolved. Open output/desk_tickets.html. From Problem 6, on each ticket tab, fill the Actual section from this run: which agents worked, what they delegated, and which tools they used. Keep your Expected section so you can compare the two. On the Cash tab of the same output/desk_tickets.html, itemize the money: 1. starting checking balance (after the reset); 2. for each ticket, how cash changed when the ticket resolved, and why (which pay/purchase/dollar amount); 3. ending checking balance: it must match the cash_accounts section in the working db. Wrong cash math loses points even if the board correctly shows every ticket resolved. Also make sure to save: 1. output/resolved_tickets.json: for each ticket, make sure you have ID, final status, short outcome, what each agent contributed, and any human approvals; 2. output/resolved_board.html, which is a page you can double-click with a screenshot of your React board for each resolved ticket 101, 102 and 103. Append real runs to output/audit_trail.json. Finish output/harness.md so it covers tables, MCP tools, the five agents, API routes, the dashboard, and safety rules."

**Follow-up prompt:** None needed yet.

**Build notes:** The run started from a reset at **$3,400.00** with 0 payments, confirmed through MCP. On 101 I approved the $840 invoice payment and the customer message, and on 102 the $2,400 rent payment. On 103 I declined the bulk discount (no price was proposed) and approved the shortfall check. That left **$160.00**, which matches `cash_accounts.checking`. Approvals were signed as "Shop Owner". Two things changed along the way. First, a ticket now resolves once a person has decided every item, so a reasonable "no" doesn't leave it stuck forever. Second, the board's balance counter now always lands on the real number, because its animation had paused in a background browser tab.

**Follow-up prompts (dashboard polish, between Problems 9 and 10):**
1. "First, double check the zoom in on the sword in the intro, it seems to glitch in the background and flash/pulse."
2. "Follow up: after the intro, let the user click 'Tickets Dashboard' or 'Pinball-Style Agentic Dashboard Replays' as two big buttons on the screen, thanks!"

**What was missing:**
- The zoom scaled the whole scene 16×, with filtered layers (noise clouds and fog, blurs, rough edges) inside it. The browser re-rendered those filters bigger on every frame and dropped them past its size limit, so the background popped. The bloom "burst" also overlapped the zoom, which caused the pulse. The fix: the dive now fades out the fog, clouds and rays and switches filters off, and the bloom burst finishes before the dive.
- The intro used to drop straight into the tickets board. Now it ends on a choice screen with two big buttons: Tickets Dashboard, or the Pinball replays. The Pinball view also got #101/#102/#103 buttons to pick which run to watch.

## Problem 10: Reflection

**Prompt I typed:** "Reflection: Open output/desk_tickets.html and fill in the Reflection tab. Answer in your own vibe and be detailed and thorough about it. 1. Evaluate the performance of the agents on each ticket. 2. How did the Actual and Expected plans differ? 3. What would have been simpler with one agent/tools, and why? 4. Describe THREE new problems Campus Customs might face that this agent team could handle with these new tools. 5. And then what three new problems could we NOT solve here? And what tools/agents would we need to solve them? Tie every answer to this app and the three tickets we ran; use the ticket tabs and Cash tab on the same page as evidence. A generic AI essay without Campus Customs details will score low."

**Follow-up prompt:** None needed yet.

**Build notes:** Every claim in the reflection comes from the Problem 9 run data (`resolved_tickets.json`, `audit_trail.json`, the Actual and Cash tabs). Examples: 13 delegations against the 8 planned; 59 model calls and about 142k tokens; the 102 lease read four times, with one loop stopped by the guardrail; 103 never asking Accounting directly, which is why no bulk price was proposed; and $3,400 → $160 with only human approvals moving money.
