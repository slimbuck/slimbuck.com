// These players are served from the same origin. Match their content height so
// controls, canvas and output scroll together with the surrounding article.
for (const frame of document.querySelectorAll('iframe[data-auto-height]')) {
    let observer;
    const fitContent = () => {
        observer?.disconnect();
        const body = frame.contentDocument?.body;
        if (!body) return;

        const resize = () => {
            const height = Math.ceil(body.getBoundingClientRect().height);
            if (height > 0) frame.parentElement.style.height = `${height}px`;
        };
        observer = new ResizeObserver(resize);
        observer.observe(body);
        resize();
    };
    frame.addEventListener('load', fitContent);
    if (frame.contentDocument?.readyState === 'complete') fitContent();
}
