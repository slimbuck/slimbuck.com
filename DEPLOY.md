# Deploying slimbuck.com

The site is a static site hosted on **AWS S3 + CloudFront**. This document
covers how to build, deploy, and the one-time AWS setup.

## TL;DR (once set up)

```bash
export AWS_S3_BUCKET=slimbuck.com                       # your bucket name
export AWS_CLOUDFRONT_DISTRIBUTION_ID=E123ABC...        # your distribution id
./deploy.sh
```

`deploy.sh` builds the site into `dist/`, syncs it to S3, fixes `.wasm`
content-types, and invalidates the CloudFront cache.

---

## 1. Find your existing bucket & distribution

You said you're logged into the AWS console. You need two values.

**CloudFront distribution id**
- Console → **CloudFront** → Distributions. Find the one whose "Alternate
  domain names (CNAMEs)" includes `slimbuck.com`. Copy its **ID** (looks like
  `E1A2B3C4D5E6F7`) and note the **Origin** (the S3 bucket it points at).

**S3 bucket name**
- The origin from above is your bucket. Or Console → **S3** and look for a
  bucket named `slimbuck.com` (or similar).

If you have the AWS CLI configured, these do the same:

```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[].{Id:Id,Domains:Aliases.Items,Origin:Origins.Items[0].DomainName}" \
  --output table

aws s3 ls
```

## 2. Install the AWS CLI (local deploys)

```bash
brew install awscli          # macOS
aws --version                # confirm v2.x
```

## 3. Choose how to authenticate

### Option A — GitHub Actions with OIDC (recommended, no stored keys)

A workflow is included at `.github/workflows/deploy.yml`. It assumes an IAM
role via OIDC, so there are no long-lived secrets.

1. **Create the OIDC identity provider** (once per AWS account):
   IAM → Identity providers → Add provider → OpenID Connect
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

2. **Create an IAM role** for deploys:
   - Trusted entity: Web identity → the provider above.
   - Trust policy from `aws/github-oidc-trust.json` (replace `<ACCOUNT_ID>`). It
     pins the subject to the `main` branch so only pushes to `main` — not other
     branches, tags, or pull requests — can assume the role:

     ```json
     {
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
             "token.actions.githubusercontent.com:sub": "repo:slimbuck/slimbuck.com:ref:refs/heads/main"
           }
         }
       }]
     }
     ```

   > If an existing role uses the broader `"...:sub": "repo:.../*"` (a
   > `StringLike`), tighten it in **IAM → Roles → *your role* → Trust
   > relationships → Edit** by pasting the policy above. Editing the JSON file in
   > this repo does not change AWS — the trust policy must be updated in the
   > console (or via `aws iam update-assume-role-policy`).

   - Attach a permissions policy using `aws/deploy-policy.json` (fill in the
     placeholders first — `<BUCKET>`, `<ACCOUNT_ID>`, `<DISTRIBUTION_ID>`).

3. **Add repo variables** (GitHub → Settings → Secrets and variables → Actions
   → Variables): `AWS_ROLE_ARN`, `AWS_REGION` (e.g. `us-east-1`),
   `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DISTRIBUTION_ID`.

4. Push to the deploy branch → it deploys automatically.

### Option B — IAM user with access keys (simplest for local `./deploy.sh`)

1. IAM → Users → Create user (e.g. `slimbuck-deploy`), **no console access**.
2. Attach a policy from `aws/deploy-policy.json` (fill in the placeholders).
3. Create an access key (type: CLI) and run `aws configure` with it.
4. Run `./deploy.sh` as in the TL;DR.

> Option A is preferred because there are no keys to leak or rotate.

## 4. One-time CloudFront settings to check

- **Default root object**: set to `index.html` (so `/` serves the home page).
- **Directory URLs**: because the origin is the S3 *REST* endpoint (not the S3
  *website* endpoint), it does not resolve `/blog/` to `/blog/index.html`, and
  it returns `403` (not `404`) for missing objects. This is handled by a
  CloudFront Function (`aws/cf-rewrite.js`, named `slimbuck-rewrite`) attached
  to the default behavior's **viewer-request** event, which rewrites directory
  URLs to `index.html`.
- **Custom error responses**: `404 → /404.html` and `403 → /404.html`, both
  with response code `404` (the 403 mapping catches missing objects from the
  REST origin).
- **COOP/COEP headers**: Playtracer and HASTY use threads/`SharedArrayBuffer`,
  which need `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`. These currently apply to the
  whole site via a response-headers policy on the default behavior. That's fine
  unless you enable comments — see §8, which scopes them to `/apps/*` so the
  giscus iframe can load on blog pages.

## 5. Which branch is deployed?

The repo has been consolidated to a single branch, **`main`**, which is the
default branch (the old `master` and `hasty` branches were removed). The
GitHub Actions workflow triggers on pushes to `main`; change the branch in
`.github/workflows/deploy.yml` if you prefer a different one.

