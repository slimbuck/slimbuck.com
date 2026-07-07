// Static site build step.
//
// Reads Markdown content from content/{blog,work,projects} and content/about.md,
// renders each collection into collapsible index pages plus per-entry permalink
// pages using the same look as the rest of the site, and (re)generates rss.xml
// and sitemap.xml. The generated pages plus the hand-authored static assets are
// assembled into dist/, which is the complete, self-contained deploy root.
//
//   dist/index.html          <- blog collection index (home)
//   dist/blog/<slug>.html    <- blog permalinks
//   dist/work/               <- work collection index (+ /work/<slug>.html)
//   dist/projects/           <- projects collection index (+ /projects/<slug>.html)
//   dist/about/              <- bio page (content/about.md)
//   dist/{css,apps,docs,...} <- copied static assets
//
// Usage: npm run build

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Everything the site needs is assembled into this folder, which becomes the
// deploy root. It is regenerated from scratch on every build and gitignored.
const OUT_DIR = path.join(__dirname, 'dist');
const out = (...p) => path.join(OUT_DIR, ...p);

// Hand-authored files/dirs copied verbatim into dist/ alongside the generated
// pages. Everything else at the repo root is source or tooling.
const STATIC_ASSETS = [
    'style.css',
    'text.css',
    'blog.css',
    'icon.png',
    '404.html',
    'robots.txt',
    'apps',
    'docs'
];

const SITE = {
    url: 'https://slimbuck.com',
    title: 'slimbuck',
    author: 'Donovan Hutchence',
    authorHandle: '@slimbuck7',
    description: 'Notes on graphics, games and software engineering by Donovan Hutchence (slimbuck).',
    image: 'https://slimbuck.com/icon.png'
};

// Person structured data (SEO signal for searches on the author's name). Shown
// on the highest-authority pages: the site root (blog) and /about/.
const PERSON_JSON_LD = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Donovan Hutchence',
    alternateName: 'slimbuck',
    url: SITE.url + '/',
    image: SITE.image,
    jobTitle: 'Software Engineer',
    worksFor: {
        '@type': 'Organization',
        name: 'PlayCanvas (Snap Inc.)',
        url: 'https://playcanvas.com/'
    },
    homeLocation: { '@type': 'Place', name: 'London, United Kingdom' },
    knowsAbout: [
        'Real-time graphics', 'Game development', 'WebAssembly',
        'C++', 'Rendering', 'Path tracing', 'WebGL', 'Gaussian splatting'
    ],
    sameAs: [
        'https://github.com/slimbuck',
        'https://twitter.com/slimbuck7',
        'https://www.linkedin.com/in/dhutchence/'
    ]
};

// giscus comments (https://giscus.app), rendered on blog permalink pages.
// Disabled until repoId AND categoryId are filled in — get both from the
// configurator at https://giscus.app after enabling GitHub Discussions on the
// repo and installing the giscus app. NOTE: the site's global COEP
// (`require-corp`) header must be scoped to /apps/* first, or the browser will
// refuse to load the giscus iframe (see DEPLOY.md §8).
const GISCUS = {
    repo: 'slimbuck/slimbuck.com',
    repoId: 'MDEwOlJlcG9zaXRvcnkyNDQxNTMxMTc=',
    category: 'General',
    categoryId: 'DIC_kwDODo17Hc4DAs9g',
    mapping: 'pathname',
    theme: 'light',
    reactionsEnabled: '0',
    inputPosition: 'bottom',
    lang: 'en'
};

const renderGiscus = () => {
    if (!GISCUS.repoId || !GISCUS.categoryId) return '';
    return `            <div class="comments">
                <script src="https://giscus.app/client.js"
                    data-repo="${GISCUS.repo}"
                    data-repo-id="${GISCUS.repoId}"
                    data-category="${GISCUS.category}"
                    data-category-id="${GISCUS.categoryId}"
                    data-mapping="${GISCUS.mapping}"
                    data-strict="1"
                    data-reactions-enabled="${GISCUS.reactionsEnabled}"
                    data-emit-metadata="0"
                    data-input-position="${GISCUS.inputPosition}"
                    data-theme="${GISCUS.theme}"
                    data-lang="${GISCUS.lang}"
                    crossorigin="anonymous"
                    async>
                </script>
            </div>`;
};

