# Testing Patterns

Testing strategies, patterns, and best practices. Focused on pragmatic testing that catches bugs without becoming a maintenance burden.

## How to Use This File

1. **Starting a test suite**: Read Testing Philosophy first
2. **Deciding what to test**: Check Testing Trophy section
3. **Debugging flaky tests**: Check Async Testing and Common Pitfalls
4. **Code review**: Reference for validating test quality

---

## Testing Philosophy

### The Testing Trophy (Kent C. Dodds)

Not a pyramid. Tests should be weighted toward integration.

```
     E2E          (few)
   ┌─────────┐
   │  🏆🏆   │    Integration (most)
   └─────────┘
   ┌───────────────────┐
   │ 🏆🏆🏆🏆🏆🏆🏆🏆🏆 │
   └───────────────────┘
   ┌───────────┐
   │ 🏆🏆🏆🏆  │       Unit (some)
   └───────────┘
   ┌─────┐
   │ 🏆  │             Static (TypeScript, ESLint)
   └─────┘
```

**Why integration > unit:**

- Unit tests can pass while the app is broken
- Integration tests verify things actually work together
- Less mocking = more confidence
- Refactoring doesn't break tests (testing behavior, not implementation)

### Write Tests That Give Confidence

```typescript
// BAD - tests implementation details
test("calls setCount when button clicked", () => {
  const setCount = jest.fn();
  render(<Counter setCount={setCount} />);
  fireEvent.click(screen.getByRole("button"));
  expect(setCount).toHaveBeenCalledWith(1); // Implementation detail!
});

// GOOD - tests behavior users care about
test("increments count when clicked", () => {
  render(<Counter />);
  expect(screen.getByText("Count: 0")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /increment/i }));
  expect(screen.getByText("Count: 1")).toBeInTheDocument();
});
```

### The Arrange-Act-Assert Pattern

```typescript
test("adds item to cart", async () => {
  // Arrange - set up test data and conditions
  const user = userEvent.setup();
  const product = { id: "1", name: "Widget", price: 9.99 };
  render(<ProductCard product={product} />);

  // Act - perform the action being tested
  await user.click(screen.getByRole("button", { name: /add to cart/i }));

  // Assert - verify the expected outcome
  expect(screen.getByText("Added to cart")).toBeInTheDocument();
  expect(screen.getByRole("button")).toHaveTextContent("In Cart");
});
```

---

## Unit vs Integration vs E2E

### When to Use Each

| Test Type   | Speed  | Confidence | Isolation | Use For                           |
| ----------- | ------ | ---------- | --------- | --------------------------------- |
| Unit        | Fast   | Low        | High      | Pure functions, utils, algorithms |
| Integration | Medium | High       | Medium    | Features, user flows, API calls   |
| E2E         | Slow   | Highest    | None      | Critical paths, deployments       |

### Unit Tests

**Use for:** Pure functions, utilities, algorithms, data transformations.

```typescript
// Good candidate for unit test - pure function
function calculateDiscount(price: number, discountPercent: number): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error("Invalid discount percentage");
  }
  return price * (1 - discountPercent / 100);
}

describe("calculateDiscount", () => {
  it("applies percentage discount", () => {
    expect(calculateDiscount(100, 20)).toBe(80);
    expect(calculateDiscount(50, 10)).toBe(45);
  });

  it("handles edge cases", () => {
    expect(calculateDiscount(100, 0)).toBe(100);
    expect(calculateDiscount(100, 100)).toBe(0);
  });

  it("throws on invalid percentage", () => {
    expect(() => calculateDiscount(100, -10)).toThrow();
    expect(() => calculateDiscount(100, 150)).toThrow();
  });
});
```

### Integration Tests

**Use for:** Features that involve multiple parts working together.

```typescript
// Tests the full feature: UI + state + API
describe("User Registration", () => {
  it("registers a new user successfully", async () => {
    const user = userEvent.setup();

    // Mock API at network level, not function level
    server.use(
      http.post("/api/users", () => {
        return HttpResponse.json({ id: "123", email: "test@example.com" });
      })
    );

    render(<RegistrationForm />);

    // Interact like a real user
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "secure123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    // Assert on user-visible outcomes
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });

  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText(/email/i), "invalid-email");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });
});
```

### E2E Tests

**Use for:** Critical user journeys that must not break.

