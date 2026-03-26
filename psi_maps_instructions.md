# 🗺️ PSI Maps Pro — Full Feature Implementation Brief

> **Target App**: PSI Maps Pro (psimaps-pro.web.app)
> **Stack**: React + Mapbox + Firebase/Firestore
> **Priority**: Time-Based Map is #1 priority

---

## 🎯 PHASE 1 — TIME-BASED MAP (MVP Upgrade — Highest Priority)

### 1A. Before/After Slider (Highest ROI Feature)
- **Left side**: Historical satellite/area view (e.g. 2010/2015)
- **Right side**: Current satellite/area view (2025)
- **Interaction**: User drags slider → instant visual comparison
- **Implementation**: Mapbox layers with opacity/swipe control
- **Architecture**:
  - Store satellite images (or tiles) per year
  - Use Mapbox layers: `satellite_2015`, `satellite_2020`, `satellite_2025`
  - Add React slider UI with opacity/swipe control

### 1B. Time Slider (Year-by-Year)
- User picks years: 2015 → 2018 → 2022 → 2025
- Dynamically swap map layers per selected year
- Show area development growth percentage
- Smooth animated transitions between years

### 1C. Custom Growth Layers (Overlay on Timeline)
- Project construction phases
- Infrastructure development (roads, metro)
- Nearby growth indicators (schools, malls built)

---

## 🎯 PHASE 2 — HIGH-IMPACT DIFFERENTIATORS

### 2A. Future Value Layer / ROI Heatmap 🔥
- Show **price growth zones** on the map
- Color-coded **investment hotspots** (Hot / Warm / Emerging / Stable)
- Overlay data from:
  - Government plans
  - Historical price trends
  - Developer pipelines
- Display annual growth rate per zone (e.g. "+12.5%")

### 2B. Walkability & Lifestyle Score
- **Radius-based scoring** (not just listing nearby)
- Categories with individual scores out of 10:
  - Schools
  - Hospitals/Healthcare
  - Cafes/Dining
  - Transit (Metro, Bus)
  - Parks/Green spaces
  - Shopping
- Overall lifestyle score (e.g. 8.5/10)
- Visual radial/bar chart display

### 2C. Construction Progress Tracking
- For each project show:
  - Monthly progress snapshots
  - % completion with progress bar
  - Delays vs schedule (flagged milestones)
  - Timeline with milestone markers
- Builds trust — huge in real estate

### 2D. View Simulation
- Show what user sees from different floors:
  - Floor 3 vs Floor 10 vs Floor 20 vs Penthouse
- Use Mapbox 3D buildings support
- Display:
  - View type (city/sea/garden/skyline/mixed)
  - Price premium per floor level

### 2E. Noise / Traffic Layer
- Airport proximity indicator
- Traffic density (1-10 scale with visual bars)
- Noise level zones (Quiet/Moderate/Busy/Noisy with dB ranges)
- Color-coded overlay on map

---

## 🎯 PHASE 3 — INVESTMENT STORY MODE (Premium UX)

### 3A. Full Investment Story Flow
When user clicks a project, show a 3-phase narrative:

**Past** (e.g. 2015):
- What the area looked like
- Historical price per sqft
- Area description

**Present** (Now):
- Current price per sqft
- Growth percentage from past
- Key highlights/developments completed

**Future** (e.g. 2030):
- Projected price per sqft
- Planned infrastructure list
- Expected growth percentage

### 3B. Infrastructure Timeline Overlay
- Upcoming government projects
- Planned metro lines
- New schools, hospitals, malls
- Road expansions

---

## 📊 FEATURE PRIORITY ORDER

| Priority | Feature | Impact |
|----------|---------|--------|
| 🔴 P0 | Before/After Slider (Mapbox) | Highest ROI — visual wow factor |
| 🔴 P0 | Time Slider (multi-year) | Core differentiator |
| 🟠 P1 | ROI Heatmap / Future Value Zones | Investment decision tool |
| 🟠 P1 | Walkability & Lifestyle Scoring | Buyer-facing — they LOVE this |
| 🟡 P2 | Construction Progress Tracking | Trust builder |
| 🟡 P2 | Investment Story Mode | Premium narrative UX |
| 🟢 P3 | View Simulation (3D floors) | Advanced feature |
| 🟢 P3 | Noise / Traffic Layer | Nice-to-have overlay |

---

## 🏗️ TECHNICAL ARCHITECTURE NOTES

### Map Engine
- **Use Mapbox** (already in PSI Maps Pro)
- NOT Google Maps (no historical imagery API, no timeline comparison)
- Google Earth = inspiration only, not embeddable

### Data Structure
```
/satellite_layers/
  - satellite_2010 (raster tileset)
  - satellite_2015
  - satellite_2020
  - satellite_2025

/roi_zones/ (Firestore or GeoJSON)
  - zone_id, name, center, growth_rate, rating, color

/projects/ (existing Firestore)
  - ADD: constructionProgress, monthlySnapshots[]
  - ADD: walkabilityScore {overall, schools, hospitals...}
  - ADD: viewSimulation [{floor, visibility, premium}]
  - ADD: noiseLevel, trafficDensity
  - ADD: investmentStory {past, present, future}
```

### UI Components Needed
1. `TimeSlider` — Year picker with animated transitions
2. `BeforeAfterSlider` — Draggable comparison view
3. `ROIHeatmapOverlay` — Mapbox circle layers with growth data
4. `WalkabilityRadial` — 6-category score visualization
5. `ConstructionTimeline` — Milestone tracker with progress bar
6. `ViewSimulator` — Floor-level view selector
7. `NoiseTrafficBadge` — Noise + traffic indicators
8. `InvestmentStoryPanel` — Past/Present/Future tabs

---

## 🔑 KEY PRINCIPLE

> **Google Earth = inspiration**
> **Mapbox = execution**
> **Your data = competitive advantage**

---

## 📱 MOBILE AUDIT (After Implementation)

After building all features, run a full mobile audit:
- Test all screen sizes (iPhone SE → iPhone 15 Pro Max → iPad)
- Verify all overlays, popups, and panels
- Test map performance (zoom, pan, marker density)
- Validate touch interactions
- Check for console errors
- Run Lighthouse mobile audit
