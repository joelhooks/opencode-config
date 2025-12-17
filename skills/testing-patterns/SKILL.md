---
name: testing-patterns
description: Patterns for testing code effectively. Use when breaking dependencies for testability, adding tests to existing code, understanding unfamiliar code through characterization tests, or deciding how to structure tests. Covers seams, dependency injection, test doubles, and safe refactoring techniques from Michael Feathers.
---

# Testing Patterns

**Core insight**: Code without tests is hard to change safely. The Testing Dilemma: to change code safely you need tests, but to add tests you often need to change code first.

## The Seam Model

A **seam** is a place where you can alter behavior without editing the source file.

Every seam has an **enabling point** - the place where you decide which behavior to use.

### Seam Types (Best to Worst)

**Object Seams** (preferred in OO languages):

```typescript
// Original - hard dependency
class PaymentProcessor {
  process(amount: number) {
    const gateway = new StripeGateway(); // untestable
    return gateway.charge(amount);
  }
}

// With seam - injectable dependency
class PaymentProcessor {
  constructor(private gateway: PaymentGateway = new StripeGateway()) {}

  process(amount: number) {
    return this.gateway.charge(amount); // enabling point: constructor
  }
}
```

**Link Seams** (classpath/module resolution):

- Enabling point is outside program text (build scripts, import maps)
- Swap implementations at link time
- Useful but harder to notice

**Preprocessing Seams** (C/C++ only):

- `#include` and `#define` manipulation
- Last resort - avoid in modern languages

## Characterization Tests

**Purpose**: Document what code actually does, not what it should do.

**Process**:

1. Write a test you know will fail
2. Run it - let the failure tell you actual behavior
3. Change the test to expect actual behavior
4. Repeat until you've characterized the code

```typescript
// Step 1: Write failing test
test("calculateFee returns... something", () => {
  const result = calculateFee(100, "premium");
  expect(result).toBe(0); // will fail, tells us actual value
});

// Step 2: After failure shows "Expected 0, got 15"
test("calculateFee returns 15 for premium with 100", () => {
  const result = calculateFee(100, "premium");
  expect(result).toBe(15); // now documents actual behavior
});
```

**Key insight**: Characterization tests verify behaviors ARE present, enabling safe refactoring. They're not about correctness - they're about preservation.

## Breaking Dependencies

### When You Can't Instantiate a Class

**Parameterize Constructor** - externalize dependencies:

```typescript
// Before
class MailChecker {
  constructor(checkPeriod: number) {
    this.receiver = new MailReceiver(); // hidden dependency
  }
}

// After - add parameter with default
class MailChecker {
  constructor(
    checkPeriod: number,
    receiver: MailReceiver = new MailReceiver(),
  ) {
    this.receiver = receiver;
  }
}
```

**Extract Interface** - safest dependency break:

```typescript
// 1. Create interface from class
interface MessageReceiver {
  receive(): Message[];
}

// 2. Have original implement it
class MailReceiver implements MessageReceiver { ... }

// 3. Create test double
class FakeReceiver implements MessageReceiver {
  messages: Message[] = [];
  receive() { return this.messages; }
}
```

**Subclass and Override Method** - core technique:

```typescript
// Production class with problematic method
class OrderProcessor {
  protected getDatabase(): Database {
    return new ProductionDatabase(); // can't use in tests
  }

  process(order: Order) {
    const db = this.getDatabase();
    // ... processing logic
  }
}

// Testing subclass
class TestableOrderProcessor extends OrderProcessor {
  protected getDatabase(): Database {
    return new InMemoryDatabase(); // test-friendly
  }
}
```

### Sensing vs Separation

**Sensing**: Need to verify effects of code (what did it do?)
**Separation**: Need to run code independently (isolate from dependencies)

Choose technique based on which problem you're solving.

## Adding New Behavior Safely

### Sprout Method

Add new behavior in a new method, call it from existing code:

```typescript
// Before - need to add validation
function processOrder(order: Order) {
  // ... 200 lines of untested code
  saveOrder(order);
}

// After - sprout new tested method
function validateOrder(order: Order): ValidationResult {
  // New code, fully tested
}

function processOrder(order: Order) {
  const validation = validateOrder(order); // one new line
  if (!validation.valid) return;
  // ... 200 lines of untested code
  saveOrder(order);
}
```

### Sprout Class

When new behavior doesn't fit existing class:

```typescript
// New class for new behavior
class OrderValidator {
  validate(order: Order): ValidationResult { ... }
}

// Minimal change to existing code
function processOrder(order: Order) {
  const validator = new OrderValidator();
  if (!validator.validate(order).valid) return;
  // ... existing untested code
}
```

### Wrap Method

Rename existing method, create new method that wraps it:

```typescript
// Before
function pay(employees: Employee[]) {
  for (const e of employees) {
    e.pay();
  }
}

// After - wrap with logging
function pay(employees: Employee[]) {
  logPayment(employees); // new behavior
  dispatchPay(employees); // renamed original
}

function dispatchPay(employees: Employee[]) {
  for (const e of employees) {
    e.pay();
  }
}
```

## Finding Test Points

### Effect Sketches

Draw what a method affects:

```
method()
  → modifies field1
  → calls helper() → modifies field2
  → returns value based on field3
```

