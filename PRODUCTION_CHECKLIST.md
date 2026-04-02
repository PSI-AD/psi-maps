# PSI Maps Pro — Production Checklist
> **Living document** — update this file after every session that changes production readiness.  
> Last updated: **April 2, 2026** (commit `f19df62`)

---

## ✅ Section 1 — Responsive Web Environments
- [x] Desktop Browser UI (MapCommandCenter, 3D rendering, Time Machine)
- [x] Tablet Viewport (iPad / Android Tablet)
- [x] Mobile Phone Viewport (iOS / Android Browsers)
- [x] PWA — `manifest.json` + Service Workers

---

## Section 2 — iOS Native App (Apple App Store)
- [x] Initialize Capacitor (`npx cap init`)
- [x] Add iOS platform (`npx cap add ios`)
- [x] Fix iOS Safe Area insets (Dynamic Island / Notch)
- [x] Configure `Info.plist` privacy permissions (Location, Camera, Photos, Mic, FaceID)
- [x] App Icon (1024×1024px)
- [x] Splash Screen — SplashScreen plugin configured in `capacitor.config.ts` ✅ Apr 2
- [ ] Screenshots (iPhone 6.5" & 5.5", iPad 12.9") ⏳
- [ ] App Store metadata (Title, Subtitle, Keywords) ⏳
- [ ] Enroll in Apple Developer Program ⏳
- [ ] Register App ID `com.psimaps.pro` in App Store Connect ⏳
- [ ] Provisioning Profiles & Code Signing in Xcode ⏳
- [ ] Archive via Xcode → TestFlight → App Store Review ⏳

---

## Section 3 — Android Native App (Google Play Store)
- [x] Add Android platform (`npx cap add android`)
- [x] Adaptive App Icons (Android 8+)
- [x] Splash Screen (Android 12+ native splash API)
- [ ] Configure Android Studio + Gradle dependencies ⏳
- [ ] Register Google Play Developer account ⏳
- [ ] Generate & store release Keystore ⏳
- [ ] Feature Graphic (1024×500px) ⏳
- [ ] Build `.aab` → Internal Testing → Production rollout ⏳

---

## Section 4 — Desktop Native Apps *(Future)*
- [ ] Tauri or Electron wrapper 🔮
- [ ] macOS notarization + DMG 🔮
- [ ] Windows installer + Authenticode 🔮

---

## ✅ Section 5 — Native Hardware
- [x] Status Bar Control (`@capacitor/status-bar`)
- [x] Haptic Feedback (`@capacitor/haptics`)
- [x] Deep Linking (`@capacitor/app` + URL parsing)
- [x] Network State (native → PWA offline handlers)

---

## Section 6 — Production Stability
- [x] Global Error Boundary + Firebase error reporting
- [x] `logError` / `logFatalError` analytics events
- [x] ErrorBoundary wraps MapCanvas in `App.tsx`
- [x] `screen="MapCanvas"` prop for crash attribution ✅ Apr 2
- [x] Fallback UI for API failures
- [x] Background sync retry strategy
- [x] Network timeout toast (`PWAStatusOverlays`)
- [x] Graceful degradation — `detectAndReportDeviceTier()` + `applyGracefulDegradation()` wired into `index.tsx` ✅ Apr 2
- [ ] Sentry integration *(optional)*

---

## ✅ Section 7 — Analytics & Behavioral Tracking
- [x] Firebase Analytics (lazy, tree-shakeable)
- [x] Screen view tracking
- [x] Project view / search / favorite / share / inquiry events
- [x] Map interaction events
- [x] PWA events (install, push, offline)
- [x] Engagement events (AI Chat, Tour, Presentation)
- [x] Conversion tracking (contact form submitted)
- [ ] Funnel drop-off analysis (Firebase Console config) ⏳
- [ ] Session replay *(optional — Hotjar/LogRocket)*

---

## Section 8 — Performance Monitoring
- [x] Firebase Performance Monitoring initialized
- [x] Custom traces: `sidebar_load`, `search_query`, `filter_apply`, `tour_segment`, `data_fetch`, `ai_chat_response`
- [x] Predictive preloader + `preloadVisibleProjects`
- [x] Vite chunk splitting (mapbox, firebase, vendor, turf)
- [x] Skeleton UI — instant layout placeholders
- [x] Real User Monitoring — `logWebVitals()` reports LCP, FID, CLS, TTFB to Firebase Analytics ✅ Apr 2
- [x] Device tier detection — `device_profile` event (cores, RAM, connection, tier) ✅ Apr 2

---

## Section 9 — Security & Data Protection
- [x] Firebase API key obfuscated + domain-restricted in Google Cloud
- [x] HTTPS enforced (Firebase Hosting)
- [x] Firestore rules hardened — public writes removed; writes require `request.auth != null`; leads/reports/error_logs append-only from clients ✅ Apr 2
- [x] ProGuard / R8 — `minifyEnabled true` + `shrinkResources true` in Android release build ✅ Apr 2
- [ ] App Check (reCAPTCHA Enterprise) — `initAppCheck()` ready, needs site key ⏳

---

## ✅ Section 10 — Offline & Resilience
- [x] Service Worker caching (`sw.js`)
- [x] Background sync engine — queues favorites, inquiries, feedback
- [x] Online event listener — replays pending actions on reconnect
- [x] Offline banner + "Back Online" toast
- [x] Connection quality indicator
- [x] Map region cached locally — `saveMapRegion()`/`loadMapRegion()` in `localPersistence.ts`, wired into `useMapState.ts` ✅ Apr 2
- [x] Offline mode UX defined — `OFFLINE_FEATURES` constant (available vs. disabled) ✅ Apr 2

---

## Section 11 — Accessibility
- [x] 44×44px minimum touch targets — CSS `min-height`/`min-width` ✅ Apr 2
- [x] Scalable text — no `user-scalable=no` in viewport
- [x] Focus rings — `:focus-visible` on all interactive elements
- [x] `img:not([alt])` visual dev warning in CSS ✅ Apr 2
- [ ] VoiceOver (iOS) / TalkBack (Android) audit ⏳ manual
- [ ] WCAG AA contrast audit ⏳ manual

---

## ✅ Section 12 — Device-Specific UX
- [x] One-handed usability zones
- [x] Map vs OS gesture conflict resolution
- [x] Safe area insets on overlays
- [x] Sidebar expanded on tablet
- [ ] TV / Apple Vision Pro UX 🔮

---

## Section 13 — Store Compliance & Legal
- [x] Privacy strings in `Info.plist`
- [ ] Privacy Policy at `psimaps.pro/privacy` ⏳
- [ ] Terms of Service at `psimaps.pro/terms` ⏳
- [ ] Data collection disclosure ⏳
- [ ] Age rating classification ⏳

---

## ✅ Section 14 — CI/CD & Automation
- [x] GitHub Actions → Firebase Hosting deploy on `main`
- [x] TypeScript type-check quality gate
- [x] PR Preview deployments
- [x] `npx cap copy` syncs web assets to native
- [ ] Automated iOS build (Xcode Cloud / Fastlane) ⏳
- [ ] Automated Android `.aab` build ⏳

---

## Section 15 — Versioning & Release Strategy
- [x] `package.json` → `version: "1.0.0"` ✅ Apr 2
- [x] `android/app/build.gradle` → `versionCode 1` / `versionName "1.0.0"` ✅ Apr 2
- [x] `capacitor.config.ts` → SplashScreen plugin configured ✅ Apr 2
- [ ] `MARKETING_VERSION` in Xcode ⏳
- [ ] Staged rollout plan (10% → 50% → 100%) ⏳
- [ ] Rollback plan ⏳

---

## Section 16 — QA (Pre-Launch Gate)
- [ ] Device matrix testing (low-end Android, high-end iOS, tablet) ⏳
- [ ] Rapid-tap stress test ⏳
- [ ] Long session test (1h+) ⏳
- [ ] Background → foreground transition test ⏳
- [ ] Offline → online transition test ⏳
- [ ] First-time user experience (fresh install) ⏳

---

## Section 17 — Observability (Post-Launch)
- [x] Firebase Analytics dashboard
- [x] Crash-free session % tracking
- [ ] Firebase Crashlytics — explore Capacitor plugin ⏳
- [ ] Custom KPI dashboard (DAU/MAU, funnel, crash %) ⏳

---

## Priority Summary

| Priority | Item | Status |
|---|---|---|
| 🔴 Critical | iOS `Info.plist` privacy strings | ✅ |
| 🔴 Critical | ErrorBoundary → Firebase reporting | ✅ |
| 🔴 Critical | `screen="MapCanvas"` crash attribution | ✅ Apr 2 |
| 🔴 Critical | CI/CD type-check gate | ✅ |
| 🔴 Critical | Apple Developer + Code Signing | ⏳ Awaiting |
| 🔴 Critical | App Store privacy policy URL | ⏳ Needs publishing |
| 🟠 High | Firestore rules — no public writes | ✅ Apr 2 |
| 🟠 High | ProGuard/R8 Android release | ✅ Apr 2 |
| 🟠 High | App Check (reCAPTCHA) | ⏳ Needs site key |
| 🟠 High | 44×44px touch targets | ✅ Apr 2 |
| 🟠 High | Accessibility WCAG audit | ⏳ Manual testing |
| 🟡 Medium | Graceful degradation (device tier) | ✅ Apr 2 |
| 🟡 Medium | Real User Monitoring (Web Vitals) | ✅ Apr 2 |
| 🟡 Medium | Slow device analytics | ✅ Apr 2 |
| 🟡 Medium | Cache last-used map region | ✅ Apr 2 |
| 🟡 Medium | Offline mode UX defined | ✅ Apr 2 |
| 🟡 Medium | Semantic versioning v1.0.0 | ✅ Apr 2 |
| 🟡 Medium | Device matrix QA | ⏳ Pending |
| 🟢 Low | Session replay | Optional |
| 🟢 Low | TV / Vision Pro UX | Future |

---

> **Sync rule:** After every session that changes production readiness, update this file and commit it. The brain copy at `/Users/admin/.gemini/antigravity/brain/692dba65-.../PSI_Maps_Pro_Production_Checklist.html` is read-only legacy — this file is authoritative.
