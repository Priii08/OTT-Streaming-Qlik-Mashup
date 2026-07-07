/**
 * utils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared utility helpers used across all dashboard modules.
 * No Qlik dependencies — pure JavaScript utilities.
 *
 *  - formatNumber()          → value formatter (integer / decimal / percent)
 *  - attachResizeObserver()  → ResizeObserver on a container (falls back to
 *                              window.resize if browser doesn't support it)
 *  - debounce()              → rate-limit a function
 *  - safeGet()               → safely access a nested property path
 * ─────────────────────────────────────────────────────────────────────────────
 */

var Utils = (function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // NUMBER FORMATTER
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Format a raw Qlik numeric value for display.
     * @param {number} val
     * @param {'integer'|'decimal'|'percent'} type
     * @returns {string}
     */
    function formatNumber(val, type) {
        if (val === null || val === undefined || isNaN(Number(val))) return '—';
        var n = Number(val);
        switch (type) {
            case 'decimal':  return n.toFixed(1);
            case 'percent':  return n.toFixed(1) + '%';
            default:         return Math.round(n).toLocaleString();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RESIZE OBSERVER
    // Watches a container element and calls resize() on all ECharts instances
    // when the container dimensions change — more precise than window.resize.
    // Falls back to window.resize in older browsers.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Attach a ResizeObserver (or window-resize fallback) that resizes
     * all provided ECharts instances.
     *
     * @param {Element}   container       — DOM element to observe
     * @param {function}  getInstances    — returns current array of echarts instances
     * @returns {ResizeObserver|undefined}
     */
    function attachResizeObserver(container, getInstances) {
        var _debounced = debounce(function () {
            var instances = getInstances();
            instances.forEach(function (inst) {
                if (inst && typeof inst.resize === 'function') inst.resize();
            });
        }, 180);

        if (window.ResizeObserver) {
            var ro = new ResizeObserver(_debounced);
            ro.observe(container);
            return ro;
        }

        // Fallback — window resize (less accurate but universally supported)
        window.addEventListener('resize', _debounced);
        return undefined;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEBOUNCE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Return a debounced version of fn that waits `ms` after the last call.
     * @param {function} fn
     * @param {number}   ms
     */
    function debounce(fn, ms) {
        var timer = null;
        return function () {
            var args    = arguments;
            var context = this;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(context, args);
            }, ms || 200);
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SAFE GET
    // Access a deeply nested property without throwing.
    // safeGet(obj, 'a.b.c', null)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Safely retrieve a nested property from an object.
     * @param {object} obj
     * @param {string} path    — dot-separated path, e.g. 'qHyperCube.qDataPages'
     * @param {*}      fallback
     */
    function safeGet(obj, path, fallback) {
        try {
            var val = path.split('.').reduce(function (o, k) {
                return (o !== null && o !== undefined) ? o[k] : undefined;
            }, obj);
            return (val !== undefined && val !== null) ? val : fallback;
        } catch (e) {
            return fallback;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // THEME HELPER
    // ─────────────────────────────────────────────────────────────────────────

    /** Returns true if the body currently has the .dark class */
    function isDark() {
        return document.body.classList.contains('dark');
    }

    /** Read a CSS custom property value from :root */
    function cssVar(name) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(name).trim();
    }

    return {
        formatNumber:          formatNumber,
        attachResizeObserver:  attachResizeObserver,
        debounce:              debounce,
        safeGet:               safeGet,
        isDark:                isDark,
        cssVar:                cssVar
    };

}());
