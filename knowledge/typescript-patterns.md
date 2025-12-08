# TypeScript Patterns

Advanced TypeScript patterns, type gymnastics, and gotchas. Searchable by concept.

## How to Use This File

1. **During development**: Search for patterns when writing complex types
2. **Debugging type errors**: Check gotchas section
3. **Code review**: Reference for validating type-level decisions
4. **Learning**: Work through examples to level up type-fu

---

## Branded/Nominal Types

### Problem: Primitive Type Confusion

**Problem:** `userId` and `postId` are both strings, but mixing them is a bug.

```typescript
// BAD - compiles but is a runtime bug
function getUser(userId: string) {
  /* ... */
}
function getPost(postId: string) {
  /* ... */
}

const userId = "user_123";
const postId = "post_456";
getUser(postId); // No error! Silent bug.
```

**Pattern:** Brand primitives to make them nominally distinct.

```typescript
// Branded type with unique symbol
declare const brand: unique symbol;
type Brand<T, B> = T & { [brand]: B };

type UserId = Brand<string, "UserId">;
type PostId = Brand<string, "PostId">;

function getUser(userId: UserId) {
  /* ... */
}
function getPost(postId: PostId) {
  /* ... */
}

// Create branded values
const userId = "user_123" as UserId;
const postId = "post_456" as PostId;

getUser(postId); // ERROR: Type 'PostId' is not assignable to type 'UserId'
getUser(userId); // OK
```

### Branded Types with Validation

```typescript
type Email = Brand<string, "Email">;
type PositiveInt = Brand<number, "PositiveInt">;

// Smart constructor - validates then brands
function toEmail(input: string): Email | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input) ? (input as Email) : null;
}

function toPositiveInt(input: number): PositiveInt | null {
  return Number.isInteger(input) && input > 0 ? (input as PositiveInt) : null;
}

// Usage - parse at the boundary, trust the type inside
function sendEmail(to: Email, subject: string) {
  // `to` is guaranteed to be valid email
}

const email = toEmail(userInput);
if (email) {
  sendEmail(email, "Hello"); // Safe
}
```

---

## Type Predicates and Guards

### Basic Type Predicates

**Problem:** TypeScript doesn't narrow types in custom functions.

```typescript
// BAD - TypeScript doesn't know what's inside the if
function isString(value: unknown) {
  return typeof value === "string";
}

const x: unknown = "hello";
if (isString(x)) {
  x.toUpperCase(); // ERROR: Object is of type 'unknown'
}

// GOOD - Type predicate narrows the type
function isString(value: unknown): value is string {
  return typeof value === "string";
}

if (isString(x)) {
  x.toUpperCase(); // OK - x is narrowed to string
}
```

### Object Type Guards

```typescript
interface User {
  id: string;
  email: string;
  name: string;
}

interface GuestUser {
  sessionId: string;
}

type AnyUser = User | GuestUser;

// Type guard using discriminant property
function isRegisteredUser(user: AnyUser): user is User {
  return "id" in user && "email" in user;
}

function sendNotification(user: AnyUser) {
  if (isRegisteredUser(user)) {
    // user is User here
    sendEmail(user.email, "Hello!");
  } else {
    // user is GuestUser here
    console.log(`Guest session: ${user.sessionId}`);
  }
}
```

### Assertion Functions

```typescript
// Assert something is true, throw if not
function assertNonNull<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error("Value is null or undefined");
  }
}

function assertIsUser(value: unknown): asserts value is User {
  if (!value || typeof value !== "object") {
    throw new Error("Not a user object");
  }
  if (!("id" in value) || !("email" in value)) {
    throw new Error("Missing required user fields");
  }
}

// Usage - throws or narrows
const data: unknown = await fetchData();
assertIsUser(data);
data.email; // OK - TypeScript knows it's User now
```

---

## Discriminated Unions

### The Pattern

**Problem:** Need to handle multiple related but distinct cases safely.

**Pattern:** Union of types with a common literal discriminant.

```typescript
// Each type has a literal `type` property
type LoadingState = { type: "loading" };
type ErrorState = { type: "error"; error: Error };
type SuccessState<T> = { type: "success"; data: T };

type AsyncState<T> = LoadingState | ErrorState | SuccessState<T>;

function render(state: AsyncState<User>) {
  switch (state.type) {
    case "loading":
      return <Spinner />;
    case "error":
      return <ErrorMessage error={state.error} />;
    case "success":
      return <UserProfile user={state.data} />;
  }
}
```

### Exhaustiveness Checking

