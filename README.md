# FORGE

An intellectual ideas platform where users develop and publish ideas through AI-assisted conversations. Built with React, FastAPI, Supabase, Stripe, and Anthropic Claude.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | FastAPI (Python 3.11) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Anthropic Claude Sonnet 4.6 |
| Payments | Stripe Checkout |
| Styling | CSS custom properties |

---

## Project Structure

```
forge/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── middleware/
│   │   └── auth.py              # JWT verification, get_current_user / get_optional_user
│   ├── models.py                # Pydantic request models
│   ├── routers/
│   │   ├── admin.py             # Admin-only endpoints
│   │   ├── comments.py          # Comment sparks and reports
│   │   ├── credits.py           # Credit balance and notifications
│   │   ├── forge.py             # AI forge session management
│   │   ├── ideas.py             # Feed, idea detail, sparks, reports
│   │   ├── payments.py          # Stripe subscriptions and turn extensions
│   │   └── users.py             # Profiles, follows, notifications
│   ├── services/
│   │   ├── anthropic_service.py # Claude API integration
│   │   ├── stripe_service.py    # Stripe checkout and webhook handling
│   │   └── supabase_service.py  # All database operations
│   └── .env                     # Environment variables (not committed)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Admin/           # Admin panel pages
│       │   ├── Auth/            # Login, signup, password reset
│       │   ├── Comments/        # Comment section
│       │   ├── Feed/            # Feed, idea cards, filters
│       │   ├── Forge/           # AI forge chat and drafts
│       │   ├── Layout/          # Header, footer
│       │   ├── Notifications/   # Notifications page
│       │   └── Profile/         # Profile and settings pages
│       ├── hooks/
│       │   ├── useAuth.js       # Auth state and profile
│       │   ├── useCredits.js    # Credit balance and tier
│       │   └── useForge.js      # Forge session state with localStorage persistence
│       └── lib/
│           ├── api.js           # All frontend → backend API calls
│           ├── adminApi.js      # Admin-specific API calls
│           └── supabase.js      # Supabase client
├── schema.sql                   # Main database schema
├── admin_schema.sql             # Admin tables and columns
└── seed_ideas.sql               # forge_team seed account and ideas
```

---

## Environment Variables

### Backend (`forge/backend/.env`)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_THINKER` | Stripe price ID for Thinker tier |
| `STRIPE_PRICE_SCHOLAR` | Stripe price ID for Scholar tier |
| `FRONTEND_URL` | Frontend origin for CORS and redirects |
| `MONTHLY_SPEND_CAP_GBP` | Monthly API spend cap shown in admin panel |

### Frontend (`forge/frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | Backend URL (default: http://localhost:8000) |

---

## Running Locally

```bash
# Backend
cd forge/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend
cd forge/frontend
npm install
npm run dev
```

---

## Tiers

| Tier | Credits/month | Turns/session | Notes |
|---|---|---|---|
| `free` | 3 lifetime | 5 | Default on signup |
| `thinker` | 10 | 8 | £4/month via Stripe |
| `scholar` | 25 | 8 | £9/month via Stripe |
| `admin` | 20 | 10 | Manually granted, seed posting only |

**Credit rules:**
- 1 credit is deducted when an idea is posted to the feed
- On cancellation: tier drops to free immediately, banked credits are kept
- On resubscription: `credits_remaining = credits_remaining + tier_monthly_allowance`
- Monthly renewals add the tier allowance on top of existing credits

---

## API Reference

All authenticated endpoints require `Authorization: Bearer <supabase_jwt>` header.

---

### Feed & Ideas — `/ideas`

#### `GET /ideas`
Returns paginated published ideas with optional filters.

| Query Param | Type | Description |
|---|---|---|
| `domain` | string | Filter by domain (e.g. Technology) |
| `genre` | string | Filter by genre (e.g. Problem) |
| `sort` | string | `recent` (default) or `sparked` |
| `page` | int | Page number, default 1, 20 per page |
| `following` | bool | If true, only show ideas from followed users (requires auth) |
| `username` | string | Filter by author username |
| `date_from` | string | ISO date — show ideas on or after this date |
| `date_to` | string | ISO date — show ideas on or before this date |

**Response:** `{ ideas, total, page, pages, per_page }`

Each idea includes `author_username`, `author_tier`, `user_has_sparked`.

---

#### `GET /ideas/{idea_id}`
Returns full idea detail including built-on parent if applicable.

**Response:** Idea object with `author_username`, `user_has_sparked`, `is_author`, and `built_on` (parent idea info if forged on top of another).

