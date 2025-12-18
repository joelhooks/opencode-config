# Prevention Patterns

Maps common error patterns to preventive measures. Used by `/debug-plus` to auto-suggest preventive beads when debugging reveals systemic issues.

## How to Use This File

1. **During debugging**: `/debug-plus` auto-references this to suggest preventive beads
2. **After fixes**: Check if the error pattern exists here, update with learnings
3. **Proactive work**: Use pattern names for bead titles when adding preventive measures
4. **Team patterns**: Add organization-specific recurring issues

---

## Pattern Format

Each pattern follows this structure for machine parseability:

```markdown
### [Pattern Name]

**Error Pattern:** `<error message regex or description>`

**Root Cause:** Why this happens (architectural, process, or knowledge gap)

**Prevention Action:** What to add/change to prevent future occurrences

**Example Bead:** `Add [preventive measure] to prevent [error type]`

**Priority:** [0-3] - How critical is prevention?

**Effort:** [low|medium|high] - Implementation cost
```

---

## React / Next.js Patterns

### Missing Error Boundaries

**Error Pattern:** `Uncaught Error.*|Application crashed|Error: .*\n\s+at.*\(.*.tsx`

**Root Cause:** React errors bubble up and crash the entire component tree. No error boundaries means one component failure = full app crash.

**Prevention Action:**

- Add error boundary wrapper at layout/page level
- Create domain-specific error boundaries (auth, data, UI)
- Implement error reporting/logging in boundaries
- Add fallback UIs for graceful degradation

**Example Bead:** `Add error boundaries to [route/layout] to prevent cascading failures`

**Priority:** 2 (high) - Affects user experience directly

**Effort:** low - Standard pattern, reusable component

**Prevention Code:**

```typescript
// app/error.tsx (page-level boundary)
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}

// Or custom boundary for specific sections
import { ErrorBoundary } from 'react-error-boundary'

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <RiskyComponent />
    </ErrorBoundary>
  )
}
```

---

### useEffect Cleanup Missing (Memory Leaks)

**Error Pattern:** `Warning: Can't perform a React state update on an unmounted component|Memory leak detected|setTimeout.*after unmount`

**Root Cause:** Async operations (timers, subscriptions, fetch) continue after component unmounts, attempting state updates or holding references.

**Prevention Action:**

- Always return cleanup function from useEffect
- Use AbortController for fetch requests
- Clear timers/intervals in cleanup
- Unsubscribe from event listeners/streams
- Add ESLint rule to enforce cleanup

**Example Bead:** `Add useEffect cleanup to [component] to prevent memory leaks`

**Priority:** 1 (medium) - Causes bugs over time, especially in SPA navigation

**Effort:** low - Standard pattern once known

**Prevention Code:**

```typescript
// Timers
useEffect(() => {
  const timer = setTimeout(() => doThing(), 1000);
  return () => clearTimeout(timer); // CLEANUP
}, []);

// Event listeners
useEffect(() => {
  const handler = (e: Event) => setState(e.detail);
  window.addEventListener("custom", handler);
  return () => window.removeEventListener("custom", handler); // CLEANUP
}, []);

// Fetch with abort
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)
    .catch((err) => {
      if (err.name !== "AbortError") handleError(err);
    });

  return () => controller.abort(); // CLEANUP
}, [url]);

// Subscriptions
useEffect(() => {
  const sub = observable.subscribe(setData);
  return () => sub.unsubscribe(); // CLEANUP
}, [observable]);
```

---

### Null/Undefined Access Without Guards

**Error Pattern:** `Cannot read propert.* of undefined|Cannot read propert.* of null|TypeError.*undefined`

**Root Cause:** Accessing nested properties or array indices without checking existence first. TypeScript strictNullChecks not enabled or guards missing.

**Prevention Action:**

- Enable `strictNullChecks` in tsconfig
- Use optional chaining (`?.`) for all nullable access
- Use nullish coalescing (`??`) for defaults
- Add runtime guards for external data
- Use Zod/Effect Schema for API boundaries

**Example Bead:** `Add null guards to [module] to prevent undefined access errors`

**Priority:** 2 (high) - Very common runtime error

**Effort:** low - Mostly syntax changes

**Prevention Code:**