```typescript
// Ensure all cases are handled
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "rectangle"; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    case "rectangle":
      return shape.width * shape.height;
    default:
      // If you add a new shape and forget to handle it,
      // TypeScript will error here
      return assertNever(shape);
  }
}
```

### Discriminated Unions vs Optional Properties

```typescript
// BAD - Optional properties lead to impossible states
interface User {
  id: string;
  email?: string; // Can be guest
  guestSessionId?: string; // Or registered
  // What if both are set? Or neither?
}

// GOOD - Impossible states are impossible
type User =
  | { type: "registered"; id: string; email: string }
  | { type: "guest"; sessionId: string };

// Now TypeScript enforces that you can't have email on guest
// or sessionId on registered
```

---

## Template Literal Types

### Basic Template Literals

```typescript
// String literal unions
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

// Template literal from union
type Endpoint = `/${string}`;
type ApiRoute = `${HttpMethod} ${Endpoint}`;
// "GET /users" | "POST /users" | etc.

// Event names
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"
```

### Dynamic Key Patterns

```typescript
// CSS properties
type CSSProperty = "margin" | "padding";
type CSSDirection = "Top" | "Right" | "Bottom" | "Left";
type CSSSpacing = `${CSSProperty}${CSSDirection}`;
// "marginTop" | "marginRight" | ... | "paddingLeft"

// Build objects from patterns
type SpacingProps = {
  [K in CSSSpacing]?: number;
};

const spacing: SpacingProps = {
  marginTop: 10,
  paddingLeft: 20,
};
```

### String Manipulation Types

```typescript
// Built-in string manipulation
type Greeting = "hello world";
type Upper = Uppercase<Greeting>; // "HELLO WORLD"
type Lower = Lowercase<Greeting>; // "hello world"
type Cap = Capitalize<Greeting>; // "Hello world"
type Uncap = Uncapitalize<"Hello">; // "hello"

// Extract parts of template literals
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"
```

---

## Conditional Types

### Basic Conditionals

```typescript
// T extends U ? X : Y
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>; // false
type C = IsString<string>; // true

// Extract array element type
type ElementOf<T> = T extends (infer E)[] ? E : never;

type D = ElementOf<string[]>; // string
type E = ElementOf<number[]>; // number
```

### Distributive Conditional Types

**Gotcha:** Conditionals distribute over unions.

```typescript
type ToArray<T> = T extends unknown ? T[] : never;

// Distributes: "a" | "b" becomes "a"[] | "b"[]
type Distributed = ToArray<"a" | "b">; // "a"[] | "b"[]

// Prevent distribution with tuple wrapper
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;
type NonDistributed = ToArrayNonDist<"a" | "b">; // ("a" | "b")[]
```

### infer Keyword

```typescript
// Extract types from structures
type GetReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never;

type FnReturn = GetReturnType<() => string>; // string

// Extract Promise inner type
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type Resolved = Awaited<Promise<Promise<string>>>; // string

// Extract function parameters
type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;

type Params = Parameters<(a: string, b: number) => void>; // [string, number]
```

---

## Mapped Types

### Basic Mapped Types

```typescript
// Transform all properties
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Optional<T> = {
  [K in keyof T]?: T[K];
};

type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

// Usage
interface User {
  id: string;
  name: string;
}

type ReadonlyUser = Readonly<User>;
// { readonly id: string; readonly name: string }
```

### Key Remapping

```typescript
// Add prefix to all keys
type Prefixed<T, P extends string> = {
  [K in keyof T as `${P}${string & K}`]: T[K];
};

type User = { id: string; name: string };
type ApiUser = Prefixed<User, "user_">;
// { user_id: string; user_name: string }

// Filter keys
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type Mixed = { id: number; name: string; email: string };
type StringsOnly = OnlyStrings<Mixed>;
// { name: string; email: string }
```

### Practical Examples

```typescript
// Make all methods async
type Async<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};

interface UserService {
  getUser(id: string): User;
  deleteUser(id: string): void;
}

type AsyncUserService = Async<UserService>;
// {
//   getUser(id: string): Promise<User>;
//   deleteUser(id: string): Promise<void>;
// }

// Create getters
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getId: () => string; getName: () => string }
```

---

## const Assertions

### Literal Inference

**Problem:** TypeScript widens literals to general types.

```typescript
// BAD - widened to string[]
const routes = ["home", "about", "contact"];
// Type: string[]

// GOOD - preserves literal types
const routes = ["home", "about", "contact"] as const;
// Type: readonly ["home", "about", "contact"]

// Extract union from const array
type Route = (typeof routes)[number];
// "home" | "about" | "contact"
```

