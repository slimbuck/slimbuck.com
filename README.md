# slimbuck.com

A static site built from Markdown with Node.js. The `main` branch is deployed
automatically to AWS S3 and CloudFront by
[GitHub Actions](https://github.com/slimbuck/slimbuck.com/actions/workflows/deploy.yml).

## Update the site

1. Edit or add Markdown in `content/`:
   - `projects/`: personal projects, ordered by the front-matter `order` field.
   - `work/`: work projects, also ordered by `order`.
   - `blog/`: posts named `YYYY-MM-DD-slug.md`, ordered by `date`.
   - `about.md`: the About page.
2. Use Node.js 22 or newer (the deployment version is in `.nvmrc`). Run `npm ci`
   when setting up the checkout or after changing dependencies.
3. Run `npm run serve` to build and preview locally. It prints the preview URL.
   To build without starting a server, run `npm run build`.
4. Review the result, commit the intended source changes, then `git push origin main`.
5. Check the Actions deployment completes successfully, then check the live site.

**Pushing to `main` publishes the site.** `dist/` is generated and ignored by Git;
edit the source Markdown and assets rather than the generated HTML.

For example, `content/projects/chirky.md` appears in `/projects/` and produces
the standalone page `/projects/chirky.html`. An optional `embed: /apps/name/`
front-matter field adds a playable app; its static files live in `apps/name/`.

## Chirky

Chirky publishes independently at [chirky.org](https://chirky.org/). This site
links to it from the project page. The historical `apps/chirky/` bundle is
excluded from builds; its old root URL contains a redirect fallback that
preserves game and level query parameters. No Chirky build is needed here.

`npm run build` checks the outgoing link and rejects a restored embed. Publish
`aws/cf-rewrite.js` to the existing CloudFront viewer-request function to enable
HTTP 301 redirects for old `/apps/chirky/` URLs and their query strings.
Deploy these changes only after chirky.org has passed its release checks.

See [DEPLOY.md](DEPLOY.md) for content examples, manual deployment, and AWS setup.
