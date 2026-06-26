# Deploying to Cloudflare Pages

This site is a Jekyll site. Cloudflare Pages builds it on every push.

> ⚠️ **Use the Pages flow, NOT the Workers / Wrangler "auto-config" import.**
> The Workers flow wraps the build as `npx bundle exec jekyll build`, and `npx`
> can't run Ruby's `bundle` → it fails with *"could not determine executable to
> run."* A Jekyll build must run as a plain shell command (Pages does this), not
> via npx. If you accidentally made a Workers project, delete it and create a
> **Pages** project as below.

## 1. Connect the repo (one-time, ~3 min)

1. Go to **dash.cloudflare.com → Workers & Pages → Create →** choose the **Pages** tab **→ "Connect to Git"**.
2. Authorize GitHub and select **Joongeun/joongeun.github.io**.
3. **Production branch:** `main`.
4. **Build settings:**
   | Field | Value |
   |-------|-------|
   | Framework preset | `None` (or `Jekyll` if listed) |
   | Build command | `bundle exec jekyll build` |
   | Build output directory | `_site` |
5. (Optional but recommended) Add an environment variable **`RUBY_VERSION` = `3.3.6`**
   — though `.ruby-version` in the repo already pins this.
6. **Save and Deploy.** First build runs `bundle install` + `jekyll build`.
   Your site goes live at `https://<project>.pages.dev`.

> The repo is pre-configured for this: `.ruby-version` (3.3.6), a `Gemfile.lock`
> with Linux platforms added, and `_config.yml` excludes/keep_files set correctly.

After the first deploy, set `url:` in `_config.yml` to the final URL (e.g.
`https://joonchoi.pages.dev`) so SEO tags and `sitemap.xml` use absolute URLs,
then commit.

## 2. Custom domain (optional)

Pages project → **Custom domains → Set up a domain** → enter your domain and
follow the DNS instructions. (Free `*.pages.dev` works with no setup.)

## 3. Cloudflare Web Analytics (privacy-first, auto bot-filtering)

**Easiest (no code):** In the Pages project → **Metrics / Web Analytics → Enable**.
Cloudflare auto-injects the beacon and excludes bot traffic automatically.

**Or via code:** dash → **Web Analytics → Add a site** → copy the token from the
JS snippet → put it in `_config.yml`:
```yaml
cloudflare_analytics_token: "your-token-here"
```
The beacon (in `_includes/head.html`) only renders when this is set.

## 4. mapmyvisitors stats link

The globe still counts visits. To make clicking it open YOUR stats page, log in
to mapmyvisitors, copy your **public profile / HTML link**, and set it in
`_config.yml`:
```yaml
mapmyvisitors_url: "https://mapmyvisitors.com/web/<your-id>"
```

## Easter-egg step counters (owner only)

How many visitors have solved each step of the gospel-journey easter egg —
step 1 (Konami code), step 2 (feed the flytrap), step 3 (plant the mustard
seed). Bookmark these:

- **Stats badge (on the live site):** <https://joon-choi.pages.dev/?eggstats>
  — adds a small "🥚 solved — step 1: N · step 2: N · step 3: N" badge.
- **Raw JSON:** <https://joon-choi.pages.dev/api/egg> — returns
  `{"step1":N,"step2":N,"step3":N}`.

Backed by the Cloudflare Pages Function `functions/api/egg.js` + a KV namespace
bound as **`EGG_KV`** (Pages project → Settings → Functions → KV namespace
bindings). If the JSON says `"error":"KV not bound"`, the binding is missing or
the project hasn't been redeployed since it was added.

Each browser is counted once (deduped via a localStorage flag), so re-solving on
the same browser won't increment it — test fresh counts in a private window.

## Local development

```bash
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
bundle install
bundle exec jekyll serve --livereload   # http://127.0.0.1:4000
```
Use Homebrew **ruby@3.3** — system Ruby 2.6 is EOL and Homebrew's default Ruby 4.0
can't compile native gems with the current Xcode CLT.
