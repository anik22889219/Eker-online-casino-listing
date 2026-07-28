# Security Specification and Threat Model: Zero-Trust Firestore Security

This document outlines the security parameters, data invariants, and the "Dirty Dozen" penetration-testing payloads for the Casino Listing Platform.

## 1. Data Invariants & Access Constraints

1. **User Profiling and Role Control**: 
   - Standard registered users cannot set or upgrade their own role (e.g., `role: "super_admin"`, `"admin"`, or `"moderator"`).
   - Only existing `super_admin` or `admin` roles can alter roles in the `/users/{userId}` collection.
   - User creation requires matching `uid` in document path with `request.auth.uid`.

2. **Casino Publication Flow**:
   - Guests can only read/query casinos where `status == "published"`.
   - Creating/updating/deleting casinos requires `admin` or `super_admin` privilege.

3. **Reviews Integrity**:
   - Guests have read-only access to reviews where `approved == true`.
   - Authenticated users can write a review ONLY if `userId == request.auth.uid`.
   - Standard users cannot approve reviews (`approved: true` can only be set by a `moderator`, `admin`, or `super_admin`).
   - Timestamps must correspond to `request.time`.

4. **Ratings Aggregation**:
   - Only authenticated users can submit ratings.
   - Standard users can only write rating documents where `userId == request.auth.uid`.

5. **Sell Request Onboarding**:
   - Guests can submit sell requests in `pending` status.
   - No standard user or guest can change `status` to `approved` or `rejected` once created. Only administrators can process sell requests.

6. **Jackpot Wins Uploads**:
   - Standard users can upload win screenshots, but they enter as `approved: false` by default.
   - Only moderators or administrators can toggle `approved` to `true`.

7. **System Configuration Protection**:
   - Global configurations at `/settings/{settingsId}` can only be updated by `admin` or `super_admin` users.

---

## 2. The "Dirty Dozen" Payloads (Threat Vectors)

Here are twelve highly dangerous JSON payloads designed to bypass the security framework.

