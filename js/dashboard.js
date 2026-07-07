/**
 * dashboard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrator — boots all sub-modules in the correct dependency order.
 *
 * Dependency graph:
 *
 *   adapters.js  ←  Fields, Measures, Dims, DataAdapters
 *   utils.js     ←  formatNumber, ResizeObserver, debounce, safeGet
 *         ↓
 *   hypercube.js ←  HypercubeManager (singleton), HM alias
 *         ↓
 *   kpi.js       ←  KPIManager     (uses HM + Measures + Utils)
 *   charts.js    ←  ChartsManager  (uses HM + Dims + DataAdapters + Utils)
 *   filters.js   ←  FiltersManager (uses app.getObject — filter objects only)
 *   theme.js     ←  ThemeManager   (dark/light toggle + ChartsManager.refreshTheme)
 *
 * Boot order is important:
 *   1. HypercubeManager.init(app)  — must receive the open app first
 *   2. FiltersManager.init(app)    — embeds Qlik listboxes via app.getObject
 *   3. KPIManager.init()           — creates KPI session objects
 *   4. ChartsManager.init()        — creates chart session objects
 *   5. ThemeManager.init()         — wires toggle (after charts so refreshTheme works)
 * ─────────────────────────────────────────────────────────────────────────────
 */

var Dashboard = (function () {
    'use strict';

    /**
     * Boot the entire dashboard.
     * @param {object} app — open Qlik app from qlik.openApp()
     */
    function init(app) {

        // 1. Session object manager — must be first
        HypercubeManager.init(app);

        // 2. Filter objects — embedded Qlik listboxes (preserves associative engine)
        FiltersManager.init(app);

        // 3. KPI cards — aggregate session objects, live on selection change
        KPIManager.init();

        // 4. Chart session objects — one per chart, live updates
        ChartsManager.init();

        // 5. Dark / light toggle — after charts so refreshTheme() is available
        ThemeManager.init();

        console.info('[Dashboard] Initialised — all modules ready.');
    }

    return { init: init };

}());
