/**
 * OTTStreamingPlatform.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Qlik Sense Mashup Bootstrap
 *
 * PRESERVED (unchanged from original):
 *   ✔ host / prefix / port / isSecure config
 *   ✔ require.config() baseUrl calculation
 *   ✔ qlik.on("error") popup handler
 *   ✔ qlik.openApp() with exact app ID
 *   ✔ All 4 filter app.getObject() calls (preserves associative engine)
 *
 * CHANGED:
 *   ✘ Removed app.getObject() for 4 KPI objects → now handled by kpi.js
 *   ✘ Removed app.getObject() for 6 chart objects → now handled by charts.js
 *   ✘ Removed inline theme toggle → now handled by theme.js
 *   ✚ Added Dashboard.init(app) call to boot all sub-modules
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── Qlik connection config (PRESERVED exactly as original) ─────────────── */
var prefix = window.location.pathname.substr(
    0,
    window.location.pathname.toLowerCase().lastIndexOf('/extensions') + 1
);

var config = {
    host:     window.location.hostname,
    prefix:   prefix,
    port:     window.location.port,
    isSecure: window.location.protocol === 'https:'
};

require.config({
    baseUrl: (config.isSecure ? 'https://' : 'http://') +
             config.host +
             (config.port ? ':' + config.port : '') +
             config.prefix + 'resources'
});

/* ── Main Qlik bootstrap ─────────────────────────────────────────────────── */
require(['js/qlik'], function (qlik) {

    /* Error handler (PRESERVED) */
    qlik.on('error', function (error) {
        $('#popupText').append(error.message + '<br>');
        $('#popup').fadeIn(1000);
    });

    $('#closePopup').click(function () {
        $('#popup').hide();
    });

    /* Open the Qlik app (PRESERVED — same app ID) */
    var app = qlik.openApp('OTT Streaming Analytics Dashboard.qvf', config);

    /* ── FILTER OBJECTS (PRESERVED — app.getObject kept for filters) ─────── */
    app.getObject('platformFilter',    'mwEzrF');
    app.getObject('releaseYearFilter', 'GktacPt');
    app.getObject('ageRatingFilter',   'jLUSJg');
    app.getObject('countryFilter',     'MJmLkr');

    /* ── BOOT ALL DASHBOARD MODULES ─────────────────────────────────────── */
    /*
     * Dashboard.init() wires:
     *   HypercubeManager  → session object manager
     *   KPIManager        → KPI cards via createCube()
     *   ChartsManager     → ECharts via createCube()
     *   FiltersManager    → styling hooks + Clear All button
     *   ThemeManager      → dark/light toggle
     */
    Dashboard.init(app);

});