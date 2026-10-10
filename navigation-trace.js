// Connect the active section to its selected entry without changing link behavior.
// Without JavaScript, the ordinary navigation and header divider remain intact.
const sectionLink = document.querySelector('.site-nav a[aria-current]');
const entryLink = document.querySelector('.entry-list a[aria-current]');

if (sectionLink && entryLink) {
    const namespace = 'http://www.w3.org/2000/svg';
    const trace = document.createElementNS(namespace, 'svg');
    trace.classList.add('navigation-trace');
    trace.setAttribute('aria-hidden', 'true');
    trace.setAttribute('focusable', 'false');
    const path = document.createElementNS(namespace, 'path');
    const sourceTerminal = document.createElementNS(namespace, 'circle');
    sourceTerminal.classList.add('source-terminal');
    sourceTerminal.setAttribute('r', '3');
    const terminal = document.createElementNS(namespace, 'circle');
    terminal.setAttribute('r', '3');
    trace.append(path, sourceTerminal, terminal);
    document.body.append(trace);
    document.body.classList.add('has-navigation-trace');

    const header = document.querySelector('.header');
    const entries = document.querySelector('.entry-list');
    let pendingFrame;

    const draw = () => {
        const body = document.body.getBoundingClientRect();
        const source = sectionLink.getBoundingClientRect();
        const target = entryLink.getBoundingClientRect();
        const menu = entries.getBoundingClientRect();
        const headerBox = header.getBoundingClientRect();
        const startX = source.left + source.width / 2 - body.left;
        const startY = source.bottom - body.top;
        const endX = target.left + target.width / 2 - body.left;
        const endY = target.top - body.top;
        const laneY = (headerBox.bottom + menu.top) / 2 - body.top;
        let route = `M ${startX} ${startY} V ${laneY}`;

        if (target.top > menu.top + 4) {
            // Wrapped entries: travel around earlier rows, never through their text.
            const gutterX = menu.left - body.left - 8;
            const rowY = endY - 5;
            route += ` H ${gutterX} V ${rowY} H ${endX}`;
        } else {
            route += ` H ${endX}`;
        }

        path.setAttribute('d', `${route} V ${endY}`);
        sourceTerminal.setAttribute('cx', startX);
        sourceTerminal.setAttribute('cy', startY);
        terminal.setAttribute('cx', endX);
        terminal.setAttribute('cy', endY);
        trace.setAttribute('height', Math.ceil(target.bottom - body.top));
    };

    const scheduleDraw = () => {
        cancelAnimationFrame(pendingFrame);
        pendingFrame = requestAnimationFrame(draw);
    };

    draw();
    const observer = new ResizeObserver(scheduleDraw);
    observer.observe(header);
    observer.observe(entries);
    window.addEventListener('resize', scheduleDraw);
    document.fonts.ready.then(scheduleDraw);
}
