/**
 * theme.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dark / Light mode toggle.
 * Extracted from the inline toggle in OTTStreamingPlatform.js.
 * Also notifies ChartsManager to refresh ECharts theme after toggle.
 * ─────────────────────────────────────────────────────────────────────────────
 */

var ThemeManager = (function () {
    'use strict';

    var STORAGE_KEY = 'ott_theme';

    // ─────────────────────────────────────────────────────────────────────────
    // Apply a theme ('dark' | 'light') to body and persist preference
    // ─────────────────────────────────────────────────────────────────────────
    function _apply(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }

        // Update toggle label text
        var label = document.querySelector('.toggle-label');
        if (label) label.textContent = theme === 'dark' ? 'Light' : 'Dark';

        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* storage disabled */ }

        // Refresh chart colours after a short delay (let CSS re-render first)
        setTimeout(function () {
            if (typeof ChartsManager !== 'undefined') {
                ChartsManager.refreshTheme();
            }
        }, 60);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC
    // ─────────────────────────────────────────────────────────────────────────

    function init() {
        // Restore saved preference
        var saved;
        try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
        if (saved) _apply(saved);

        // Wire the toggle button
        var btn = document.getElementById('themeToggle');
        if (!btn) return;

        btn.addEventListener('click', function () {
            var isDark = document.body.classList.contains('dark');
            _apply(isDark ? 'light' : 'dark');
        });
    }

    return { init: init };

}());
