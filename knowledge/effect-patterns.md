# Effect-TS Patterns Knowledge Base

Practical patterns, idioms, and gotchas for Effect-TS. Searchable by concept.

## How to Use This File

1. **Starting with Effect**: Read Core Concepts first
2. **During debugging**: Search for error messages or concept names
3. **Adding features**: Check relevant pattern section
4. **Code review**: Verify patterns match these idioms

---

## Core Concepts

### Effect<A, E, R> - The Holy Trinity

```typescript
// Effect<Success, Error, Requirements>
// A = Success type (what it returns)
// E = Error type (what can fail)
// R = Requirements type (what dependencies it needs)

// Pure success - no error, no requirements
const succeed: Effect.Effect<number> = Effect.succeed(42);

// Can fail - has error channel
const mayFail: Effect.Effect<number, Error> = Effect.fail(new Error("boom"));

// Needs something - has requirements
const needsDb: Effect.Effect<User, DbError, Database> = Database.findUser(id);
```

**Key insight**: `never` means "nothing" in that channel:

- `Effect<number, never, never>` - always succeeds, needs nothing
- `Effect<never, Error, never>` - always fails, needs nothing

---

### Effect.fn - Traced Functions

Use `Effect.fn` for named, traced functions with automatic call-site tracking:

```typescript
// Creates a traced function - shows up in error stack traces
const processUser = Effect.fn("processUser")(function* (userId: string) {
  yield* Effect.logInfo(`Processing user ${userId}`);
  const user = yield* getUser(userId);
  return yield* processData(user);
});

// With explicit types
const fetchData = Effect.fn("fetchData")<
  [url: string],
  Data,
  FetchError,
  HttpClient
>(function* (url) {
  const client = yield* HttpClient;
  return yield* client.get(url);
});
```

**When to use**:

- Service methods that you want traced in errors
- Functions called from multiple places (easier debugging)
- Any function where call-site matters for debugging

**Key insight**: `Effect.fn` gives you named stack traces without manual span creation.

---

### Effect.gen vs pipe - When to Use Which

**Use `Effect.gen` for**:

- Sequential operations where each step depends on previous
- Readability (looks like async/await)
- Most business logic

```typescript
const program = Effect.gen(function* () {
  const user = yield* Database.findUser(id);
  const posts = yield* Database.findPosts(user.id);
  const enriched = yield* enrichPosts(posts);
  return { user, posts: enriched };
});
```

**Use `pipe` for**:

- Transformations and compositions
- When you don't need intermediate values
- Functional style chaining

```typescript
const program = pipe(
  Database.findUser(id),
  Effect.flatMap((user) => Database.findPosts(user.id)),
  Effect.map((posts) => posts.filter((p) => p.published)),
  Effect.tap((posts) => Console.log(`Found ${posts.length} posts`)),
);
```

**Common mistake**: Mixing styles incorrectly

```typescript
// WRONG - yield* in pipe callback doesn't work
pipe(
  someEffect,
  Effect.map(function* () {
    // NO! This is a generator, not an Effect
    yield* otherEffect;
  }),
);

// RIGHT - use flatMap for effects in pipe
pipe(
  someEffect,
  Effect.flatMap(() => otherEffect),
);
```

---

### Effect.sync vs Effect.promise vs Effect.tryPromise

```typescript
// Effect.sync - synchronous, CANNOT throw
// Use for pure computations
const now = Effect.sync(() => Date.now());
const parsed = Effect.sync(() => JSON.parse(json)); // WRONG if JSON might be invalid!

// Effect.try - synchronous, CAN throw
// Catches throws and puts in error channel
const safeParse = Effect.try({
  try: () => JSON.parse(json),
  catch: (e) => new ParseError(e),
});

// Effect.promise - async, promise CANNOT reject
// Use for promises that always resolve
const delay = Effect.promise(() => new Promise((r) => setTimeout(r, 1000)));

// Effect.tryPromise - async, promise CAN reject
// Use for fetch, db calls, etc.
const fetchData = Effect.tryPromise({
  try: () => fetch(url).then((r) => r.json()),
  catch: (e) => new FetchError(e),
});
```

