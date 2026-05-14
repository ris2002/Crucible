# CRUCIBLE — Intellectual Ideas Platform

A full-stack platform for forging, sharing, and discussing ideas. Users converse with an AI thinking partner (the Crucible) across 8 intellectual genres to develop rough thoughts into publishable ideas. The platform includes a social feed, comments, sparks, follows, a credit/subscription system, and a full admin panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Backend | FastAPI (Python 3.11) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI | Anthropic Claude Sonnet 4.6 |
| Payments | Stripe (subscriptions + one-time payments) |
| Hosting | Render (backend) + Vercel or Render static (frontend) |

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
│   │   │   ├── users.py           # Profiles, follows, notifications
│   │   │   ├── comments.py        # Comment sparks and reports
│   │   │   ├── credits.py         # Credit balance and history
│   │   │   ├── payments.py        # Stripe subscriptions and webhooks
│   │   │   └── admin.py           # Admin-only panel endpoints
│   │   └── services/
│   │       ├── anthropic_service.py  # Claude AI + genre prompts
│   │       ├── supabase_service.py   # All DB operations
│   │       └── stripe_service.py     # Stripe API operations
│   └── frontend/
│       ├── package.json
│       ├── vite.config.js
│       └── src/
│           ├── App.jsx            # Routes and auth provider
│           ├── lib/
│           │   ├── api.js         # All API calls
│           │   └── supabase.js    # Supabase client
│           ├── hooks/
│           │   ├── useAuth.js     # Auth state + profile
│           │   ├── useForge.js    # Crucible session state + streaming
│           │   └── useCredits.js  # Credit balance
│           └── components/
│               ├── Layout/Header.jsx
│               ├── Feed/
│               │   ├── FeedPage.jsx
│               │   ├── FilterBar.jsx
│               │   └── IdeaDetailPage.jsx
│               ├── Forge/
│               │   ├── ForgePage.jsx
│               │   ├── ForgeChat.jsx
│               │   ├── ForgeBanner.jsx
│               │   ├── TurnIndicator.jsx
│               │   └── TurnWarning.jsx
│               ├── Auth/
│               │   ├── LoginPage.jsx
│               │   ├── SignupPage.jsx
│               │   ├── ForgotPasswordPage.jsx
│               │   └── ResetPasswordPage.jsx
│               ├── Profile/ProfilePage.jsx
│               ├── Settings/SettingsPage.jsx
│               ├── Notifications/NotificationsPage.jsx
│               ├── Drafts/DraftsPage.jsx
│               └── Admin/AdminPage.jsx
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
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_THINKER` | Stripe Price ID for Thinker monthly plan |
| `STRIPE_PRICE_SCHOLAR` | Stripe Price ID for Scholar monthly plan |
| `STRIPE_PRICE_TURNS` | Stripe Price ID for turn extension (+4 turns, £2) |
| `FRONTEND_URL` | Comma-separated allowed origins e.g. `http://localhost:5173,https://yourapp.vercel.app` |
| `MONTHLY_SPEND_CAP_GBP` | Monthly Anthropic spend cap in GBP (default: `100`) |

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
| `tier` | TEXT | `free` / `thinker` / `scholar` / `admin` |
| `credits_remaining` | INT | Default 3 |
| `credits_monthly` | INT | Default 3 |
| `lifetime_sessions_used` | INT | Incremented on Crucible session start |
| `stripe_customer_id` | TEXT | Set on first Stripe checkout |
| `is_admin` | BOOLEAN | Must be set manually in Supabase for admin access |
| `banned` | BOOLEAN | Set by admin |
| `soft_deleted` | BOOLEAN | Set by admin, hides ideas |
| `created_at` | TIMESTAMPTZ | |

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
| `status` | TEXT | `active` / `draft` / `posted` / `abandoned` |
| `idea_id` | UUID | FK → ideas, set after posting |
| `input_tokens` | INT | Cumulative input tokens used |
| `output_tokens` | INT | Cumulative output tokens used |
| `ai_redirect_triggered` | BOOLEAN | True if hate/inflammatory redirect fired |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `comments`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `author_id` | UUID | FK → profiles |
| `idea_id` | UUID | FK → ideas |
| `parent_id` | UUID | FK → comments (for replies) |
| `content` | TEXT | Minimum 50 words enforced |
| `word_count` | INT | |
| `spark_count` | INT | Default 0 |
| `created_at` | TIMESTAMPTZ | |