```typescript
// tsconfig.json - ENABLE THIS
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}

// Optional chaining
const value = obj?.nested?.property // undefined if any step is null/undefined

// Nullish coalescing for defaults
const name = user?.name ?? 'Anonymous'

// Array access
const first = arr[0] ?? defaultItem
const item = arr.find(x => x.id === id) ?? throwError('Not found')

// Guard functions
function assertExists<T>(value: T | null | undefined, msg?: string): asserts value is T {
  if (value == null) throw new Error(msg ?? 'Value is null/undefined')
}

const user = getUser()
assertExists(user, 'User not found')
user.name // TypeScript knows user is non-null here

// Zod for API boundaries
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
})

// Parse throws if data doesn't match
const user = UserSchema.parse(unknownData)
```

---

### Missing Loading/Error States

**Error Pattern:** `User sees stale data|Form submits twice|No feedback on action|Spinner missing`

**Root Cause:** UI doesn't communicate async operation status. No loading indicators, no error messages, no success feedback.

**Prevention Action:**

- Add loading states for all async operations
- Show error messages with retry actions
- Implement optimistic updates where appropriate
- Use Suspense for server component loading
- Add skeleton UIs for better perceived performance

**Example Bead:** `Add loading/error states to [feature] to prevent UI confusion`

**Priority:** 1 (medium) - UX issue, not critical bug

**Effort:** medium - Requires UI design decisions

**Prevention Code:**

```typescript
// Client component with loading/error
'use client'

function DataFetcher() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchData()
      setData(result)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorDisplay error={error} retry={load} />
  if (!data) return <EmptyState onLoad={load} />

  return <DataDisplay data={data} />
}

// Server component with Suspense
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AsyncDataComponent />
    </Suspense>
  )
}

// Form with submission state
function Form() {
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      await submitForm()
      toast.success('Saved!')
    } catch (err) {
      toast.error('Failed to save')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button disabled={pending}>
        {pending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

---

### Unhandled Promise Rejections

**Error Pattern:** `UnhandledPromiseRejectionWarning|Unhandled promise rejection|Promise rejected with no catch`

**Root Cause:** Async functions called without `await` or `.catch()`. Promises rejected but no error handler attached.

**Prevention Action:**

- Add `.catch()` to all promise chains
- Use try/catch with async/await
- Add global unhandled rejection handler
- Enable ESLint `no-floating-promises` rule
- Use Effect for typed error handling

**Example Bead:** `Add promise error handling to [module] to prevent unhandled rejections`

**Priority:** 2 (high) - Silent failures are dangerous

**Effort:** low - Syntax additions

**Prevention Code:**

```typescript
// ❌ BAD - promise floats, rejection unhandled
fetchData();

// ✅ GOOD - awaited with try/catch
try {
  const data = await fetchData();
} catch (error) {
  handleError(error);
}

// ✅ GOOD - promise chain with catch
fetchData().then(handleSuccess).catch(handleError);

// ✅ GOOD - void explicitly (when you truly don't care)
void fetchData().catch(handleError);

// Global handler (last resort logging)
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled rejection:", event.reason);
    // Send to error tracking service
  });
}

// Effect for typed error handling
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const data = yield* Effect.tryPromise({
    try: () => fetchData(),
    catch: (error) => new FetchError({ cause: error }),
  });
  return data;
});

// All errors must be handled before running
Effect.runPromise(
  program.pipe(Effect.catchAll((error) => Effect.succeed(defaultValue))),
);
```

---

### Missing Input Validation

**Error Pattern:** `SQL injection|XSS attack|Invalid data in database|Type error from API|Schema validation failed`

**Root Cause:** Trusting user input without validation. No sanitization, no type checking, no constraints enforcement.

**Prevention Action:**

- Use Zod/Effect Schema at API boundaries
- Validate on both client and server
- Sanitize HTML before rendering
- Use parameterized queries (never string concat SQL)
- Add length/format constraints
- Implement rate limiting for endpoints

**Example Bead:** `Add input validation to [endpoint/form] to prevent injection attacks`

**Priority:** 3 (critical) - Security vulnerability

**Effort:** medium - Requires schema design

**Prevention Code:**

```typescript
// Zod schema for validation
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).trim(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['user', 'admin']),
})

// Server action with validation
'use server'

export async function createUser(formData: FormData) {
  // Parse and validate
  const result = CreateUserSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
    age: Number(formData.get('age')),
    role: formData.get('role'),
  })

  if (!result.success) {
    return { error: result.error.flatten() }
  }

  // result.data is now type-safe and validated
  const user = await db.user.create({ data: result.data })
  return { user }
}