**Common mistake**: Using `Effect.sync` for code that can throw

```typescript
// WRONG - throws are defects in Effect.sync
const bad = Effect.sync(() => JSON.parse(invalidJson)); // Defect!

// RIGHT - use Effect.try
const good = Effect.try({
  try: () => JSON.parse(invalidJson),
  catch: (e) => new ParseError(e),
});
```

---

### Fiber Basics

Fibers are lightweight threads. Effects run on fibers.

```typescript
// Fork an effect to run concurrently
const fiber = yield * Effect.fork(longRunningTask);

// Join to wait for result
const result = yield * Fiber.join(fiber);

// Interrupt to cancel
yield * Fiber.interrupt(fiber);

// Fork and forget (daemon fiber)
yield * Effect.forkDaemon(backgroundTask);

// Fork in scope (auto-cleanup)
yield * Effect.forkScoped(scopedTask);
```

**When to use fibers**:

- Background tasks
- Concurrent operations with manual control
- Cancellation scenarios
- Racing multiple operations

---

## Error Handling

### Tagged Errors with Data.TaggedError

```typescript
import { Data } from "effect";

// Define typed errors
class UserNotFound extends Data.TaggedError("UserNotFound")<{
  userId: string;
}> {}

class InvalidInput extends Data.TaggedError("InvalidInput")<{
  field: string;
  message: string;
}> {}

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  cause: unknown;
}> {}

// Use in effects
const findUser = (
  id: string,
): Effect.Effect<User, UserNotFound | DatabaseError> =>
  Effect.gen(function* () {
    const result = yield* db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!result) {
      return yield* new UserNotFound({ userId: id });
    }
    return result;
  });
```

**Why TaggedError**:

- `_tag` discriminant for type narrowing
- Equality by value (not reference)
- Plays nice with Schema

---

### Effect.catchTag, Effect.catchAll, Effect.catchTags

```typescript
// Catch specific error by tag
const handled = pipe(
  findUser(id),
  Effect.catchTag("UserNotFound", (e) =>
    Effect.succeed({ id: e.userId, name: "Anonymous" }),
  ),
);

// Catch multiple tags
const handledMultiple = pipe(
  riskyOperation,
  Effect.catchTags({
    UserNotFound: (e) => Effect.succeed(defaultUser),
    InvalidInput: (e) => Effect.fail(new ValidationError(e.message)),
  }),
);

// Catch all errors (escape hatch)
const handledAll = pipe(
  riskyOperation,
  Effect.catchAll((e) => {
    console.error("Something went wrong:", e);
    return Effect.succeed(fallbackValue);
  }),
);
```

---

### Effect.either, Effect.option

Convert error channel to success channel for explicit handling:

```typescript
// Effect.either - errors become Left, success becomes Right
const result = yield * Effect.either(mayFailEffect);
if (Either.isLeft(result)) {
  console.log("Failed:", result.left);
} else {
  console.log("Success:", result.right);
}

// Effect.option - errors become None, success becomes Some
const maybeUser = yield * Effect.option(findUser(id));
if (Option.isNone(maybeUser)) {
  // Handle missing
}
```

**When to use**:

- When you want to handle error in success channel
- Pattern matching on results
- Collecting errors from multiple operations

---

### Defects vs Expected Errors

**Expected errors** (E channel):

- Business logic failures (user not found, validation failed)
- Recoverable conditions
- Part of your API contract

**Defects** (thrown, not in E):

- Programmer errors (null pointer, division by zero)
- Unrecoverable conditions
- Bugs that should crash

```typescript
// Expected error - in E channel
const expected = Effect.fail(new UserNotFound({ userId: "123" }));

// Defect - not in E channel, will crash unless caught with catchAllDefect
const defect = Effect.die(new Error("This should never happen"));

// Promote expected error to defect (when you've handled it upstream)
const promoted = pipe(
  findUser(id),
  Effect.catchTag("UserNotFound", () =>
    Effect.die("Impossible - user was just created"),
  ),
);
```

---

### Schema.Defect for Unknown Errors

Wrap errors from external libraries that you can't control:

