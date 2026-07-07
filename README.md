# OTT Streaming Analytics Dashboard

A modern, high-fidelity business intelligence dashboard built as a custom Qlik Sense Mashup. This application integrates active Qlik Sense visualizations into a bespoke corporate web interface, delivering real-time streaming data analytics with premium styling and interactive controls.

---

## Executive Summary

The OTT Streaming Analytics Dashboard serves as a comprehensive portal for tracking, monitoring, and evaluating digital content distribution metrics across global streaming services. It enables business analysts, content curators, and stakeholders to analyze cross-platform availability, user sentiment ratings, global content production density, and growth patterns through a unified interface.

---

## Key Features

### Dynamic Filtering & Associative Search
*   **Visual Selection Indicators:** Color-coded accents aligned with platform brand identities (Netflix, Prime Video, Hulu, Disney+) in active filter selections.
*   **Contextual Clear Controls:** Isolated inline clear options for individual filter categories alongside a global dashboard clear control.
*   **Qlik Association Integrity:** Custom accordion filter lists bind directly to Qlik engine list objects, ensuring all exclusion, selection, and alternative states reflect in real-time.

### KPI Cards
*   **Count-up Animations:** Smooth numeric counter animations on load for all KPI values.
*   **Four Core Metrics:** Total Titles, Global Coverage (Countries), Average IMDb Rating, and Average Runtime.

### Analytics Visualizations
*   Content Distribution by Platform (Bar Chart)
*   Content Release Trend Over Time (Area Chart)
*   Genre Distribution (Treemap)
*   Top 10 Countries by Content Volume (Bar Chart)
*   IMDb vs Rotten Tomatoes Analysis (Scatter Chart)
*   Content Growth vs IMDb Rating (Dual-axis Chart)

### UI & Theme
*   Light & Dark Theme Toggle with persistent user preference.
*   Modern responsive dashboard with glassmorphic sidebar filter panel.
*   Smooth CSS animations for card entrances and hover states.

---

## Technologies Used

*   **Platform Engine:** Qlik Sense Enterprise / Qlik Dev Hub
*   **Visualizations:** Apache ECharts v5
*   **Base Technologies:** HTML5, CSS3 (Custom Properties, Grid, Flexbox), Vanilla JavaScript
*   **Module System:** RequireJS

---

## Project Structure

```
OTT-Streaming-Qlik-Mashup/
├── OTTStreamingPlatform.html       # Entrypoint & skeleton markup
├── OTTStreamingPlatform.css        # Root layout, header, and colour variables
├── OTTStreamingPlatform.js         # Qlik connection bootstrap
├── README.md
│
├── css/
│   ├── animations.css              # Entry keyframe definitions
│   ├── cards.css                   # KPI & chart card styles
│   ├── charts.css                  # Chart container grid & sizing
│   ├── filters.css                 # Accordion, pills, checkbox input styles
│   └── theme.css                   # Light/Dark CSS token definitions
│
└── js/
    ├── adapters.js                 # Field names, measures, dimension helpers
    ├── charts.js                   # Chart orchestration & ECharts rendering
    ├── dashboard.js                # Module boot orchestrator
    ├── filters.js                  # Qlik list object binding & filter UI
    ├── hypercube.js                # Session object & hypercube controller
    ├── kpi.js                      # KPI manager & count-up animations
    ├── theme.js                    # Dark/Light theme switcher
    └── utils.js                    # Number formatting & resize utilities
```

---

## Layout & Design Tokens

| Token | Light Theme | Dark Theme |
| :--- | :--- | :--- |
| **Page Background** | `#F0F4FB` gradient | `#090a0f` gradient |
| **Card Surface** | `#FFFFFF` | `#161B22` |
| **Primary Accent** | `#6366F1` | `#8B5CF6` |
| **Body Text** | `#0F172A` | `#F0F6FC` |
| **Muted Text** | `#64748B` | `#8B949E` |

---

## Dashboard Overview

Users can analyze:

*   Content distribution across streaming platforms
*   Release trends over time
*   Genre-wise distribution
*   Top content-producing countries
*   IMDb vs Rotten Tomatoes rating correlations
*   OTT content growth trends

Interactive filters enable drill-down by platform, release year, age rating, and country.

---

## Future Enhancements

*   Navigational tabs for section-based drill-throughs.
*   Additional OTT KPIs (subscriber estimates, regional breakdowns).
*   Enhanced mobile layout responsiveness.
*   Offline fallback caching for presentation mode.

---

## Author

**Priyanshi Varshney** — UPES, Dehradun (B.Tech CSE — Full Stack Development)