```typescript
// Playwright E2E test
test.describe("Checkout Flow", () => {
  test("complete purchase as guest", async ({ page }) => {
    // Navigate to product
    await page.goto("/products/widget");

    // Add to cart
    await page.getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added to cart")).toBeVisible();

    // Go to checkout
    await page.getByRole("link", { name: "Cart" }).click();
    await page.getByRole("button", { name: "Checkout" }).click();

    // Fill payment (use test card)
    await page.getByLabel("Card number").fill("4242424242424242");
    await page.getByLabel("Expiry").fill("12/25");
    await page.getByLabel("CVC").fill("123");

    // Complete purchase
    await page.getByRole("button", { name: "Pay" }).click();

    // Verify success
    await expect(page.getByText("Order confirmed")).toBeVisible();
  });
});
```

---

## Mocking Strategies

### Don't Mock What You Don't Own

**Problem:** Mocking third-party libraries couples tests to implementation.

```typescript
// BAD - mocking axios directly
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.get.mockResolvedValue({ data: { user: "test" } });

// If you switch to fetch, all tests break
// If axios changes API, tests don't catch it

// GOOD - mock at the network level with MSW
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.get("/api/user", () => {
    return HttpResponse.json({ user: "test" });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Now tests work regardless of HTTP library
// And you catch actual network issues
```

### Dependency Injection for Testability

```typescript
// Hard to test - direct dependency
class UserService {
  async getUser(id: string) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }
}

// Easy to test - injected dependency
interface HttpClient {
  get<T>(url: string): Promise<T>;
}

class UserService {
  constructor(private http: HttpClient) {}

  async getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}

// In tests
const mockHttp: HttpClient = {
  get: jest.fn().mockResolvedValue({ id: "1", name: "Test User" }),
};
const service = new UserService(mockHttp);
```

### Mock Only at Boundaries

**Boundaries worth mocking:**

- Network requests (use MSW)
- Database (use test DB or in-memory)
- File system (use memfs or tmp directories)
- Time (use fake timers)
- External services (Stripe, SendGrid, etc.)

**Don't mock:**

- Your own code (except when testing in isolation)
- Language features
- Internal module interactions

```typescript
// Mocking time
describe("session expiry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("expires session after 30 minutes", () => {
    const session = createSession();
    expect(session.isExpired()).toBe(false);

    jest.advanceTimersByTime(30 * 60 * 1000);
    expect(session.isExpired()).toBe(true);
  });
});
```

---

## Test Fixtures and Factories

### Factory Functions

**Problem:** Creating test data is repetitive and brittle.

```typescript
// BAD - inline data everywhere
test("displays user profile", () => {
  const user = {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    avatar: "https://example.com/avatar.jpg",
    role: "user",
    createdAt: new Date(),
    // ... 10 more required fields
  };
  render(<UserProfile user={user} />);
});

// GOOD - factory functions
function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    avatar: "https://example.com/avatar.jpg",
    role: "user",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

test("displays user profile", () => {
  const user = createUser({ name: "Joel Hooks" });
  render(<UserProfile user={user} />);
  expect(screen.getByText("Joel Hooks")).toBeInTheDocument();
});

test("shows admin badge for admin users", () => {
  const admin = createUser({ role: "admin" });
  render(<UserProfile user={admin} />);
  expect(screen.getByText("Admin")).toBeInTheDocument();
});
```

### Builder Pattern for Complex Data

```typescript
class UserBuilder {
  private user: User = {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    role: "user",
    permissions: [],
    createdAt: new Date(),
  };

  withId(id: string) {
    this.user.id = id;
    return this;
  }

  withEmail(email: string) {
    this.user.email = email;
    return this;
  }

  asAdmin() {
    this.user.role = "admin";
    this.user.permissions = ["read", "write", "delete"];
    return this;
  }

  build(): User {
    return { ...this.user };
  }
}

// Usage
const user = new UserBuilder().withEmail("joel@egghead.io").asAdmin().build();
```

### Shared Fixtures

```typescript
// fixtures/users.ts
export const fixtures = {
  regularUser: createUser({ role: "user" }),
  adminUser: createUser({ role: "admin", permissions: ["all"] }),
  newUser: createUser({ createdAt: new Date(), isVerified: false }),
  bannedUser: createUser({ status: "banned", bannedAt: new Date() }),
};

// In tests
import { fixtures } from "@/test/fixtures/users";

test("banned users cannot post", () => {
  render(<PostForm user={fixtures.bannedUser} />);
  expect(screen.getByRole("button", { name: /post/i })).toBeDisabled();
});
```

---

## Testing Async Code

### Proper Async Handling

```typescript
// BAD - not waiting for async operations
test("loads user data", () => {
  render(<UserProfile userId="1" />);
  expect(screen.getByText("Joel")).toBeInTheDocument(); // Fails - data not loaded yet!
});

// GOOD - wait for elements to appear
test("loads user data", async () => {
  render(<UserProfile userId="1" />);

  // Wait for loading to finish
  expect(await screen.findByText("Joel")).toBeInTheDocument();

  // Or use waitFor for complex conditions
  await waitFor(() => {
    expect(screen.getByText("Joel")).toBeInTheDocument();
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });
});
```