### Object Literals

```typescript
// BAD - widened
const config = {
  env: "production",
  port: 3000,
};
// Type: { env: string; port: number }

// GOOD - exact literal types
const config = {
  env: "production",
  port: 3000,
} as const;
// Type: { readonly env: "production"; readonly port: 3000 }

// Useful for discriminated unions
const actions = {
  increment: { type: "INCREMENT" },
  decrement: { type: "DECREMENT" },
  reset: { type: "RESET", payload: 0 },
} as const;

type Action = (typeof actions)[keyof typeof actions];
// { readonly type: "INCREMENT" } | { readonly type: "DECREMENT" } | ...
```

### Function Arguments

```typescript
function route<T extends readonly string[]>(paths: T): T {
  return paths;
}

// Without as const - loses literal types
const bad = route(["a", "b"]); // string[]

// With as const - preserves literals
const good = route(["a", "b"] as const); // readonly ["a", "b"]
```

---

## satisfies Operator

### The Problem satisfies Solves

**Problem:** Type annotations lose inference, but no annotation loses validation.

```typescript
// Annotation - validates but loses specific type
const colors: Record<string, string> = {
  red: "#ff0000",
  green: "#00ff00",
};
colors.red; // string (lost the literal)
colors.purple; // string (typo not caught)

// No annotation - keeps type but no validation
const colors = {
  red: "#ff0000",
  green: "#00ff00",
};
colors.red; // "#ff0000" (good!)
colors.purple; // Error! (good!)
// But: no guarantee it matches Record<string, string>

// satisfies - validates AND preserves inference
const colors = {
  red: "#ff0000",
  green: "#00ff00",
} satisfies Record<string, string>;

colors.red; // "#ff0000" (literal preserved!)
colors.purple; // Error! (typo caught)
```

### Use Cases

```typescript
// Validate config while keeping literal types
type Config = {
  apiUrl: string;
  features: string[];
  debug: boolean;
};

const config = {
  apiUrl: "https://api.example.com",
  features: ["auth", "payments"],
  debug: false,
} satisfies Config;

config.apiUrl; // "https://api.example.com" (literal!)
config.features; // ["auth", "payments"] (tuple-like!)

// Validate route config
type RouteConfig = {
  [path: string]: {
    component: React.ComponentType;
    auth?: boolean;
  };
};

const routes = {
  "/home": { component: Home },
  "/dashboard": { component: Dashboard, auth: true },
} satisfies RouteConfig;

// routes["/home"] is known to exist
// routes["/typo"] would error at this definition
```

---

## Common Gotchas

### any vs unknown

```typescript
// any - disables type checking (avoid!)
const dangerous: any = "hello";
dangerous.foo.bar.baz(); // No error - runtime crash

// unknown - type-safe "any"
const safe: unknown = "hello";
safe.toUpperCase(); // Error! Must narrow first

if (typeof safe === "string") {
  safe.toUpperCase(); // OK after narrowing
}

// Use unknown for:
// - User input
// - API responses before validation
// - Error catch blocks (catch (e: unknown))
```

### type vs interface

```typescript
// Interface - extendable, declaration merging
interface User {
  id: string;
}
interface User {
  name: string;
}
// Merged: { id: string; name: string }

// Type - final, more powerful
type User = {
  id: string;
};
// Cannot add more properties via declaration

// Type can do things interface can't:
type StringOrNumber = string | number; // Unions
type Pair<T> = [T, T]; // Tuples
type Handler = () => void; // Function types

// Rule of thumb:
// - Interface for objects you want extendable
// - Type for everything else
// - Be consistent in your codebase
```

### Excess Property Checking

```typescript
interface User {
  id: string;
  name: string;
}

// Direct assignment - excess property check
const user: User = {
  id: "1",
  name: "Joel",
  email: "joel@example.com", // Error! Excess property
};

// Via intermediate variable - no check!
const obj = { id: "1", name: "Joel", email: "joel@example.com" };
const user: User = obj; // No error!

// This is why:
// - Use satisfies for literal validation
// - Or use strict type assertions
```

### Index Signatures vs Record

```typescript
// Index signature
interface StringMap {
  [key: string]: string;
}

// Record (utility type)
type StringMap = Record<string, string>;

// They're equivalent, but Record is:
// - More concise
// - Can constrain keys
type HttpHeaders = Record<"content-type" | "authorization", string>;

// Index signature quirk: allows any string key access
const map: StringMap = { foo: "bar" };
map.anything; // string (no error, but might be undefined!)

// Better: use noUncheckedIndexedAccess in tsconfig
// Then: map.anything is string | undefined
```