```typescript
// Schema.Defect wraps unknown errors safely
class ApiError extends Schema.TaggedError<ApiError>()("ApiError", {
  endpoint: Schema.String,
  statusCode: Schema.Number,
  cause: Schema.Defect, // Wraps unknown errors from fetch, etc.
}) {}

// Use when catching external library errors
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r) => r.json()),
    catch: (error) =>
      new ApiError({
        endpoint: `/api/users/${id}`,
        statusCode: 500,
        cause: error, // Unknown error wrapped safely
      }),
  });

// The cause is preserved for debugging but safely typed
```

**When to use**:

- Wrapping errors from `fetch`, database drivers, etc.
- When you need to preserve the original error for debugging
- External library errors that don't have typed errors

---

### Effect.orDie, Effect.orElse

```typescript
// orDie - convert all errors to defects
// Use when errors are "impossible" or you want to crash
const mustSucceed = pipe(
  parseConfig,
  Effect.orDie, // If this fails, it's a bug
);

// orElse - fallback effect on any error
const withFallback = pipe(
  primarySource,
  Effect.orElse(() => fallbackSource),
);

// orElseSucceed - fallback value on any error
const withDefault = pipe(
  findUser(id),
  Effect.orElseSucceed(() => defaultUser),
);
```

---

## Services & Layers

### Context.Tag Pattern

```typescript
import { Context, Effect, Layer } from "effect";

// 1. Define the service interface
interface Database {
  readonly query: (sql: string) => Effect.Effect<unknown[], DatabaseError>;
  readonly execute: (sql: string) => Effect.Effect<void, DatabaseError>;
}

// 2. Create the Tag (service identifier)
const Database = Context.GenericTag<Database>("Database");

// 3. Use in effects
const findUsers = Effect.gen(function* () {
  const db = yield* Database;
  return yield* db.query("SELECT * FROM users");
});

// 4. Create implementation as Layer
const DatabaseLive = Layer.succeed(Database, {
  query: (sql) =>
    Effect.tryPromise({
      try: () => pool.query(sql),
      catch: (e) => new DatabaseError({ cause: e }),
    }),
  execute: (sql) =>
    Effect.tryPromise({
      try: () => pool.execute(sql),
      catch: (e) => new DatabaseError({ cause: e }),
    }),
});
```

---

### Layer.effect, Layer.scoped, Layer.succeed

```typescript
// Layer.succeed - for values that don't need effects to construct
const ConfigLive = Layer.succeed(Config, {
  apiUrl: process.env.API_URL!,
  timeout: 5000,
});

// Layer.effect - for services that need async setup
const HttpClientLive = Layer.effect(
  HttpClient,
  Effect.gen(function* () {
    const config = yield* Config;
    const client = createClient({ baseUrl: config.apiUrl });
    return {
      get: (path) => Effect.tryPromise(() => client.get(path)),
    };
  }),
);

// Layer.scoped - for services that need cleanup
const DatabaseLive = Layer.scoped(
  Database,
  Effect.gen(function* () {
    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => createPool()),
      (pool) => Effect.sync(() => pool.end()),
    );
    return {
      query: (sql) => Effect.tryPromise(() => pool.query(sql)),
    };
  }),
);
```

---

### Layer Composition

```typescript
// Layer.merge - combine independent layers
const InfraLayer = Layer.merge(DatabaseLive, HttpClientLive);

// Layer.provide - layer A depends on layer B
const ServiceLive = Layer.provide(ServiceThatNeedsDb, DatabaseLive);

// Layer.provideMerge - provide and merge
const FullAppLayer = pipe(
  ServiceLive,
  Layer.provideMerge(ConfigLive),
  Layer.provideMerge(LoggerLive),
);

// Build the full dependency graph
const program = pipe(myApp, Effect.provide(FullAppLayer));
```

---

### Layer Memoization (IMPORTANT)

Store parameterized layers in constants to avoid duplicate resource construction:

```typescript
// ✅ GOOD: Single connection pool shared by all services
const postgresLayer = Postgres.layer({ url: "...", poolSize: 10 });

const appLayer = Layer.merge(
  UserRepo.layer.pipe(Layer.provide(postgresLayer)),
  OrderRepo.layer.pipe(Layer.provide(postgresLayer)),
);
// Both repos share the SAME pool

// ❌ BAD: Creates TWO separate connection pools!
const appLayerBad = Layer.merge(
  UserRepo.layer.pipe(
    Layer.provide(Postgres.layer({ url: "...", poolSize: 10 })),
  ),
  OrderRepo.layer.pipe(
    Layer.provide(Postgres.layer({ url: "...", poolSize: 10 })),
  ),
);
// Each repo gets its own pool - resource waste!

// ✅ GOOD: Memoize expensive layers
const ExpensiveServiceLive = Layer.effect(
  ExpensiveService,
  Effect.gen(function* () {
    yield* Effect.logInfo("Initializing expensive service...");
    // This should only run ONCE
    return {
      /* ... */
    };
  }),
).pipe(Layer.memoize); // Explicit memoization
```

**Key insight**: Layer construction is NOT automatically memoized. If you inline `Layer.effect(...)` in multiple places, it runs multiple times. Extract to a constant or use `Layer.memoize`.

---

### Testing with Test Layers

```typescript
// Create test implementation
const DatabaseTest = Layer.succeed(Database, {
  query: (sql) => Effect.succeed([{ id: 1, name: "Test User" }]),
  execute: (sql) => Effect.void,
});

// Or with mutable state for assertions
const makeDatabaseTest = () => {
  const queries: string[] = [];

  return {
    layer: Layer.succeed(Database, {
      query: (sql) => {
        queries.push(sql);
        return Effect.succeed([]);
      },
      execute: (sql) => {
        queries.push(sql);
        return Effect.void;
      },
    }),
    getQueries: () => queries,
  };
};

// In test
test("should query database", async () => {
  const { layer, getQueries } = makeDatabaseTest();
  await Effect.runPromise(pipe(myProgram, Effect.provide(layer)));
  expect(getQueries()).toContain("SELECT * FROM users");
});
```

---

## Schema

### Schema.Class for Domain Models

```typescript
import { Schema } from "effect";

// Define a class with validation
class User extends Schema.Class<User>("User")({
  id: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^.+@.+\..+$/)),
  name: Schema.String.pipe(Schema.minLength(1)),
  createdAt: Schema.DateFromString,
  role: Schema.Literal("admin", "user", "guest"),
}) {}

// Automatic constructor validation
const user = new User({
  id: "123",
  email: "joel@example.com",
  name: "Joel",
  createdAt: "2024-01-01T00:00:00Z",
  role: "admin",
});

// Decode from unknown
const decoded = Schema.decodeUnknown(User)({
  id: "123",
  email: "test@test.com",
  // ...
});

// Encode to JSON-safe format
const encoded = Schema.encode(User)(user);
```

---

### Schema.TaggedError for Typed Errors

```typescript
// Combine Schema validation with TaggedError
class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: Schema.String,
    message: Schema.String,
    received: Schema.Unknown,
  },
) {}

class ApiError extends Schema.TaggedError<ApiError>()("ApiError", {
  statusCode: Schema.Number,
  body: Schema.Unknown,
}) {}

// Use in effects
const validate = (input: unknown): Effect.Effect<ValidInput, ValidationError> =>
  pipe(
    Schema.decodeUnknown(InputSchema)(input),
    Effect.mapError(
      (e) =>
        new ValidationError({
          field: "input",
          message: "Invalid input",
          received: input,
        }),
    ),
  );
```

---

### Schema.optional and Schema.optionalWith

```typescript
const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,

  // Optional - can be missing or undefined
  bio: Schema.optional(Schema.String),

  // Optional with default value
  role: Schema.optionalWith(Schema.String, { default: () => "user" }),

  // Optional but nullable (null allowed when present)
  avatar: Schema.optional(Schema.NullOr(Schema.String)),

  // Exact optional - must be missing, not undefined
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown), {
    exact: true,
  }),
});
```

---

### Schema Transformations