// API route validation
export async function POST(req: Request) {
  const body = await req.json()

  // Validate before processing
  const data = CreateUserSchema.parse(body) // throws if invalid

  // Or safe parse for custom error handling
  const result = CreateUserSchema.safeParse(body)
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  // Process validated data
}

// HTML sanitization (if rendering user HTML)
import DOMPurify from 'isomorphic-dompurify'

function UserContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html)
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}

// SQL - ALWAYS use parameterized queries
// ❌ BAD - SQL injection vulnerability
const users = await db.query(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ GOOD - parameterized
const users = await db.query('SELECT * FROM users WHERE email = $1', [email])
```

---

### Race Conditions in Async Code

**Error Pattern:** `Stale data displayed|Form submitted with old values|State update order wrong|useEffect race condition`

**Root Cause:** Multiple async operations racing, last-to-finish wins (not last-to-start). No cancellation, no request deduplication.

**Prevention Action:**

- Use AbortController to cancel stale requests
- Implement request deduplication
- Use React Query/SWR for automatic dedup
- Add request IDs to track latest
- Use useTransition for controlled updates

**Example Bead:** `Add race condition handling to [feature] to prevent stale data bugs`

**Priority:** 1 (medium) - Causes confusing bugs

**Effort:** medium - Requires architectural changes

**Prevention Code:**

```typescript
// Race condition example (BAD)
function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    // If user types fast: "a" -> "ab" -> "abc"
    // Requests may return: "abc" -> "a" -> "ab" (out of order!)
    fetch(`/api/search?q=${query}`)
      .then((res) => res.json())
      .then(setResults); // ❌ Last response wins, not latest query
  }, [query]);
}

// FIX 1: AbortController
function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(setResults)
      .catch((err) => {
        if (err.name !== "AbortError") handleError(err);
      });

    return () => controller.abort(); // Cancel previous request
  }, [query]);
}

// FIX 2: Request ID tracking
function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++latestRequestIdRef.current;

    fetch(`/api/search?q=${query}`)
      .then((res) => res.json())
      .then((data) => {
        // Only update if this is still the latest request
        if (requestId === latestRequestIdRef.current) {
          setResults(data);
        }
      });
  }, [query]);
}

// FIX 3: React Query (handles dedup automatically)
import { useQuery } from "@tanstack/react-query";

function SearchBox() {
  const [query, setQuery] = useState("");

  const { data: results } = useQuery({
    queryKey: ["search", query],
    queryFn: () => fetch(`/api/search?q=${query}`).then((r) => r.json()),
    enabled: query.length > 0,
  });
  // Automatically cancels stale requests, deduplicates, caches
}

// FIX 4: Debounce + abort
import { useDebouncedValue } from "./hooks";

