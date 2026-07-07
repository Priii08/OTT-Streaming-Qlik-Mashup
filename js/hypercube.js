/**
 * hypercube.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton Hypercube Manager.
 *
 * Architecture:
 *   HM.createCube(opts)
 *         ↓
 *   Tries app.model.createChild()  ← Qlik ≥ June 2020 / enigma.js path
 *         ↓ (if unavailable → auto-fallback)
 *   app.createCube(def, callback)  ← Capability API (all versions)
 *         ↓
 *   callback(matrix, qHyperCube)  → chart / KPI renderer
 *
 * The Capability API's app.createCube() automatically re-fires the callback
 * whenever selections / filters change — providing the same live-update
 * behaviour as the session-object model.on('changed') pattern.
 *
 * Usage:
 *   HypercubeManager.init(app);
 *   HypercubeManager.createCube({
 *       id:         'myChart',
 *       dimensions: [Dims.platform()],
 *       measures:   [HM.measure(Measures.countTitles, 'Count')],
 *       rows:       50,
 *       cols:       2,
 *       callback:   function(matrix, hc) { ... }
 *   });
 *   HypercubeManager.destroy('myChart');
 * ─────────────────────────────────────────────────────────────────────────────
 */

var HypercubeManager = (function () {
    'use strict';

    /** @type {object|null} Open Qlik app reference */
    var _app = null;

    /**
     * Registry: id → session-object or cube reference
     * Used only for destroy() cleanup.
     */
    var _registry = {};

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC — init
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initialise with an open Qlik app.
     * Must be called before any createCube() calls.
     * @param {object} app — result of qlik.openApp()
     */
    function init(app) {
        _app = app;
        console.info('[HypercubeManager] Initialised.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC — createCube  (primary API)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a Qlik session object backed by a HyperCube.
     * Automatically detects whether app.model.createChild() is available
     * and falls back to app.createCube() if not.
     *
     * The callback is called:
     *   1. Immediately after initial data loads.
     *   2. Automatically on every filter / selection change.
     *
     * @param {object}   opts
     * @param {string}   opts.id          — unique ID for this cube
     * @param {object[]} opts.dimensions  — NxDimension array (use Dims helpers)
     * @param {object[]} opts.measures    — NxMeasure array (use HM.measure())
     * @param {number}  [opts.rows=100]   — max data rows
     * @param {number}  [opts.cols]       — total columns (auto if omitted)
     * @param {function} opts.callback    — called with (matrix[], qHyperCube)
     */
    function createCube(opts) {
        if (!_app) {
            console.error('[HM] Not initialised — call HypercubeManager.init(app) first.');
            return;
        }

        var id       = opts.id;
        var dims     = opts.dimensions || [];
        var msrs     = opts.measures   || [];
        var rows     = opts.rows       || 100;
        var cols     = opts.cols       || (dims.length + msrs.length);
        var callback = opts.callback;

        // Clean up any existing object with this ID
        destroy(id);

        var hypercubeDef = {
            qDimensions:       dims,
            qMeasures:         msrs,
            qInitialDataFetch: [{
                qTop:    0,
                qLeft:   0,
                qWidth:  cols,
                qHeight: rows
            }]
        };

        // ── Route: try session-object approach, fall back if unavailable ──
        var hasCreateChild = _app.model &&
                             typeof _app.model.createChild === 'function';

        if (hasCreateChild) {
            _sessionObjectCreate(id, hypercubeDef, callback);
        } else {
            // Capability API app.createCube() — compatible with all versions
            _capabilityCreate(id, hypercubeDef, callback);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Session Object path  (Qlik ≥ June 2020)
    // ─────────────────────────────────────────────────────────────────────────

    function _sessionObjectCreate(id, def, callback) {
        var sessionProps = {
            qInfo: { qId: id, qType: 'HyperCube' },
            qHyperCubeDef: def
        };

        _app.model.createChild(sessionProps)
            .then(function (model) {
                _registry[id] = { type: 'session', model: model };

                function _fetch() {
                    model.getLayout().then(function (layout) {
                        var hc     = layout.qHyperCube;
                        var pages  = hc && hc.qDataPages;
                        var matrix = (pages && pages.length) ? pages[0].qMatrix : [];
                        _log(id, matrix.length);
                        try { callback(matrix, hc || {}); }
                        catch (e) { console.error('[HM] Callback error "' + id + '":', e); }
                    }).catch(function (err) {
                        console.error('[HM] getLayout failed "' + id + '":', err);
                        callback([], {});
                    });
                }

                // Live updates on selection / filter change
                model.on('changed', _fetch);
                // Initial fetch
                _fetch();
            })
            .catch(function (err) {
                // createChild failed at runtime — fall back gracefully
                console.warn('[HM] createChild failed for "' + id + '", using fallback:', err);
                _capabilityCreate(id, def, callback);
            });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Capability API path  (all Qlik versions)
    // app.createCube() re-fires the callback automatically on selection changes.
    // ─────────────────────────────────────────────────────────────────────────

    function _capabilityCreate(id, def, callback) {
        _app.createCube(def, function (reply) {
            // Store reference for destroy()
            if (!_registry[id]) {
                _registry[id] = { type: 'capability', handle: reply };
            }

            var hc     = reply && reply.qHyperCube;
            var pages  = hc && hc.qDataPages;
            var matrix = (pages && pages.length) ? pages[0].qMatrix : [];

            _log(id, matrix.length);

            try { callback(matrix, hc || {}); }
            catch (e) { console.error('[HM] Callback error "' + id + '":', e); }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — debug log
    // ─────────────────────────────────────────────────────────────────────────

    function _log(id, rowCount) {
        console.log(
            '[HM] "' + id + '" → rows:',
            rowCount,
            rowCount === 0 ? ' ⚠ 0 rows — check field name in adapters.js' : '✓'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC — destroy
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Close and deregister a session object.
     * @param {string} id
     */
    function destroy(id) {
        var entry = _registry[id];
        if (!entry) return;

        try {
            if (entry.type === 'session' && entry.model) {
                if (typeof entry.model.close === 'function') entry.model.close();
            }
        } catch (e) { /* already closed */ }

        delete _registry[id];
    }

    /** Destroy ALL registered objects. */
    function destroyAll() {
        Object.keys(_registry).forEach(destroy);
        console.info('[HM] All session objects destroyed.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS — builders kept for backward compatibility with old code
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build an NxMeasure object.
     * Use Measures.xxx from adapters.js for the expression.
     */
    function measure(expr, label) {
        return {
            qDef: {
                qDef:   expr,
                qLabel: label || expr
            }
        };
    }

    /** Alias for backward compatibility */
    var msr = measure;

    /**
     * Build an NxDimension.
     * Prefer Dims.xxx() from adapters.js for new code.
     */
    function dim(fieldName, label) {
        return {
            qDef: {
                qFieldDefs:   [fieldName],
                qFieldLabels: [label || fieldName]
            },
            qNullSuppression: true
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    return {
        init:       init,
        createCube: createCube,
        destroy:    destroy,
        destroyAll: destroyAll,
        measure:    measure,
        msr:        msr,
        dim:        dim
    };

}());

// Short alias used throughout charts.js and kpi.js
var HM = HypercubeManager;
