# SultiAI Threat Mitigation & Rate Limiting (30pts)

This section covers the security mechanisms that protect the application from abuse, including rate limiting, IP blacklisting/lockout, and progressive delays for failed authentication attempts.

## File Structure & Key Components

| File | Lines | Purpose |
|------|-------|---------|
| `server/src/middleware/rateLimit.ts` | ~180 | **Rate limiting middleware** - Express middleware with global, auth, AI, speech, and community limits + IP blacklisting/lockout |
| `server/src/config.ts` | - | **RATE_LIMITS config** - Defines window sizes and max requests per category |
| `server/src/utils/apiResponse.ts` | - | **Error responses** - `rateLimited()`, `forbidden()` standardized error formats |
| `server/src/middleware/auth.ts` | - | **Auth middleware** - Extracts user role from JWT for role-based limits |
| `server/src/services/api.js` | 73-129 | **Client request wrapper** - AbortController timeout (15s), network error handling |

## Rate Limiting Architecture

### 1. **Layered Rate Limit Middleware** (`server/src/middleware/rateLimit.ts`)

Multiple independent rate limiters with different scopes:

| Limiter | Purpose | Scope |
|---------|---------|-------|
| `globalRateLimit` | General API protection | All routes |
| `authRateLimit` | Authentication endpoints | Sign up, sign in, OAuth, token refresh |
| `aiRateLimit` | AI generation (lesson creation) | Tutor/conversation APIs |
| `speechRateLimit` | Speech/pronunciation features | Recording, transcription, stats |
| `communityRateLimit` | Community features | Posts, comments, collaborations |

```javascript
// Example: Auth endpoints are rate-limited
router.post('/signup', rateLimit_1.authRateLimit, (0, validate_1.validate)([
  // ... validation
]));
router.post('/signin', rateLimit_1.authRateLimit, auth_controller_1.signIn);
router.post('/google', rateLimit_1.authRateLimit, auth_controller_1.googleSignIn);
```

### 2. **IP Blacklisting & Lockout** (`server/src/middleware/rateLimit.ts:20-60`)

- **Blacklist**: Permanent IP blocking via `ipBlacklist` Set
- **Lockout**: Temporary blocking after `MAX_FAILED_ATTEMPTS` (default 5)
- **Lock duration**: 15 minutes (`LOCKOUT_DURATION_MS = 15 * 60 * 1000`)
- **Progressive delay**: Exponential backoff between attempts: `min(1000 * 2^(count-1), 30000)`

```javascript
// After 5 failed attempts, IP is locked out for 15 minutes
if (entry.count >= MAX_FAILED_ATTEMPTS) {
  entry.lockedUntil = now + LOCKOUT_DURATION_MS;
}
```

### 3. **Rate Limit Headers** (`server/src/middleware/rateLimit.ts:113-120`)

All rate-limited responses include these headers:

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Max requests allowed in window |
| `X-RateLimit-Remaining` | Remaining requests this window |
| `X-RateLimit-Reset` | Epoch seconds when window resets |

### 4. **Role-Based Rate Limiting** (`server/src/middleware/rateLimit.ts:163-190`)

Admins and moderators get higher limits than regular users:

```javascript
export function roleBasedRateLimit(
  key: string,
  limits: { user?: number; moderator?: number; admin?: number },
  windowMs: number
) {
  return (req, res, next) => {
    const role = req.userRole?.role || req.user?.role || 'user';
    let max = limits.user || 50;

    if (role === 'admin' && limits.admin) max = limits.admin;
    else if (role === 'moderator' && limits.moderator) max = limits.moderator;

    checkLimit(req, res, next, `role:${key}`, windowMs, max);
  };
}
```

## Client-Side Mitigation

### 1. **Request Timeouts** (`src/services/api.js:73-129`)

- Default 15-second timeout via `AbortController`
- Prevents hanging requests from consuming resources
- Clear error message: "Request timed out. Please check your connection and try again."

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
```

### 2. **AbortController for Cancellation** (`src/services/api.js:83-96`)

- External signals can be provided to cancel requests
- Both external signal AND timeout controller are handled
- Prevents race conditions when aborting

### 3. **Offline Sync Protection** (`src/services/offline.js:16-19`)

- 3-second timeout for offline queue operations
- Prevents stalled sync operations from blocking app

## Data Flow: Failed Attempts → Lockout

```
User attempts auth action
    ↓
Server records failed attempt (rateLimit middleware)
    ↓
IP check: blacklisted? → 403 Forbidden
    ↓
IP check: locked? → 429 Rate Limited + Retry-After header
    ↓
Record attempt → count++ → check max
    ↓
If count > max: 429 Rate Limited error
    ↓
If count >= MAX_FAILED_ATTEMPTS: lock IP
    ↓
Progressive delay on subsequent attempts
    ↓
Client shows error + Retry-After guidance
```

## Key Constants (from `server/src/config.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `RATE_LIMITS.GLOBAL.windowMs` | e.g., 60000 | 1 minute window |
| `RATE_LIMITS.GLOBAL.max` | e.g., 100 | Max 100 global requests/min |
| `RATE_LIMITS.AUTH.windowMs` | e.g., 60000 | 1 minute window for auth |
| `RATE_LIMITS.AUTH.max` | e.g., 10 | Max 10 auth attempts/min |
| `RATE_LIMITS.AI.windowMs` | e.g., 60000 | 1 minute for AI generation |
| `RATE_LIMITS.AI.max` | e.g., 5 | Max 5 AI calls/min |
| `RATE_LIMITS.SPEECH.windowMs` | e.g., 60000 | 1 minute for speech |
| `RATE_LIMITS.SPEECH.max` | e.g., 30 | Max 30 speech ops/min |

## Usage in Routes

```javascript
// Auth routes - strict limits
router.post('/signin', rateLimit_1.authRateLimit, validator, controller.signIn);
router.post('/google', rateLimit_1.authRateLimit, controller.googleSignIn);

// AI generation - moderate limits  
router.post('/tutor/lesson', rateLimit_1.aiRateLimit, lesson_controller_1.generateLesson);

// Speech/pronunciation
router.post('/attempt', rateLimit_2.aiRateLimit, pronunciation_controller_1.recordAttempt);
router.get('/stats', rateLimit_2.speechRateLimit, pronunciation_controller_1.getStats);
```

## Security Summary

| Threat | Mitigation |
|--------|-----------|
| Brute force login | IP lockout after 5 failures (15min), progressive delays |
| API abuse | Tiered rate limits (global/auth/AI/speech/community) |
| IP spoofing | `x-forwarded-for` parsing with fallback to `req.ip` |
| Stalled requests | 15s AbortController timeout on client |
| Resource exhaustion | Rate limit headers inform client of remaining quota |