### Testing Loading States

```typescript
test("shows loading state then content", async () => {
  render(<UserProfile userId="1" />);

  // Initially shows loading
  expect(screen.getByText("Loading...")).toBeInTheDocument();

  // Eventually shows content
  expect(await screen.findByText("Joel")).toBeInTheDocument();
  expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
});
```

### Testing Error States

```typescript
test("shows error when fetch fails", async () => {
  // Override handler to return error
  server.use(
    http.get("/api/users/:id", () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<UserProfile userId="1" />);

  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
});
```

### Avoiding Flaky Async Tests

```typescript
// BAD - arbitrary timeouts
await new Promise((r) => setTimeout(r, 1000));
expect(screen.getByText("Done")).toBeInTheDocument();

// BAD - too short waitFor timeout
await waitFor(
  () => {
    expect(mockFn).toHaveBeenCalled();
  },
  { timeout: 100 },
); // Might fail intermittently

// GOOD - wait for specific conditions
await waitFor(() => {
  expect(screen.getByText("Done")).toBeInTheDocument();
});

// GOOD - use findBy (has built-in waiting)
const element = await screen.findByText("Done");
expect(element).toBeInTheDocument();

// GOOD - wait for network requests to complete (MSW)
await waitFor(() => {
  expect(server.events.length).toBeGreaterThan(0);
});
```

---

## Testing React Components

### Using Testing Library

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("LoginForm", () => {
  it("submits with valid credentials", async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "joel@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: "joel@example.com",
      password: "password123",
    });
  });
});
```

### Query Priority

Use queries in this order (accessibility-first):

```typescript
// 1. Accessible to everyone
screen.getByRole("button", { name: /submit/i });
screen.getByLabelText(/email/i);
screen.getByPlaceholderText(/search/i);
screen.getByText(/welcome/i);
screen.getByDisplayValue("current value");

// 2. Semantic queries
screen.getByAltText(/profile picture/i);
screen.getByTitle(/close/i);

// 3. Test IDs (last resort)
screen.getByTestId("submit-button");
```

### Custom Render with Providers

```typescript
// test/utils.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: AllProviders });
}

// In tests
import { renderWithProviders } from "@/test/utils";

test("renders with all providers", () => {
  renderWithProviders(<MyComponent />);
});
```

### Testing Hooks

```typescript
import { renderHook, act } from "@testing-library/react";

describe("useCounter", () => {
  it("increments count", () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("accepts initial value", () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });
});
```

---

## Snapshot Testing

### When to Use

**Good uses:**

- Serialized output (JSON, HTML structure)
- Regression prevention for stable UI
- Generated code/config

**Bad uses:**

- Rapidly changing UI
- Large component trees
- Testing behavior (use assertions instead)

### Effective Snapshot Tests

```typescript
// BAD - entire component snapshot (too big, too fragile)
test("renders correctly", () => {
  const { container } = render(<ComplexDashboard />);
  expect(container).toMatchSnapshot();
});

// GOOD - focused snapshot on specific output
test("generates correct CSS class names", () => {
  const classes = generateClassNames({ variant: "primary", size: "large" });
  expect(classes).toMatchInlineSnapshot(`"btn btn-primary btn-lg"`);
});

// GOOD - serialized data structures
test("transforms API response correctly", () => {
  const response = { id: "1", user_name: "joel", created_at: "2024-01-01" };
  const transformed = transformUser(response);
  expect(transformed).toMatchInlineSnapshot(`
    {
      "createdAt": "2024-01-01T00:00:00.000Z",
      "id": "1",
      "userName": "joel",
    }
  `);
});
```

### Inline vs External Snapshots

```typescript
// Inline - for small, stable outputs
expect(value).toMatchInlineSnapshot(`"expected"`);

// External - for larger outputs (creates .snap file)
expect(value).toMatchSnapshot();

// Named snapshot - when multiple in one test
expect(loading).toMatchSnapshot("loading state");
expect(loaded).toMatchSnapshot("loaded state");
```

---

## Coverage Strategies

### What Coverage Tells You

- **100% coverage**: Every line was executed (not that it's correct)
- **Low coverage**: Untested code paths exist
- **Coverage lies**: A test can hit all lines without testing behavior

### Pragmatic Coverage Targets

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
    // Stricter for critical code
    "./src/payment/**/*.ts": {
      branches: 90,
      functions: 90,
      lines: 95,
    },
    // Looser for UI components
    "./src/components/**/*.tsx": {
      branches: 50,
      functions: 50,
      lines: 60,
    },
  },
};
```