---

#### `POST /ideas/{idea_id}/spark`
Toggles a spark (like) on an idea. Creates a notification for the idea author.

**Auth required.**
**Response:** `{ sparked: bool, spark_count: int }`

---

#### `POST /ideas/{idea_id}/report`
Reports an idea to the admin flagged content queue.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `reason` | string | Report reason: `spam`, `misinformation`, `harassment`, `off-topic`, `other` |
| `reason_detail` | string | Optional free text detail |

**Response:** `{ message: "Reported" }`

---

#### `GET /ideas/{idea_id}/comments`
Returns paginated comments for an idea including nested replies.

| Query Param | Type | Description |
|---|---|---|
| `page` | int | Page number, default 1 |

**Response:** `{ comments: [...] }`

---

#### `POST /ideas/{idea_id}/comments`
Posts a new comment. Minimum 50 words enforced. Creates a notification for the idea author.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `content` | string | Comment text (min 50 words) |
| `parent_id` | string | Optional — parent comment ID for replies |

**Response:** Created comment object.

---

### Forge (AI Sessions) — `/forge`

#### `POST /forge/start`
Creates a new AI forge session. Checks user has at least 1 credit remaining.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `domain` | string | Idea domain (e.g. Technology) |
| `genre` | string | Idea genre (e.g. Problem) |
| `built_on_idea_id` | string | Optional — ID of idea being built upon |

**Response:** `{ session_id, turns_used, max_turns, domain, genre, messages, status, built_on }`

---

#### `POST /forge/message`
Sends a message in an active forge session. Calls Claude with the full conversation history and system prompt. Detects when the idea is ready (`---FORGE_READY---` block) and extracts title, summary, and 5 tags. Tracks input/output tokens. Auto-flags sessions containing hate keywords or AI redirect phrases.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `session_id` | string | Active session ID |
| `message` | string | User's message |

**Response:** `{ reply, turns_used, max_turns, forge_ready, draft_title, draft_summary, draft_tags, warning }`

`warning` is `true` on the second-to-last turn to prompt the user to wrap up.

---

#### `POST /forge/post`
Posts the forged idea to the feed. Deducts 1 credit. Auto-flags if AI redirect was triggered during the session or if hate terms are detected in title/summary. Notifies followers and the original idea author if this is a build.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `session_id` | string | Session to post from |
| `title` | string | Final edited title |
| `summary` | string | Final edited summary |
| `tags` | string[] | Up to 5 tags |

**Response:** `{ idea_id, message }`

---

#### `POST /forge/save-draft`
Marks a session as draft without posting.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `session_id` | string | Session to save |

---

#### `POST /forge/extend`
Creates a Stripe Checkout session for a £2 turn extension (+4 turns).

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `session_id` | string | Session to extend |

**Response:** `{ checkout_url, checkout_id }`

---

#### `GET /forge/drafts`
Returns all draft sessions for the authenticated user.

**Auth required.**
**Response:** `{ drafts: [...] }`

---

#### `GET /forge/session/{session_id}`
Returns full session state including messages and calculated `max_turns`.

**Auth required.**

---

### Users & Profiles — `/users`

#### `GET /users/{username}`
Returns public profile data including follower/following counts and idea count. If authenticated, also returns `is_following` and `is_self`.

**Response:** `{ id, username, bio, tier, created_at, follower_count, following_count, idea_count, is_following, is_self }`

---

#### `GET /users/{username}/ideas`
Returns paginated published ideas by a user.

| Query Param | Type | Description |
|---|---|---|
| `page` | int | Page number, default 1 |

**Response:** `{ ideas, total, page, pages }`

---

#### `POST /users/{username}/follow`
Toggles follow/unfollow on a user. Cannot follow yourself.

**Auth required.**
**Response:** `{ is_following: bool, follower_count: int }`

---

#### `PATCH /users/me/profile`
Updates the authenticated user's bio (max 160 characters).

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `bio` | string | New bio text |

**Response:** Updated profile object.

---

### Credits & Notifications — `/credits`, `/notifications`

#### `GET /credits`
Returns current credit balance, tier, monthly allowance, lifetime sessions used, and last 20 credit transactions. Auto-creates a profile if one does not exist (handles new signups).

**Auth required.**
**Response:** `{ credits_remaining, credits_monthly, tier, lifetime_sessions_used, transactions }`

---

#### `GET /notifications`
Returns all notifications for the user with unread count. Notification types: `spark`, `comment`, `build`, `new_idea_from_follow`.