// Collections rendered from content/<name>/*.md.
const COLLECTIONS = [
    {
        name: 'blog',
        srcDir: 'content/blog',
        sort: 'date',
        rss: true,
        person: true,
        indexOut: 'index.html',
        permalinkDir: 'blog',
        permalinkBase: '/blog',
        canonical: SITE.url + '/',
        indexHref: '/',
        heading: 'Blog',
        intro: 'Occasional notes on graphics, games and software engineering.',
        indexTitle: 'Donovan Hutchence (slimbuck) — Blog',
        indexDescription: SITE.description,
        backLabel: 'the blog',
        sitemapPriority: '1.0'
    },
    {
        name: 'work',
        srcDir: 'content/work',
        sort: 'order',
        indexOut: 'work/index.html',
        permalinkDir: 'work',
        permalinkBase: '/work',
        canonical: SITE.url + '/work/',
        indexHref: '/work/',
        heading: 'Work',
        intro: 'I am fortunate to work on open source projects much of time at PlayCanvas. These are some of those projects.',
        indexTitle: 'Work — Donovan Hutchence (slimbuck)',
        indexDescription: 'Open-source graphics and Gaussian splatting projects Donovan Hutchence works on at PlayCanvas.',
        backLabel: 'all work',
        sitemapPriority: '0.8'
    },
    {
        name: 'projects',
        srcDir: 'content/projects',
        sort: 'order',
        embeds: true,
        indexOut: 'projects/index.html',
        permalinkDir: 'projects',
        permalinkBase: '/projects',
        canonical: SITE.url + '/projects/',
        indexHref: '/projects/',
        heading: 'Projects',
        intro: 'Interactive experiments that run in your browser.',
        indexTitle: 'Projects — Donovan Hutchence (slimbuck)',
        indexDescription: 'Browser-based graphics experiments by Donovan Hutchence, written in C++ and compiled to WebAssembly.',
        backLabel: 'all projects',
        sitemapPriority: '0.8'
    }
];

// Extra standalone pages (the interactive apps) included in the sitemap.
const STATIC_PAGES = [
    { loc: '/apps/playtracer/', priority: '0.6' },
    { loc: '/apps/hasty/', priority: '0.6' }
];

const escapeHtml = (s = '') =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const slugFromFilename = (file) =>
    path.basename(file, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '');

const formatDate = (iso) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });

// Brand icons (inline SVG, public-domain marks from simple-icons). Use
// currentColor so they inherit the button's text colour.
const SOCIAL_ICONS = {
    github: {
        label: 'GitHub',
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>'
    },
    twitter: {
        label: 'Twitter / X',
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    },
    linkedin: {
        label: 'LinkedIn',
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
    }
};

const renderSocial = (social = []) => {
    const links = social
        .map((s) => {
            const icon = SOCIAL_ICONS[s.platform];
            if (!icon) return '';
            return `                <a href="${s.url}" title="${icon.label}" aria-label="${icon.label}" target="_blank" rel="me noopener">${icon.svg}</a>`;
        })
        .filter(Boolean)
        .join('\n');
    return `            <div class="social">\n${links}\n            </div>`;
};

const jsonLdScript = (obj) =>
    '        <script type="application/ld+json">\n' +
    JSON.stringify(obj, null, 2) +
    '\n        </script>';

// Lazily loads an embedded app into its iframe the first time its entry is
// expanded, and frees it (unloading WASM/threads) when collapsed.
const EMBED_SCRIPT = `            <script>
                document.querySelectorAll('details.post-entry').forEach(function (d) {
                    d.addEventListener('toggle', function () {
                        var box = d.querySelector('.app-embed');
                        if (!box) return;
                        if (d.open) {
                            if (!box.querySelector('iframe')) {
                                var f = document.createElement('iframe');
                                f.src = box.getAttribute('data-src');
                                f.title = box.getAttribute('data-title') || '';
                                box.appendChild(f);
                            }
                        } else {
                            box.innerHTML = '';
                        }
                    });
                });
            </script>`;

const NAV = [
    { href: '/', label: 'blog', key: 'home' },
    { href: '/work/', label: 'work', key: 'work' },
    { href: '/projects/', label: 'projects', key: 'projects' },
    { href: '/about/', label: 'about', key: 'about' }
];