### `sparks`
Unified table for both idea sparks and comment sparks.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles |
| `idea_id` | UUID | FK → ideas (nullable) |
| `comment_id` | UUID | FK → comments (nullable) |
| `created_at` | TIMESTAMPTZ | |

Constraint: exactly one of `idea_id` or `comment_id` must be set.

### `follows`

| Column | Type | Notes |
|---|---|---|
| `follower_id` | UUID | FK → profiles |
| `following_id` | UUID | FK → profiles |
| `created_at` | TIMESTAMPTZ | |

Constraint: `follower_id != following_id`.

### `notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | Recipient |
| `type` | TEXT | `spark` / `comment` / `build` / `follow` / `new_idea_from_follow` |
| `actor_id` | UUID | FK → profiles (who triggered it) |
| `idea_id` | UUID | FK → ideas (optional) |
| `comment_id` | UUID | FK → comments (optional) |
| `read` | BOOLEAN | Default false |
| `created_at` | TIMESTAMPTZ | |

### `credit_transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles |
| `amount` | INT | Positive = added, negative = deducted |
| `type` | TEXT | `post` / `subscription` / `renewal` |
| `description` | TEXT | |
| `stripe_payment_id` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### `flagged_content`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `idea_id` | UUID | FK → ideas |
| `reporter_id` | UUID | FK → profiles (null if system-triggered) |
| `reason` | TEXT | `spam` / `misinformation` / `harassment` / `off-topic` / `other` / `ai_redirect` / `keyword_match` |
| `reason_detail` | TEXT | Optional free-text detail |
| `triggered_by` | TEXT | `user` or `system` |
| `reviewed` | BOOLEAN | Default false |
| `dismissed` | BOOLEAN | Default false |
| `created_at` | TIMESTAMPTZ | |

### `admin_actions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `admin_email` | TEXT | |
| `action_type` | TEXT | `dismiss_flag` / `delete_idea` / `ban_user` / `adjust_credits` / `change_tier` / `seed_post` / `soft_delete` / `unban` / `hard_delete` |
| `target_type` | TEXT | `flag` / `idea` / `user` |
| `target_id` | TEXT | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

---

## Tier System

| Tier | Credits/Month | Turns/Session | Notes |
|---|---|---|---|
| `free` | 3 | 5 | Default on signup |
| `thinker` | 10 | 8 | Paid subscription |
| `scholar` | 25 | 8 | Paid subscription |
| `admin` | 20 | 10 | Cannot use the Crucible; uses seed generator |

**Credits** are deducted only when posting an idea (1 credit per post). Starting or abandoning a Crucible session is free. Credits accumulate — resubscribing adds new credits on top of existing balance. Cancellation keeps remaining credits but drops the monthly allocation to 3 (free tier).

**Turn extensions** (+4 turns) can be purchased mid-session for £2 via Stripe.

---

## API Reference

All authenticated endpoints require `Authorization: Bearer <supabase_jwt>` header.

---

### Forge — `/forge`

#### `POST /forge/start`
Start a new Crucible session.

**Body:**
```json
{ "domain": "Technology", "genre": "Problem", "built_on_idea_id": null }
```

**Response:**
```json
{
  "session_id": "uuid",
  "turns_used": 0,
  "max_turns": 5,
  "domain": "Technology",
  "genre": "Problem",
  "messages": [],
  "status": "active",
  "built_on": { "id": "uuid", "title": "..." }
}
```

**Errors:** `402` no credits, `404` profile not found.

---

#### `POST /forge/stream` *(primary — streaming)*
Send a message and receive the AI response as a Server-Sent Events stream.

**Body:**
```json
{ "session_id": "uuid", "message": "your text" }
```

**SSE Events — text chunk** (fires repeatedly as tokens arrive):
```json
{ "text": "fragment of the response" }
```

**SSE Events — done** (fires once at end):
```json
{
  "done": true,
  "turns_used": 3,
  "max_turns": 5,
  "forge_ready": false,
  "warning": true
}
```

**SSE Events — done with CRUCIBLE_READY:**
```json
{
  "done": true,
  "turns_used": 5,
  "max_turns": 5,
  "forge_ready": true,
  "warning": false,
  "draft_title": "...",
  "draft_summary": "...",
  "draft_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
```

**Errors:** `400` turn limit / message over 500 words / session already posted.

---

#### `POST /forge/message` *(fallback — non-streaming)*
Same logic as `/forge/stream` but returns a single JSON response after full generation.

