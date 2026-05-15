# CRUCIBLE — Intellectual Ideas Platform

A full-stack platform for forging, sharing, and discussing ideas. Users converse with an AI thinking partner (the Crucible) across 8 intellectual genres to develop rough thoughts into publishable ideas. The platform includes a social feed, comments, sparks, follows, a credit/subscription system, and a full admin panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Backend | FastAPI (Python 3.11) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI (platform) | Anthropic Claude Sonnet 4.6 |
| AI (Alchemist) | Anthropic / OpenAI / Google Gemini (user's own key) |
| Payments | Stripe (subscriptions + one-time payments) |
| Hosting | Render (backend) + Vercel (frontend) |

---

## Project Structure

```
IdeaForage/
├── render.yaml                    # Render deployment config
├── forge/
│   ├── schema.sql                 # Full DB schema
│   ├── backend/
│   │   ├── main.py                # FastAPI app entry point
│   │   ├── models.py              # Pydantic request/response models
│   │   ├── requirements.txt
│   │   ├── .env                   # Local env vars (never committed)
│   │   ├── middleware/
│   │   │   └── auth.py            # JWT auth via Supabase
│   │   ├── routers/
│   │   │   ├── forge.py           # Crucible session endpoints
│   │   │   ├── ideas.py           # Feed, idea detail, sparks, comments
│   │   │   ├── users.py           # Profiles, follows, notifications, API key management
│   │   │   ├── comments.py        # Comment sparks and reports
│   │   │   ├── credits.py         # Credit balance and history
│   │   │   ├── payments.py        # Stripe subscriptions and webhooks
│   │   │   └── admin.py           # Admin-only panel endpoints
│   │   └── services/
│   │       ├── anthropic_service.py  # Claude AI + genre prompts
│   │       ├── ai_router.py          # Multi-provider streaming (Anthropic/OpenAI/Google)
│   │       ├── crisis_check.py       # Keyword crisis detection
│   │       ├── email_service.py      # Admin email alerts
│   │       ├── supabase_service.py   # All DB operations
│   │       └── stripe_service.py     # Stripe API operations
│   └── frontend/
│       ├── package.json
│       ├── vite.config.js
│       ├── vercel.json            # SPA routing fix for Vercel
│       └── src/
│           ├── App.jsx            # Routes, auth provider, credits provider
│           ├── lib/
│           │   ├── api.js         # All API calls
│           │   └── supabase.js    # Supabase client
│           ├── hooks/
│           │   ├── useAuth.js     # Auth state + profile
│           │   ├── useForge.js    # Crucible session state + streaming
│           │   ├── useCredits.js  # Shared credits context (real-time updates)
│           │   └── usePurchases.js # Purchases/upgrades toggle config
│           └── components/
│               ├── Layout/
│               │   ├── Header.jsx
│               │   └── Footer.jsx  # Disclaimers
│               ├── Feed/
│               │   ├── FeedPage.jsx
│               │   ├── FilterBar.jsx
│               │   └── IdeaDetailPage.jsx
│               ├── Forge/
│               │   ├── ForgePage.jsx
│               │   ├── ForgeChat.jsx
│               │   ├── ForgeBanner.jsx  # Disclaimers
│               │   ├── TurnIndicator.jsx
│               │   └── TurnWarning.jsx
│               ├── Auth/
│               │   ├── LoginPage.jsx
│               │   ├── SignupPage.jsx
│               │   ├── ForgotPasswordPage.jsx
│               │   └── ResetPasswordPage.jsx
│               ├── Profile/
│               │   ├── ProfilePage.jsx
│               │   └── SettingsPage.jsx  # Tier cards + Alchemist API key config
│               ├── Notifications/NotificationsPage.jsx
│               ├── Drafts/DraftsPage.jsx
│               └── Admin/
│                   ├── AdminPage.jsx
│                   ├── AdminDashboard.jsx
│                   ├── AdminFlagged.jsx
│                   ├── AdminCosts.jsx
│                   ├── AdminSeedGenerator.jsx
│                   ├── AdminUsers.jsx
│                   └── AdminSettings.jsx
```

---

## Local Setup

### Backend

```bash
cd forge/backend
python -m venv venv
source venv/bin/activate         # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in your keys
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd forge/frontend
npm install
cp .env.example .env.local       # fill in your keys
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Environment Variables

### Backend (`forge/backend/.env`)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude (platform default) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_THINKER` | Stripe Price ID for Thinker monthly plan |
| `STRIPE_PRICE_SCHOLAR` | Stripe Price ID for Scholar monthly plan |
| `STRIPE_PRICE_ALCHEMIST` | Stripe Price ID for Alchemist monthly plan (£7/month) |
| `STRIPE_PRICE_TURNS` | Stripe Price ID for turn extension (+4 turns, £2) |
| `FRONTEND_URL` | Comma-separated allowed origins e.g. `http://localhost:5173,https://yourapp.vercel.app` |
| `MONTHLY_SPEND_CAP_GBP` | Monthly Anthropic spend cap in GBP (default: `100`) |
| `SMTP_HOST` | SMTP server (default: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | Email address to send alerts from |
| `SMTP_PASS` | App password for SMTP (Gmail: generate under Security → App Passwords) |
| `ADMIN_EMAIL` | Email address to receive admin alerts |

### Frontend (`forge/frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend URL e.g. `http://localhost:8000` |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key (`pk_test_...` or `pk_live_...`) |

---

## Database Schema

### `profiles`
Auto-created on signup via Supabase trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | References `auth.users` |
| `username` | TEXT UNIQUE | Set on signup |
| `bio` | TEXT | Max 160 chars |
| `tier` | TEXT | `free` / `thinker` / `scholar` / `alchemist` / `admin` |
| `credits_remaining` | INT | Default 3 |
| `credits_monthly` | INT | Default 3 |
| `lifetime_sessions_used` | INT | Incremented on idea post |
| `stripe_customer_id` | TEXT | Set on first Stripe checkout |
| `llm_api_key` | TEXT | Alchemist only — stored API key for their chosen provider |
| `llm_provider` | TEXT | Alchemist only — `anthropic` / `openai` / `google` |
| `llm_model` | TEXT | Alchemist only — specific model ID |
| `is_admin` | BOOLEAN | Must be set manually in Supabase for admin access |
| `banned` | BOOLEAN | Set by admin |
| `soft_deleted` | BOOLEAN | Set by admin, hides ideas |
| `created_at` | TIMESTAMPTZ | |

**SQL migrations required for existing databases:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS llm_api_key TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'anthropic';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT NULL;
```

### `app_settings`
Single-row config table (`id = 1`).

| Column | Type | Notes |
|---|---|---|
| `id` | INT | Always 1 |
| `purchases_enabled` | BOOLEAN | Controls turn extension purchases |
| `upgrades_enabled` | BOOLEAN | Controls new tier subscriptions |
| `cost_reset_at` | TIMESTAMPTZ | Timestamp of last admin cost reset |

**SQL migrations required:**
```sql
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS upgrades_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS cost_reset_at TIMESTAMPTZ DEFAULT NULL;
UPDATE app_settings SET upgrades_enabled = TRUE WHERE id = 1;
```

### `ideas`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `author_id` | UUID | FK → profiles |
| `title` | TEXT | 10-15 words |
| `summary` | TEXT | 330-480 words |
| `domain` | TEXT | One of 12 domains |
| `genre` | TEXT | One of 8 genres |
| `tags` | TEXT[] | Up to 5 hashtags |
| `spark_count` | INT | Default 0 |
| `comment_count` | INT | Default 0 |
| `build_count` | INT | Default 0 |
| `built_on_idea_id` | UUID | FK → ideas (optional) |
| `status` | TEXT | `published` / `draft` |
| `created_at` | TIMESTAMPTZ | |

### `forge_sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles |
| `domain` | TEXT | |
| `genre` | TEXT | |
| `messages` | JSONB | Array of `{role, content}` |
| `turns_used` | INT | Default 0 |
| `max_turns_extended` | INT | Set after turn extension purchase |
| `built_on_idea_id` | UUID | FK → ideas (optional) |
| `draft_title` | TEXT | Set when CRUCIBLE_READY triggered |
| `draft_summary` | TEXT | |
| `draft_tags` | TEXT[] | |
| `status` | TEXT | `active` / `draft` / `posted` |
| `idea_id` | UUID | FK → ideas, set after posting |
| `input_tokens` | INT | Cumulative input tokens used |
| `output_tokens` | INT | Cumulative output tokens used |
| `ai_redirect_triggered` | BOOLEAN | True if hate/inflammatory redirect fired |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `comments`, `sparks`, `follows`, `notifications`, `credit_transactions`, `flagged_content`, `admin_actions`
Unchanged from initial schema. See `forge/schema.sql` for full definitions.

---

## Tier System

| Tier | Price | Credits/Month | Turns/Session | Notes |
|---|---|---|---|---|
| `free` | £0 | 3 (lifetime) | 7 | Default on signup |
| `thinker` | £4/mo | 10 | 10 | Credits roll over (max 20) |
| `scholar` | £9/mo | 25 | 12 | Credits roll over (max 50) |
| `alchemist` | £7/mo | 10 | Unlimited | BYOK — user supplies their own AI API key |
| `admin` | — | 20 | 10 | Cannot use the Crucible; uses seed generator |

**Credits** are deducted only when posting (1 credit per post). Starting or abandoning a session is free.

**Turn extensions** (+4 turns for £2) can be purchased mid-session. Not available to Alchemist (already unlimited).

---

## Alchemist Tier — Bring Your Own Key

Alchemist users bring their own AI API key. Their sessions run on their own provider quota — the platform incurs zero LLM cost for them.

### Supported providers

| Provider | Models available |
|---|---|
| Anthropic (Claude) | Claude Opus 4.7, Claude Sonnet 4.6, Claude Haiku 4.5 |
| OpenAI (ChatGPT) | GPT-4o, GPT-4o Mini |
| Google (Gemini) | Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash |

### How it works

1. User subscribes to Alchemist via Stripe
2. In **Settings → AI Model**, they select a provider and model, enter their API key, and click **Save config**
3. The key is stored encrypted in the `profiles` table (`llm_api_key`, `llm_provider`, `llm_model`)
4. On every Crucible session, `forge.py` detects the Alchemist tier, fetches the stored key, and routes the request through `ai_router.py` using the appropriate provider's SDK
5. The same system prompt and all safety guardrails apply regardless of provider
6. If no key is stored, the session cannot start — the user is prompted to add one in Settings

### Key deletion on downgrade

When an Alchemist user cancels their subscription (via the Settings page or Stripe webhook), their `llm_api_key`, `llm_provider`, and `llm_model` are immediately wiped from the database. The cancel confirmation dialog warns them of this explicitly.

---

## AI Safety Guardrails

### Crisis protocol (highest priority)

Before any message reaches the AI, the backend runs a regex check (`crisis_check.py`) against 25 patterns covering:
- Direct statements: "kill myself", "end my life", "want to die"
- Self-harm: "self-harm", "cut myself", "hurt myself"
- Hopelessness: "no reason to live", "not worth living"
- Methods: "overdose", "hang myself", "jump off"

If triggered, the AI is **bypassed entirely**. A hardcoded crisis response is returned immediately with region-specific helplines:

- **UK:** Samaritans — 116 123 or text SHOUT to 85258
- **US:** 988 Suicide & Crisis Lifeline
- **India:** iCall — 9152987821
- **Australia:** Lifeline — 13 11 14
- **Everywhere else:** findahelpline.com

The chat input is locked after the crisis response. The session cannot continue.

### Scope guardrail

If a user drifts into personal chat, venting, or life advice requests, the AI redirects with a single firm message and waits for an idea. It does not engage with personal content.

### Political neutrality

The AI engages with political topics but never advocates for, favours, or disparages any party, politician, ideology, or movement. Equal critical pressure is applied to all sides.

### Hate/inflammatory content

If a message is framed to inflame rather than illuminate, the AI redirects without moralising:
*"That framing is more heat than light. What is the underlying question you are actually trying to work through?"*

### Disclaimers

Shown in the Forge banner (at session start) and the site footer:
- For brainstorming only
- Users are responsible for their own decisions
- AI may hallucinate or provide inaccurate information

---

## API Reference

All authenticated endpoints require `Authorization: Bearer <supabase_jwt>` header.

### Forge — `/forge`

#### `POST /forge/start`
Start a new Crucible session. Checks credit balance. For Alchemist users, also checks that an API key is stored.

**Body:** `{ "domain": "Technology", "genre": "Problem", "built_on_idea_id": null }`

**Errors:** `402` no credits or Alchemist key missing, `404` profile not found.

---

#### `POST /forge/stream` *(primary — streaming)*
Send a message and receive the AI response as Server-Sent Events.

**Crisis intercept:** If the message matches any crisis pattern, returns the crisis response immediately without calling any AI provider.

**Alchemist routing:** Uses the user's stored provider/model/key via `ai_router.py` instead of the platform Anthropic client.

**SSE Events:**
```json
{ "text": "fragment" }
{ "done": true, "turns_used": 3, "max_turns": 10, "forge_ready": false, "warning": true }
{ "done": true, "forge_ready": true, "draft_title": "...", "draft_summary": "...", "draft_tags": [...] }
{ "crisis": true, "done": true }
```

---

#### `POST /forge/message` *(fallback — non-streaming)*
Same logic, returns single JSON response after full generation.

---

#### `POST /forge/post`
Post completed idea. Deducts 1 credit. Auto-flags if AI redirect was triggered or hate keywords detected.

---

#### `POST /forge/save-draft`, `POST /forge/extend`, `GET /forge/drafts`, `GET /forge/session/{id}`
Unchanged from initial implementation.

---

### Users — `/users`

#### `GET /users/me/api-key/status`
Returns `{ "has_key": bool, "provider": "anthropic", "model": "claude-sonnet-4-6" }`.

#### `POST /users/me/api-key`
Store AI config for Alchemist tier. Restricted to `tier = alchemist`.

**Body:** `{ "key": "sk-ant-...", "provider": "anthropic", "model": "claude-sonnet-4-6" }`

#### `DELETE /users/me/api-key`
Remove stored API key, provider, and model.

#### `GET /users/me/ai-models`
Returns full provider/model list from `ai_router.PROVIDERS`.

All other user endpoints unchanged.

---

### Payments — `/payments`

#### `POST /payments/subscribe`
**Body:** `{ "tier": "thinker" }` — accepts `thinker`, `scholar`, or `alchemist`.

#### `POST /payments/extend-turns`
Blocked for Alchemist tier (returns `400` — already unlimited).

All other payment endpoints unchanged.

---

### Admin — `/admin`

#### `GET /admin/costs`
Now includes spend since last cost reset (not just monthly). Returns `cost_reset_at` timestamp.

#### `POST /admin/costs/reset`
Reset the cost counter. Call this after topping up your Anthropic balance. Sets `cost_reset_at` to now.

#### `GET /admin/settings`
Returns `{ "purchases_enabled": bool, "upgrades_enabled": bool, "cost_reset_at": "..." }`.

#### `POST /admin/settings`
Toggle either setting. **Body:** `{ "purchases_enabled": false }` or `{ "upgrades_enabled": false }`.

All other admin endpoints unchanged.

---

## Admin Controls

### Purchase & Upgrade Toggles

Two independent kill switches in **Admin Panel → Settings**. Take effect immediately, no redeployment required.

| Toggle | What it controls | Alchemist |
|---|---|---|
| **Tier Upgrades** | New subscriptions to Thinker, Scholar, or Alchemist | Blocked if disabled |
| **Turn Extensions** | Buying +4 turns mid-session for £2 | N/A (Alchemist has unlimited turns) |

### Cost Reset

In **Admin Panel → API Costs**, the **↺ Reset Counter** button (top-right) resets the "spend since last top-up" tracker. Press this each time you top up your Anthropic balance. The hourly chart and daily spend continue regardless; only the cumulative since-reset counter resets.

### Admin Email Alerts

Every flag — whether user-reported or system auto-detected — sends an email to `ADMIN_EMAIL`:

| Flag type | Email subject |
|---|---|
| User report | `Crucible - User Report: {reason}` |
| Auto-flag (keyword/AI redirect) | `Crucible - Auto-flag: {reason}` |

The email includes the idea title, reason, detail, reporter username (or "system"), and a direct link to the admin panel. Emails are sent in a background thread and never delay the API response.

**Setup:** Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAIL` to backend env vars. For Gmail, generate an App Password under Google Account → Security → 2-Step Verification → App Passwords.

### Post Deletion UX

Inline confirmations replace browser dialogs for all destructive admin actions:
- **Flagged Content:** "Delete post" and "Ban user" expand to show `Sure? [Yes] [Cancel]` within the card
- **User Detail:** "Remove" button on each idea shows inline confirm, then turns to `✓ Removed` on success

---

## The Crucible System

### How a session works

1. User selects a domain and genre, clicks **Start Forging** (1 credit required; deducted only on posting)
2. A session is created in `forge_sessions`
3. User sends messages via `POST /forge/stream` — response streams token by token via SSE
4. Every message is first checked by the crisis detector before reaching any AI provider
5. The AI asks one sharp probing question per turn, staying strictly within the chosen genre
6. After 4-8 exchanges, if the idea has earned it, the AI returns `---CRUCIBLE_READY---` with title, summary, and tags
7. User edits the draft and clicks **Post to Feed — 1 credit**

### Session state persistence

The full session state (messages, forge ready status, draft data) is cached in `localStorage`. Switching tabs or navigating away and returning restores the session from cache without an API call. Typed-but-unsent input is persisted in `sessionStorage`.

### Turn limit UI

- A single warning appears when one turn remains (not repeated on subsequent sends)
- When the limit is reached, an inline panel appears near the chatbox with options to buy more turns or save the draft
- "Buy 4 more turns" is hidden if the admin has disabled purchases

### Credits display

Credits are held in a shared React context (`CreditsProvider`) wrapping the whole app. The header credit badge updates immediately after posting — no page reload required.

### Genres and AI roles

| Genre | AI Role | Primary lens |
|---|---|---|
| Problem | Root-cause investigator | Symptom vs disease — stay in diagnosis, never jump to solutions |
| Solution | Stress-tester | Find the weakest point — feasibility, unintended consequences, assumptions |
| Observation | Pattern interrogator | Real pattern vs over-interpreted data point — what does it imply? |
| Question | Question auditor | Sharpen the question before attempting any answer — expose buried assumptions |
| Prediction | Falsifiability enforcer | Demand evidence, timeline, base rate, and what would prove it wrong |
| Contradiction | Coherence investigator | Real vs apparent — who benefits from the contradiction existing? |
| Concept | Usefulness auditor | Genuinely useful vs merely interesting — test with concrete examples and edge cases |
| Challenge | Devil's advocate | Steel-man the conventional view first, then test whether the challenge survives |

### CRUCIBLE_READY summary structure

| Section | Word budget |
|---|---|
| Claim | 50-80 words |
| Reasoning | 100-150 words |
| Counterargument | 100-150 words |
| Implication | 80-100 words |
| **Total** | **330-480 words** |

---

## LLM Cost Minimisation

### 1. Prompt Caching
System prompt sent with `cache_control: { type: "ephemeral" }`. Anthropic caches for 5 minutes — saves ~90% of input token cost on the system block from turn 2 onward.

### 2. Output Token Cap (`max_tokens=1000`)
Hard ceiling per API call. Seed generator capped at `max_tokens=700`.

### 3. Conversational Word Limit
System prompt instructs the AI to stay under 350 words per conversational turn. Most turns generate 150-250 output tokens in practice.

### 4. User Input Cap (500 Words)
Validated at the backend before the API call. Frontend shows a live word counter above 450 words and disables Send above 500.

### 5. Turn Limits per Tier

| Tier | Max turns |
|---|---|
| free | 7 |
| thinker | 10 |
| scholar | 12 |
| alchemist | Unlimited (user's own quota) |
| admin | 10 |

### 6. Alchemist Tier — Zero Platform LLM Cost
Alchemist users pay £7/month for platform access and bring their own API key. Every LLM call in their session is charged to their own Anthropic/OpenAI/Google account — the platform pays nothing for these sessions.

### 7. Token Tracking and Spend Monitoring
Every session logs `input_tokens` and `output_tokens`. The **Admin → API Costs** panel shows daily spend, spend since last top-up vs cap, hourly breakdown, and top 10 most expensive sessions.

```python
INPUT_COST_GBP  = 3  * 0.79 / 1_000_000   # $3 per 1M input tokens
OUTPUT_COST_GBP = 15 * 0.79 / 1_000_000   # $15 per 1M output tokens
```

### Summary

| Strategy | What it saves |
|---|---|
| Prompt caching | ~90% of system prompt input tokens from turn 2 onward |
| `max_tokens=1000` | Hard ceiling on output per call |
| 350-word output instruction | Keeps most turns at 150-250 output tokens |
| 500-word input cap | Limits conversation history growth |
| Turn limits per tier | Caps API calls per session |
| Alchemist BYOK | Zero platform LLM cost for these users |
| Token tracking + admin panel | Visibility and early warning on spend |

---

## Domains

Technology · Science & Nature · Society & Culture · Philosophy & Ethics · Business & Economy · Arts & Creativity · Politics & Power · Education & Learning · Health & Mind · Environment & Future · Sports & Games · History & Civilisation

---

## Making a User Admin

1. Go to **Supabase Dashboard → Table Editor → profiles**
2. Find the user's row
3. Set `is_admin = true` and `tier = 'admin'`

Admin accounts cannot use the Crucible. They access the admin panel, generate seed ideas, and post them to the feed.

---

## Deployment

### Vercel (Frontend)

1. Import the repo in Vercel, set **Root Directory** to `forge/frontend`
2. Add all `VITE_*` environment variables
3. The `vercel.json` in `forge/frontend/` rewrites all routes to `index.html` — required for React Router to work on direct URL access and page refresh

### Render (Backend)

Connect the repo in Render, set all environment variables in the dashboard. Set **Python version to 3.11** under Settings → Language.

After deploying, add the Vercel URL to `FRONTEND_URL` in the Render backend environment (comma-separated if multiple origins).

### Stripe Webhooks

Register:
```
https://your-backend.onrender.com/payments/webhook
```

Enable events:
- `checkout.session.completed`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

---

## Security Notes

- All secrets in environment variables — never committed to source control
- Supabase RLS enforces row-level access on all tables
- Admin endpoints query `is_admin` from the database on every request — not stored in JWT
- User LLM API keys stored in `profiles.llm_api_key` — never returned to the frontend (status-only endpoint)
- Input cap: 500 words per Crucible message, enforced on the backend
- CORS restricted to explicit origins via `FRONTEND_URL`
- Stripe webhook signature verified on every inbound call
- Monthly Anthropic spend cap configurable via `MONTHLY_SPEND_CAP_GBP`
- Crisis keyword check runs before any AI call — cannot be bypassed by prompt injection
