/**
 * adapters.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for:
 *   1. Field names  (Fields)   — edit here, propagates everywhere
 *   2. Measure expressions  (Measures)
 *   3. Dimension definitions  (Dims)
 *   4. Data transformation  (DataAdapters)
 *
 * Chart / KPI modules must NOT hardcode field names or expressions.
 * They import from this file only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ════════════════════════════════════════════════════════════════════════════
// FIELDS — exact Qlik data-model field names (verified from app.getList('FieldList'))
// Change here → all charts and KPIs update automatically
// ════════════════════════════════════════════════════════════════════════════
var Fields = {
    id       : 'ID',                 // ✅ confirmed (Count DISTINCT ID = 16,744)
    title    : 'Title',              // ✅ confirmed
    platform : 'Platforms',          // ✅ fixed  (was 'Platform')
    year     : 'Year',               // ✅ fixed  (was 'Release Year')
    genre    : 'Genres',             // ✅ fixed  (was 'Listed In')
    country  : 'Country',            // ✅ confirmed
    imdb     : 'IMDb',               // ✅ fixed  (was 'IMDb Score')
    rt       : 'Rotten Tomatoes',    // ✅ fixed  (was 'Rotten Tomatoes Score')
    runtime  : 'Runtime',            // ✅ confirmed
    type     : 'Type',               // ✅ confirmed (Movie | TV Show)
    age      : 'Age',                // ✅ confirmed (Age Rating)
    language : 'Language',           // ✅ confirmed
    directors: 'Directors'           // ✅ confirmed
};

// ════════════════════════════════════════════════════════════════════════════
// MEASURES — reusable Qlik expressions
// Use square brackets around every field name that may contain spaces.
// ════════════════════════════════════════════════════════════════════════════
var Measures = {
    totalTitles    : 'Count(DISTINCT [' + Fields.id + '])',
    totalCountries : 'Count(DISTINCT [' + Fields.country + '])',
    countTitles    : 'Count(DISTINCT [' + Fields.id + '])',
    avgIMDb        : 'Avg([' + Fields.imdb + '])',
    avgRuntime     : 'Avg([' + Fields.runtime + '])',
    avgRT          : 'Avg([' + Fields.rt + '])'
};

// ════════════════════════════════════════════════════════════════════════════
// DIMS — reusable NxDimension builders
// Returns a fully-formed dimension object for use in qHyperCubeDef.
// ════════════════════════════════════════════════════════════════════════════
var Dims = {
    platform : function() { return _dim(Fields.platform,  'Platform');  },  // 'Platforms'
    year     : function() { return _dim(Fields.year,      'Year');      },  // 'Year'
    genre    : function() { return _dim(Fields.genre,     'Genres');    },  // 'Genres'
    country  : function() { return _dim(Fields.country,   'Country');   },  // 'Country'
    title    : function() { return _dim(Fields.title,     'Title');     },  // 'Title'
    type     : function() { return _dim(Fields.type,      'Type');      },  // 'Type'
    age      : function() { return _dim(Fields.age,       'Age Rating'); }  // 'Age'
};

/** @private */
function _dim(fieldName, label) {
    return {
        qDef: {
            qFieldDefs:   [fieldName],
            qFieldLabels: [label || fieldName]
        },
        qNullSuppression: true
    };
}

// ════════════════════════════════════════════════════════════════════════════
// DATA ADAPTERS
// Transform raw Qlik qMatrix rows into chart-ready data structures.
// Separation of concerns: cube → adapter → chart renderer.
// ════════════════════════════════════════════════════════════════════════════
var DataAdapters = {

    /**
     * Pie / Donut / Treemap — [{name, value}]
     * Input: matrix[i] = [dimCell, msrCell]
     */
    toCategoryValue: function (matrix) {
        if (!matrix || !matrix.length) return [];
        return matrix
            .filter(function (row) { return row[0].qText && row[0].qText !== '-'; })
            .map(function (row) {
                return { name: row[0].qText, value: row[1].qNum };
            });
    },

    /**
     * Bar / Line — {labels: [], values: []}
     * Input: matrix[i] = [dimCell, msrCell]
     */
    toLabelValue: function (matrix) {
        if (!matrix || !matrix.length) return { labels: [], values: [] };
        // Filter out null / dash rows (same as toCategoryValue)
        var filtered = matrix.filter(function (r) {
            return r[0].qText && r[0].qText !== '-';
        });
        return {
            labels: filtered.map(function (r) { return r[0].qText; }),
            values: filtered.map(function (r) { return r[1].qNum; })
        };
    },

    /**
     * Dual-axis / multi-series — {labels: [], series: [[],[],...]}
     * Input: matrix[i] = [dimCell, msr1, msr2, ...]
     * @param {number} seriesCount — number of measure columns
     */
    toMultiSeries: function (matrix, seriesCount) {
        if (!matrix || !matrix.length) return { labels: [], series: [] };
        var count = seriesCount || 1;
        var labels = matrix.map(function (r) { return r[0].qText; });
        var series = [];
        for (var i = 0; i < count; i++) {
            var col = i; // capture for closure
            series.push(matrix.map(function (r) {
                var v = r[col + 1].qNum;
                return isNaN(v) ? null : v;
            }));
        }
        return { labels: labels, series: series };
    },

    /**
     * Scatter plot — {groupName: [[x, y], ...]}
     * Input: matrix[i] = [groupDimCell, xMsrCell, yMsrCell]
     */
    toScatterGroups: function (matrix) {
        if (!matrix || !matrix.length) return {};
        var groups = {};
        matrix.forEach(function (row) {
            var group = row[0].qText || 'Unknown';
            var x     = row[1].qNum;
            var y     = row[2].qNum;
            if (isNaN(x) || isNaN(y)) return;
            if (!groups[group]) groups[group] = [];
            groups[group].push([x, y]);
        });
        return groups;
    },

    /**
     * Treemap with color index — [{name, value, itemStyle}]
     * @param {string[]} palette — color array
     */
    toTreemapData: function (matrix, palette) {
        if (!matrix || !matrix.length) return [];
        return matrix
            .filter(function (row) { return row[0].qText && row[0].qText !== '-'; })
            .map(function (row, i) {
                return {
                    name:      row[0].qText,
                    value:     row[1].qNum,
                    itemStyle: { color: (palette || [])[i % (palette || []).length] }
                };
            });
    }
};