**Response:**
```json
{
  "reply": "...",
  "turns_used": 3,
  "max_turns": 5,
  "forge_ready": false,
  "draft_title": null,
  "draft_summary": null,
  "draft_tags": null,
  "warning": false
}
```

---

#### `POST /forge/post`
Post a completed idea from a session. Deducts 1 credit.

**Body:** `{ "session_id": "uuid", "title": "...", "summary": "...", "tags": ["tag1"] }`

**Response:** `{ "idea_id": "uuid", "message": "Idea posted successfully" }`

**Side effects:** Notifies author's followers, notifies original idea author if this is a build, auto-flags if AI redirect was triggered or hate speech keywords detected in title/summary.

---

#### `POST /forge/save-draft`
Save session as draft without posting. **Body:** `{ "session_id": "uuid" }`

---

#### `POST /forge/extend`
Create a Stripe Checkout URL for purchasing +4 turns (£2).

**Body:** `{ "session_id": "uuid" }`

**Response:** `{ "checkout_url": "https://checkout.stripe.com/...", "checkout_id": "cs_..." }`

---

#### `GET /forge/drafts`
Returns all draft sessions for the authenticated user.

---

#### `GET /forge/session/{session_id}`
Returns full session data including messages, turn counts, and draft fields.

---

### Ideas — `/ideas`

#### `GET /ideas`
Fetch the public feed.

| Param | Type | Default | Description |
|---|---|---|---|
| `domain` | string | — | Filter by domain |
| `genre` | string | — | Filter by genre |
| `sort` | string | `recent` | `recent` or `sparked` |
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |
| `following` | bool | false | Only followed users' ideas |
| `username` | string | — | Filter by author username |
| `date_from` | string | — | ISO date lower bound |
| `date_to` | string | — | ISO date upper bound |

**Response:** `{ "ideas": [...], "total": 100, "page": 1 }`

---

#### `GET /ideas/{idea_id}`
Full idea detail with author profile, parent idea (if a build), and spark status for the current user.

---

#### `POST /ideas/{idea_id}/spark`
Toggle spark on/off. **Response:** `{ "sparked": true, "spark_count": 42 }`

---

#### `POST /ideas/{idea_id}/report`
**Body:** `{ "reason": "spam", "reason_detail": "optional" }`

Reason options: `spam`, `misinformation`, `harassment`, `off-topic`, `other`.

---

#### `GET /ideas/{idea_id}/comments`
Paginated comments with nested replies. **Params:** `?page=1` (20 per page)

---

#### `POST /ideas/{idea_id}/comments`
**Body:** `{ "content": "...", "parent_id": null }`

---

### Users — `/users`

#### `GET /users/{username}`
Public profile: bio, tier, follower/following counts, idea count, follow status.

#### `GET /users/{username}/ideas`
Paginated published ideas. **Params:** `?page=1`

#### `POST /users/{username}/follow`
Toggle follow. **Response:** `{ "following": true }`

#### `PATCH /users/me/profile`
Update own bio (max 160 chars). **Body:** `{ "bio": "..." }`

#### `GET /notifications/all`
All notifications for the authenticated user.

#### `POST /notifications/read`
**Body:** `{ "ids": ["uuid1", "uuid2"] }`

---

### Credits — `/credits`

#### `GET /credits`
Returns current balance, tier, monthly allocation, lifetime sessions used, and recent transaction history.

---

### Payments — `/payments`

#### `POST /payments/subscribe`
Create a Stripe Checkout session. **Body:** `{ "tier": "thinker" }` or `{ "tier": "scholar" }`

**Response:** `{ "checkout_url": "https://checkout.stripe.com/..." }`

---

#### `POST /payments/webhook`
Stripe webhook receiver. Register this URL in the Stripe Dashboard.

Handles:
- `checkout.session.completed` — activates subscription or turn extension
- `customer.subscription.deleted` — reverts user to free tier
- `invoice.payment_succeeded` — adds monthly credits on renewal

---

#### `POST /payments/sync`
Sync subscription state from Stripe directly. Call this on the success redirect page as a fallback for webhook timing delays.

---

#### `POST /payments/sync-turns`
Verify and apply a turn extension after Stripe checkout.

**Body:** `{ "session_id": "forge_session_uuid", "checkout_id": "cs_..." }`

---

#### `DELETE /payments/subscription`
Cancel active subscription immediately. User keeps current credits; tier reverts to free.

---

