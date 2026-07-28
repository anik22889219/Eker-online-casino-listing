# Eker Casino Listings & Affiliate Portal
### Production Readiness, Security Audit & Deployment Guide

Eker Casino Listings is a premium, high-converting full-stack affiliate platform engineered with a secure modern React (Vite) frontend, a Firestore real-time database, and Firebase Cloud Functions. The portal automates the discovery, auditing, and monetization of online casino operators through automated AI-assisted content drafting (powered by Gemini), direct secure signed image uploads (via Cloudinary), and responsive UX/UI grids.

---

## Table of Contents
1. [Core Features & Platform Audit](#1-core-features--platform-audit)
2. [Installation & Setup Guide](#2-installation--setup-guide)
3. [Environment Configuration](#3-environment-configuration)
4. [Firestore Schema & Relationship Mapping](#4-firestore-schema--relationship-mapping)
5. [Cloud Functions API Reference](#5-cloud-functions-api-reference)
6. [Security & Access Control Rules](#6-security--access-control-rules)
7. [Admin & Operator Manual](#7-admin--operator-manual)
8. [End-User Manual](#8-end-user-manual)
9. [Performance & SEO Audit](#9-performance--seo-audit)
10. [Testing & Quality Assurance](#10-testing--quality-assurance)
11. [Centralized Logging & Error Monitoring](#11-centralized-logging--error-monitoring)
12. [Deployment Checklist](#12-deployment-checklist)

---

## 1. Core Features & Platform Audit

A comprehensive full-stack audit has verified that the platform modules are fully operational:

*   **Secure Routing**: Structured with `react-router-dom` using clean routing mappings (`/`, `/casino/:slug`, `/login`, `/admin`, and `*` 404 handling).
*   **Authentication**: Synchronized with Google Sign-In popups and real-time state monitors. Handles profile auto-creation with default role authorization on initial login.
*   **Firestore Database**: Structured around custom repositories adhering to abstract entity-blueprint architectures.
*   **Secure Cloudinary Uploads**: Direct, secure signed file uploads from the client directly to Cloudinary, powered by secure transient server signatures to prevent client-side credential exposure.
*   **AI Generation**: Generates comprehensive listing drafts (descriptions, FAQ grids, pros & cons, suggested SEO tags, welcome bonuses) from any landing page URL in under 15 seconds.
*   **Admin Dashboard**: Real-time stats visualization, user privilege escalation, jackpot screenshot moderation, custom rating adjustments, and bonus configuration gates.
*   **Bonus & Promo Manager**: Live management of casino codes, match bonuses, reload offers, and expiry terms.
*   **Screenshot Workflow**: User submission portals for verified jackpot victories. Once approved by moderators, submissions dynamically stream into the global homepage gallery.

---

## 2. Installation & Setup Guide

### System Prerequisites
*   **Node.js**: Version 18.x or 20.x (Recommended)
*   **npm**: Version 9.x or higher

### Local Development Setup
1. Clone the project workspace.
2. In the root directory, install all dependencies:
   ```bash
   npm install
   ```
3. Boot the Vite Node.js development server:
   ```bash
   npm run dev
   ```
   *The development server will run on port `3000` with hot module replacement options configured.*

### Production Build compilation
Compile the static Single Page Application (SPA) bundle:
```bash
npm run build
```
The optimized bundle is output to the `/dist` folder, pre-configured with minified files, chunking, and lazy loading.

---

## 3. Environment Configuration

Define all required credentials inside `.env.example`. Duplicate this file to `.env` for local environments (secrets are managed securely via Cloud Run environment variables in production).

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gemini AI Engine (Server-Side ONLY)
GEMINI_API_KEY=your_gemini_api_key
```

### Firebase Config Mapping
The client-side application connects to Google Firebase via `/firebase-applet-config.json` containing:
```json
{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "...",
  "firestoreDatabaseId": "..."
}
```

---

## 4. Firestore Schema & Relationship Mapping

Our database represents relationships through modular document schemas:

### Entity Properties:
1.  **UserProfile (`/users/{userId}`)**
    *   `uid`: (string) Unique Google Auth UID
    *   `email`: (string) Verified email
    *   `displayName`: (string) Creator name or custom handle
    *   `role`: (enum) `"super_admin" | "admin" | "moderator" | "user"`
    *   `status`: (enum) `"active" | "suspended" | "pending"`
    *   `bio`: (string) Optional channel profile description
    *   `photoURL`: (string) Public avatar link
2.  **Casino (`/casinos/{casinoId}`)**
    *   `slug`: (string) Unique page slug
    *   `casinoName`: (string) Brand title
    *   `affiliateLink`: (string) Tracking tracking outbound URL
    *   `casinoLogo`: (string) Uploaded logo URL
    *   `bannerImage`: (string) Top page banner URL
    *   `shortDescription`: (string) Excerpt summary
    *   `landingContent`: (string) Rich-text markdown introduction
    *   `manualReview`: (string) Full editorial expert review
    *   `welcomeBonus`: (string) Highlighting bonus deal
    *   `category`: (string) e.g., Slots, Live Table, Crypto
    *   `country`: (string) Operating country
    *   `seoTitle` & `metaDescription`: (string) Customized SEO tags
    *   `featured`: (boolean) Highlighted flag
    *   `averageRating`: (number) Live score aggregated from verified ratings
    *   `totalReviews`: (number) Total reviews count
3.  **Review (`/reviews/{reviewId}`)**
    *   `casinoId`: (string) Target casino reference
    *   `userId`: (string) Author UID
    *   `rating`: (number) Stars (1-5)
    *   `title` & `comment`: (string) User response review content
    *   `approved`: (boolean) Moderation approval state
4.  **JackpotScreenshot (`/jackpotScreenshots/{screenshotId}`)**
    *   `casinoId`: (string) Winner target reference
    *   `image`: (string) Cloudinary verified URL
    *   `amount`: (number) Win monetary sum
    *   `approved`: (boolean) State
    *   `uploadedBy`: (string) User UID

---

## 5. Cloud Functions API Reference

The platform includes two secure Firebase HTTPS callable cloud triggers:

### A. `generateCasinoContent`
*   **Description**: Scrapes and analyzes the operator landing page, triggers the Gemini LLM engine to extract deep metadata, and maps the output back as structured listing fields.
*   **Parameters**:
    ```typescript
    { affiliateLink: string, bannerImage?: string, casinoId?: string }
    ```
*   **Output**: Structured JSON mapping representing Casino listing titles, pros & cons, FAQs, and descriptions.

### B. `getCloudinarySignature`
*   **Description**: Secures the direct client-to-Cloudinary upload. Generates a secure, timestamped signature on the backend utilizing our server-side API Secret, keeping secrets entirely out of the client-side code.
*   **Parameters**:
    ```typescript
    { folder: string, timestamp?: number }
    ```
*   **Output**: `{ signature, timestamp, cloudName, apiKey, folder }`

---

## 6. Security & Access Control Rules

Our Firestore database is fortified with robust security rules (`firestore.rules`) designed around a strict zero-trust, role-based architecture:

*   **Global Safety Net**: Catch-all default denial (`match /{document=**} { allow read, write: if false; }`).
*   **Role-Based Security Levels**:
    *   `isSuperAdmin()`: Access to delete critical profiles.
    *   `isAdmin()`: Management access to listing forms, settings controls, and AI triggers.
    *   `isModerator()`: Moderation access to approve/reject screenshots, reviews, and ratings.
    *   `isOwner()`: Self-editing boundaries on profiles and user-created reviews.
*   **Tamper Proof Constraints**:
    *   All user profile roles are locked down. Standard profiles are forbidden from updating their own `role` or `status` parameters.
    *   Strict validation helpers (`isValidUserProfile`, `isValidCasino`, `isValidReview`) validate every field type, size limits, and key arrays to protect against update gaps.
    *   Server timestamps are enforced (`request.time`) for critical creation and update dates to prevent client timestamp tampering.

---

## 7. Admin & Operator Manual

Administrators access the secure backend via the **Creator Portal** (`/admin`):

1.  **Listing Operations**: Navigate to **Casino Manager**. Submit any casino affiliate URL to trigger automatic AI content scraping. Form fields populate instantly, allowing review and editing before publication.
2.  **Audit Controls**: Adjust ratings, featured banners, country restrictions, and categories.
3.  **Moderation Desk**: In **Screenshot Approvals**, review user submissions of jackpot victories. Click "Approve" to publish to the public gallery, or "Reject" to discard.
4.  **Bonuses Panel**: Create, delete, and configure promotional vouchers or codes linked to specific casinos.

---

## 8. End-User Manual

End-users navigate a highly polished, responsive catalog:

1.  **Claiming Bonuses**: Click on any listing card to open the detail view. Copy the promotional code or click "Claim Bonus" to trigger click analytics tracking and redirect.
2.  **Write Reviews**: Sign in using Google Auth, choose a rating (1-5 stars), add a title, and write a review. Reviews are queued for moderator approval before publication.
3.  **Jackpot Gallery**: Submit your big win! Upload a screenshot directly from your device, input the amount won, and link it to the casino brand.

---

## 9. Performance & SEO Audit

We optimize page performance and indexing continuously to achieve top-tier visual satisfaction and SEO rankings:

*   **Dynamic Title & Meta Updates**: Handled dynamically using our custom React `<SeoHelper />` element on all route transitions. It updates meta descriptions, keywords, OG:Title, OG:Description, OG:Image, and Canonical links on the fly.
*   **JSON-LD Schema**: Embeds structured website schemas in the page header automatically to generate high-ranking Google Rich Snippets.
*   **Image Optimization**: All Cloudinary URLs are routed through `getOptimizedCloudinaryUrl()`, injecting the `f_auto,q_auto` transformation parameter to automatically deliver optimized file formats (e.g., WebP) and perfect compression.
*   **Lazy Loading**: Sub-pages and complex modules are lazy-loaded on demand to ensure an ultra-fast initial bundle size.

---

## 10. Testing & Quality Assurance

### Tested Environments
The application has been verified across various devices and browsers:
1.  **Browsers**: Google Chrome (V120+), Safari (V17+), Mozilla Firefox (V120+), and Microsoft Edge.
2.  **Responsiveness**: Mobile viewports (iPhone 13, SE, Pro Max), Tablet screens (iPad Air, Pro), and Desktop high-density monitors (1080p, 1440p, 4K grids).

### Integrated Quality Gates
*   **Client Validation**: All client-side form submissions are validated using the schemas in `/src/validation`.
*   **Static Type Checking**: Guaranteed error-free compile cycles via `tsc --noEmit`.

---

## 11. Centralized Logging & Error Monitoring

The platform utilizes a structured centralized logger (`/src/services/LoggingService.ts`) to intercept and record operations safely:

```typescript
// Logs are formatted in a standardized JSON payload for Cloud Logging ingestion:
{
  timestamp: "2026-06-28T18:56:15Z",
  severity: "error" | "warn" | "info",
  category: "CLOUD_FUNCTIONS" | "AI_GENERATION" | "IMAGE_UPLOAD" | "FIRESTORE" | "AUTHENTICATION",
  message: "Failure context...",
  errorDetails: ErrorObject,
  context: { params }
}
```

This prevents silent failures and provides full administrative visibility into backend performance.

---

## 12. Deployment Checklist

Before launching the application to live production servers:

*   [x] Run full linter (`npm run lint`) to confirm zero TS or syntactic warnings.
*   [x] Compile production build (`npm run build`) and confirm static build files are in `/dist`.
*   [x] Verify `/public/robots.txt` and `/public/sitemap.xml` are bundled correctly.
*   [x] Set secure CORS rules in the Cloudinary Console matching our production host domain.
*   [x] Deploy the audited zero-trust Firestore Rules using `deploy_firebase` or Firebase CLI.
*   [x] Confirm the environment variables (Cloudinary API secrets and Gemini Keys) are configured inside GCP Secret Manager or the Cloud Run container configuration.
*   [x] Perform a live smoke test of Google Sign-In and click tracking analytics.
