# Firebase Backend Foundation & Architecture Guide

This guide details the database diagram, relationships, security rule configurations, folder design, and migration guidelines prepared for the AI-Powered Affiliate Casino Listing Platform.

---

## 1. Database Diagram & Collection Relationships

```
              ┌──────────────────────┐
              │      users (Auth)    │
              └──────────┬───────────┘
                         │
        ┌────────────────┴────────────────┬────────────────┐
        │ 1:N                             │ 1:N            │ 1:N
        ▼                                 ▼                ▼
┌───────────────┐                  ┌─────────────┐  ┌─────────────┐
│    reviews    │                  │   ratings   │  │sellRequests │
└───────┬───────┘                  └──────┬──────┘  └─────────────┘
        │ N:1                             │ N:1
        │                                 │
        └────────────────┬────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │       casinos        │
              └──────────┬───────────┘
                         │
        ┌────────────────┼────────────────┬────────────────┐
        │ 1:N                             │ 1:N            │ 1:N
        ▼                                 ▼                ▼
┌───────────────┐                  ┌─────────────┐  ┌──────────────┐
│    bonuses    │                  │ promoOffers │  │  aiHistory   │
└───────────────┘                  └─────────────┘  └──────────────┘
                                          │ 1:N
                                          ▼
                               ┌──────────────────────┐
                               │  jackpotScreenshots  │
                               └──────────────────────┘
```

### Collection Mappings & Relationships:
1. **`users` ➔ `reviews` (1:N)**: A registered user can write multiple reviews.
2. **`users` ➔ `ratings` (1:N)**: A registered user can provide star feedback on multiple casinos.
3. **`casinos` ➔ `reviews` & `ratings` (1:N)**: Each casino listing aggregates scores from several user sub-documents.
4. **`casinos` ➔ `bonuses` (1:N)**: A casino can offer multiple active/inactive welcome or recurring bonuses.
5. **`casinos` ➔ `promoOffers` (1:N)**: Promotional codes belong to specific casinos.
6. **`casinos` ➔ `aiHistory` (1:N)**: Admin-initiated prompt logs trace historical context generations for each casino.
7. **`casinos` ➔ `jackpotScreenshots` (1:N)**: Screenshots proving wins map to the specific brand list.

---

## 2. Zero-Trust Security Specification

The platform utilizes custom dynamic Role-Based Access Control (RBAC) checked against secure document properties:

- **Guest (Unauthenticated)**:
  - Can only query `casinos` where `status == "published"`.
  - Can read `reviews` and `jackpotScreenshots` where `approved == true`.
  - Allowed standard `get` operations on user profiles to render branded custom lists.
- **Registered User**:
  - Can read personal profile and modify non-sensitive attributes (e.g., `displayName`, `bio`, `photoURL`).
  - Restricted from updating roles or active status to prevent privilege escalation or self-reactivation.
  - Can write reviews and screenshots initializing as `approved == false`.
- **Moderator**:
  - Can list/read unapproved submissions.
  - Can toggle `approved` state on reviews, screenshots, and comments.
- **Admin & Super Admin**:
  - Fully authorized for CRUD tasks, AI generation, and global system configuration.

---

## 3. Storage Folder Design (Zero-Trust Bucket Partition)

Storage matches strict size and content constraints:

- `logos/` : Public brand logos. Write is restricted to `isAdmin()`, max `2MB`, must be `image/*`.
- `banners/` : Brand hero promotional banners. Write is restricted to `isAdmin()`, max `5MB`, must be `image/*`.
- `jackpots/` : Win screenshot proofs uploaded by standard players. Standard user upload, max `5MB`. Requires moderator approval to render.
- `screenshots/` : Support images for onboarding proposals. Authenticated user upload, max `5MB`.
- `avatars/` : User profile images. Partitioned as `avatars/{userId}/{fileName}`. Editable strictly by `isOwner(userId)`, max `2MB`.

---

## 4. Cloud Functions Directory Architecture (`/functions`)

The functions framework separates trigger scopes:

- `/functions/package.json` & `tsconfig.json`: Multi-module build configurations.
- `/functions/src/index.ts`: Aggregated main exports.
- `/functions/src/auth/`: Triggers automatically on account creations (`onUserCreated`) to instantiate Firestore profiles.
- `/functions/src/ai/`: Safe, server-side HTTPS callable APIs to proxy Gemini API integrations, preventing key exposure.
- `/functions/src/casino/`: Hook points for listing state changes (e.g., automated CDN cache purge or email dispatches).
- `/functions/src/review/`: Real-time rating aggregation recalculations.
- `/functions/src/storage/`: Compress and optimize uploaded images.
- `/functions/src/notifications/`: Triggers user notification insertions.

---

## 5. Future Production Migration Protocols

1. **Incremental Index Deployment**:
   - To query complex collection relations (e.g., `reviews` ordered by rating within `casinoId` and `approved == true`), deploy composite Firestore indices.
   
2. **Cold Start Optimization for Cloud Functions**:
   - For high-volume regions, upgrade callable functions to minimum-instances to reduce cold starts during real-time Gemini generation requests.

3. **Subcollection Transitioning**:
   - If `reviews` grow beyond thousands per casino, transition `reviews` from root collections into a subcollection format (`/casinos/{casinoId}/reviews/{reviewId}`) to isolate documents cleanly.