```typescript
// Transform during decode/encode
const DateFromUnix = Schema.transform(Schema.Number, Schema.DateFromSelf, {
  decode: (unix) => new Date(unix * 1000),
  encode: (date) => Math.floor(date.getTime() / 1000),
});

// Branded types for type safety
const UserId = Schema.String.pipe(Schema.brand("UserId"));
type UserId = Schema.Schema.Type<typeof UserId>;

// Compose schemas
const ApiResponse = <A, I>(dataSchema: Schema.Schema<A, I>) =>
  Schema.Struct({
    success: Schema.Boolean,
    data: dataSchema,
    timestamp: Schema.DateFromString,
  });
```

---

## Concurrency

### Effect.all with Concurrency Options

```typescript
// Sequential (default)
const results = yield * Effect.all([effectA, effectB, effectC]);

// Concurrent - all at once
const concurrent =
  yield *
  Effect.all([effectA, effectB, effectC], {
    concurrency: "unbounded",
  });

// Limited concurrency
const limited =
  yield *
  Effect.all(manyEffects, {
    concurrency: 5,
  });

// Fail on first error vs collect all
const failFast =
  yield *
  Effect.all(effects, {
    concurrency: "unbounded",
    mode: "default", // fails immediately on first error
  });

const collectErrors =
  yield *
  Effect.all(effects, {
    concurrency: "unbounded",
    mode: "either", // collects all results as Either
  });
```

---

### Effect.forEach

```typescript
// Process items with effects
const processed =
  yield *
  Effect.forEach(items, (item) => processItem(item), { concurrency: 10 });

// Discard results (side effects only)
yield *
  Effect.forEach(items, (item) => sendNotification(item), {
    concurrency: 5,
    discard: true,
  });
```

---

### Effect.race, Effect.timeout

```typescript
// Race - first to complete wins
const fastest = yield * Effect.race(fetchFromPrimary, fetchFromBackup);

// Timeout - fail if too slow
const withTimeout = pipe(slowOperation, Effect.timeout("5 seconds"));

// Timeout with fallback
const withFallback = pipe(
  slowOperation,
  Effect.timeoutTo({
    duration: "5 seconds",
    onTimeout: () => fallbackValue,
  }),
);
```

---

### Semaphore, Queue, Ref

```typescript
// Semaphore - limit concurrent access
const semaphore = yield * Effect.makeSemaphore(3);
yield * semaphore.withPermits(1)(expensiveOperation);

// Queue - async communication between fibers
const queue = yield * Queue.bounded<Message>(100);
yield * Queue.offer(queue, message);
const msg = yield * Queue.take(queue);

// Ref - mutable state
const counter = yield * Ref.make(0);
yield * Ref.update(counter, (n) => n + 1);
const value = yield * Ref.get(counter);

// Ref.modify - update and return something
const oldValue = yield * Ref.getAndUpdate(counter, (n) => n + 1);
```

---

## Resource Management

### Effect.acquireRelease

```typescript
// Basic pattern
const file =
  yield *
  Effect.acquireRelease(
    // Acquire
    Effect.sync(() => fs.openSync(path, "r")),
    // Release (always runs)
    (fd) => Effect.sync(() => fs.closeSync(fd)),
  );

// With scoped to manage lifetime
const useFile = (path: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fd = yield* Effect.acquireRelease(
        Effect.sync(() => fs.openSync(path, "r")),
        (fd) => Effect.sync(() => fs.closeSync(fd)),
      );
      return yield* readContents(fd);
    }),
  );
```

---

### Effect.addFinalizer

```typescript
const withCleanup = Effect.gen(function* () {
  const resource = yield* acquireResource;

  // Register cleanup for this scope
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => console.log("Cleaning up!")),
  );

  return resource;
});

// Finalizers run when scope closes
const result = yield * Effect.scoped(withCleanup);
```

---

### Proper Cleanup Patterns

