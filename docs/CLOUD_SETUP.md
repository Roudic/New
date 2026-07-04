# Connect JoltCheck to Turso (cloud database)

Your live app: **https://new-sand-six-69.vercel.app**

Right now it shows `"DATABASE_URL is not set"` — so it's still in offline demo mode.

## Option A — Automated script (fastest)

1. **Turso account** — sign up with GitHub:  
   https://api.turso.tech/signup?redirect=false

2. **Log in locally** (on your computer):
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```

3. **Vercel token** — create at https://vercel.com/account/tokens

4. **Run setup** from the project folder:
   ```bash
   export VERCEL_TOKEN=your_vercel_token
   export VERCEL_URL=https://new-sand-six-69.vercel.app
   chmod +x scripts/setup-cloud.sh
   ./scripts/setup-cloud.sh
   ```

The script creates the Turso database, sets Vercel env vars, pushes the schema, seeds demo users, and verifies `/api/health`.

---

## Option B — Manual (no CLI)

### 1. Turso dashboard

1. Go to [turso.tech](https://turso.tech) → create database **`joltcheck`**
2. Copy:
   - **Database URL** (`libsql://...`)
   - **Auth token**

### 2. Vercel env vars

Open your Vercel project → **Settings → Environment Variables** and add:

| Name | Value |
|------|--------|
| `DATABASE_URL` | `libsql://...` from Turso |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `NEXTAUTH_SECRET` | any long random string |
| `NEXTAUTH_URL` | `https://new-sand-six-69.vercel.app` |
| `SETUP_SECRET` | any random string (optional) |

Apply to **Production**, **Preview**, and **Development**.

### 3. Redeploy

Vercel → **Deployments** → Redeploy latest `main`.

### 4. Seed the database

From your computer (with Turso URL/token in env):

```bash
DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run db:push
DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run db:seed
```

Or after deploy:

```bash
curl -X POST https://new-sand-six-69.vercel.app/api/setup \
  -H "x-setup-secret: YOUR_SETUP_SECRET"
```

### 5. Verify

Open: https://new-sand-six-69.vercel.app/api/health  

Expected: `{"ok":true,"needsSeed":false}`

Then sign in: https://new-sand-six-69.vercel.app/login

---

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@joltcheck.com | admin123 |
| Employee | alex@store.com | employee123 |

After cloud mode is active, the login page shows **“Connected to cloud database”** and data syncs across devices.
