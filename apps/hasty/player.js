(() => {
    const canvas = document.getElementById('canvas');
    const status = document.getElementById('game-status');

    function fail(message) {
        canvas.hidden = true;
        status.hidden = false;
        status.textContent = message;
    }

    window.Module = {
        canvas,
        onRuntimeInitialized() {
            status.hidden = true;
            canvas.hidden = false;
        },
        onAbort() {
            fail('HASTY could not start. Reload the page to try again.');
        }
    };

    // Only take keyboard focus when the player interacts with the game.
    canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll: true }));
    canvas.addEventListener('keydown', event => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    });

    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
        fail('HASTY needs a browser with shared-memory support and an isolated game page.');
        if (window !== window.top) {
            const link = document.createElement('a');
            link.href = './';
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = ' Open HASTY in its own tab.';
            status.append(link);
        }
    } else {
        const script = document.createElement('script');
        script.src = 'hasty.js';
        script.onerror = () => fail('HASTY could not download. Reload the page to try again.');
        document.body.append(script);
    }
})();