```typescript
// Multiple resources - nest scopes or use all
const multiResource = Effect.scoped(
  Effect.gen(function* () {
    const [db, cache, queue] = yield* Effect.all([
      acquireDb,
      acquireCache,
      acquireQueue,
    ]);

    // All cleaned up when scope exits
    return yield* doWork(db, cache, queue);
  }),
);

// Ensure cleanup even on interrupt
const interruptSafe = Effect.gen(function* () {
  const resource = yield* Effect.acquireRelease(
    acquire,
    (r) => release(r).pipe(Effect.orDie), // Release must not fail
  );

  yield* Effect.onInterrupt(doWork(resource), () =>
    Effect.sync(() => console.log("Was interrupted!")),
  );
});
```

---

## Common Patterns

### Retry with Schedule

```typescript
import { Schedule } from "effect";

// Retry 3 times
const retried = pipe(flakeyOperation, Effect.retry(Schedule.recurs(3)));

// Exponential backoff
const exponential = pipe(
  flakeyOperation,
  Effect.retry(
    Schedule.exponential("100 millis").pipe(
      Schedule.jittered,
      Schedule.compose(Schedule.recurs(5)),
    ),
  ),
);

// Retry specific errors only
const selectiveRetry = pipe(
  operation,
  Effect.retry({
    schedule: Schedule.recurs(3),
    while: (e) => e._tag === "NetworkError",
  }),
);

// Retry with logging
const withLogging = pipe(
  operation,
  Effect.retry(
    Schedule.recurs(3).pipe(
      Schedule.tapInput((e) => Console.log(`Retrying due to: ${e}`)),
    ),
  ),
);
```

---

### Batching with RequestResolver

```typescript
import { Request, RequestResolver } from "effect";

// Define request type
interface GetUser extends Request.Request<User, UserNotFound> {
  readonly _tag: "GetUser";
  readonly id: string;
}
const GetUser = Request.tagged<GetUser>("GetUser");

// Create resolver that batches
const UserResolver = RequestResolver.makeBatched((requests: GetUser[]) =>
  Effect.gen(function* () {
    const ids = requests.map((r) => r.id);
    const users = yield* Database.findUsersByIds(ids);

    return requests.map((req) => {
      const user = users.find((u) => u.id === req.id);
      return user
        ? Request.succeed(req, user)
        : Request.fail(req, new UserNotFound({ userId: req.id }));
    });
  }),
);

// Use with Effect.request
const getUser = (id: string) => Effect.request(GetUser({ id }), UserResolver);

// Automatic batching when called concurrently
const users =
  yield *
  Effect.all([getUser("1"), getUser("2"), getUser("3")], {
    concurrency: "unbounded",
  }); // Single batched query!
```

---

### Streaming with Stream

```typescript
import { Stream } from "effect";

// Create streams
const numbers = Stream.range(1, 100);
const fromArray = Stream.fromIterable([1, 2, 3]);
const fromEffect = Stream.fromEffect(fetchSomething);

// Transform
const transformed = pipe(
  numbers,
  Stream.map((n) => n * 2),
  Stream.filter((n) => n > 10),
  Stream.take(5),
);

// Chunked processing
const chunked = pipe(
  largeStream,
  Stream.grouped(100),
  Stream.mapEffect((chunk) => processBatch(chunk), { concurrency: 5 }),
);

// Run stream
const results = yield * Stream.runCollect(transformed);
const firstItem = yield * Stream.runHead(transformed);
yield * Stream.runForEach(transformed, (item) => Console.log(item));
```

---

### Config from Environment

```typescript
import { Config, ConfigProvider } from "effect";

// Define config
const AppConfig = Config.all({
  port: Config.number("PORT").pipe(Config.withDefault(3000)),
  host: Config.string("HOST").pipe(Config.withDefault("localhost")),
  dbUrl: Config.string("DATABASE_URL"),
  debug: Config.boolean("DEBUG").pipe(Config.withDefault(false)),
});

// Use in effect
const program = Effect.gen(function* () {
  const config = yield* AppConfig;
  console.log(`Starting on ${config.host}:${config.port}`);
});

// Provide custom config for testing
const testProgram = pipe(
  program,
  Effect.provide(
    ConfigProvider.fromMap(
      new Map([
        ["PORT", "8080"],
        ["DATABASE_URL", "postgres://test"],
      ]),
    ),
  ),
);
```

