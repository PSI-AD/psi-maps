# PSI Maps Pro: Cross-Platform & Device Publishing Checklist

This document tracks our progress in taking the completed PSI Maps Pro web environment and bringing it to all native devices (Apple App Store, Google Play Store, Desktop, and Web). It serves as the master checklist to monitor what has been delivered and what is pending for publishing.

## 1. Responsive Web Environments (The Foundation)
*These represent the core UI viewports that we have built, optimized, and unified.*

- [x] **Desktop Browser UI**
  - Fully responsive `MapCommandCenter` and architecture.
  - Hover-based interactions, Mapbox 3D rendering, and hardware acceleration.
  - Implementation of advanced features like Time Machine.
- [x] **Tablet Viewport (iPad / Android Tablet)**
  - Sidebar layout optimization and expanded real estate utilization.
  - Touch-friendly sizing for map controls and UI overlays.
- [x] **Mobile Phone Viewport (iOS / Android Browsers)**
  - Resolution of critical z-index overlap issues (e.g. Carousel vs Modal).
  - Landscape breakpoint correction to prevent desktop sidebars from rendering.
  - Touch-action and pointer-event fixes for seamless scrolling vs. swiping.
- [x] **PWA (Progressive Web App) Enhancements**
  - Generate and inject `manifest.json` for "Add to Home Screen" functionality.
  - Implement basic Service Workers for faster loading and caching.

---

## 2. iOS Native App (Apple App Store)
*Wrapping the web application seamlessly into a native iOS app using Capacitor.*

### Phase 2.1: Environment & Wrappers
- [x] Initialize Capacitor in the Vite project (`npx cap init`).
- [x] Add the iOS platform to the codebase (`npx cap add ios`).
- [ ] Fix iOS Safe Area insets (preventing app from bleeding into the Dynamic Island / Notch).
- [ ] Implement native routing behaviors (e.g., swipe back gesture limits).

### Phase 2.2: Apple Developer Configuration
- [ ] Enroll in the Apple Developer Program (Corporate/Organization account).
- [ ] Register the App ID & Bundle Identifier (e.g., `com.psimaps.pro`).
- [ ] Configure Plist permissions (Location, Storage, Network usage descriptions).
- [ ] Provisioning Profiles and Code Signing setup in Xcode.

### Phase 2.3: Asset & Artwork Creation
- [x] **App Icon:** Design primary icon (1024x1024px, no transparency).
- [x] **Splash Screen:** Create an adaptive Launch Screen Storyboard for seamless load-ins.
- [ ] **Screenshots (iPhone):** Design 4-6 high-fidelity promotional screenshots for 6.5" and 5.5" displays.
- [ ] **Screenshots (iPad):** Design 4-6 high-fidelity promotional screenshots for 12.9" Pro displays.
- [ ] **Metadata:** Finalize Title, Subtitle, Keywords, and promotional text.

### Phase 2.4: App Store Connect Publishing
- [ ] Create the application record in App Store Connect.
- [ ] Provide Privacy Policy URL and complete Data Privacy Questionnaire regarding analytics.
- [ ] Archive the build via Xcode and upload.
- [ ] Submit to **TestFlight** for internal testing and validation.
- [ ] Submit for final **App Store Review**.

---

## 3. Android Native App (Google Play Store)
*Wrapping the web application seamlessly into an Android APK/Bundle using Capacitor.*

### Phase 3.1: Environment & Wrappers
- [x] Add the Android platform to the codebase (`npx cap add android`).
- [ ] Configure Android Studio, Gradle dependencies, and SDK limits.
- [ ] Adjust status bar and navigation bar colors to match the PSI dark mode UI natively.

### Phase 3.2: Google Play Configuration
- [ ] Register Google Play Developer account and complete Organization ID verification.
- [ ] Generate and securely store the release Keystore (App Signing key).
- [ ] Define API restrictions in Google Cloud Platform for Android package names.

### Phase 3.3: Asset & Artwork Creation
- [x] **App Icon:** Create adaptive app icons (Foreground and Background layers for Android 8+).
- [x] **Splash Screen:** Configure Android 12+ native splash screen API.
- [ ] **Feature Graphic:** Design the required Play Store top banner (1024x500px).
- [ ] **Screenshots:** Design 4-6 mobile screenshots and 4-6 tablet screenshots.

### Phase 3.4: Google Play Console Publishing
- [ ] Create the application record in Google Play Console.
- [ ] Complete Content Rating and Data Safety forms.
- [ ] Build the Android App Bundle (`.aab`) format.
- [ ] Publish to **Internal Testing Track** for QA.
- [ ] Submit to Google Play for the production rollout.

---

## 4. Desktop Native Apps (macOS & Windows) - *Future Phase*
*Optional: Converting the platform into installable desktop software.*

- [ ] Wrap application using Tauri or Electron.
- [ ] Implement custom Title-Bar / Window Controls.
- [ ] **macOS:** App Notarization & DMG creation.
- [ ] **Windows:** EXE Installer creation & Authenticode signing.

---

## 5. Native Hardware Enhancements (Cross-Platform) 
*Advanced features to make the app feel 100% native on iOS and Android.*

- [x] **Status Bar Control:** Dynamically adapt device clock/battery text color (Light/Dark mode) via Capacitor plugins.
- [x] **Haptic Feedback:** Bind native mobile vibrations to Map actions (e.g. when zooming finishes or clicking a marker).
- [x] **Deep Linking:** Allow clicking a shared link on mobile to open directly natively in the app.
- [x] **Network State Handling:** Show a native offline toast when signal drops out.