// Shared page shell so every page matches the site look and navigation.
// `active` highlights the current tab (home | work | projects | about).
const layout = ({ title, description, canonical, headExtra = '', body, active = null }) => {
    const nav = NAV
        .map((n) => `            <a href="${n.href}"${n.key === active ? ' class="active"' : ''}>${n.label}</a>`)
        .join('\n');
    return `<!doctype html>
<html lang="en">
    <head>
        <title>${escapeHtml(title)}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="${escapeHtml(description)}">
        <meta name="author" content="${escapeHtml(SITE.author)}">
        <link rel="canonical" href="${canonical}">

        <meta property="og:type" content="website">
        <meta property="og:site_name" content="${escapeHtml(SITE.title)}">
        <meta property="og:title" content="${escapeHtml(title)}">
        <meta property="og:description" content="${escapeHtml(description)}">
        <meta property="og:url" content="${canonical}">
        <meta property="og:image" content="${SITE.image}">
        <meta name="twitter:card" content="summary">
        <meta name="twitter:site" content="${SITE.authorHandle}">

        <link rel="stylesheet" type="text/css" href="/style.css" />
        <link rel="stylesheet" type="text/css" href="/text.css" />
        <link rel="stylesheet" type="text/css" href="/blog.css" />
        <link rel="icon" type="image/png" href="/icon.png">
        <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.title)} blog" href="/rss.xml">
${headExtra}
    </head>
    <body>
        <div class="header">
            <h1><a href="/">slimbuck.com</a></h1>
${nav}
        </div>
        <div class="content">
${body}
            <div class="footer"></div>
        </div>
    </body>
</html>
`;
};

const readCollection = (cfg) => {
    const dir = path.join(__dirname, cfg.srcDir);
    if (!fs.existsSync(dir)) return [];
    const items = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((file) => {
            const raw = fs.readFileSync(path.join(dir, file), 'utf8');
            const { data, content } = matter(raw);
            if (data.draft) return null;
            const slug = data.slug || slugFromFilename(file);
            return {
                slug,
                title: data.title || slug,
                date: data.date || null,
                order: data.order != null ? Number(data.order) : 0,
                description: data.description || '',
                tags: data.tags || [],
                embed: data.embed || null,
                embedHeight: data.embedHeight || 500,
                html: marked.parse(content),
                url: `${SITE.url}${cfg.permalinkBase}/${slug}.html`
            };
        })
        .filter(Boolean);

    if (cfg.sort === 'date') {
        items.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
        items.sort((a, b) => a.order - b.order);
    }
    return items;
};

const renderTags = (tags) =>
    tags.length
        ? `<div class="post-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')}</div>`
        : '';

// A single collapsible entry on a collection index page.
const renderEntry = (cfg, item) => {
    const meta = item.date
        ? `<span class="post-entry-date">${formatDate(item.date)}</span>`
        : '';
    const embed = item.embed
        ? `
                    <div class="app-embed" style="height:${item.embedHeight}px" data-src="${item.embed}" data-title="${escapeHtml(item.title)}"></div>
                    <p><a href="${item.embed}" target="_blank" rel="noopener">Open full screen &#8599;</a></p>`
        : '';
    return `            <details class="post-entry" id="${item.slug}">
                <summary><span class="post-entry-title">${escapeHtml(item.title)}</span>${meta}</summary>
                <div class="text post">
${item.html}${embed}
                    ${renderTags(item.tags)}
                    <p><a href="${cfg.permalinkBase}/${item.slug}.html">Permalink</a></p>
                </div>
            </details>`;
};

const renderIndex = (cfg, items) => {
    const entries = items.map((i) => renderEntry(cfg, i)).join('\n');
    const rssLink = cfg.rss ? ' <a href="/rss.xml">RSS feed</a>' : '';
    const trailing = cfg.embeds ? `\n${EMBED_SCRIPT}` : '';
    const body = `            <div class="text">
                <p>${cfg.intro}${rssLink}</p>
            </div>
${entries || '            <div class="text">Nothing here yet — check back soon.</div>'}${trailing}`;

    return layout({
        title: cfg.indexTitle,
        description: cfg.indexDescription,
        canonical: cfg.canonical,
        headExtra: cfg.person ? jsonLdScript(PERSON_JSON_LD) : '',
        active: cfg.name === 'blog' ? 'home' : cfg.name,
        body
    });
};

const renderPermalink = (cfg, item) => {
    let headExtra = '';
    if (cfg.name === 'blog') {
        headExtra = jsonLdScript({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: item.title,
            description: item.description,
            datePublished: item.date,
            url: item.url,
            image: SITE.image,
            author: { '@type': 'Person', name: SITE.author, url: SITE.url + '/' },
            mainEntityOfPage: item.url,
            keywords: item.tags.join(', ')
        });
    }

    const meta = item.date
        ? `<p class="post-meta">Posted ${formatDate(item.date)}</p>\n`
        : '';
    const embed = item.embed
        ? `
                <div class="app-embed" style="height:${item.embedHeight}px"><iframe src="${item.embed}" title="${escapeHtml(item.title)}"></iframe></div>
                <p><a href="${item.embed}" target="_blank" rel="noopener">Open full screen &#8599;</a></p>`
        : '';

    const comments = cfg.name === 'blog' ? renderGiscus() : '';
    const body = `            <div class="heading"><h2>${escapeHtml(item.title)}</h2></div>
            <div class="text post">
                ${meta}${item.html}${embed}
                ${renderTags(item.tags)}
                <p><a href="${cfg.indexHref}">&larr; back to ${cfg.backLabel}</a></p>
            </div>${comments ? '\n' + comments : ''}`;

    return layout({
        title: `${item.title} · ${SITE.title}`,
        description: item.description,
        canonical: item.url,
        headExtra,
        active: cfg.name === 'blog' ? 'home' : cfg.name,
        body
    });
};