### Admin — `/admin`
All endpoints require `is_admin = true` on the authenticated user's profile row. Returns `403` otherwise.

#### `GET /admin/dashboard`
Aggregate stats: flagged count, today/month spend in GBP, active users today, total/new users, total/today ideas and sessions, active subscriptions.

#### `GET /admin/costs`
Detailed cost breakdown: daily and monthly spend in GBP, % of monthly cap, hourly spend chart, top 10 most expensive sessions.

#### `GET /admin/flagged`
All unreviewed flagged content with idea details and reporter info.

#### `GET /admin/flagged/{flag_id}/session`
Full conversation transcript for the session behind a flagged idea.

#### `POST /admin/flagged/{flag_id}/dismiss`
Mark flag as reviewed and dismissed with no action.

#### `POST /admin/flagged/{flag_id}/delete-idea`
Set idea status to `draft` (removes from feed) and mark flag reviewed.

#### `POST /admin/flagged/{flag_id}/ban-user`
Ban the idea's author: `banned=true`, `soft_deleted=true`, all their ideas hidden.

#### `POST /admin/seed/generate`
Generate a seed idea draft using Claude. Does not post.

**Body:** `{ "domain": "Technology", "genre": "Observation", "hint": "optional hint" }`

**Response:** `{ "idea": { "title": "...", "summary": "...", "tags": [...] } }`

#### `POST /admin/seed/post`
Post a seed idea under the admin's own account. Costs 1 credit from the admin's balance.

**Body:** `{ "title": "...", "summary": "...", "domain": "...", "genre": "...", "tags": [...] }`

#### `GET /admin/users`
List all users. **Params:** `?search=` filters by username or email.

#### `GET /admin/users/{user_id}`
Full user detail: profile, all ideas, credit transaction history, session count, reports filed by and against user.

#### `POST /admin/users/{user_id}/credits`
Override credit balance. **Body:** `{ "credits": 10 }`

#### `POST /admin/users/{user_id}/tier`
Change tier. **Body:** `{ "tier": "scholar" }`

#### `DELETE /admin/users/{user_id}/ideas/{idea_id}`
Remove idea from feed (sets status to `draft`).

#### `POST /admin/users/{user_id}/soft-delete`
Soft-delete: `banned=true`, `soft_deleted=true`, all ideas hidden.

#### `POST /admin/users/{user_id}/unban`
Reverse soft-delete: restores user and republishes their ideas.

#### `POST /admin/users/{user_id}/hard-delete`
Permanently delete user and their auth account. Requires username confirmation.

**Body:** `{ "confirm_username": "their_username" }`

---

## Frontend Routes

| Route | Component | Auth |
|---|---|---|
| `/` | FeedPage | No |
| `/forge` | ForgePage | Yes |
| `/idea/:id` | IdeaDetailPage | No |
| `/profile/:username` | ProfilePage | No |
| `/login` | LoginPage | No |
| `/signup` | SignupPage | No |
| `/forgot-password` | ForgotPasswordPage | No |
| `/reset-password` | ResetPasswordPage | No |
| `/notifications` | NotificationsPage | Yes |
| `/drafts` | DraftsPage | Yes |
| `/settings` | SettingsPage | Yes |
| `/admin` | AdminPage | Yes + is_admin |

---

## The Crucible System

### How a session works

1. User selects a domain and genre, clicks **Start Forging**
2. A session is created in `forge_sessions`. No credit is deducted yet.
3. User sends messages. Each message calls `POST /forge/stream` which streams the AI response token by token via SSE.
4. The AI asks one sharp probing question per turn, staying strictly within the chosen genre.
5. After 4-8 exchanges, if the idea has earned it, the AI returns a `---CRUCIBLE_READY---` block with a title, 330-480 word summary, and 5 tags.
6. User edits the draft and clicks **Post to Feed — 1 credit**. Credit deducted here only.

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

When the AI decides the idea is ready, the generated summary always follows this structure (written as continuous prose with no labels):

| Section | Word budget |
|---|---|
| Claim | 50-80 words |
| Reasoning | 100-150 words |
| Counterargument | 100-150 words |
| Implication | 80-100 words |
| **Total** | **330-480 words** |

### Auto-flagging

Ideas are automatically flagged for admin review in two cases:
1. **AI redirect triggered** — the Forge used the hate/inflammatory redirect phrase during the session
2. **Keyword match** — the final title or summary contains a word from the hate speech blocklist

---

## Domains