### Function Overloads

```typescript
// Overload signatures (what callers see)
function parse(input: string): object;
function parse(
  input: string,
  reviver: (k: string, v: unknown) => unknown,
): object;

// Implementation signature (must be compatible with all overloads)
function parse(
  input: string,
  reviver?: (k: string, v: unknown) => unknown,
): object {
  return reviver ? JSON.parse(input, reviver) : JSON.parse(input);
}

// Gotcha: Implementation signature is not callable
parse("{}"); // Uses first overload
parse("{}", (k, v) => v); // Uses second overload
```

### Readonly vs const

```typescript
// const - compile-time only, reference is constant
const arr = [1, 2, 3];
arr.push(4); // Allowed! Array is mutable
arr = []; // Error! Can't reassign const

// Readonly - type-level immutability
const arr: readonly number[] = [1, 2, 3];
arr.push(4); // Error! Can't mutate
arr[0] = 5; // Error! Can't mutate

// ReadonlyArray vs readonly T[]
type A = ReadonlyArray<number>; // Same as
type B = readonly number[]; // This

// Deep readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

---

## Utility Types Reference

### Built-in Utilities

```typescript
// Partial - all properties optional
type Partial<T> = { [K in keyof T]?: T[K] };

// Required - all properties required
type Required<T> = { [K in keyof T]-?: T[K] };

// Readonly - all properties readonly
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// Pick - select specific properties
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

// Omit - exclude specific properties
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Record - object with specific key/value types
type Record<K extends keyof any, T> = { [P in K]: T };

// Exclude - remove types from union
type Exclude<T, U> = T extends U ? never : T;

// Extract - keep only matching types from union
type Extract<T, U> = T extends U ? T : never;

// NonNullable - remove null and undefined
type NonNullable<T> = T extends null | undefined ? never : T;

// ReturnType - get function return type
type ReturnType<T> = T extends (...args: any) => infer R ? R : never;

// Parameters - get function parameter types
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
```

### Custom Utility Types

```typescript
// Deep Partial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Make specific keys required
type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Make specific keys optional
type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Get keys where value is of type V
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// Mutable - remove readonly
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
```

---

## Real-World Patterns

### API Response Types

```typescript
// Generic API response wrapper
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Paginated response
type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

// Usage
async function fetchUsers(): Promise<ApiResponse<Paginated<User>>> {
  const response = await fetch("/api/users");
  return response.json();
}

const result = await fetchUsers();
if (result.success) {
  result.data.items; // User[]
} else {
  result.error.message; // string
}
```

### Event Emitter Types

```typescript
type EventMap = {
  userLogin: { userId: string; timestamp: Date };
  userLogout: { userId: string };
  error: { code: number; message: string };
};

class TypedEventEmitter<T extends Record<string, unknown>> {
  private listeners = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  emit<K extends keyof T>(event: K, payload: T[K]) {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }
}

const emitter = new TypedEventEmitter<EventMap>();
emitter.on("userLogin", ({ userId, timestamp }) => {
  // userId: string, timestamp: Date - fully typed!
});
emitter.emit("userLogin", { userId: "123", timestamp: new Date() });
```

### Builder Pattern

```typescript
class QueryBuilder<T extends object = {}> {
  private query: T = {} as T;

  select<K extends string>(field: K): QueryBuilder<T & Record<K, true>> {
    return this as unknown as QueryBuilder<T & Record<K, true>>;
  }

  where<K extends string, V>(
    field: K,
    value: V,
  ): QueryBuilder<T & { where: Record<K, V> }> {
    return this as unknown as QueryBuilder<T & { where: Record<K, V> }>;
  }

  build(): T {
    return this.query;
  }
}

const query = new QueryBuilder()
  .select("id")
  .select("name")
  .where("status", "active")
  .build();
// Type: { id: true; name: true; where: { status: "active" } }
```

---

## Adding New Patterns

When you discover a new pattern:

1. **Identify the problem**: What type-level challenge does it solve?
2. **Show the anti-pattern**: What's the naive/wrong approach?
3. **Demonstrate the solution**: Clear, minimal code
4. **Note edge cases**: When it doesn't work or has gotchas

```markdown
### Pattern Name

**Problem:** What challenge does this solve?

\`\`\`typescript
// BAD - why this doesn't work
const bad = ...

// GOOD - the pattern
const good = ...
\`\`\`

**When to use / avoid:** Context for application.
```