**Auth required.**
**Response:** `{ notifications, unread_count }`

---

#### `POST /notifications/read`
Marks a list of notification IDs as read.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `ids` | string[] | Notification IDs to mark read |

---

### Comments — `/comments`

#### `POST /comments/{comment_id}/spark`
Toggles a spark on a comment.

**Auth required.**
**Response:** `{ sparked: bool, spark_count: int }`

---

#### `POST /comments/{comment_id}/report`
Reports a comment for moderation.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `reason` | string | Reason for report |

---

### Payments — `/payments`

#### `POST /payments/subscribe`
Creates a Stripe Checkout session for a monthly subscription. Creates a Stripe customer if one does not exist for the user.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `tier` | string | `thinker` or `scholar` |

**Response:** `{ checkout_url }`

---

#### `POST /payments/extend-turns`
Creates a Stripe Checkout session for a £2 one-time turn extension (+4 turns).

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `session_id` | string | Forge session to extend |

**Response:** `{ checkout_url }`

---

#### `POST /payments/webhook`
Receives Stripe webhook events. Verifies signature using `STRIPE_WEBHOOK_SECRET`.

Handles:
- `checkout.session.completed` — upgrades tier and adds credits on subscription or extends turns on one-time payment
- `invoice.payment_succeeded` — adds monthly credits on renewal
- `customer.subscription.deleted` — drops tier to free immediately, credits unchanged

---

#### `POST /payments/sync`
Queries Stripe directly for the user's active subscription and updates tier and credits if not already current. Used on return from Stripe Checkout to avoid webhook timing issues.

**Auth required.**
**Response:** `{ synced, tier, credits }`

---

#### `POST /payments/sync-turns`
Verifies a Stripe Checkout session by ID and extends forge turns if payment is confirmed. Used on return from turn extension checkout.

**Auth required.**

| Body Field | Type | Description |
|---|---|---|
| `session_id` | string | Forge session ID |
| `checkout_id` | string | Stripe Checkout session ID |

---

#### `DELETE /payments/subscription`
Cancels the active Stripe subscription immediately. Tier drops to free at once; banked credits are kept.

**Auth required.**

---

### Admin — `/admin`

All admin endpoints require the authenticated user to have `is_admin = true` in their profile. Returns `403 Forbidden` otherwise.

---

#### `GET /admin/dashboard`
Returns platform overview stats.

**Response fields:**

| Field | Description |
|---|---|
| `flagged_count` | Unreviewed flags in the queue |
| `spend_today_gbp` | Total API spend today (GBP) |
| `spend_month_gbp` | Total API spend this month (GBP) |
| `active_users_today` | Unique users who ran a forge session today |
| `total_users` | Total registered profiles |
| `new_users_today` | New signups today |
| `total_ideas` | Total published ideas |
| `ideas_today` | Ideas published today |
| `sessions_today` | Forge sessions started today |
| `active_subscriptions` | Users on thinker or scholar tier |

---

#### `GET /admin/flagged`
Returns all unreviewed flagged content with full idea info, author, and reporter.

Flags are created by three triggers:
1. **User report** — user clicks Report on an idea
2. **AI redirect** — Claude responded with the "more heat than light" phrase during the session
3. **Keyword match** — hate terms detected in title or summary on post

---

#### `GET /admin/flagged/{flag_id}/session`
Returns the full forge conversation that led to a flagged idea, for context during review.

---

#### `POST /admin/flagged/{flag_id}/dismiss`
Marks a flag as reviewed and dismissed. No action taken on the content.

---

#### `POST /admin/flagged/{flag_id}/delete-idea`
Removes the flagged idea from the feed (sets status to draft) and marks the flag reviewed.

---

#### `POST /admin/flagged/{flag_id}/ban-user`
Bans the idea's author: sets `banned = true`, `soft_deleted = true`, and hides all their ideas from the feed. Marks the flag reviewed.

---

#### `GET /admin/costs`
Returns detailed API cost breakdown.

**Response fields:**

| Field | Description |
|---|---|
| `spend_today_gbp` | Total spend today |
| `spend_month_gbp` | Total spend this month |
| `monthly_cap_gbp` | Cap set in env var |
| `cap_percent` | Percentage of monthly cap used |
| `sessions_today` | Number of forge sessions today |
| `avg_tokens_per_session` | Average total tokens per session today |
| `hourly` | Array of 24 hourly cost buckets |
| `top_sessions` | Top 10 most expensive sessions today by cost |

Cost rates used: £0.00000237 per input token, £0.00001185 per output token (Claude Sonnet 4.6 at $3/$15 per million tokens, converted at 0.79 USD/GBP).