Technology · Science & Nature · Society & Culture · Philosophy & Ethics · Business & Economy · Arts & Creativity · Politics & Power · Education & Learning · Health & Mind · Environment & Future · Sports & Games · History & Civilisation

---

## Making a User Admin

Admins cannot self-promote. To grant admin access:

1. Go to **Supabase Dashboard → Table Editor → profiles**
2. Find the user's row
3. Set `is_admin = true`
4. Set `tier = admin`

Admin accounts cannot use Forge. They access the admin panel, generate seed ideas, and post them to the feed. Seed posts appear under the admin's own username.

---

## Deployment

### Render (Backend + Frontend)

`render.yaml` at the project root defines both services. Connect your GitHub repo in Render, then set all environment variables in the Render dashboard under each service's **Environment** tab.

Set **Python version to 3.11** in the backend service under Settings → Language.

### Vercel (Frontend Alternative)

1. Import the repo in Vercel
2. Set **Root Directory** to `forge/frontend`
3. Add all `VITE_*` environment variables
4. Deploy

After deploying, add the Vercel URL to `FRONTEND_URL` in the Render backend environment (comma-separated).

### Stripe Webhooks

Register the backend as a webhook endpoint in Stripe Dashboard:

```
https://your-backend.onrender.com/payments/webhook
```

Enable these events:
- `checkout.session.completed`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## LLM Cost Minimisation

Running Claude Sonnet on every Crucible turn is the biggest cost driver in the platform. The following strategies are layered together to keep it under control.

---

### 1. Prompt Caching

Every system prompt is sent to Anthropic with a `cache_control: { type: "ephemeral" }` header on the system block:

```python
# anthropic_service.py — build_system_prompt()
return [{"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}]
```

Anthropic caches this block server-side for 5 minutes. On every subsequent turn within the same session, the system prompt is served from cache rather than re-tokenised. Since the system prompt is ~500 words (~650 tokens) and is repeated on every single API call, this saves roughly **90% of input token cost on the system block** for turns 2 and beyond.

This is the single biggest cost saving in the codebase.

---

### 2. Output Token Cap (`max_tokens=1000`)

The API is hard-capped at 1000 output tokens per call. The model cannot generate beyond this regardless of what it tries to write. This prevents runaway verbose responses from quietly inflating costs.

For the seed generator (admin only, single call, no conversation), the cap is set lower at `max_tokens=700` since it only needs to produce a title, summary, and tags.

---

### 3. Conversational Word Limit in the System Prompt

The system prompt instructs the AI to stay under 350 words per conversational response:

```
Keep each conversational response under 350 words. Always end with a complete sentence.
```

This is a behavioural guardrail that sits above the hard token cap. Because the model tries to comply, most turns generate 150-250 output tokens rather than pushing toward the 1000-token ceiling. **You only pay for tokens actually generated** — so if the model writes 200 words, you pay for ~260 tokens, not 1000.

The CRUCIBLE_READY turn is intentionally exempt from this limit since the summary needs 330-480 words. That one turn will use more tokens, but it only happens once per session.

---

### 4. User Input Cap (500 Words)

Every message the user sends is validated at the backend before it is forwarded to the API:

```python
# forge.py — /stream and /message endpoints
if len(body.message.split()) > 500:
    raise HTTPException(status_code=400, detail="Message exceeds 500-word limit")
```

Long user inputs directly inflate input token costs on every subsequent turn because the full conversation history is sent to the API each time. Capping inputs at 500 words limits how fast the conversation history grows.

The frontend also shows a live word counter once the user passes 450 words and disables the Send button at 501+.

---

### 5. Turn Limits per Tier

Each tier has a hard turn ceiling per session:

| Tier | Max Turns |
|---|---|
| free | 5 |
| thinker | 8 |
| scholar | 8 |
| admin | 10 |

This caps the maximum number of API calls and therefore the maximum token cost of a single session. A free user cannot run a 20-turn session that costs 10× what was expected.

Turn extensions (+4 turns for £2) are a paid feature, so any cost above the tier cap is offset by revenue.

---

### 6. Token Tracking and Spend Monitoring

Every session logs cumulative input and output tokens to `forge_sessions`:

```python
updates = {
    "input_tokens": (session.get("input_tokens") or 0) + input_tokens,
    "output_tokens": (session.get("output_tokens") or 0) + output_tokens,
}
```

