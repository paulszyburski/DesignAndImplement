(() => {
    "use strict";
    const canvas = document.querySelector("canvas.garden-scroll-video");
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const frameCount = Number(canvas.dataset.frameCount);
    const framesUrl = new URL("../assets/garden-frames/", document.currentScript.src);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cache = new Map();
    let animation = 0, position = 0, target = 0, previousTime = 0;

    function schedule() {
        if (!animation) animation = requestAnimationFrame(render);
    }

    function loadFrame(index) {
        index = Math.max(0, Math.min(frameCount - 1, index));
        if (cache.has(index)) return cache.get(index);
        const image = new Image();
        const entry = { image, ready: false };
        cache.set(index, entry);
        image.src = new URL(`${String(index + 1).padStart(4, "0")}.webp`, framesUrl).href;
        image.decode().then(() => {
            entry.ready = true;
            schedule();
        }).catch(() => {
            // Keep the last rendered frame if a frame cannot be fetched.
        });
        return entry;
    }

    function render(time) {
        animation = 0;
        const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
        previousTime = time;
        position += (target - position) * (1 - Math.exp(-elapsed / 65));
        if (Math.abs(target - position) < 0.005) position = target;
        const lower = Math.floor(position);
        const upper = Math.min(frameCount - 1, lower + 1);
        const first = loadFrame(lower);
        const second = loadFrame(upper);
        let base = first.ready ? first : second.ready ? second : null;
        if (!base) {
            let distance = Infinity;
            for (const [index, entry] of cache) {
                if (entry.ready && Math.abs(index - position) < distance) {
                    base = entry;
                    distance = Math.abs(index - position);
                }
            }
        }
        if (base) {
            context.globalAlpha = 1;
            context.drawImage(base.image, 0, 0, canvas.width, canvas.height);
            if (first.ready && second.ready && lower !== upper) {
                context.globalAlpha = position - lower;
                context.drawImage(second.image, 0, 0, canvas.width, canvas.height);
                context.globalAlpha = 1;
            }
            canvas.classList.add("is-ready");
        }
        // Decode nearby frames ahead of the scroll; cap decoded image memory.
        if (first.ready && second.ready) {
            for (let offset = 1; offset <= 4; offset++) {
                loadFrame(lower - offset);
                loadFrame(upper + offset);
            }
        }
        if (cache.size > 32) {
            const farthest = [...cache.keys()].sort((a, b) => Math.abs(b - position) - Math.abs(a - position));
            for (const index of farthest.slice(0, cache.size - 32)) cache.delete(index);
        }
        if (position !== target) schedule();
        else previousTime = 0;
    }

    function update() {
        const range = document.documentElement.scrollHeight - innerHeight;
        const progress = range > 0 ? Math.max(0, Math.min(1, scrollY / range)) : 0;
        target = reducedMotion.matches ? 0 : progress * (frameCount - 1);
        if (reducedMotion.matches) position = 0;
        schedule();
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("pageshow", update);
    window.addEventListener("load", update);
    reducedMotion.addEventListener("change", update);
    update();
})();
