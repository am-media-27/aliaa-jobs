# Aliaa — Cloud Job Search Hub

Always-on version of your Job Search Hub that auto-refreshes every morning and is reachable from any device (iPad, phone, anyone's computer) at a public URL.

## What it does
Every day at 06:30 UTC (10:30 Dubai time), a GitHub Actions workflow:
1. Triggers the same Apify scrapers your laptop runs (LinkedIn posts, LinkedIn Jobs, Indeed, Bayt, GulfTalent)
2. Filters and de-dupes against the state file in `data/state.json`
3. Drops any role posted more than 21 days ago
4. Rebuilds `index.html` (full hub) and `mobile.html` (iPad view)
5. Commits the changes — GitHub Pages serves them at your public URL within ~1 minute

## One-time setup (10 minutes)

### 1. Create the repo
- Log in to https://github.com
- Click the **+** top-right → **New repository**
- Repository name: `aliaa-jobs` (or anything; remember it for step 6)
- **Public** (required for free GitHub Pages)
- Tick **"Add a README file"** then click **Create repository**

### 2. Upload these files
- In the repo, click **Add file → Upload files**
- Drag the *contents* of this `cloud-hub` folder (not the folder itself — open it first, then select everything inside: `.github`, `scripts`, `data`, `package.json`, `README.md`)
- Commit message: `Initial cloud hub setup`
- Click **Commit changes**

### 3. Add your Apify token as a secret
- Get your Apify API token: https://console.apify.com/settings/integrations → copy the **Personal API token**
- In your GitHub repo, go to **Settings → Secrets and variables → Actions**
- Click **New repository secret**
- Name: `APIFY_TOKEN`
- Secret: paste your token
- Click **Add secret**

### 4. Enable GitHub Pages
- In the repo, go to **Settings → Pages**
- Under "Build and deployment": Source = **Deploy from a branch**
- Branch: **main**, folder: **/ (root)**
- Click **Save**
- After a minute, your URL appears at the top of that page: `https://<your-username>.github.io/aliaa-jobs/`

### 5. First run
- Go to **Actions** tab in your repo
- Click **Refresh hub** workflow on the left
- Click **Run workflow** → **Run workflow** (green button)
- Wait ~3 minutes. When it's green, your hub is live.

### 6. Open from iPad
- Safari → enter `https://<your-username>.github.io/aliaa-jobs/mobile.html`
- Share icon → **Add to Home Screen** → tap the icon any time

## Daily refresh
Runs automatically at 06:30 UTC every day. Each run:
- Costs ~$0 (Apify free tier covers it, GitHub Actions free for public repos)
- Takes ~3 minutes

## Manual trigger
Actions tab → Refresh hub → Run workflow. Useful if you want fresh data ad-hoc.

## Files
- `index.html` — full desktop hub (generated)
- `mobile.html` — iPad-friendly view (generated)
- `data/state.json` — persistent state across runs (auto-updated)
- `scripts/scrape.js` — calls Apify
- `scripts/process.js` — filters, dedupes, classifies fit
- `scripts/build-hub.js` — generates HTML
- `.github/workflows/refresh.yml` — daily schedule
