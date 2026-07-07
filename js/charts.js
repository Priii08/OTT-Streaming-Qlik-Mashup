/**
 * charts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom Apache ECharts Visualizations Manager.
 * Backed by modular Qlik session objects (HypercubeManager).
 *
 * Charts (matching screenshot layout — 3×2 grid):
 *   1. platformDist          → BAR     (1/3 width) — Content By Platform
 *   2. contentReleaseTrend   → AREA    (1/3 width) — Content Release Trend Over Time
 *   3. genreTreemap          → TREEMAP (1/3 width) — Genre Distribution Treemap
 *   4. imdbVsRT              → SCATTER (1/3 width) — IMDb vs Rotten Tomatoes Analysis
 *   5. countryAnalysis       → BAR     (1/3 width) — Top 10 Countries by Content
 *   6. contentGrowthRating   → DUAL    (1/3 width) — Content Growth vs IMDb Rating
 * ─────────────────────────────────────────────────────────────────────────────
 */

var ChartsManager = (function () {
    'use strict';

    // Platform-specific brand colors
    var PLATFORM_COLORS = {
        'Netflix':     '#e50914',
        'Prime Video': '#00a8e1',
        'Disney+':     '#113ccf',
        'Hulu':        '#1ce783'
    };

    // Teal-to-purple gradient palette (matches screenshot aesthetic)
    var TEAL_PALETTE = [
        '#0d9488', '#0f766e', '#14b8a6', '#5eead4',
        '#7c3aed', '#a78bfa', '#c4b5fd', '#8b5cf6'
    ];

    var PAL = ['#0070f3', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

    var _inst = {};
    var _resizeObserver = null;

    // Theme helpers
    function _dark()  { return Utils.isDark(); }
    function _text()  { return _dark() ? '#ffffff' : '#171717'; }
    function _muted() { return _dark() ? '#888888' : '#666666'; }
    function _grid()  { return _dark() ? '#222222'  : '#eaeaea'; }
    function _bg()    { return _dark() ? '#0a0a0a' : '#ffffff'; }

    function _ec(id) {
        var el = document.getElementById(id);
        if (!el) return null;
        if (!_inst[id]) {
            _inst[id] = echarts.init(el, null, { renderer: 'canvas' });
        }
        return _inst[id];
    }

    function _skeleton(id, show) {
        var el = document.getElementById(id);
        if (el) el.classList[show ? 'add' : 'remove']('chart-skeleton');
    }

    function _showState(id, state, hint) {
        var chart = _ec(id);
        if (!chart) return;
        var icon  = state === 'error' ? '✕' : '⚠';
        var line1 = state === 'error' ? 'Error loading data' : 'No data available';
        var line2 = hint ? 'Field: "' + hint + '"' : 'Check browser console for details';
        chart.setOption({
            backgroundColor: 'transparent',
            graphic: [{ type: 'group', left: 'center', top: 'middle',
                children: [
                    { type: 'text', left: 'center',
                      style: { text: icon, fill: state === 'error' ? '#ee0000' : '#888888', fontSize: 24, fontFamily: 'Inter, sans-serif' } },
                    { type: 'text', left: 'center', top: 36,
                      style: { text: line1, fill: _text(), fontSize: 12, fontWeight: '700', fontFamily: 'Inter, sans-serif' } },
                    { type: 'text', left: 'center', top: 56,
                      style: { text: line2, fill: _muted(), fontSize: 11, fontFamily: 'Inter, sans-serif' } }
                ]
            }]
        }, true);
    }

    function _tip(trigger) {
        return {
            trigger: trigger || 'item',
            backgroundColor: _bg(),
            borderColor:     _grid(),
            textStyle: { color: _text(), fontFamily: 'Inter, sans-serif', fontSize: 12 },
            extraCssText: 'border-radius:6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid ' + _grid()
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. CONTENT BY PLATFORM — Horizontal Bar (1/3-width)
    //    Matches screenshot: teal bars, platform names on Y axis
    // ─────────────────────────────────────────────────────────────────────────
    function _platformDist() {
        _skeleton('platformDistChart', true);

        HM.createCube({
            id:         'chart_platformDist',
            dimensions: [Dims.platform()],
            measures:   [HM.measure(Measures.countTitles, 'Titles')],
            rows:       10,
            cols:       2,
            callback: function (matrix) {
                _skeleton('platformDistChart', false);
                var lv = DataAdapters.toLabelValue(matrix);
                if (!lv.labels.length) { _showState('platformDistChart', 'empty', Fields.platform); return; }

                // Sort ascending so largest bar is at top of chart
                var pairs = lv.labels.map(function (l, i) { return { label: l, value: lv.values[i] }; });
                pairs.sort(function (a, b) { return a.value - b.value; });

                var labels = pairs.map(function (p) { return p.label; });
                var values = pairs.map(function (p) { return p.value; });

                var chart = _ec('platformDistChart');
                if (!chart) return;

                chart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: _tip('axis'),
                    grid: { left: '3%', right: '10%', top: '4%', bottom: '4%', containLabel: true },
                    xAxis: {
                        type: 'value',
                        splitLine: { lineStyle: { color: _grid(), type: 'dashed' } },
                        axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 10 }
                    },
                    yAxis: {
                        type: 'category', data: labels,
                        axisLine: { show: false }, axisTick: { show: false },
                        axisLabel: { color: _text(), fontFamily: 'Inter', fontSize: 11, fontWeight: '500' }
                    },
                    series: [{
                        type: 'bar',
                        data: values.map(function (val, idx) {
                            var name  = labels[idx];
                            var color = PLATFORM_COLORS[name] || TEAL_PALETTE[idx % TEAL_PALETTE.length];
                            return { value: val, itemStyle: { color: color } };
                        }),
                        barMaxWidth: 28,
                        itemStyle: { borderRadius: [0, 4, 4, 0] },
                        label: {
                            show: true, position: 'right',
                            formatter: function (p) {
                                return p.value >= 1000
                                    ? (p.value / 1000).toFixed(1) + 'k'
                                    : p.value;
                            },
                            color: _muted(), fontFamily: 'Inter', fontSize: 10, fontWeight: '600'
                        }
                    }]
                }, true);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CONTENT RELEASE TREND OVER TIME — Stacked Area (1/3-width)
    //    Matches screenshot: area fill, per-year total content count
    // ─────────────────────────────────────────────────────────────────────────
    function _contentReleaseTrend() {
        _skeleton('contentReleaseTrendChart', true);

        HM.createCube({
            id:         'chart_contentReleaseTrend',
            dimensions: [Dims.year()],
            measures: [
                HM.measure("Count(DISTINCT {<[" + Fields.platform + "]={'Netflix'}> } [" + Fields.id + "])", 'Netflix'),
                HM.measure("Count(DISTINCT {<[" + Fields.platform + "]={'Prime Video'}> } [" + Fields.id + "])", 'Prime Video'),
                HM.measure("Count(DISTINCT {<[" + Fields.platform + "]={'Disney+'}> } [" + Fields.id + "])", 'Disney+'),
                HM.measure("Count(DISTINCT {<[" + Fields.platform + "]={'Hulu'}> } [" + Fields.id + "])", 'Hulu')
            ],
            rows:  150,
            cols:  5,
            callback: function (matrix) {
                _skeleton('contentReleaseTrendChart', false);
                if (!matrix || !matrix.length) { _showState('contentReleaseTrendChart', 'empty', Fields.year); return; }

                // Sort by year ascending
                matrix.sort(function (a, b) { return Number(a[0].qText) - Number(b[0].qText); });

                var years   = [], netflix = [], prime = [], disney = [], hulu = [];

                matrix.forEach(function (row) {
                    var y = Number(row[0].qText);
                    if (isNaN(y) || y < 1990) return;

                    years.push(row[0].qText);
                    netflix.push(isNaN(row[1].qNum) ? 0 : row[1].qNum);
                    prime.push(  isNaN(row[2].qNum) ? 0 : row[2].qNum);
                    disney.push( isNaN(row[3].qNum) ? 0 : row[3].qNum);
                    hulu.push(   isNaN(row[4].qNum) ? 0 : row[4].qNum);
                });

                var chart = _ec('contentReleaseTrendChart');
                if (!chart) return;

                function _areaSeries(name, data, color) {
                    return {
                        name: name, type: 'line', stack: 'total',
                        smooth: true, symbol: 'none',
                        data: data,
                        lineStyle: { width: 1.5, color: color },
                        itemStyle: { color: color },
                        areaStyle: { color: color, opacity: 0.55 }
                    };
                }

                chart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: Object.assign(_tip('axis'), {
                        axisPointer: { type: 'cross', lineStyle: { color: '#888', type: 'dashed' } }
                    }),
                    legend: {
                        bottom: '0%', left: 'center',
                        textStyle: { color: _text(), fontFamily: 'Inter', fontSize: 10 },
                        itemGap: 12, itemWidth: 12, itemHeight: 8
                    },
                    grid: { left: '4%', right: '3%', top: '6%', bottom: '18%', containLabel: true },
                    xAxis: {
                        type: 'category', data: years, boundaryGap: false,
                        axisLine: { lineStyle: { color: _grid() } },
                        axisTick: { show: false },
                        axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 9,
                            formatter: function (v) {
                                var n = Number(v);
                                return n >= 1000 ? (n / 1000).toFixed(2) + 'k' : v;
                            }
                        }
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: { lineStyle: { color: _grid(), type: 'dashed' } },
                        axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 9,
                            formatter: function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v; }
                        }
                    },
                    series: [
                        _areaSeries('Netflix',     netflix, PLATFORM_COLORS['Netflix']),
                        _areaSeries('Prime Video', prime,   PLATFORM_COLORS['Prime Video']),
                        _areaSeries('Disney+',     disney,  PLATFORM_COLORS['Disney+']),
                        _areaSeries('Hulu',        hulu,    PLATFORM_COLORS['Hulu'])
                    ]
                }, true);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. GENRE DISTRIBUTION TREEMAP — Treemap (1/3-width)
    //    Matches screenshot: teal/muted colored rectangles with genre labels
    // ─────────────────────────────────────────────────────────────────────────
    function _genreTreemap() {
        _skeleton('genreTreemapChart', true);

        HM.createCube({
            id:         'chart_genreTreemap',
            dimensions: [Dims.genre()],
            measures:   [HM.measure(Measures.countTitles, 'Count')],
            rows:       20,
            cols:       2,
            callback: function (matrix) {
                _skeleton('genreTreemapChart', false);
                if (!matrix || !matrix.length) { _showState('genreTreemapChart', 'empty', Fields.genre); return; }

                // Treemap palette — teal to purple shades matching screenshot
                var treemapColors = [
                    '#0f766e', '#0d9488', '#14b8a6', '#5eead4',
                    '#7c3aed', '#8b5cf6', '#a78bfa', '#6d28d9',
                    '#0369a1', '#0284c7', '#7e22ce', '#be185d',
                    '#166534', '#15803d', '#854d0e', '#92400e'
                ];

                var data = DataAdapters.toTreemapData(matrix, treemapColors);
                // Sort descending so largest blocks come first
                data.sort(function (a, b) { return b.value - a.value; });

                var chart = _ec('genreTreemapChart');
                if (!chart) return;

                chart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: {
                        formatter: function (info) {
                            return '<b>' + info.name + '</b><br/>Titles: ' + info.value.toLocaleString();
                        },
                        backgroundColor: _bg(),
                        borderColor: _grid(),
                        textStyle: { color: _text(), fontFamily: 'Inter', fontSize: 12 }
                    },
                    series: [{
                        type: 'treemap',
                        top: '2%', left: '2%', right: '2%', bottom: '2%',
                        roam: false,
                        nodeClick: false,
                        breadcrumb: { show: false },
                        label: {
                            show: true,
                            formatter: '{b}',
                            color: '#ffffff',
                            fontFamily: 'Inter',
                            fontSize: 11,
                            fontWeight: '600',
                            overflow: 'truncate'
                        },
                        itemStyle: { borderWidth: 2, borderColor: _bg(), gapWidth: 2 },
                        data: data
                    }]
                }, true);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. IMDB VS ROTTEN TOMATOES ANALYSIS — Scatter Plot (1/3-width)
    //    Matches screenshot: X=IMDb (0-10), Y=RT (0-200), colored dots by title
    // ─────────────────────────────────────────────────────────────────────────
    function _imdbVsRT() {
        _skeleton('imdbVsRTChart', true);

        HM.createCube({
            id:         'chart_imdbVsRT',
            dimensions: [Dims.year()],
            measures: [
                HM.measure(Measures.avgIMDb,    'Avg IMDb'),
                HM.measure(Measures.avgRT,      'Avg RT'),
                HM.measure(Measures.countTitles,'Count')
            ],
            rows:  150,
            cols:  4,
            callback: function (matrix) {
                _skeleton('imdbVsRTChart', false);
                if (!matrix || !matrix.length) { _showState('imdbVsRTChart', 'empty', Fields.imdb); return; }

                var scatterData = [];
                var labels = [];
                matrix.forEach(function (row) {
                    var year  = row[0].qText;
                    var imdb  = row[1].qNum;
                    var rt    = row[2].qNum;
                    var count = row[3].qNum;
                    if (isNaN(imdb) || isNaN(rt) || imdb <= 0 || rt <= 0) return;
                    scatterData.push([imdb, rt, count, year]);
                    labels.push(year);
                });

                if (!scatterData.length) { _showState('imdbVsRTChart', 'empty', Fields.imdb); return; }

                var chart = _ec('imdbVsRTChart');
                if (!chart) return;

                chart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: {
                        trigger: 'item',
                        formatter: function (params) {
                            var d = params.data;
                            return '<b>' + d[3] + '</b><br/>' +
                                   'IMDb: ' + d[0].toFixed(1) + '<br/>' +
                                   'Rotten Tomatoes: ' + d[1].toFixed(0) + '<br/>' +
                                   'Titles: ' + d[2];
                        },
                        backgroundColor: _bg(), borderColor: _grid(),
                        textStyle: { color: _text(), fontFamily: 'Inter', fontSize: 11 }
                    },
                    grid: { left: '8%', right: '4%', top: '6%', bottom: '12%', containLabel: true },
                    xAxis: {
                        type: 'value', name: 'IMDb Rating',
                        nameTextStyle: { color: _muted(), fontSize: 10, fontFamily: 'Inter' },
                        min: 0, max: 10,
                        splitLine: { lineStyle: { color: _grid(), type: 'dashed' } },
                        axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 10 }
                    },
                    yAxis: {
                        type: 'value', name: 'Rotten Tomatoes',
                        nameTextStyle: { color: _muted(), fontSize: 10, fontFamily: 'Inter' },
                        nameRotate: 90, nameGap: 30,
                        splitLine: { lineStyle: { color: _grid(), type: 'dashed' } },
                        axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 10 }
                    },
                    series: [{
                        type: 'scatter',
                        data: scatterData,
                        symbolSize: function (d) {
                            // Size dot by content count (min 5, max 20)
                            var s = Math.sqrt(d[2] || 1) * 1.5;
                            return Math.max(5, Math.min(20, s));
                        },
                        itemStyle: {
                            color: function (params) {
                                // Color gradient by IMDb rating
                                var imdb = params.data[0];
                                if (imdb >= 8)  return '#10b981'; // green
                                if (imdb >= 6)  return '#0070f3'; // blue
                                if (imdb >= 4)  return '#f59e0b'; // amber
                                return '#ef4444';                  // red
                            },
                            opacity: 0.75
                        },
                        label: {
                            show: true,
                            formatter: function (params) { return params.data[3]; },
                            position: 'top',
                            color: _muted(), fontFamily: 'Inter', fontSize: 9
                        }
                    }]
                }, true);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TOP 10 COUNTRIES BY CONTENT — Gradient Horizontal Bar (1/3-width)
    //    Matches screenshot: teal-to-purple gradient, top countries
    // ─────────────────────────────────────────────────────────────────────────
    function _countryAnalysis() {
        _skeleton('countryAnalysisChart', true);

        HM.createCube({
            id:         'chart_countryAnalysis',
            dimensions: [Dims.country()],
            measures:   [HM.measure(Measures.countTitles, 'Count')],
            rows:       10,
            cols:       2,
            callback: function (matrix) {
                _skeleton('countryAnalysisChart', false);
                var lv = DataAdapters.toLabelValue(matrix);
                if (!lv.labels.length) { _showState('countryAnalysisChart', 'empty', Fields.country); return; }

                // Sort ascending (largest bar at top)
                var pairs = lv.labels.map(function (l, i) { return { label: l, value: lv.values[i] }; });
                pairs.sort(function (a, b) { return a.value - b.value; });
                var labels = pairs.map(function (p) { return p.label; });
                var values = pairs.map(function (p) { return p.value; });
                var maxVal = Math.max.apply(null, values);

                var chart = _ec('countryAnalysisChart');
                if (!chart) return;

                // Build teal→purple gradient per bar based on its relative value
                var seriesData = values.map(function (val, idx) {
                    var ratio = maxVal > 0 ? val / maxVal : 0;
                    // Interpolate teal (#0f766e) → purple (#7c3aed)
                    var r = Math.round(0x0f + ratio * (0x7c - 0x0f));
                    var g = Math.round(0x76 + ratio * (0x3a - 0x76));
                    var b = Math.round(0x6e + ratio * (0xed - 0x6e));
                    var color = 'rgb(' + r + ',' + g + ',' + b + ')';
                    return { value: val, itemStyle: { color: color } };
                });

                chart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: _tip('axis'),
                    grid: { left: '3%', right: '10%', top: '4%', bottom: '4%', containLabel: true },
                    xAxis: {
                        type: 'value',
                        splitLine: { lineStyle: { color: _grid(), type: 'dashed' } },
                        axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 9,
                            formatter: function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v; }
                        }
                    },
                    yAxis: {
                        type: 'category', data: labels,
                        axisLine: { show: false }, axisTick: { show: false },
                        axisLabel: {
                            color: _text(), fontFamily: 'Inter', fontSize: 10, fontWeight: '500',
                            formatter: function (v) {
                                return v.length > 14 ? v.substring(0, 12) + '…' : v;
                            }
                        }
                    },
                    series: [{
                        type: 'bar', data: seriesData,
                        barMaxWidth: 24,
                        itemStyle: { borderRadius: [0, 4, 4, 0] },
                        label: {
                            show: true, position: 'right',
                            formatter: function (p) {
                                return p.value >= 1000
                                    ? (p.value / 1000).toFixed(2) + 'k'
                                    : p.value;
                            },
                            color: _muted(), fontFamily: 'Inter', fontSize: 9, fontWeight: '600'
                        }
                    }]
                }, true);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. CONTENT GROWTH VS IMDB RATING — Dual-Axis Bar+Line (1/3-width)
    //    Matches screenshot: bars = content count per year, line = avg IMDb rating
    // ─────────────────────────────────────────────────────────────────────────
    function _contentGrowthRating() {
        _skeleton('contentGrowthRatingChart', true);

        HM.createCube({
            id:         'chart_contentGrowthRating',
            dimensions: [Dims.year()],
            measures: [
                HM.measure(Measures.countTitles, 'Titles Added'),
                HM.measure(Measures.avgIMDb,     'Avg IMDb Rating')
            ],
            rows:  150,
            cols:  3,
            callback: function (matrix) {
                _skeleton('contentGrowthRatingChart', false);
                if (!matrix || !matrix.length) { _showState('contentGrowthRatingChart', 'empty', Fields.year); return; }

                // Sort ascending by year
                matrix.sort(function (a, b) { return Number(a[0].qText) - Number(b[0].qText); });

                var years  = [];
                var counts = [];
                var imdb   = [];

                matrix.forEach(function (row) {
                    var y = Number(row[0].qText);
                    if (isNaN(y) || y < 1990) return;
                    years.push(row[0].qText);
                    counts.push(isNaN(row[1].qNum) ? 0 : row[1].qNum);
                    imdb.push(  isNaN(row[2].qNum) ? null : parseFloat(row[2].qNum.toFixed(1)));
                });

                var chart = _ec('contentGrowthRatingChart');
                if (!chart) return;

                chart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: Object.assign(_tip('axis'), {
                        axisPointer: { type: 'shadow' }
                    }),
                    legend: {
                        bottom: '0%', left: 'center',
                        textStyle: { color: _text(), fontFamily: 'Inter', fontSize: 10 },
                        itemGap: 12, itemWidth: 12, itemHeight: 8
                    },
                    grid: { left: '4%', right: '6%', top: '6%', bottom: '18%', containLabel: true },
                    xAxis: {
                        type: 'category', data: years,
                        axisLine: { lineStyle: { color: _grid() } },
                        axisTick: { show: false },
                        axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 9,
                            formatter: function (v) {
                                var n = Number(v);
                                return n >= 1000 ? (n / 1000).toFixed(2) + 'k' : v;
                            }
                        }
                    },
                    yAxis: [
                        {
                            // Left axis — content count
                            type: 'value', name: 'Titles',
                            nameTextStyle: { color: _muted(), fontSize: 9 },
                            splitLine: { lineStyle: { color: _grid(), type: 'dashed' } },
                            axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 9,
                                formatter: function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v; }
                            }
                        },
                        {
                            // Right axis — avg IMDb rating
                            type: 'value', name: 'Avg IMDb Rating',
                            nameTextStyle: { color: _muted(), fontSize: 9 },
                            min: 0, max: 10,
                            splitLine: { show: false },
                            axisLabel: { color: _muted(), fontFamily: 'Inter', fontSize: 9 },
                            position: 'right'
                        }
                    ],
                    dataZoom: [{
                        type: 'slider',
                        bottom: 10,
                        height: 18,
                        borderColor: _grid(),
                        fillerColor: 'rgba(0,112,243,0.1)',
                        handleStyle: { color: '#0070f3' },
                        textStyle: { color: _muted(), fontSize: 9 }
                    }],
                    series: [
                        {
                            name: 'Titles Added',
                            type: 'bar',
                            yAxisIndex: 0,
                            data: counts,
                            barMaxWidth: 12,
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#0070f3' },
                                    { offset: 1, color: 'rgba(0,112,243,0.2)' }
                                ]),
                                borderRadius: [2, 2, 0, 0]
                            }
                        },
                        {
                            name: 'Avg IMDb Rating',
                            type: 'line',
                            yAxisIndex: 1,
                            data: imdb,
                            smooth: true,
                            symbol: 'none',
                            lineStyle: { width: 2, color: '#10b981' },
                            itemStyle: { color: '#10b981' },
                            areaStyle: { color: 'rgba(16,185,129,0.08)' }
                        }
                    ]
                }, true);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RESIZE OBSERVER
    // ─────────────────────────────────────────────────────────────────────────
    function _setupResize() {
        var container = document.querySelector('.charts') || document.body;
        _resizeObserver = Utils.attachResizeObserver(container, function () {
            return Object.values(_inst).filter(Boolean);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC
    // ─────────────────────────────────────────────────────────────────────────
    function init() {
        _platformDist();
        _contentReleaseTrend();
        _genreTreemap();
        _imdbVsRT();
        _countryAnalysis();
        _contentGrowthRating();
        _setupResize();
    }

    function refreshTheme() {
        Object.keys(_inst).forEach(function (id) {
            if (_inst[id]) { _inst[id].dispose(); delete _inst[id]; }
        });
        init();
    }

    return { init: init, refreshTheme: refreshTheme };

}());