### Focus on Critical Paths

Don't chase 100% coverage. Focus on:

1. **Business logic** - calculations, validation, state machines
2. **Edge cases** - error handling, empty states, boundaries
3. **Integration points** - API calls, database operations
4. **User flows** - checkout, authentication, onboarding

```typescript
// Worth testing thoroughly
describe("calculateTax", () => {
  it("handles different tax brackets");
  it("rounds correctly");
  it("handles zero income");
  it("handles negative adjustments");
  it("throws on invalid input");
});

// Not worth exhaustive testing
describe("Footer", () => {
  it("renders copyright year"); // One simple test is fine
});
```

---

## Common Pitfalls

### Testing Implementation Details

```typescript
// BAD - testing internal state
test("sets loading to true", () => {
  const { result } = renderHook(() => useFetch("/api/data"));
  expect(result.current.loading).toBe(true); // Implementation detail
});

// GOOD - testing observable behavior
test("shows loading indicator while fetching", async () => {
  render(<DataDisplay />);
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));
});
```

### Over-Mocking

```typescript
// BAD - mocking everything
jest.mock("./utils");
jest.mock("./api");
jest.mock("./hooks");
// What are you even testing at this point?

// GOOD - mock only boundaries, test real code
server.use(
  http.get("/api/data", () => HttpResponse.json({ items: [] }))
);
render(<RealComponent />); // Uses real utils, hooks, etc.
```

### Brittle Selectors

```typescript
// BAD - implementation-dependent selectors
screen.getByClassName("btn-primary");
container.querySelector("div > span:first-child");
screen.getByTestId("submit-btn"); // When there's a better option

// GOOD - semantic, accessible selectors
screen.getByRole("button", { name: /submit/i });
screen.getByLabelText(/email address/i);
screen.getByText(/welcome back/i);
```

### Not Testing Error Cases

```typescript
// BAD - only happy path
test("creates user", async () => {
  await createUser({ email: "test@example.com" });
  expect(/* success case */);
});

// GOOD - test errors too
test("handles duplicate email", async () => {
  server.use(
    http.post("/api/users", () => {
      return HttpResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    })
  );

  render(<RegistrationForm />);
  await user.type(screen.getByLabelText(/email/i), "existing@example.com");
  await user.click(screen.getByRole("button", { name: /register/i }));

  expect(await screen.findByText(/email already exists/i)).toBeInTheDocument();
});
```

### Ignoring Act Warnings

```typescript
// BAD - ignoring the warning
console.error = jest.fn(); // 🚩 Red flag

// GOOD - fix the actual issue
test("updates state", async () => {
  render(<Counter />);

  // Wrap state updates in act (or use userEvent which does it for you)
  await userEvent.click(screen.getByRole("button"));

  expect(screen.getByText("1")).toBeInTheDocument();
});
```

---

## Test Organization

### File Structure

```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx     # Co-located tests
  features/
    auth/
      LoginForm.tsx
      LoginForm.test.tsx
      useAuth.ts
      useAuth.test.ts
  utils/
    format.ts
    format.test.ts
test/
  fixtures/               # Shared test data
    users.ts
    products.ts
  mocks/                  # MSW handlers, etc.
    handlers.ts
    server.ts
  utils.tsx               # Custom render, providers
  setup.ts                # Global test setup
```

### Describe Blocks

```typescript
describe("ShoppingCart", () => {
  describe("when empty", () => {
    it("shows empty message");
    it("hides checkout button");
  });

  describe("with items", () => {
    it("displays item count");
    it("calculates total");
    it("allows quantity changes");
  });

  describe("checkout", () => {
    it("validates stock availability");
    it("applies discount codes");
    it("handles payment failure");
  });
});
```

### Naming Conventions

```typescript
// Describe the subject
describe("calculateShipping", () => {});
describe("LoginForm", () => {});
describe("useAuth hook", () => {});

// Test names should read like sentences
it("returns free shipping for orders over $50");
it("shows error message for invalid email");
it("redirects to dashboard after login");

// Group by behavior/state
describe("when user is logged in", () => {});
describe("with invalid input", () => {});
describe("after timeout", () => {});
```

---

## Adding New Patterns

When you discover a new testing pattern:

1. **Identify the problem**: What was hard to test?
2. **Show the anti-pattern**: What doesn't work?
3. **Demonstrate the solution**: Clear, minimal example
4. **Note tradeoffs**: When to use/avoid

```markdown
### Pattern Name

**Problem:** What testing challenge does this solve?

\`\`\`typescript
// BAD - why this approach fails
// ...

// GOOD - the pattern
// ...
\`\`\`

**When to use / avoid:** Context for when this applies.
```
