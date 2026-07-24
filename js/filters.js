/**
 * filters.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom Sidebar Filter Panel (Power BI / Netflix style).
 * Replaces Qlik's default listboxes with a custom accordion layout.
 *
 * Features:
 *   1. Custom collapse/expand accordions (e.g. Platform, Content Type).
 *   2. Quick-select filter pills at the top of each accordion.
 *   3. Custom checkbox items (coloured by platform) with selection states (S, O, A, X).
 *   4. Preserves Qlik's full associative engine using app.createList().
 *   5. LIVE UPDATES — list model re-renders on every selection change via model.on('changed').
 *   6. Multi-select — clicking checkboxes toggles individual items without locking.
 *   7. Clean "Clear All" button.
 * ─────────────────────────────────────────────────────────────────────────────
 */

var FiltersManager = (function () {
    'use strict';

    var _app = null;

    // Registry of active list object models (for cleanup / change listeners)
    var _activeLists = [];

    // Open/collapse state of each filter (Platform open by default)
    var _collapsed = {
        'Platforms': false,
        'Year': true,
        'Age': true,
        'Country': true
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Filter configuration (Matches original Qlik Sense app filters exactly)
    // ─────────────────────────────────────────────────────────────────────────
    var CONFIGS = [
        {
            id: 'Platforms',
            title: 'PLATFORM',
            fieldName: 'Platforms',
            colorMap: {
                'Netflix': '#e50914',
                'Prime Video': '#00a8e1',
                'Disney+': '#113ccf',
                'Hulu': '#1ce783'
            }
        },
        {
            id: 'Year',
            title: 'RELEASE YEAR',
            fieldName: 'Year'
        },
        {
            id: 'Age',
            title: 'AGE RATING',
            fieldName: 'Age'
        },
        {
            id: 'Country',
            title: 'COUNTRY',
            fieldName: 'Country'
        }
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // Render the base sidebar skeleton (Header + Clear All button + Accordions)
    // ─────────────────────────────────────────────────────────────────────────
    function _renderBaseStructure() {
        var container = document.querySelector('.filter-container');
        if (!container) return;

        container.innerHTML =
            '<div class="sidebar-header">' +
            '  <div class="sidebar-title">' +
            '    <svg class="filter-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '      <line x1="4" y1="21" x2="4" y2="14"></line>' +
            '      <line x1="4" y1="10" x2="4" y2="3"></line>' +
            '      <line x1="12" y1="21" x2="12" y2="12"></line>' +
            '      <line x1="12" y1="8" x2="12" y2="3"></line>' +
            '      <line x1="20" y1="21" x2="20" y2="16"></line>' +
            '      <line x1="20" y1="12" x2="20" y2="3"></line>' +
            '      <line x1="1" y1="14" x2="7" y2="14"></line>' +
            '      <line x1="9" y1="8" x2="15" y2="8"></line>' +
            '      <line x1="17" y1="16" x2="23" y2="16"></line>' +
            '    </svg>' +
            '    <span>Filters</span>' +
            '    <!-- Icon-only sidebar collapse toggle -->' +
            '    <button id="btnToggleCompact" class="sidebar-collapse-btn" aria-label="Toggle sidebar" title="Toggle sidebar">' +
            '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>' +
            '        <line x1="9" y1="3" x2="9" y2="21"></line>' +
            '      </svg>' +
            '    </button>' +
            '  </div>' +
            '  <button id="clearAllFilters" class="filter-clear-btn">' +
            '    ✕  Clear All' +
            '  </button>' +
            '</div>' +
            '<div class="accordion-list"></div>';

        // Wire Clear All
        var clearBtn = document.getElementById('clearAllFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', _clearAll);
        }

        // Wire sidebar collapse toggle (same logic as HeroManager used to own)
        var collapseBtn     = document.getElementById('btnToggleCompact');
        var contentWrapper  = document.querySelector('.content-wrapper');
        if (collapseBtn && contentWrapper) {
            collapseBtn.addEventListener('click', function () {
                contentWrapper.classList.toggle('sidebar-collapsed');
                setTimeout(function () {
                    window.dispatchEvent(new Event('resize'));
                }, 300);
            });
        }

    }

    // ─────────────────────────────────────────────────────────────────────────
    // Clear all filters across all configured fields
    // ─────────────────────────────────────────────────────────────────────────
    function _clearAll() {
        CONFIGS.forEach(function (cfg) {
            if (_app && typeof _app.field === 'function') {
                _app.field(cfg.fieldName).clear();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Setup individual accordion filter lists
    // ─────────────────────────────────────────────────────────────────────────
    // Helper to get circle emoji based on selected state value
    function _getEmoji(fieldName, text) {
        if (fieldName === 'Platforms') {
            if (text === 'Netflix') return '🔴';
            if (text === 'Prime Video') return '🔵';
            if (text === 'Disney+') return '🔵';
            if (text === 'Hulu') return '🟢';
        }
        return '🟣';
    }

    function _setupFilter(cfg) {
        var accordionList = document.querySelector('.accordion-list');
        if (!accordionList) return;

        // Render accordion item skeleton (without the quick-select pills container)
        var itemDiv = document.createElement('div');
        itemDiv.className = 'accordion-item' + (_collapsed[cfg.id] ? ' collapsed' : '');
        itemDiv.id = 'accordion-' + cfg.id;
        itemDiv.innerHTML =
            '<div class="accordion-header" id="header-' + cfg.id + '">' +
            '  <span>' + cfg.title + '</span>' +
            '  <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '    <polyline points="6 9 12 15 18 9"></polyline>' +
            '  </svg>' +
            '</div>' +
            '<div class="accordion-content">' +
            '  <div class="options-list" id="options-' + cfg.id + '">' +
            '    <div class="filter-skeleton-line"></div>' +
            '    <div class="filter-skeleton-line" style="width:75%"></div>' +
            '    <div class="filter-skeleton-line" style="width:60%"></div>' +
            '  </div>' +
            '  <div class="clear-btn-container" id="clear-container-' + cfg.id + '"></div>' +
            '</div>';

        accordionList.appendChild(itemDiv);

        // Toggle expand/collapse
        var header = document.getElementById('header-' + cfg.id);
        if (header) {
            header.addEventListener('click', function () {
                _collapsed[cfg.id] = !_collapsed[cfg.id];
                itemDiv.classList.toggle('collapsed', _collapsed[cfg.id]);
            });
        }

        // ── List object definition — both wrapped and unwrapped variants ─────
        // Wrapped: expected by some Qlik versions (qListObjectDef outer key)
        var listDef = {
            qListObjectDef: {
                qDef: { qFieldDefs: [cfg.fieldName] },
                qShowAlternatives: true,
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 1, qHeight: 200 }]
            }
        };
        // Unwrapped: used by some older Qlik Capability API versions directly
        var listDefUnwrapped = {
            qDef: { qFieldDefs: [cfg.fieldName] },
            qShowAlternatives: true,
            qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 1, qHeight: 200 }]
        };


        // ── DUAL-PATH (mirrors hypercube.js exactly) ─────────────────────────
        // Path A: session-object (Qlik ≥ June 2020 / enigma.js path)
        //         model.on('changed') + model.getLayout()
        // Path B: Capability API app.createList(def, callback)
        //         callback auto-refires on every selection / filter change
        //         — identical to how app.createCube() works for charts.
        var hasCreateChild = _app.model &&
                             typeof _app.model.createChild === 'function';

        if (hasCreateChild) {
            // ── PATH A: Session object ────────────────────────────────────────
            var sessionProps = {
                qInfo:         { qId: 'list-' + cfg.id, qType: 'ListObject' },
                qListObjectDef: listDef.qListObjectDef
            };

            _app.model.createChild(sessionProps)
                .then(function (model) {
                    _activeLists.push(model);

                    function _fetch() {
                        model.getLayout().then(function (layout) {
                            _renderData(cfg, layout);
                        }).catch(function (err) {
                            console.warn('[FiltersManager] getLayout failed for', cfg.id, err);
                        });
                    }

                    model.on('changed', _fetch);
                    _fetch(); // initial render
                })
                .catch(function (err) {
                    // Fall through to Capability API on failure
                    console.warn('[FiltersManager] createChild failed for', cfg.id, '— using Capability API:', err);
                    _capabilityList(cfg, listDefUnwrapped);
                });

        } else {
            // ── PATH B: Capability API ────────────────────────────────────────
            _capabilityList(cfg, listDefUnwrapped);
        }
    }

    function _capabilityList(cfg, listDefUnwrapped) {
        console.log('[FiltersManager] createList for', cfg.id);

        var promise = _app.createList(listDefUnwrapped, function (reply) {
            console.log('[FiltersManager] reply received for', cfg.id,
                        '| qDataPages len:', reply && reply.qListObject &&
                        reply.qListObject.qDataPages ? reply.qListObject.qDataPages.length : 'n/a');
            _renderData(cfg, reply);
        });

        if (promise && typeof promise.then === 'function') {
            promise.then(function (model) {
                _activeLists.push(model);
            }).catch(function (err) {
                console.warn('[FiltersManager] createList failed for', cfg.id, err);
            });
        } else if (promise) {
            _activeLists.push(promise);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render the Qlik filter data (list options)
    // Called both on initial load and on every 'changed' event.
    // ─────────────────────────────────────────────────────────────────────────
    function _renderData(cfg, reply) {
        var clearContainer = document.getElementById('clear-container-' + cfg.id);
        var optionsContainer = document.getElementById('options-' + cfg.id);
        var accordionEl = document.getElementById('accordion-' + cfg.id);
        if (!optionsContainer) return;

        // ── Defensive reply parsing — Qlik API returns different shapes ────────
        // Shape 1: getLayout() / session object → { qListObject: { qDataPages:[...] } }
        // Shape 2: createList callback (some versions) → { qListObject: {...} }
        // Shape 3: createList callback (other versions) → qListObject directly
        var list = null;
        if (reply && reply.qListObject) {
            list = reply.qListObject;               // shapes 1 & 2
        } else if (reply && reply.qDataPages) {
            list = reply;                            // shape 3 — IS the qListObject
        } else if (reply && reply.layout && reply.layout.qListObject) {
            list = reply.layout.qListObject;        // enigma.js model layout
        }

        var matrix = (list && list.qDataPages && list.qDataPages[0])
                     ? list.qDataPages[0].qMatrix
                     : [];

        console.log('[FiltersManager]', cfg.id, '→ matrix rows:', matrix.length,
                    '| reply type:', reply ? (reply.qListObject ? 'wrapped' : (reply.qDataPages ? 'direct' : 'unknown')) : 'null');

        // Determine if any item is currently Selected
        var selectedItems = matrix.filter(function (row) { return row[0].qState === 'S'; });
        var hasSelections = selectedItems.length > 0;

        // Blue border on the accordion card when active
        if (accordionEl) {
            accordionEl.classList.toggle('has-selections', hasSelections);
        }

        // ── 2. RENDER CLEAR FILTER BUTTON ────────────────────────────────────
        if (clearContainer) {
            clearContainer.innerHTML = '';
            if (hasSelections) {
                var clearBtn = document.createElement('button');
                clearBtn.className = 'filter-item-clear-btn';
                clearBtn.innerHTML = '✕ Clear Filter';
                clearBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    _app.field(cfg.fieldName).clear();
                });
                clearContainer.appendChild(clearBtn);
            }
        }

        // ── 3. RENDER OPTIONS LIST ───────────────────────────────────────────
        optionsContainer.innerHTML = '';
        if (!matrix.length) {
            // Replace "No options available" with the clear filter action if selections exist
            if (!hasSelections) {
                optionsContainer.innerHTML = '<div class="no-filter-data">No options available</div>';
            }
            return;
        }

        matrix.forEach(function (row) {
            var cell = row[0];
            var text = cell.qText || '';
            var state = cell.qState;       // 'S' (Selected) | 'O' (Optional) | 'A' (Alternative) | 'X' (Excluded)
            var elemNo = cell.qElemNumber;
            var freq = cell.qFrequency ? Number(cell.qFrequency) : 0;

            // Platform-specific accent color for checkbox fill
            var customAccent = cfg.colorMap && cfg.colorMap[text]
                ? cfg.colorMap[text]
                : '#6366f1';

            var isSelected = state === 'S';
            var isExcluded = state === 'X';

            // Build item wrapper
            var itemLabel = document.createElement('label');
            itemLabel.className = 'option-item state-' + state;
            itemLabel.style.setProperty('--accent-color', customAccent);
            if (isExcluded) {
                itemLabel.style.opacity = '0.45';
                itemLabel.style.pointerEvents = 'none';
            }

            var labelText = text;
            if (isSelected) {
                var emoji = _getEmoji(cfg.fieldName, text);
                labelText = emoji + ' ' + text;
            }

            // Checkbox — checked when state is 'S' (Selected)
            itemLabel.innerHTML =
                '<div class="checkbox-wrapper">' +
                '  <input type="checkbox" ' + (isSelected ? 'checked' : '') + ' readonly />' +
                '  <span class="checkbox-custom" style="--accent-color:' + customAccent + '"></span>' +
                '</div>' +
                '<span class="option-label" title="' + text + '">' + labelText + '</span>' +
                '<span class="option-count">' + (freq > 0 ? freq.toLocaleString() : '') + '</span>';

            // ── Click handler: toggle selection using element index ───────────
            // _app.field().select([elemNo], toggleMode, softLock)
            //   toggleMode = true  → clicking a selected item deselects it (multi-select)
            //   softLock   = false → keeps field unlocked so other filters can still work
            itemLabel.addEventListener('click', function (e) {
                e.preventDefault(); // prevent double-fire from label→checkbox cascade
                if (isExcluded) return;
                _app.field(cfg.fieldName).select([elemNo], true, false);
            });

            optionsContainer.appendChild(itemLabel);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC
    // ─────────────────────────────────────────────────────────────────────────

    function init(app) {
        _app = app;
        _activeLists = [];

        _renderBaseStructure();
        CONFIGS.forEach(_setupFilter);
    }

    return { init: init };

}());