---

## 6. Post-launch SEO checklist (do this once live)

These matter as much as the on-page changes for actually showing up when people
Google "Donovan Hutchence":

1. **Google Search Console** (https://search.google.com/search-console)
   - Add property for `slimbuck.com` (Domain property = add a DNS TXT record; if
     the domain is in Route 53 this is quick).
   - Submit `https://slimbuck.com/sitemap.xml`.
   - Use **URL Inspection** on the home page → **Request indexing**.
2. **Bing Webmaster Tools** (https://www.bing.com/webmasters) — add site, submit
   the same sitemap (also feeds DuckDuckGo).
3. **Validate structured data**: https://search.google.com/test/rich-results
   (paste `https://slimbuck.com/`) — confirm the `Person` schema is detected.
4. **Link your name back to the site** from profiles Google already trusts:
   GitHub profile website field, LinkedIn "Contact info" website, Twitter/X bio.
   Consistent name + link across profiles strongly reinforces the association.
5. Give it 1–4 weeks. Indexing and ranking for a personal-name query is not
   instant, but the schema + name-in-title + backlinks are the levers that move
   it.

## 7. Editing content

All content is Markdown under `content/`, and the build assembles the whole site
into `dist/` (the deploy root). Run `npm run build` after any change.

### Blog post

1. Add `content/blog/YYYY-MM-DD-my-slug.md` with front matter:

   ```markdown
   ---
   title: "My post title"
   date: "2026-08-01"
   description: "One-sentence summary used for SEO and the listing."
   tags: ["graphics", "webassembly"]
   ---

   Your Markdown content here.
   ```

2. Run `npm run build` (regenerates `dist/`, including `index.html`, the
   `dist/blog/` permalinks, `rss.xml`, and `sitemap.xml`).
3. Commit and deploy. Set `draft: true` in front matter to skip an entry.

### Work / projects entry

Add a Markdown file under `content/work/` or `content/projects/`. These sort by
an `order` field instead of `date`:

```markdown
---
title: "Project name"
order: 1
description: "One-sentence summary used for SEO and the listing."
---

Your Markdown content here.
```

A `projects` entry can embed an interactive app that loads when its entry is
expanded by adding `embed: /apps/<name>/` (and optional `embedHeight: 500`).

### About page

Edit `content/about.md`. The `{{social}}` placeholder is replaced with the
social-icon row built from the `social:` list in its front matter.

> Preview locally with `npm run serve` (builds, then serves `dist/`).

---

## 8. Comments (giscus)

Blog permalink pages can show a comments thread via [giscus](https://giscus.app),
which stores comments as **GitHub Discussions**. Each post gets its own thread
(keyed by URL path). It's wired into `build.js` but **disabled** until the two
IDs below are filled in.

### One-time setup

1. Make the `slimbuck/slimbuck.com` repo **public** and enable **Discussions**
   (repo → Settings → General → Features → Discussions).
2. Install the **giscus GitHub App** (https://github.com/apps/giscus) and grant
   it access to this repo.
3. Create a Discussions **category** for comments (e.g. "Comments", format
   "Announcements" so only maintainers can open threads — giscus opens them on
   demand).
4. Go to https://giscus.app, enter the repo, and copy the generated
   `data-repo-id` and `data-category-id`.
5. Paste them into the `GISCUS` block in `build.js`:

   ```js
   const GISCUS = {
       repo: 'slimbuck/slimbuck.com',
       repoId: 'R_kgD...',        // <- from giscus.app
       category: 'Comments',
       categoryId: 'DIC_kwD...',  // <- from giscus.app
       ...
   };
   ```

6. `npm run build` — the widget now renders on blog permalink pages.

### Required: scope the isolation headers (or giscus won't load)

The site currently returns `Cross-Origin-Embedder-Policy: require-corp` (and
`Cross-Origin-Opener-Policy: same-origin`) on **every** response. Under
`require-corp` the browser refuses to load the cross-origin giscus iframe, so
comments silently fail. Only Playtracer/HASTY actually need those headers (for
`SharedArrayBuffer`/threads), so scope them to `/apps/*`:

1. CloudFront → your distribution → **Behaviors**.
2. Create a new behavior with **Path pattern `/apps/*`** and attach the existing
   response-headers policy that sets COOP/COEP (leave everything else matching
   the default behavior — same origin, cache policy, and the `slimbuck-rewrite`
   function on viewer-request).
3. Edit the **Default (`*`)** behavior to use a response-headers policy
   *without* COOP/COEP (e.g. the AWS managed `SecurityHeadersPolicy`, or a
   custom one).
4. Create an invalidation for `/*`.

After this, `/apps/*` stays cross-origin isolated while blog pages drop the
headers so giscus (and any future third-party embed) works.