The admin panel's **API Costs** page reads these to show:
- Daily and monthly spend in GBP
- Spend as a percentage of the monthly cap (`MONTHLY_SPEND_CAP_GBP`)
- An hourly breakdown chart
- The top 10 most expensive sessions by username

Cost is calculated using Claude Sonnet 4.6 pricing converted to GBP:

```python
INPUT_COST_GBP  = 3  * 0.79 / 1_000_000   # $3 per 1M input tokens
OUTPUT_COST_GBP = 15 * 0.79 / 1_000_000   # $15 per 1M output tokens
```

This gives full visibility into where spend is going before it becomes a problem.

---

### 7. Credit System as a Rate Limiter

Credits are deducted only on posting (1 credit per idea). Free users get 3 credits per month, meaning at most 3 Crucible sessions result in a posted idea. However, a user could start many sessions without posting — so the turn limits (point 5) are the primary guard against token abuse in abandoned sessions.

---

### Summary

| Strategy | Where | What it saves |
|---|---|---|
| Prompt caching | `anthropic_service.py` | ~90% of input tokens on system prompt from turn 2 onward |
| `max_tokens=1000` | `anthropic_service.py`, `forge.py` | Hard ceiling on output per call |
| 350-word output instruction | System prompt | Keeps most turns at 150-250 output tokens |
| 500-word input cap | `forge.py` backend validation | Limits conversation history growth |
| Turn limits per tier | `supabase_service.py` | Caps API calls per session |
| Token tracking + admin panel | `forge_sessions` table + `admin.py` | Visibility and early warning on spend |

---

## Admin Controls

### Purchase & Upgrade Toggles

Admins have two independent kill switches in the **Admin Panel → Settings** tab. Changes take effect immediately for all users with no redeployment required.

| Toggle | What it controls | Effect on existing users |
|---|---|---|
| **Tier Upgrades** | Free users subscribing to Thinker or Scholar | **None** — existing paid users keep their tier, credits, and monthly renewals |
| **Turn Extensions** | Buying +4 turns for £2 mid-session | **None** — in-progress sessions continue normally |

**When Tier Upgrades are disabled:**
- Upgrade buttons on the Settings page are replaced with "Unavailable"
- `/payments/subscribe` returns HTTP 403
- Stripe webhook handlers (`invoice.payment_succeeded`, `customer.subscription.deleted`) still fire normally — existing subscribers are fully unaffected

**When Turn Extensions are disabled:**
- "Buy 4 more turns — £2" button is hidden in the chat turn-limit panel
- "Extend 4 turns — £2" button is hidden in the TurnWarning banner
- `/payments/extend-turns` returns HTTP 403

These settings are stored in the `app_settings` table in Supabase (single row, `id = 1`). The frontend fetches them once on load via `GET /payments/config` and caches in memory for the session.

---

### Admin Panel Sections

| Section | Description |
|---|---|
| **Dashboard** | Live stats: users, ideas, Crucible sessions, active subscriptions, flagged content count, spend today/month |
| **Flagged Content** | Review user reports — dismiss, remove idea, or ban user. View full Crucible conversation that led to the post |
| **API Costs** | Hourly spend chart, monthly vs cap, top 10 most expensive sessions by username |
| **Seed Generator** | Generate and post ideas to the feed as the admin account. Deducts 1 credit per post (20 credits/month) |
| **Users** | Search users, view profile + ideas + credit history, adjust credits, change tier, soft-delete, unban, hard-delete |
| **Settings** | Toggle tier upgrades and turn extensions on/off |

---

### Admin Access

Admin status is controlled by the `is_admin` boolean column on the `profiles` table — set manually in Supabase for trusted accounts:

```sql
UPDATE profiles SET is_admin = TRUE, tier = 'admin' WHERE id = '<user-uuid>';
```

Admin accounts:
- Have `tier = 'admin'` (10 turns/session, 20 credits/month)
- Can access `/admin` panel
- Cannot use the Crucible (blocked at the UI level)
- "Enter the Crucible" button is hidden in the header

---

## Security Notes

- All secrets in environment variables — never committed to source control
- Supabase RLS enforces row-level access on all tables
- Admin endpoints query `is_admin` from the database on every request — it is not stored in the JWT
- Input cap: 500 words per Crucible message, enforced on the backend
- CORS restricted to explicit origins via `FRONTEND_URL`
- Stripe webhook signature verified on every inbound webhook call
- Monthly Anthropic spend cap configurable via `MONTHLY_SPEND_CAP_GBP`
