/**
 * js/hero.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Hero Section Controller
 * Provides dynamic greetings, active selections display, a collapsible sidebar
 * toggle, and a fully interactive automated tour.
 * ─────────────────────────────────────────────────────────────────────────────
 */

var HeroManager = (function () {
    'use strict';

    var _app = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Initialize
    // ─────────────────────────────────────────────────────────────────────────
    function init(app) {
        _app = app;

        _updateGreeting();
        _setupSelectionListener();
        _setupTour();
    }


    // ─────────────────────────────────────────────────────────────────────────
    // Dynamic greeting based on hour of day
    // ─────────────────────────────────────────────────────────────────────────
    function _updateGreeting() {
        var greetingEl = document.getElementById('hero-greeting');
        if (!greetingEl) return;

        var hour = new Date().getHours();
        var greeting = 'Welcome back, Priyanshi!';
        if (hour < 12) {
            greeting = 'Good morning, Priyanshi!';
        } else if (hour < 17) {
            greeting = 'Good afternoon, Priyanshi!';
        } else {
            greeting = 'Good evening, Priyanshi!';
        }

        greetingEl.textContent = greeting;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Selection listener using Qlik SelectionObject
    // ─────────────────────────────────────────────────────────────────────────
    function _setupSelectionListener() {
        var selectionCountEl = document.getElementById('active-selections-count');
        if (!selectionCountEl) return;

        // Register listener for selections in the Qlik app
        _app.getList('SelectionObject', function (reply) {
            var selections = reply && reply.qSelectionObject && reply.qSelectionObject.qSelections;
            if (selections && selections.length) {
                var textParts = selections.map(function (sel) {
                    // E.g. "Platforms: Netflix, Hulu"
                    return sel.qField + ': ' + sel.qSelected;
                });
                selectionCountEl.textContent = textParts.join(' | ');
            } else {
                selectionCountEl.textContent = 'All Data';
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Interactive Tour
    // Highlights components and selects Netflix to demo live updates
    // ─────────────────────────────────────────────────────────────────────────
    function _setupTour() {
        var tourBtn = document.getElementById('btnQuickTour');
        if (!tourBtn) return;

        tourBtn.addEventListener('click', function () {
            tourBtn.disabled = true;
            var originalText = tourBtn.innerHTML;

            var steps = [
                {
                    el: document.querySelector('.hero-section'),
                    msg: 'Welcome to OTT Dashboard Tour!'
                },
                {
                    el: document.querySelector('.filter-container'),
                    msg: 'Filter data instantly by Platform, Year, Age, or Country here.'
                },
                {
                    el: document.querySelector('.kpi-container'),
                    msg: 'Watch KPIs automatically recalculate on selection.'
                },
                {
                    el: document.querySelector('.charts'),
                    msg: 'Interactive ECharts visualize content growth, ratings, and distribution.'
                }
            ];

            var currentStep = 0;

            function runStep() {
                if (currentStep > 0) {
                    steps[currentStep - 1].el.classList.remove('tour-highlight');
                }

                if (currentStep < steps.length) {
                    var step = steps[currentStep];
                    tourBtn.innerHTML = 'Tour: ' + step.msg;
                    step.el.classList.add('tour-highlight');
                    currentStep++;
                    setTimeout(runStep, 2000);
                } else {
                    // Demo Selection: Toggle Netflix filter automatically to showcase Qlik engine
                    tourBtn.innerHTML = 'Filtering to Netflix...';
                    
                    // Clear previous and select Netflix
                    _app.field('Platforms').clear();
                    setTimeout(function() {
                        _app.field('Platforms').selectValues([{ qText: 'Netflix' }], false, false);
                        
                        tourBtn.innerHTML = 'Recalculating...';
                        
                        setTimeout(function() {
                            tourBtn.innerHTML = 'Clearing filters...';
                            _app.field('Platforms').clear();
                            
                            setTimeout(function() {
                                tourBtn.disabled = false;
                                tourBtn.innerHTML = originalText;
                                console.log('[HeroManager] Interactive Tour completed.');
                            }, 1000);
                        }, 2500);
                    }, 800);
                }
            }

            runStep();
        });
    }

    return {
        init: init
    };

}());
