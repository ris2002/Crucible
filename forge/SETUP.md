# FORGE — Local Setup Guide

## Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project (already set up)
- Stripe account (test mode)
- Anthropic API key

---

## Step 1: Supabase Database

1. Go to your Supabase dashboard → **SQL Editor**
2. Run `schema.sql` (creates all tables + RLS policies)
3. Optionally run `seed.sql` after creating 2 test accounts via signup

---

## Step 2: Backend

```bash
cd forge/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Edit `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-YOUR_REAL_KEY_HERE
SUPABASE_URL=https://tmacsxpaxcuzcufxzkrp.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_03j90PkyvlItBHNgW9Ns-w_kLuBW_M_
STRIPE_SECRET_KEY=sk_test_51M1YEwS...
STRIPE_WEBHOOK_SECRET=whsec_...  (from Stripe CLI)
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

Test: http://localhost:8000/health

---

## Step 3: Stripe Webhook (for payment testing)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:8000/payments/webhook
# Copy the webhook signing secret → paste into STRIPE_WEBHOOK_SECRET
```

For Stripe subscriptions, you need to create products/prices in the Stripe dashboard:
- Thinker: £4/month recurring → copy the Price ID → set `STRIPE_PRICE_THINKER=price_xxx` in .env
- Scholar: £9/month recurring → copy the Price ID → set `STRIPE_PRICE_SCHOLAR=price_xxx` in .env

---

## Step 4: Frontend

```bash
cd forge/frontend
npm install
```

`frontend/.env` is already configured with your keys.

```bash
npm run dev
```

Open: http://localhost:5173

---

## Step 5: First use

1. Go to http://localhost:5173
2. Click **Join Forge** → sign up
3. You get 3 free credits
4. Click **Forge an Idea** → select domain and genre → start chatting
5. After 4–8 turns the AI will produce a FORGE_READY draft
6. Edit the draft → Post to Feed (costs 1 credit)

---

## Architecture

```
forge/
├── backend/          FastAPI on localhost:8000
│   ├── main.py
│   ├── routers/      forge, ideas, users, comments, credits, payments
│   ├── services/     anthropic, supabase, stripe
│   └── middleware/   JWT auth
├── frontend/         React + Vite on localhost:5173
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── lib/
├── schema.sql        Run in Supabase SQL editor
└── seed.sql          Optional seed data
```

---

## Key notes

- **API key**: Never exposed to frontend. All Anthropic calls go through the backend.
- **Credits**: Deducted atomically only on Post. Drafts and abandoned sessions are free.
- **Web search**: The forge chat uses Anthropic's `web_search_20250305` tool to ground questions in real evidence.
- **No algorithm**: Feed is chronological or by spark count. No ML ranking, ever.

---

## Deployment (5% — later)

- Frontend → Vercel (`vercel deploy` from `frontend/`)
- Backend → Railway (connect GitHub repo, set env vars)
- Supabase → already cloud, nothing changes