const renderAbout = () => {
    const file = path.join(__dirname, 'content/about.md');
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    const socialRow = renderSocial(data.social);
    const rendered = marked
        .parse(content)
        .replace(/<p>\s*\{\{social\}\}\s*<\/p>/, socialRow)
        .replace(/\{\{social\}\}/, socialRow);
    const body = `            <div class="panel">
                <div class="text post">
${rendered}
                </div>
            </div>`;
    return layout({
        title: `${data.title || 'About'} — Donovan Hutchence (slimbuck)`,
        description: data.description || SITE.description,
        canonical: SITE.url + '/about/',
        headExtra: data.person ? jsonLdScript(PERSON_JSON_LD) : '',
        active: 'about',
        body
    });
};

const renderRss = (posts) => {
    const items = posts
        .map(
            (p) => `        <item>
            <title>${escapeHtml(p.title)}</title>
            <link>${p.url}</link>
            <guid>${p.url}</guid>
            <pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate>
            <description>${escapeHtml(p.description)}</description>
        </item>`
        )
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>${escapeHtml(SITE.title)}</title>
        <link>${SITE.url}/</link>
        <description>${escapeHtml(SITE.description)}</description>
        <language>en</language>
${items}
    </channel>
</rss>
`;
};

const renderSitemap = (collections) => {
    const today = new Date().toISOString().slice(0, 10);
    const urls = [];
    for (const { cfg, items } of collections) {
        urls.push({ loc: cfg.canonical, lastmod: today, priority: cfg.sitemapPriority });
        for (const item of items) {
            urls.push({ loc: item.url, lastmod: item.date || today, priority: '0.6' });
        }
    }
    urls.push({ loc: SITE.url + '/about/', lastmod: today, priority: '0.7' });
    for (const p of STATIC_PAGES) {
        urls.push({ loc: SITE.url + p.loc, lastmod: today, priority: p.priority });
    }

    const body = urls
        .map(
            (u) => `    <url>
        <loc>${u.loc}</loc>
        <lastmod>${u.lastmod}</lastmod>
        <priority>${u.priority}</priority>
    </url>`
        )
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
};

const copyStaticAssets = () => {
    for (const asset of STATIC_ASSETS) {
        const src = path.join(__dirname, asset);
        if (!fs.existsSync(src)) {
            console.warn(`  ! skipping missing asset: ${asset}`);
            continue;
        }
        fs.cpSync(src, out(asset), { recursive: true });
    }
};

const main = () => {
    // Start from a clean output dir so removed content never lingers.
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });

    copyStaticAssets();

    const collections = COLLECTIONS.map((cfg) => ({ cfg, items: readCollection(cfg) }));

    for (const { cfg, items } of collections) {
        fs.mkdirSync(out(cfg.permalinkDir), { recursive: true });
        const indexPath = out(cfg.indexOut);
        fs.mkdirSync(path.dirname(indexPath), { recursive: true });
        fs.writeFileSync(indexPath, renderIndex(cfg, items));
        for (const item of items) {
            fs.writeFileSync(
                out(cfg.permalinkDir, `${item.slug}.html`),
                renderPermalink(cfg, item)
            );
        }
    }

    fs.mkdirSync(out('about'), { recursive: true });
    fs.writeFileSync(out('about', 'index.html'), renderAbout());

    const blog = collections.find((c) => c.cfg.name === 'blog');
    fs.writeFileSync(out('rss.xml'), renderRss(blog ? blog.items : []));
    fs.writeFileSync(out('sitemap.xml'), renderSitemap(collections));

    for (const { cfg, items } of collections) {
        console.log(`${cfg.name}: ${items.length} entr${items.length === 1 ? 'y' : 'ies'}`);
        for (const item of items) console.log(`  - ${cfg.permalinkBase}/${item.slug}.html`);
    }
    console.log('Built site into dist/');
};

main();
