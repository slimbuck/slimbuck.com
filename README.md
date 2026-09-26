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

## Refresh the Chirky games

The playable build in `apps/chirky/` is owned and built by the
[Chirky repository](https://github.com/slimbuck/chirky). Its `build.json` records
the source commit, uncommitted-change status and exact file hashes. Do not edit
the bundled player here: configuration bundling and iframe focus behaviour are
part of Chirky's shared browser build.

From the Chirky checkout, run `make web` and
`node tools/export-web.cjs ../slimbuck.com` (adjust the destination path).
On Windows, build with `wsl make web NODE=node.exe`. The export runs both games'
desktop/mobile browser checks against the standalone build before replacing
this site's `apps/chirky/` with identical files. It does not commit or publish.
Commit Chirky first and rebuild when preparing a release from a clean revision.

Here, run `npm run build` and preview/check the result before committing and
pushing. This site's build copies the entire bundle unchanged, including
`configs.json`; `.gitattributes` prevents Git newline conversion from altering
the tested bytes. No game server is required.

Deployment waits for cache invalidation and runs `tools/check-chirky.js` to
verify all public game resources against the build. To check a local preview:
`node tools/check-chirky.js http://127.0.0.1:8772/`.

See [DEPLOY.md](DEPLOY.md) for content examples, manual deployment, and AWS setup.