function SearchBox() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!debouncedQuery) return;

    const controller = new AbortController();

    fetch(`/api/search?q=${debouncedQuery}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(setResults)
      .catch((err) => {
        if (err.name !== "AbortError") handleError(err);
      });

    return () => controller.abort();
  }, [debouncedQuery]);
}
```

---

### Missing TypeScript Strict Checks

**Error Pattern:** `Runtime type errors|undefined is not a function|Unexpected null|Type 'any' loses safety`

**Root Cause:** TypeScript strict mode disabled. Using `any` liberally. Not enabling all strict flags in tsconfig.

**Prevention Action:**

- Enable ALL strict flags in tsconfig
- Ban `any` except for truly dynamic types
- Use `unknown` instead of `any` for dynamic data
- Enable `noUncheckedIndexedAccess` for array safety
- Run `tsc --noEmit` in CI to catch type errors

**Example Bead:** `Enable TypeScript strict mode in [project] to prevent type errors`

**Priority:** 2 (high) - Foundational safety

**Effort:** high - May require fixing existing code

**Prevention Code:**

```json
// tsconfig.json - THE GOLD STANDARD
{
  "compilerOptions": {
    // Strict mode (enables all flags below)
    "strict": true,

    // Individual flags (strict=true enables these)
    "strictNullChecks": true, // null/undefined must be explicit
    "strictFunctionTypes": true, // function param contravariance
    "strictBindCallApply": true, // bind/call/apply type-safe
    "strictPropertyInitialization": true, // class props must be initialized
    "noImplicitAny": true, // no implicit any types
    "noImplicitThis": true, // this must have explicit type
    "alwaysStrict": true, // emit 'use strict'

    // Additional strict checks (NOT in strict mode)
    "noUncheckedIndexedAccess": true, // array[i] returns T | undefined
    "exactOptionalPropertyTypes": true, // {x?: string} vs {x?: string | undefined}
    "noImplicitReturns": true, // all code paths must return
    "noFallthroughCasesInSwitch": true, // switch cases must break/return
    "noUnusedLocals": true, // catch unused variables
    "noUnusedParameters": true, // catch unused params
    "noPropertyAccessFromIndexSignature": true, // obj.prop vs obj['prop']

    // Errors on any usage
    "noImplicitAny": true
  }
}
```

```typescript
// Replace 'any' with better alternatives

// ❌ BAD
function process(data: any) {
  return data.value; // No type safety
}

// ✅ GOOD - unknown for dynamic data
function process(data: unknown) {
  // Must narrow before using
  if (typeof data === "object" && data !== null && "value" in data) {
    return data.value;
  }
  throw new Error("Invalid data");
}

// ✅ GOOD - generic for typed params
function process<T extends { value: number }>(data: T) {
  return data.value; // Type-safe
}

// ✅ GOOD - Zod for runtime + compile-time safety
import { z } from "zod";

const DataSchema = z.object({ value: z.number() });
type Data = z.infer<typeof DataSchema>;

function process(data: Data) {
  return data.value;
}

// Parse at boundary
const parsed = DataSchema.parse(unknownData);
process(parsed);
```

---

## API / Backend Patterns

### Missing Request Timeout

**Error Pattern:** `Request hangs indefinitely|No response from API|Connection never closes`

**Root Cause:** No timeout configured for fetch/axios. External API hangs, your app waits forever.

**Prevention Action:**

- Set timeout on all fetch requests
- Use AbortController with setTimeout
- Add retry logic with exponential backoff
- Implement circuit breaker for failing services

**Example Bead:** `Add request timeouts to [API client] to prevent hanging requests`

**Priority:** 1 (medium) - UX degradation

**Effort:** low - Standard pattern

**Prevention Code:**

```typescript
// Fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 5000,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// Next.js fetch with timeout (built-in)
fetch(url, {
  next: { revalidate: 60 },
  signal: AbortSignal.timeout(5000), // Native timeout
});

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelay = 1000,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i); // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}
```

---

### Missing Rate Limiting

**Error Pattern:** `429 Too Many Requests|API quota exceeded|DDoS attack|Cost spike from API abuse`

**Root Cause:** No rate limiting on endpoints. Malicious users or bugs can hammer API, causing outages or cost overruns.

**Prevention Action:**

- Implement rate limiting middleware
- Use Redis for distributed rate limiting
- Add per-user and per-IP limits
- Return proper 429 status with Retry-After
- Add request queuing for bursts

**Example Bead:** `Add rate limiting to [API routes] to prevent abuse`

**Priority:** 2 (high) - Security and cost issue

**Effort:** medium - Infrastructure required

**Prevention Code:**

```typescript
// Simple in-memory rate limiter (single server only)
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimit.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimit.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Next.js API route with rate limiting
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  if (!checkRateLimit(ip, 10, 60000)) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      },
    );
  }

  // Process request
}

// Production: Use Redis with upstash/ratelimit
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(reset).toISOString(),
        },
      },
    );
  }

  // Process request
}
```

---

### Missing Authentication/Authorization Checks

**Error Pattern:** `Unauthorized access to data|User accessed admin route|Data leak|IDOR vulnerability`

**Root Cause:** Auth checks missing or inconsistent. Checking auth on client but not server. No role-based access control.

**Prevention Action:**

- Always verify auth on server
- Never trust client-side auth checks
- Implement middleware for auth verification
- Add role-based access control (RBAC)
- Validate resource ownership before mutations

**Example Bead:** `Add auth checks to [routes] to prevent unauthorized access`

**Priority:** 3 (critical) - Security vulnerability

**Effort:** medium - Requires auth infrastructure

**Prevention Code:**

```typescript
// Next.js middleware for route protection
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const session = await getSession(request);

  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!session || session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

// Server action with auth check
("use server");

import { auth } from "./lib/auth";

export async function deletePost(postId: string) {
  const session = await auth();

  // Check authentication
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Check ownership (prevent IDOR)
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error("Post not found");
  }

  if (post.authorId !== session.user.id) {
    throw new Error("Forbidden: You can only delete your own posts");
  }

  // Now safe to delete
  await db.post.delete({ where: { id: postId } });
}

// API route with RBAC
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role
  if (session.user.role !== "admin" && session.user.role !== "moderator") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check resource ownership or permissions
  const resource = await db.resource.findUnique({ where: { id: params.id } });

  if (!resource) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete =
    session.user.role === "admin" ||
    (session.user.role === "moderator" &&
      resource.authorId === session.user.id);

  if (!canDelete) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.resource.delete({ where: { id: params.id } });
  return Response.json({ success: true });
}
```

---

## Database / Data Patterns

### Missing Database Indexes

**Error Pattern:** `Query timeout|Slow query|Database CPU at 100%|Full table scan detected`

**Root Cause:** Querying columns without indexes. Database scans entire table instead of using index.

**Prevention Action:**

- Add indexes to frequently queried columns
- Index foreign keys
- Add composite indexes for multi-column queries
- Monitor slow query logs
- Use EXPLAIN to analyze query plans

**Example Bead:** `Add database indexes to [table] to prevent slow queries`

**Priority:** 1 (medium) - Performance issue

**Effort:** low - Simple migration

**Prevention Code:**

```sql
-- Identify slow queries first
-- PostgreSQL
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Add index to single column
CREATE INDEX idx_users_email ON users(email);

-- Add composite index for multi-column WHERE
CREATE INDEX idx_posts_author_status ON posts(author_id, status);

-- Add partial index for filtered queries
CREATE INDEX idx_posts_published ON posts(published_at)
WHERE status = 'published';

-- Add index for foreign keys (CRITICAL)
CREATE INDEX idx_posts_author_id ON posts(author_id);

-- Prisma schema with indexes
model Post {
  id          String   @id @default(cuid())
  authorId    String
  status      String
  publishedAt DateTime?

  author User @relation(fields: [authorId], references: [id])

  @@index([authorId]) // Foreign key index
  @@index([status, publishedAt]) // Composite for queries
  @@index([publishedAt], where: { status: 'published' }) // Partial index
}
```

---

### Missing Database Transactions

**Error Pattern:** `Data inconsistency|Partial update|Race condition in DB|Lost update problem`

**Root Cause:** Multiple related database operations not wrapped in transaction. Failure in middle leaves inconsistent state.

**Prevention Action:**

- Use transactions for multi-step operations
- Wrap related INSERT/UPDATE/DELETE in transaction
- Use optimistic locking for concurrent updates
- Implement idempotency for retryable operations

**Example Bead:** `Add database transactions to [operation] to prevent data inconsistency`

**Priority:** 2 (high) - Data integrity issue

**Effort:** low - Framework usually provides this

**Prevention Code:**

```typescript
// Prisma transaction
import { prisma } from './lib/db'

// ❌ BAD - no transaction
async function transferMoney(fromId: string, toId: string, amount: number) {
  await prisma.account.update({
    where: { id: fromId },
    data: { balance: { decrement: amount } }
  })

  // If this fails, money is lost!
  await prisma.account.update({
    where: { id: toId },
    data: { balance: { increment: amount } }
  })
}

// ✅ GOOD - transaction ensures all-or-nothing
async function transferMoney(fromId: string, toId: string, amount: number) {
  await prisma.$transaction(async (tx) => {
    // Decrement sender
    await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } }
    })

    // Increment receiver
    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } }
    })
  })
  // If ANY operation fails, ALL are rolled back
}

// Optimistic locking with version field
model Account {
  id      String @id
  balance Int
  version Int    @default(0) // Increment on every update
}

async function updateAccountSafe(id: string, newBalance: number) {
  const account = await prisma.account.findUnique({ where: { id } })

  const updated = await prisma.account.updateMany({
    where: {
      id,
      version: account.version, // Only update if version matches
    },
    data: {
      balance: newBalance,
      version: { increment: 1 },
    },
  })

  if (updated.count === 0) {
    throw new Error('Concurrent modification detected, retry')
  }
}
```

---

## Build / Deployment Patterns

### Missing Environment Variable Validation

**Error Pattern:** `undefined is not a function|Cannot connect to database|API key missing|Runtime config error`

**Root Cause:** Environment variables not validated at build/startup time. App starts with missing/invalid config, fails at runtime.

**Prevention Action:**

- Validate env vars at startup
- Use Zod schema for env validation
- Fail fast if required vars missing
- Type-safe env access
- Document required env vars

**Example Bead:** `Add env validation to [project] to prevent runtime config errors`

**Priority:** 2 (high) - Prevents runtime failures

**Effort:** low - One-time setup

**Prevention Code:**

```typescript
// env.ts - Single source of truth for env vars
import { z } from "zod";

const envSchema = z.object({
  // Node env
  NODE_ENV: z.enum(["development", "production", "test"]),

  // Database
  DATABASE_URL: z.string().url(),

  // APIs
  NEXT_PUBLIC_API_URL: z.string().url(),
  API_SECRET_KEY: z.string().min(32),

  // Optional with defaults
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// Validate at module load (fails fast)
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables");
}

// Export typed env
export const env = parsed.data;

// Now use type-safe env everywhere
import { env } from "./env";

const db = new Database(env.DATABASE_URL);
const port = env.PORT; // number, not string

// Next.js specific - validate in next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Fails build if missing
    REQUIRED_VAR: process.env.REQUIRED_VAR,
  },
  // Or use experimental.envSchema (Next.js 15+)
  experimental: {
    envSchema: {
      DATABASE_URL: z.string().url(),
      API_KEY: z.string(),
    },
  },
};
```

---

### Missing Health Checks

**Error Pattern:** `503 Service Unavailable|Load balancer routing to dead instances|Can't tell if app is healthy`

**Root Cause:** No health check endpoint. Load balancers/orchestrators can't verify app health, route traffic to broken instances.

**Prevention Action:**

- Add /health and /ready endpoints
- Check database connectivity in health check
- Check external dependencies
- Return 200 for healthy, 503 for unhealthy
- Separate liveness (is running?) from readiness (can serve traffic?)

**Example Bead:** `Add health check endpoint to [service] to enable monitoring`

**Priority:** 1 (medium) - Ops requirement for production

**Effort:** low - Standard pattern

**Prevention Code:**

```typescript
// app/api/health/route.ts - Liveness probe (is process alive?)
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}

// app/api/ready/route.ts - Readiness probe (can serve traffic?)
import { prisma } from "@/lib/db";

export async function GET() {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;

    // Check Redis (if used)
    // await redis.ping()
    // checks.redis = true

    const allHealthy = Object.values(checks).every(Boolean);

    return Response.json(
      {
        status: allHealthy ? "ready" : "not_ready",
        checks,
        timestamp: new Date().toISOString(),
      },
      { status: allHealthy ? 200 : 503 },
    );
  } catch (error) {
    return Response.json(
      {
        status: "error",
        checks,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

// Kubernetes deployment.yaml
// livenessProbe:
//   httpGet:
//     path: /api/health
//     port: 3000
//   initialDelaySeconds: 10
//   periodSeconds: 5
//
// readinessProbe:
//   httpGet:
//     path: /api/ready
//     port: 3000
//   initialDelaySeconds: 5
//   periodSeconds: 3
```

---

## Adding New Patterns

When you discover a new preventable error pattern:

1. **Identify recurrence**: Has this happened >2 times in different contexts?
2. **Find root cause**: Why does this keep happening?
3. **Define prevention**: What systematic change prevents it?
4. **Create bead template**: What's the actionable task title?
5. **Add to this file**: Follow the format above

Then create a cell to track adding it:

```bash
hive_create({
  title: "Prevention pattern: [error type]",
  type: "chore",
  description: "Add [error] to prevention-patterns.md with prevention actions"
})
```

---

## Integration with /debug-plus

The `/debug-plus` command references this file to suggest preventive beads:

1. User hits error
2. `/debug-plus` matches error to pattern
3. Extracts "Prevention Action" and "Example Bead"
4. Suggests creating bead with preventive work
5. Logs pattern match for learning

**Format requirements for machine parsing:**

- `**Error Pattern:**` - Must contain regex or description
- `**Prevention Action:**` - Bullet list of actions
- `**Example Bead:**` - Bead title template with [placeholders]
- `**Priority:**` - 0-3 for bead priority
- `**Effort:**` - low|medium|high for estimation

Keep patterns focused, actionable, and backed by real examples.
