# AromaForm — Product Requirements Document

## Original Problem Statement
Build "AromaForm", a web-based/mobile Perfume Formulation & Fragrance Management App for independent perfumers.
- Luxury-laboratory aesthetic (Aesop/Byredo style), neutral colors (#FBFBF9) with gold accents (#C5A059).
- Core modules: Ingredient Library, Interactive Formula Builder (real-time calculations, IFRA safety checks, note balance charts), Batch & Dilution Calculator, Formula History & Versioning.

## User Choices (confirmed)
- Dashboard as the initial screen; 4 tabs: Formulas, Ingredients, Calculator, Settings.
- Online persistence (MongoDB) with local draft caching on device.
- Emergent-managed Google sign-in + email/password authentication.
- Prepopulated with 5 sample raw materials and 1 sample formula ("Velvet Cedar" v1.0).
- Language: English.

## Architecture
- **Frontend**: Expo SDK 57 (React Native 0.86), expo-router file-based routing, React Query, react-native-keyboard-controller, NativeTabs on iOS 26+ / JS Tabs elsewhere.
- **Backend**: FastAPI + Motor (MongoDB), session-token auth (Bearer), bcrypt password hashing.
- **Auth**: Email/password (JWT-style session tokens in `user_sessions`, 7-day expiry) + Emergent-managed Google OAuth (`/api/auth/session`).
- **Storage**: `@/src/utils/storage` (AsyncStorage native / IndexedDB web) for drafts & theme; SecureStore for the session token on native.

## User Personas
- Independent perfumer / small studio: composes trial formulas, checks IFRA compliance, scales trials to production batches, keeps versioned records of each study.

## Core Requirements (static)
1. Ingredient library with CAS, category, note type, cost/g, IFRA max %.
2. Formula builder with real-time calculations (percentages, finished-product levels), IFRA safety checks, note balance chart.
3. Batch & dilution calculator (batch weight × concentration → oil/alcohol split + raw material cost).
4. Formula history & versioning.
5. Dashboard overview (recent formulas, note balance, stats).
6. Google + email/password auth; online persistence; local draft caching.

## Implemented
| Date | Feature |
|---|---|
| 2026-09 (session 1) | FastAPI backend: auth (register/login/Google session/logout/me), ingredients list+create, formulas CRUD + duplicate. Seed: 5 materials (Bergamot, Hedione, Iso E Super, Ambroxan, Cedarwood) + "Velvet Cedar" v1.0. |
| 2026-09 (session 1) | Frontend shell: login screen, 4-tab layout, dashboard with live note-balance chart, ingredient library + add-material modal, batch calculator, formula builder with share/duplicate. Fixed web-preview CORS (same-origin API on web). |
| 2026-09 (session 2) | Stable `testID`s on all interactive elements (login, tabs, dashboard, ingredients, calculator, settings, builder, modals). |
| 2026-09 (session 2) | Corrected IFRA math (material % in finished product = pure weight / total concentrate × target strength), red per-material alerts + aggregate safety panel (pass/fail). |
| 2026-09 (session 2) | Local draft caching via storage util: per-formula drafts (`aromaform_draft_<id>`), autosave on edit, restore banner with Discard, cleared on save; dashboard "Unsaved draft — Resume" card. |
| 2026-09 (session 2) | Lab Sheet export: formatted preview modal, CSV export (web download / native share), PDF/print (web print window / expo-print + expo-sharing native). Shared engine in `src/labsheet.ts`. |
| 2026-09 (session 2) | Formula versioning: `POST /api/formulas/{id}/duplicate?as_version=true` bumps version (v1.0 → v1.1) keeping title; "new version" action in builder header. |
| 2026-09 (session 2) | Tab icons (Ionicons) on JS tab bar, theme toggle (light/dark, persisted), KeyboardAwareScrollView on all form screens. |
| 2026-09 (session 3) | Milligram precision: 0.001 g (3-decimal) weight inputs/displays across builder, lab sheet, dashboard, calculator (`src/format.ts` `formatGrams`). |
| 2026-09 (session 3) | Drops (tetes) converter: per-row g/drops unit toggle in builder, `dropWeightGrams` per ingredient (default 0.05 g; seeded Ambroxan 0.045), editable in add-material modal, live two-way conversion at 0.001 g precision, Drops column in lab sheet CSV/PDF. |
| 2026-09 (session 3) | IDR currency system-wide: `formatIDR` ("Rp 150.000,00"), seed costs migrated to IDR/g (one-time startup migration for legacy USD-scale values), HPP labeling in calculator + lab sheet, currency row in Settings. |

## Backlog (prioritized)
- **P0**: none outstanding.
- **P1**: Ingredient edit/delete; formula delete; pull-to-refresh on lists.
- **P2**: Full version-history view (group formulas by title, diff versions); offline read cache for lists; batch records (production log per formula).
- **P2**: Cost estimation per batch already live in calculator; extend to packaging/labor overhead inputs.

## Test Credentials
See `/app/memory/test_credentials.md` — demo account `studio@aromaform.app` / `AromaForm123!`.

## Test Reports
- `/app/test_reports/iteration_1.json` — smoke pass (login, dashboard, tabs); action items were testIDs + regression of deep flows (addressed session 2).
- `/app/test_reports/iteration_2.json` — deep regression: 20/20 backend pytest, 32/36 frontend; found 3 bugs (web sign-out Alert.alert no-op, dead theme toggle, share crash) — all fixed.
- `/app/test_reports/iteration_3.json` — bugfix verification 15/15 PASS, retest_needed: false. Note for future E2E: router.push keeps prior screens in DOM on web — use `:visible` selectors.
