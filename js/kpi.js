/**
 * kpi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the 4 Vercel-style KPI cards.
 * Replaces old emojis with clean inline SVG outlines.
 *
 * Calculations & Subtitles (calculated dynamically on data load):
 *   1. TOTAL TITLES    → Count(DISTINCT [ID])              | "All platforms"
 *   2. TOTAL MOVIES    → Count(DISTINCT {<[Type]={'Movie'}>} [ID])   | "X% of titles"
 *   3. TOTAL TV SHOWS  → Count(DISTINCT {<[Type]={'TV Show'}>} [ID]) | "X% of titles"
 *   4. TOTAL PLATFORMS → Count(DISTINCT [Platforms])       | "Active platforms"
 * ─────────────────────────────────────────────────────────────────────────────
 */

var KPIManager = (function () {
    'use strict';

    // Caches of active values to calculate percentages dynamically
    var _values = {
        totalTitles:    0,
        totalCountries: 0,
        avgIMDb:        0,
        avgRuntime:     0
    };

    var KPI_CONFIG = [
        {
            id:      'totalTitles',
            label:   'Total Titles',
            expr:    Measures.totalTitles,
            accent:  '#ef4444',            // Red
            icon:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
            subtitle: 'All platforms'
        },
        {
            id:      'totalCountries',
            label:   'Total Countries',
            expr:    Measures.totalCountries,
            accent:  '#0ea5e9',            // Sky Blue
            icon:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            subtitle: 'Origin countries'
        },
        {
            id:      'avgIMDb',
            label:   'Avg IMDb Rating',
            expr:    Measures.avgIMDb,
            accent:  '#ec4899',            // Pink/Magenta
            icon:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
            subtitle: 'User rating (0-10)',
            format:  'decimal'
        },
        {
            id:      'avgRuntime',
            label:   'Avg Runtime',
            expr:    Measures.avgRuntime,
            accent:  '#6366f1',            // Violet/Indigo
            icon:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
            subtitle: 'Minutes per title'
        }
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER SKELETON
    // ─────────────────────────────────────────────────────────────────────────
    function _renderSkeleton(cfg) {
        var el = document.getElementById(cfg.id);
        if (!el) return;

        el.style.setProperty('--kpi-accent', cfg.accent);
        el.style.setProperty('--kpi-color', cfg.accent);

        el.innerHTML =
            '<div class="kpi-inner">' +
            '  <div class="kpi-header">' +
            '    <span class="kpi-label">' + cfg.label + '</span>' +
            '    <div class="kpi-icon-wrap">' + cfg.icon + '</div>' +
            '  </div>' +
            '  <div class="kpi-value skeleton-line" id="kpi-val-' + cfg.id + '">—</div>' +
            '  <div class="kpi-subtitle" id="kpi-sub-' + cfg.id + '">' + cfg.subtitle + '</div>' +
            '  <div class="kpi-shimmer"></div>' +
            '</div>';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COUNT-UP ANIMATION FOR KPI VALUES
    // ─────────────────────────────────────────────────────────────────────────
    function _animateCount(el, targetVal, format) {
        if (typeof window.requestAnimationFrame === 'undefined' || isNaN(targetVal) || targetVal === null) {
            el.textContent = Utils.formatNumber(targetVal, format || 'integer');
            return;
        }

        var start = 0;
        var duration = 800; // ms
        var startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out quad
            var currentVal = progress * (2 - progress) * (targetVal - start) + start;
            el.textContent = Utils.formatNumber(currentVal, format || 'integer');

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                el.textContent = Utils.formatNumber(targetVal, format || 'integer');
            }
        }
        window.requestAnimationFrame(step);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOAD KPI
    // ─────────────────────────────────────────────────────────────────────────
    function _loadKPI(cfg) {
        HM.createCube({
            id:         'kpi_' + cfg.id,
            dimensions: [],
            measures:   [HM.measure(cfg.expr, cfg.label)],
            rows:       1,
            cols:       1,
            callback: function (matrix) {
                var valEl = document.getElementById('kpi-val-' + cfg.id);
                if (!valEl) return;

                var raw = Utils.safeGet(matrix, '0.0.qNum', null);
                _values[cfg.id] = raw || 0;

                // Update text content and animate
                valEl.classList.remove('skeleton-line');
                valEl.classList.add('kpi-value-loaded');

                _animateCount(valEl, raw || 0, cfg.format);

                // Remove shimmer loading
                var inner = valEl.closest('.kpi-inner');
                if (inner) {
                    var shimmer = inner.querySelector('.kpi-shimmer');
                    if (shimmer) shimmer.style.animation = 'none';
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC
    // ─────────────────────────────────────────────────────────────────────────
    function init() {
        KPI_CONFIG.forEach(_renderSkeleton);
        KPI_CONFIG.forEach(_loadKPI);
    }

    return { init: init };

}());