### Pinch Points

A **pinch point** is a narrow place where many effects can be detected.

Look for methods that:

- Are called by many paths
- Aggregate results from multiple operations
- Sit at natural boundaries

**Pinch points are ideal test locations** - one test covers many code paths.

### Interception Points

Where you can detect effects of changes:

1. Return values
2. Modified state (fields, globals)
3. Calls to other objects (mock/spy)

## Safe Refactoring Techniques

### Preserve Signatures

When breaking dependencies without tests:

- Copy/paste method signatures exactly
- Don't change parameter types or order
- Lean on the compiler to catch mistakes

```typescript
// Safe: copy signature exactly
function process(order: Order, options: Options): Result;
// becomes
function processInternal(order: Order, options: Options): Result;
```

### Scratch Refactoring

Refactor to understand, then throw it away:

1. Make aggressive changes to understand structure
2. Don't commit - this is exploration
3. Revert everything
4. Now you understand the code
5. Make real changes with tests

### Lean on the Compiler

Use type system as safety net:

1. Make change that should cause compile errors
2. Compiler shows all affected locations
3. Fix each location
4. If it compiles, change is likely safe

## Decision Tree

```
Need to add tests to code?
│
├─ Can you write a test for it now?
│  └─ YES → Write test, make change, done
│
└─ NO → What's blocking you?
   │
   ├─ Can't instantiate class
   │  ├─ Hidden dependency → Parameterize Constructor
   │  ├─ Too many dependencies → Extract Interface
   │  └─ Constructor does work → Extract and Override Factory Method
   │
   ├─ Can't call method in test
   │  ├─ Private method → Test through public interface (or make protected)
   │  ├─ Side effects → Extract and Override Call
   │  └─ Global state → Introduce Static Setter (carefully)
   │
   └─ Don't understand the code
      ├─ Write Characterization Tests
      ├─ Do Scratch Refactoring (then revert)
      └─ Draw Effect Sketches
```

## Kent Beck's 4 Rules of Simple Design

From Beck (codified by Corey Haines) - in priority order:

1. **Tests Pass** - Code must work. Without this, nothing else matters.
2. **Reveals Intention** - Code should express what it does clearly.
3. **No Duplication** - DRY, but specifically _duplication of knowledge_, not just structure.
4. **Fewest Elements** - Remove anything that doesn't serve the above three.

### Test Names Should Influence API

Test names reveal design problems:

```typescript
// Bad: test name doesn't match code
test("a]live cell with 2 neighbors stays alive", () => {
  const cell = new Cell(true);
  cell.setNeighborCount(2);
  expect(cell.aliveInNextGeneration()).toBe(true);
});

// Better: API matches the language of the test
test("alive cell with 2 neighbors stays alive", () => {
  const cell = Cell.alive();
  expect(cell.aliveInNextGeneration({ neighbors: 2 })).toBe(true);
});
```

### Test Behavior, Not State

```typescript
// Testing state (fragile)
test("sets alive to false", () => {
  const cell = new Cell();
  cell.die();
  expect(cell.alive).toBe(false);
});

// Testing behavior (robust)
test("dead cell stays dead with no neighbors", () => {
  const cell = Cell.dead();
  expect(cell.aliveInNextGeneration({ neighbors: 0 })).toBe(false);
});
```

### Duplication of Knowledge vs Structure

Not all duplication is bad. Two pieces of code that look the same but represent different concepts should NOT be merged:

```typescript
// These look similar but represent different domain concepts
const MINIMUM_NEIGHBORS_TO_SURVIVE = 2;
const MINIMUM_NEIGHBORS_TO_REPRODUCE = 3;

// DON'T merge just because the numbers are close
// They change for different reasons
```

## Self-Testing Code (Fowler)

> "Self-testing code not only enables refactoring—it also makes it much safer to add new features."

**The key insight**: When a test fails, you know exactly what broke because you just changed it. Tests are a "powerful bug detector that decapitates the time it takes to find bugs."

### Test Isolation

- Each test should be independent
- Don't have tests depend on previous tests
- Tests should be able to run in any order

### Breaking Abstraction Level

Tests become fragile when they test at the wrong level:

```typescript
// Fragile: tests implementation details
test("stores user in database", () => {
  createUser({ name: "Joel" });
  expect(db.query("SELECT * FROM users")).toContain({ name: "Joel" });
});

// Robust: tests behavior through public API
test("created user can be retrieved", () => {
  const id = createUser({ name: "Joel" });
  expect(getUser(id).name).toBe("Joel");
});
```

## Test Doubles

**Fake**: Working implementation with shortcuts (in-memory DB)
**Stub**: Returns canned answers to calls
**Mock**: Verifies interactions happened
**Spy**: Records calls for later verification

**Prefer fakes over mocks** - they're more realistic and less brittle.

```typescript
// Fake - actually works, just simpler
class FakeEmailService implements EmailService {
  sent: Email[] = [];
  send(email: Email) {
    this.sent.push(email);
  }
}

// Mock - verifies interaction
const mockEmail = mock<EmailService>();
// ... code runs ...
expect(mockEmail.send).toHaveBeenCalledWith(expectedEmail);
```

## References

For detailed patterns and examples:

- `references/dependency-breaking-catalog.md` - All 25 techniques with examples
