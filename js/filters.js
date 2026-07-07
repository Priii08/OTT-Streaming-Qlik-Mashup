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

    // Open/collapse state of each filter (Platform and Content Type open by default)
    var _collapsed = {
        'Platforms': false,
        'Type': false,
        'Genres': true,
        'Country': true,
        'Year': true
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Filter configuration
    // ─────────────────────────────────────────────────────────────────────────
    var CONFIGS = [
        {
            id: 'Platforms',
            title: 'PLATFORM',
            fieldName: 'Platforms',
            pills: ['All', 'Netflix', 'Prime Video', 'Disney+', 'Hulu'],
            colorMap: {
                'Netflix': '#e50914',
                'Prime Video': '#00a8e1',
                'Disney+': '#113ccf',
                'Hulu': '#1ce783'
            }
        },
        {
            id: 'Type',
            title: 'CONTENT TYPE',
            fieldName: 'Type',
            pills: ['All', 'Movie', 'TV Show']
        },
        {
            id: 'Genres',
            title: 'GENRE',
            fieldName: 'Genres',
            pills: ['All', 'Drama', 'Comedy', 'Action', 'Documentaries']
        },
        {
            id: 'Country',
            title: 'COUNTRY',
            fieldName: 'Country',
            pills: ['All', 'United States', 'India', 'United Kingdom', 'Canada']
        },
        {
            id: 'Year',
            title: 'RELEASE YEAR',
            fieldName: 'Year',
            pills: ['All', '2021', '2020', '2019', '2018']
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

        // Render accordion item skeleton
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
            '  <div class="pills-container" id="pills-' + cfg.id + '"></div>' +
            '  <div class="clear-btn-container" id="clear-container-' + cfg.id + '"></div>' +
            '  <div class="options-list" id="options-' + cfg.id + '">' +
            '    <div class="filter-skeleton-line"></div>' +
            '    <div class="filter-skeleton-line" style="width:75%"></div>' +
            '    <div class="filter-skeleton-line" style="width:60%"></div>' +
            '  </div>' +
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
                    _capabilityList(cfg, listDef);
                });

        } else {
            // ── PATH B: Capability API ────────────────────────────────────────
            _capabilityList(cfg, listDef);
        }
    }

    function _capabilityList(cfg, listDef) {
        console.log('[FiltersManager] createList for', cfg.id);

        // In this Qlik version, the createList callback passes a plain layout
        // stub: qListObject exists but qDataPages is [] (qInitialDataFetch ignored).
        // Solution: grab the qInfo.qId from the stub, then use app.getObject()
        // to get the real model with getLayout() + on('changed').
        _app.createList(listDef, function (stub) {
            var qId = stub && stub.qInfo && stub.qInfo.qId;
            console.log('[FiltersManager] stub received for', cfg.id,
                        '| qId:', qId,
                        '| qDataPages len:', stub && stub.qListObject &&
                        stub.qListObject.qDataPages ? stub.qListObject.qDataPages.length : 'n/a');

            if (!qId) {
                console.error('[FiltersManager] No qId in stub for', cfg.id, '— cannot proceed');
                return;
            }

            // Use app.getObject(qId) to get the live model
            _app.getObject(qId).then(function (model) {
                console.log('[FiltersManager] getObject model for', cfg.id,
                            '| has getLayout:', typeof model.getLayout === 'function');
                _activeLists.push(model);

                function _fetch() {
                    model.getLayout().then(function (layout) {
                        var dp = layout && layout.qListObject && layout.qListObject.qDataPages;
                        console.log('[FiltersManager] layout fetched for', cfg.id,
                                    '| rows:', dp && dp[0] ? dp[0].qMatrix.length : 0);
                        _renderData(cfg, layout);
                    }).catch(function (err) {
                        console.warn('[FiltersManager] getLayout error for', cfg.id, err);
                    });
                }

                model.on('changed', _fetch);
                _fetch();

            }).catch(function (err) {
                console.warn('[FiltersManager] getObject failed for', cfg.id,
                             '— trying unwrapped createList:', err);
                // Try the unwrapped listDef as a last resort
                _capabilityListUnwrapped(cfg, listDefUnwrapped);
            });
        });
    }

    // Fallback: try createList with the listObjectDef UNWRAPPED (no qListObjectDef key)
    // Some Qlik Capability API versions expect the def content directly.
    function _capabilityListUnwrapped(cfg, listDefUnwrapped) {
        console.log('[FiltersManager] Trying unwrapped createList for', cfg.id);
        _app.createList(listDefUnwrapped, function (reply) {
            console.log('[FiltersManager] Unwrapped reply for', cfg.id,
                        '| keys:', reply ? Object.keys(reply).join(',') : 'null');
            _renderData(cfg, reply);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render the Qlik filter data (pills + list options)
    // Called both on initial load and on every 'changed' event.
    // ─────────────────────────────────────────────────────────────────────────
    function _renderData(cfg, reply) {
        var pillsContainer = document.getElementById('pills-' + cfg.id);
        var clearContainer = document.getElementById('clear-container-' + cfg.id);
        var optionsContainer = document.getElementById('options-' + cfg.id);
        var accordionEl = document.getElementById('accordion-' + cfg.id);
        if (!pillsContainer || !optionsContainer) return;

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

        // ── 1. RENDER QUICK SELECT PILLS ─────────────────────────────────────
        pillsContainer.innerHTML = '';
        if (cfg.pills && cfg.pills.length) {
            cfg.pills.forEach(function (pillName) {
                var isAll = pillName === 'All';
                var isActive = isAll
                    ? !hasSelections
                    : selectedItems.some(function (row) { return row[0].qText === pillName; });

                var pillSpan = document.createElement('span');
                pillSpan.className = 'pill' + (isActive ? ' active' : '');
                pillSpan.textContent = pillName;

                pillSpan.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (isAll) {
                        // Clear all selections for this field
                        _app.field(cfg.fieldName).clear();
                    } else {
                        // Qlik Capability API: selectValues expects [{qText: string}] objects.
                        // toggleMode=true allows accumulating selections (multi-select pills).
                        _app.field(cfg.fieldName).selectValues(
                            [{ qText: pillName }],
                            true,   // toggleMode — true = add to existing selection
                            false   // softLock — false = normal selection
                        );
                    }
                });

                pillsContainer.appendChild(pillSpan);
            });
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
                : 'var(--primary)';

            var isSelected = state === 'S';
            var isExcluded = state === 'X';

            // Build item wrapper
            var itemLabel = document.createElement('label');
            itemLabel.className = 'option-item state-' + state;
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