### Payload 1: Privilege Escalation upon Registration
- **Target Collection**: `/users/attacker_uid` (Create)
- **User Identity**: `request.auth.uid == "attacker_uid"`, `role == "user"` (Claims)
- **Malicious Payload**:
```json
{
  "email": "attacker@gmail.com",
  "displayName": "Vandal",
  "role": "super_admin",
  "status": "active",
  "createdAt": "2026-06-27T12:00:00Z",
  "updatedAt": "2026-06-27T12:00:00Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — standard users must not assign administrative roles.

---

### Payload 2: Privilege Escalation via Shadow Profile Update
- **Target Collection**: `/users/attacker_uid` (Update)
- **User Identity**: `request.auth.uid == "attacker_uid"`, existing document role is `"user"`
- **Malicious Payload**:
```json
{
  "email": "attacker@gmail.com",
  "displayName": "Vandal",
  "role": "admin",
  "status": "active",
  "createdAt": "2026-06-27T12:00:00Z",
  "updatedAt": "2026-06-27T12:00:00Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — user updating their own profile must use `affectedKeys().hasOnly(['displayName', 'bio', 'photoURL', 'updatedAt'])`.

---

### Payload 3: Direct Casino Publication (State Shortcutting)
- **Target Collection**: `/casinos/malicious-casino` (Create)
- **User Identity**: `request.auth.uid == "attacker_uid"`, Standard User
- **Malicious Payload**:
```json
{
  "slug": "malicious-slots",
  "affiliateLink": "https://malicious.com/ref",
  "casinoName": "Malicious Casino",
  "status": "published",
  "aiGenerated": false,
  "featured": true,
  "createdAt": "2026-06-27T12:00:00Z",
  "updatedAt": "2026-06-27T12:00:00Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — only `admin` can create casino documents.

---

### Payload 4: Unauthorized Casino Status Manipulation (State Shortcutting)
- **Target Collection**: `/casinos/existing-casino-id` (Update)
- **User Identity**: Standard User or Moderator
- **Malicious Payload**:
```json
{
  "status": "published",
  "updatedAt": "2026-06-27T12:00:00Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — state alterations on casinos require admin status.

---

### Payload 5: Review Impersonation (Identity Spoofing)
- **Target Collection**: `/reviews/attacker-review-id` (Create)
- **User Identity**: `request.auth.uid == "attacker_uid"`
- **Malicious Payload**:
```json
{
  "casinoId": "vegas-grand",
  "userId": "innocent_victim_uid",
  "rating": 5,
  "title": "Amazing Place!",
  "comment": "Totally legit!",
  "approved": true,
  "createdAt": "2026-06-27T12:00:00Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — payload's `userId` must equal `request.auth.uid` and `approved` must be initialized as `false`.

---

### Payload 6: Denial-of-Wallet String Bloat (Resource Poisoning)
- **Target Collection**: `/reviews/massive-review-id` (Create)
- **User Identity**: `request.auth.uid == "attacker_uid"`
- **Malicious Payload**:
```json
{
  "casinoId": "vegas-grand",
  "userId": "attacker_uid",
  "rating": 5,
  "title": "A".repeat(10000),
  "comment": "B".repeat(100000),
  "approved": false,
  "createdAt": "2026-06-27T12:00:00Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — comment size must be <= 4096 and title <= 128 characters.

---

### Payload 7: Self-Approval of Reviews (State Shortcutting)
- **Target Collection**: `/reviews/attacker-review-id` (Update)
- **User Identity**: `request.auth.uid == "attacker_uid"` (Owner of the review)
- **Malicious Payload**:
```json
{
  "approved": true
}
```
- **Expectation**: `PERMISSION_DENIED` — standard users cannot approve reviews; only moderators/admins can.

---

### Payload 8: Cross-User Account Vandalism (Access Violation)
- **Target Collection**: `/users/victim_user_uid` (Update)
- **User Identity**: `request.auth.uid == "attacker_uid"`
- **Malicious Payload**:
```json
{
  "displayName": "Hacked Profile",
  "bio": "Defaced by attacker",
  "updatedAt": "2026-06-27T12:00:00Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — can only write if `request.auth.uid == userId`.

---

### Payload 9: Hijacking Onboarding Submissions
- **Target Collection**: `/sellRequests/request-123` (Update)
- **User Identity**: Guest / Anonymous / Standard User
- **Malicious Payload**:
```json
{
  "status": "approved"
}
```
- **Expectation**: `PERMISSION_DENIED` — sell requests cannot be edited by submitters; only admins can write to them.

---

### Payload 10: Direct AI Generation Logs Forgery (System-Only Mod)
- **Target Collection**: `/aiHistory/forged-history-id` (Create)
- **User Identity**: `request.auth.uid == "attacker_uid"`, Standard User
- **Malicious Payload**:
```json
{
  "casinoId": "vip-spin",
  "prompt": "Write positive review",
  "response": "Perfect high paying site",
  "generatedAt": "2026-06-27T12:00:00Z",
  "generatedBy": "Gemini-Pro"
}
```
- **Expectation**: `PERMISSION_DENIED` — client SDKs are strictly blocked from editing AI logs; only backend/admin integrations allowed.

---

### Payload 11: Global Maintenance Bypass
- **Target Collection**: `/settings/global-config` (Update)
- **User Identity**: Standard User
- **Malicious Payload**:
```json
{
  "maintenanceMode": false,
  "updatedAt": "2026-06-27T12:00:00Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — global settings are restricted to administrative update triggers.

---

### Payload 12: Timestamp Spoofing (Temporal Integrity Bypass)
- **Target Collection**: `/reviews/spoof-timestamp` (Create)
- **User Identity**: `request.auth.uid == "attacker_uid"`
- **Malicious Payload**:
```json
{
  "casinoId": "vegas-grand",
  "userId": "attacker_uid",
  "rating": 5,
  "title": "Good",
  "comment": "Nice",
  "approved": false,
  "createdAt": "1999-12-31T23:59:59Z"
}
```
- **Expectation**: `PERMISSION_DENIED` — must validate `createdAt == request.time`.

---

## 3. Test Runner Blueprint (`firestore.rules.test.ts`)

Below is the automated validation test runner utilizing standard Firebase Jest/Mocha libraries to assert validation blocks.

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

describe("Zero-Trust Firestore Security Rules Test Suite", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "eker-online-casino-listing",
      firestore: {
        rules: require("fs").readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("fails Payload 1: Privilege escalation during profile creation", async () => {
    const attackerDb = testEnv.authenticatedContext("attacker_uid").firestore();
    const docRef = doc(attackerDb, "users/attacker_uid");
    
    await expect(
      setDoc(docRef, {
        email: "attacker@gmail.com",
        displayName: "Vandal",
        role: "super_admin",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ).rejects.toThrow();
  });

  it("fails Payload 2: Privilege escalation on user update", async () => {
    const adminDb = testEnv.unauthenticatedContext().firestore(); // Seed profile first
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/attacker_uid"), {
        email: "attacker@gmail.com",
        displayName: "Vandal",
        role: "user",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    const attackerDb = testEnv.authenticatedContext("attacker_uid").firestore();
    await expect(
      updateDoc(doc(attackerDb, "users/attacker_uid"), {
        role: "admin"
      })
    ).rejects.toThrow();
  });

  it("fails Payload 3: Direct casino publication by guest/user", async () => {
    const userDb = testEnv.authenticatedContext("user_uid").firestore();
    await expect(
      setDoc(doc(userDb, "casinos/malicious-casino"), {
        slug: "malicious-slots",
        affiliateLink: "https://malicious.com",
        casinoName: "Malicious Casino",
        status: "published",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ).rejects.toThrow();
  });
});
```