---

### Config.redacted for Secrets

Use `Config.redacted` for sensitive values that shouldn't appear in logs:

```typescript
import { Config, Redacted } from "effect";

// Define secret config
const SecureConfig = Config.all({
  apiKey: Config.redacted("API_KEY"), // Hidden in logs
  dbPassword: Config.redacted("DB_PASSWORD"),
  publicUrl: Config.string("PUBLIC_URL"), // Normal, can be logged
});

// Use in effect
const program = Effect.gen(function* () {
  const config = yield* SecureConfig;

  // Extract the actual value when needed
  const headers = {
    Authorization: `Bearer ${Redacted.value(config.apiKey)}`,
  };

  // Safe to log - shows <redacted>
  yield* Effect.logInfo(`Config loaded: ${config.apiKey}`);
  // Output: Config loaded: <redacted>
});
```

**Key insight**: `Redacted.value()` extracts the secret, but the Redacted wrapper prevents accidental logging.

---

## Common Gotchas

### Never-Terminating Effects

**Pattern**: `Type 'Effect<never, never, never>' is not assignable`

```typescript
// WRONG - forgot yield*
Effect.gen(function* () {
  someEffect; // Does nothing! Not yielded
  return "done";
});

// RIGHT
Effect.gen(function* () {
  yield* someEffect;
  return "done";
});

// WRONG - returning void instead of Effect
pipe(
  someEffect,
  Effect.map(() => {
    anotherEffect; // Never runs!
  }),
);

// RIGHT - use flatMap for effects
pipe(
  someEffect,
  Effect.flatMap(() => anotherEffect),
);
```

---

### Missing Layer in Runtime

**Pattern**: `Service not found: X`

```typescript
// WRONG - forgot to provide
const main = Effect.gen(function* () {
  const db = yield* Database; // Needs Database layer!
  return yield* db.query("SELECT 1");
});
Effect.runPromise(main); // Error!

// RIGHT - provide all dependencies
Effect.runPromise(pipe(main, Effect.provide(DatabaseLive)));

// CHECK your Requirements type
// Effect<A, E, R> - R shows what's missing
// If R is not `never`, you need to provide layers
```

---

### Schema Decode Errors

**Pattern**: `Expected X but got Y`

```typescript
// Common issue: unknown data structure
const data = await fetch(url).then((r) => r.json());
const user = Schema.decodeUnknownSync(User)(data); // Throws!

// Better: use Effect and handle errors
const user =
  yield *
  pipe(
    Effect.tryPromise(() => fetch(url).then((r) => r.json())),
    Effect.flatMap(Schema.decodeUnknown(User)),
    Effect.mapError((e) => new ApiError({ cause: e })),
  );

// Debug: print the actual error
const result = Schema.decodeUnknownEither(User)(data);
if (Either.isLeft(result)) {
  console.log(TreeFormatter.formatError(result.left));
}
```

---

### Forgetting to Run the Effect

**Pattern**: Nothing happens / undefined returned

```typescript
// WRONG - effect never runs
function getUser(id: string) {
  return Effect.gen(function* () {
    return yield* Database.findUser(id);
  });
}
getUser("123"); // Returns Effect, doesn't run it!

// RIGHT - run the effect
await Effect.runPromise(getUser("123"));

// Or in an effect context
Effect.gen(function* () {
  const user = yield* getUser("123"); // yield* runs it
});
```

---

### Type Inference Issues

**Pattern**: Type too wide / any / unknown

```typescript
// Issue: TypeScript can't infer generator return
const program = Effect.gen(function* () {
  const a = yield* getA();
  const b = yield* getB();
  return { a, b };
}); // Type might be Effect<{ a: unknown; b: unknown; }, ...>

// Fix 1: Explicit return type annotation
const program: Effect.Effect<{ a: string; b: number }, Error, Deps> =
  Effect.gen(function* () {
    const a = yield* getA();
    const b = yield* getB();
    return { a, b };
  });

// Fix 2: Use satisfies
const program = Effect.gen(function* () {
  const a = yield* getA();
  const b = yield* getB();
  return { a, b } satisfies Result;
});

// Fix 3: Type the function
const program: Effect.Effect<Result, Error, Deps> = Effect.gen(function* () {
  // ...
});
```