---

#### `POST /admin/seed/generate`
Calls Claude to generate a draft seed idea. Does not post it — returns it for review and editing.

| Body Field | Type | Description |
|---|---|---|
| `domain` | string | Idea domain |
| `genre` | string | Idea genre |
| `hint` | string | Optional topic hint |

**Response:** `{ idea: { title, summary, tags } }`

---

#### `POST /admin/seed/post`
Posts the seed idea to the feed under the `forge_team` account. Deducts 1 credit from the admin's balance (max 20 seed posts per month).

| Body Field | Type | Description |
|---|---|---|
| `title` | string | Final title |
| `summary` | string | Final summary |
| `tags` | string[] | Up to 5 tags |
| `domain` | string | Idea domain |
| `genre` | string | Idea genre |

**Response:** `{ idea_id, credits_remaining, message }`

---

#### `GET /admin/users`
Returns up to 100 users, optionally filtered by username or email substring. Includes email from auth, idea count, and ban status.

| Query Param | Type | Description |
|---|---|---|
| `search` | string | Optional search string |

---

#### `GET /admin/users/{user_id}`
Returns full user detail: profile, all ideas, last 20 credit transactions, session count, flags filed by user, and flags against user.

---

#### `POST /admin/users/{user_id}/credits`
Sets a user's `credits_remaining` to a specific value.

| Body Field | Type | Description |
|---|---|---|
| `credits` | int | New credit balance |

---

#### `POST /admin/users/{user_id}/tier`
Changes a user's tier.

| Body Field | Type | Description |
|---|---|---|
| `tier` | string | `free`, `thinker`, `scholar`, or `admin` |

---

#### `DELETE /admin/users/{user_id}/ideas/{idea_id}`
Removes a specific idea from the feed (sets status to draft).

---

#### `POST /admin/users/{user_id}/soft-delete`
Bans a user and hides all their content. Reversible via unban.

---

#### `POST /admin/users/{user_id}/unban`
Reverses a soft delete: clears banned flag and restores all ideas to published.

---

#### `POST /admin/users/{user_id}/hard-delete`
Permanently deletes a user and all their data from both the profiles table and Supabase Auth. Requires the caller to type the username as confirmation.

| Body Field | Type | Description |
|---|---|---|
| `confirm_username` | string | Must exactly match the user's username |

---

## Database Schema Summary

| Table | Purpose |
|---|---|
| `profiles` | User profile, tier, credits, ban status, is_admin flag |
| `ideas` | Published and draft ideas with domain, genre, tags, spark/comment counts |
| `forge_sessions` | AI conversation history, turn tracking, token usage, draft fields |
| `comments` | Threaded comments with 50-word minimum |
| `sparks` | Unified likes for ideas and comments |
| `follows` | Follow relationships between users |
| `notifications` | In-app notifications (spark, comment, build, new_idea_from_follow) |
| `credit_transactions` | Full audit log of credit changes |
| `reports` | Comment abuse reports |
| `flagged_content` | Admin moderation queue for ideas |
| `admin_actions` | Audit log of all admin actions |

---

## Key Business Logic

### Forge Session Flow
1. User picks domain and genre → `POST /forge/start` (checks credits > 0)
2. User sends messages → `POST /forge/message` (Claude responds, tokens tracked)
3. After 4–8 turns, if idea is ready, Claude appends `---FORGE_READY---` block with title, summary, 5 tags
4. User edits the draft in the UI
5. User posts → `POST /forge/post` (1 credit deducted, idea published)

### Auto-Flagging
- If Claude responds with "that framing is more heat than light", `ai_redirect_triggered` is set on the session. On post, the idea is auto-flagged.
- If title or summary contains any configured hate terms, the idea is auto-flagged on post.
- Users can manually report any idea from the idea detail page.

### Payments Flow
1. User clicks Upgrade → `POST /payments/subscribe` → redirected to Stripe Checkout
2. On return, `POST /payments/sync` is called to immediately update tier and credits without waiting for webhook
3. Stripe webhooks handle renewals (`invoice.payment_succeeded`) and cancellations (`customer.subscription.deleted`) asynchronously

### Admin Access
- Set `is_admin = true` in the `profiles` table via Supabase SQL Editor
- Admin accounts have `tier = admin`, 20 credits/month for seed posting, 10 turns/session
- Admin accounts cannot use Forge — only the Seed Generator in the admin panel
- The Admin nav link in the header is only visible when `profile.tier === 'admin'`
