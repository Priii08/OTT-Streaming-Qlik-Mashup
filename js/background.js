/**
 * background.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vanilla-JS port of 21st.dev @kokonutd/background-paths.
 *
 * Generates N organic SVG bezier-curve paths that slowly animate across the
 * full-viewport background layer (#bg-paths-canvas).
 *
 * Design:
 *   - 36 unique bezier paths, spread across full viewport height
 *   - Each path draws itself using stroke-dashoffset animation
 *   - Animation duration varies 18–50s with staggered negative delays
 *     so paths are already mid-animation on page load (no blank wait)
 *   - Canvas stays behind all content (position:fixed, z-index:0)
 *   - pointer-events:none — never interferes with Qlik interactions
 * ─────────────────────────────────────────────────────────────────────────────
 */
var BackgroundPaths = (function () {
    'use strict';

    var TOTAL      = 36;
    var VIEWBOX_W  = 1440;
    var VIEWBOX_H  = 900;
    var DASH_LEN   = 2000; // matches the CSS keyframe range

    // ── Stable seeded pseudo-random  ────────────────────────────────────────
    function rand(seed) {
        var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
        return x - Math.floor(x);
    }

    // ── Generate one organic cubic bezier path string ─────────────────────
    function makePath(i) {
        var yBand  = (i / TOTAL) * VIEWBOX_H;
        var yNoise = (rand(i * 3 + 1) - 0.5) * 220;
        var yStart = Math.max(10, Math.min(VIEWBOX_H - 10, yBand + yNoise));

        // Alternate direction so paths cross from both sides
        var leftToRight = (i % 2 === 0);
        var x0 = leftToRight ? -60 : VIEWBOX_W + 60;
        var x3 = leftToRight ? VIEWBOX_W + 60 : -60;

        var t1 = 0.25 + rand(i * 5 + 2) * 0.25;
        var t2 = 0.60 + rand(i * 7 + 3) * 0.25;

        var x1 = x0 + (x3 - x0) * t1;
        var y1 = yStart + (rand(i * 11 + 4) - 0.5) * 500;
        var x2 = x0 + (x3 - x0) * t2;
        var y2 = yStart + (rand(i * 13 + 5) - 0.5) * 500;
        var y3 = yStart + (rand(i * 17 + 6) - 0.5) * 200;

        return [
            'M', x0.toFixed(1), yStart.toFixed(1),
            'C', x1.toFixed(1), y1.toFixed(1),
                 x2.toFixed(1), y2.toFixed(1),
                 x3.toFixed(1), y3.toFixed(1)
        ].join(' ');
    }

    // ── Build the entire SVG and inject it ──────────────────────────────────
    function _build(canvas) {
        var NS  = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + VIEWBOX_W + ' ' + VIEWBOX_H);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

        for (var i = 0; i < TOTAL; i++) {
            var dur   = 18 + rand(i * 19 + 7) * 32;           // 18–50 s
            var delay = -(rand(i * 23 + 9) * dur);             // negative = pre-running

            var path = document.createElementNS(NS, 'path');
            path.setAttribute('class', 'bg-path');
            path.setAttribute('d', makePath(i));
            // A visible dash segment followed by a gap larger than the viewport diagonal
            path.setAttribute('stroke-dasharray', '600 ' + (DASH_LEN * 2));
            path.style.setProperty('--bg-dur',   dur.toFixed(1)   + 's');
            path.style.setProperty('--bg-delay', delay.toFixed(1) + 's');

            svg.appendChild(path);
        }

        canvas.innerHTML = '';
        canvas.appendChild(svg);
    }

    // ── Public init ─────────────────────────────────────────────────────────
    function init() {
        var canvas = document.getElementById('bg-paths-canvas');
        if (!canvas) {
            canvas = document.createElement('div');
            canvas.id = 'bg-paths-canvas';
            document.body.insertBefore(canvas, document.body.firstChild);
        }
        _build(canvas);
    }

    return { init: init };
}());