---

## Testing

### Effect.runPromise in Tests

```typescript
import { describe, it, expect } from "vitest";
import { Effect } from "effect";

describe("UserService", () => {
  it("should find user", async () => {
    const result = await Effect.runPromise(
      pipe(UserService.findUser("123"), Effect.provide(TestLayers)),
    );

    expect(result.name).toBe("Test User");
  });

  it("should handle not found", async () => {
    const result = await Effect.runPromise(
      pipe(
        UserService.findUser("nonexistent"),
        Effect.either,
        Effect.provide(TestLayers),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("UserNotFound");
    }
  });
});
```

---

### Providing Test Layers

```typescript
// Create test layer factory
const makeTestDatabase = () => {
  const state = {
    users: new Map<string, User>(),
    queries: [] as string[],
  };

  const layer = Layer.succeed(Database, {
    query: (sql) => {
      state.queries.push(sql);
      return Effect.succeed([...state.users.values()]);
    },
    findUser: (id) => {
      state.queries.push(`findUser:${id}`);
      const user = state.users.get(id);
      return user
        ? Effect.succeed(user)
        : Effect.fail(new UserNotFound({ userId: id }));
    },
  });

  return {
    layer,
    addUser: (user: User) => state.users.set(user.id, user),
    getQueries: () => state.queries,
    reset: () => {
      state.users.clear();
      state.queries = [];
    },
  };
};

// In tests
describe("with test database", () => {
  const testDb = makeTestDatabase();

  beforeEach(() => testDb.reset());

  it("queries database", async () => {
    testDb.addUser({ id: "1", name: "Test" });

    await Effect.runPromise(pipe(myProgram, Effect.provide(testDb.layer)));

    expect(testDb.getQueries()).toContain("findUser:1");
  });
});
```

---

### TestClock, TestRandom

```typescript
import { TestClock, TestRandom, TestContext } from "effect";

// Test time-dependent code
it("should timeout after 5 seconds", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const fiber = yield* Effect.fork(
        pipe(neverEndingEffect, Effect.timeout("5 seconds")),
      );

      // Advance time
      yield* TestClock.adjust("5 seconds");

      // Should be done now
      const result = yield* Fiber.join(fiber);
      expect(Option.isNone(result)).toBe(true);
    }).pipe(Effect.provide(TestContext.TestContext)),
  );
});

// Test randomness
it("should use seeded random", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const random1 = yield* Random.next;

      yield* TestRandom.setSeed(12345);
      const random2 = yield* Random.next;

      yield* TestRandom.setSeed(12345);
      const random3 = yield* Random.next;

      expect(random2).toBe(random3); // Same seed = same value
      expect(random1).not.toBe(random2); // Different seeds
    }).pipe(Effect.provide(TestContext.TestContext)),
  );
});
```

---

### Property-Based Testing with fast-check

```typescript
import * as fc from "fast-check";
import { Effect, Schema } from "effect";

describe("Schema roundtrip", () => {
  it("User encodes and decodes", () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (input) => {
          const result = await Effect.runPromise(
            pipe(
              Effect.succeed(input),
              Effect.flatMap(Schema.decode(User)),
              Effect.flatMap(Schema.encode(User)),
              Effect.flatMap(Schema.decode(User)),
            ),
          );

          expect(result.id).toBe(input.id);
          expect(result.email).toBe(input.email);
          expect(result.name).toBe(input.name);
        },
      ),
    );
  });
});
```

---

## Adding New Patterns

When you encounter a useful pattern:

1. **Identify the category**: Which section does it belong to?
2. **Show the pattern**: Clear code example
3. **Explain when to use**: What problem does it solve?
4. **Show common mistakes**: What not to do

```markdown
### Pattern Name

**When to use**: [situation description]

\`\`\`typescript
// Good example
const correct = ...

// Common mistake
const wrong = ... // WRONG because...
\`\`\`

**Key insight**: [one-liner takeaway]
```
