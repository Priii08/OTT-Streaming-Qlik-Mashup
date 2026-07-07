/**
 * background.js — Animated Background Paths
 * ─────────────────────────────────────────────────────────────────────────────
 * Faithful vanilla-JS port of 21st.dev @kokonutd/background-paths.
 *
 * Uses requestAnimationFrame (not CSS keyframes) for stroke-dashoffset
 * animation — 100% reliable cross-browser, matches framer-motion behaviour.
 *
 * Architecture:
 *  • generateAestheticPath()  → produces the same multi-wave cubic bezier
 *    path strings as the original React component
 *  • _getTotalLength()        → measures actual SVG path length at runtime
 *  • rAF loop                 → animates stroke-dashoffset per path
 *  • Dark/light aware         → reads body.dark class to pick stroke colour
 * ─────────────────────────────────────────────────────────────────────────────
 */
var BackgroundPaths = (function () {
    'use strict';

    // ── Configuration ──────────────────────────────────────────────────────
    var VIEWBOX_W  = 1440;
    var VIEWBOX_H  = 900;

    // Path counts by type (matches original component)
    var COUNTS = { primary: 12, secondary: 10, accent: 8 };

    // Stroke colours (light/dark) — mirrors the component's neutral palette
    var COLORS = {
        light: {
            primary:   'rgba(0,0,0,0.06)',
            secondary: 'rgba(0,0,0,0.04)',
            accent:    'rgba(0,0,0,0.03)'
        },
        dark: {
            primary:   'rgba(255,255,255,0.10)',
            secondary: 'rgba(255,255,255,0.06)',
            accent:    'rgba(255,255,255,0.04)'
        }
    };

    // Stroke widths by type
    var WIDTHS = { primary: 1.2, secondary: 0.8, accent: 0.5 };

    // Duration range (seconds)
    var DUR = { primary: [30, 50], secondary: [20, 40], accent: [15, 30] };

    var _paths   = [];   // { el, len, dur, offset, speed }
    var _rafId   = null;
    var _started = 0;
    var _svg     = null;

    // ── Path generation (faithful port of generateAestheticPath) ───────────
    function generateAestheticPath(index, position, type) {
        var baseAmplitude = type === 'primary' ? 150 : type === 'secondary' ? 100 : 60;
        var phase    = index * 0.2;
        var segments = type === 'primary' ? 10 : type === 'secondary' ? 8 : 6;

        var startX = 2400,  startY = 800;
        var endX   = -2400, endY   = -800 + index * 25;

        var points = [];
        for (var i = 0; i <= segments; i++) {
            var progress = i / segments;
            var eased    = 1 - Math.pow(1 - progress, 2);

            var baseX = startX + (endX - startX) * eased;
            var baseY = startY + (endY - startY) * eased;

            var ampFactor = 1 - eased * 0.3;
            var wave1 = Math.sin(progress * Math.PI * 3 + phase) * (baseAmplitude * 0.7 * ampFactor);
            var wave2 = Math.cos(progress * Math.PI * 4 + phase) * (baseAmplitude * 0.3 * ampFactor);
            var wave3 = Math.sin(progress * Math.PI * 2 + phase) * (baseAmplitude * 0.2 * ampFactor);

            points.push({ x: baseX * position, y: baseY + wave1 + wave2 + wave3 });
        }

        var cmds = points.map(function (pt, idx) {
            if (idx === 0) return 'M ' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
            var prev    = points[idx - 1];
            var tension = 0.4;
            var cp1x = prev.x + (pt.x - prev.x) * tension;
            var cp1y = prev.y;
            var cp2x = prev.x + (pt.x - prev.x) * (1 - tension);
            var cp2y = pt.y;
            return 'C ' + cp1x.toFixed(1) + ' ' + cp1y.toFixed(1) +
                   ', ' + cp2x.toFixed(1) + ' ' + cp2y.toFixed(1) +
                   ', ' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
        });

        return cmds.join(' ');
    }

    // ── Build SVG and all path elements ───────────────────────────────────
    function _build(canvas) {
        var NS = 'http://www.w3.org/2000/svg';
        _svg = document.createElementNS(NS, 'svg');
        _svg.setAttribute('viewBox', '-2400 -800 4800 1600');
        _svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        _svg.style.width  = '100%';
        _svg.style.height = '100%';

        _paths = [];

        var isDark  = document.body.classList.contains('dark');
        var palette = isDark ? COLORS.dark : COLORS.light;

        // position = 1 (left-to-right) or -1 (right-to-left)
        var types = ['primary', 'secondary', 'accent'];
        types.forEach(function (type) {
            var count = COUNTS[type];
            for (var i = 0; i < count; i++) {
                var position = (i % 2 === 0) ? 1 : -1;
                var d        = generateAestheticPath(i, position, type);

                var el = document.createElementNS(NS, 'path');
                el.setAttribute('d', d);
                el.setAttribute('fill', 'none');
                el.setAttribute('stroke-linecap', 'round');
                el.setAttribute('data-type', type);
                el.setAttribute('data-index', i);

                // Opacity & width
                var opacity = type === 'primary' ? 0.7 + Math.random() * 0.3
                            : type === 'secondary' ? 0.5 + Math.random() * 0.3
                            : 0.3 + Math.random() * 0.3;
                el.style.stroke        = palette[type];
                el.style.strokeWidth   = WIDTHS[type];
                el.style.opacity       = 0;
                el.style.fill          = 'none';
                el.style.strokeLinecap = 'round';

                _svg.appendChild(el);

                // Duration: random within type range
                var range = DUR[type];
                var dur   = range[0] + Math.random() * (range[1] - range[0]);

                _paths.push({
                    el:      el,
                    len:     0,          // filled after mount
                    dur:     dur,
                    phase:   Math.random(), // random start phase [0,1)
                    opacity: opacity,
                    type:    type
                });
            }
        });

        canvas.innerHTML = '';
        canvas.appendChild(_svg);
    }

    // ── Measure actual path lengths after DOM mount ────────────────────────
    function _measureLengths() {
        _paths.forEach(function (p) {
            try {
                p.len = p.el.getTotalLength();
            } catch (e) {
                p.len = 2000; // fallback
            }
            // Set dasharray to full length so we can animate offset 0 → len
            p.el.setAttribute('stroke-dasharray', p.len + ' ' + (p.len + 10));
            // Start offset = full length (path hidden), phase shifts it
            p.el.style.strokeDashoffset = p.len * (1 - p.phase);
        });
    }

    // ── rAF animation loop ─────────────────────────────────────────────────
    function _animate(ts) {
        var t = (ts - _started) / 1000; // elapsed seconds

        _paths.forEach(function (p) {
            if (!p.len) return;

            // progress ∈ [0, 1] cycling with p.dur, shifted by p.phase
            var progress = ((t / p.dur) + p.phase) % 1;

            // dashoffset: path "draws in" from 0→0.5, then "erases" 0.5→1
            // Use a sine curve for smooth in/out:
            var dashOffset = p.len * (1 - progress);
            p.el.style.strokeDashoffset = dashOffset;

            // Fade: fade in first 15%, full opacity 15%–75%, fade out last 25%
            var op;
            if (progress < 0.15) {
                op = (progress / 0.15) * p.opacity;
            } else if (progress < 0.75) {
                op = p.opacity;
            } else {
                op = ((1 - progress) / 0.25) * p.opacity;
            }
            p.el.style.opacity = Math.max(0, Math.min(1, op));
        });

        _rafId = requestAnimationFrame(_animate);
    }

    // ── Update stroke colours when theme switches ──────────────────────────
    function _updateColors() {
        var isDark  = document.body.classList.contains('dark');
        var palette = isDark ? COLORS.dark : COLORS.light;
        _paths.forEach(function (p) {
            p.el.style.stroke = palette[p.type];
        });
    }

    // ── Public API ─────────────────────────────────────────────────────────
    function init() {
        var canvas = document.getElementById('bg-paths-canvas');
        if (!canvas) {
            canvas = document.createElement('div');
            canvas.id = 'bg-paths-canvas';
            document.body.insertBefore(canvas, document.body.firstChild);
        }

        _build(canvas);

        // Measure after browser has laid out SVG
        requestAnimationFrame(function () {
            _measureLengths();
            _started = performance.now();
            if (_rafId) cancelAnimationFrame(_rafId);
            _rafId = requestAnimationFrame(_animate);
        });

        // Watch for theme changes
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                if (m.attributeName === 'class') _updateColors();
            });
        });
        observer.observe(document.body, { attributes: true });
    }

    // Rebuild (call when theme is toggled if colours need refresh)
    function refresh() {
        _updateColors();
    }

    return { init: init, refresh: refresh };
}());
