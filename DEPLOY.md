# Deploying to Cloudflare Pages

This site is a Jekyll site. Cloudflare Pages builds it on every push.

## 1. Connect the repo (one-time, ~3 min)

1. Go to **dash.cloudflare.com → Workers & Pages → Create → Pages → "Connect to Git"**.
2. Authorize GitHub and select **Joongeun/joongeun.github.io**.
3. **Production branch:** `redesign` (or merge `redesign` → `main` first and use `main`).
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

## Local development

```bash
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
bundle install
bundle exec jekyll serve --livereload   # http://127.0.0.1:4000
```
Use Homebrew **ruby@3.3** — system Ruby 2.6 is EOL and Homebrew's default Ruby 4.0
can't compile native gems with the current Xcode CLT.
