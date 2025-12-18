# TDD Patterns: Red-Green-Refactor

**The non-negotiable discipline for swarm work.**

> "Legacy code is simply code without tests." — Michael Feathers, _Working Effectively with Legacy Code_

> "Refactoring is a disciplined technique for restructuring an existing body of code, altering its internal structure without changing its external behavior." — Martin Fowler, _Refactoring_

---

## The Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    RED → GREEN → REFACTOR                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────┐         ┌─────────┐         ┌─────────┐          │
│   │   RED   │────────▶│  GREEN  │────────▶│REFACTOR │          │
│   │         │         │         │         │         │          │
│   │ Write a │         │ Make it │         │ Clean   │          │
│   │ failing │         │ pass    │         │ it up   │          │
│   │ test    │         │ (fast)  │         │         │          │
│   └─────────┘         └─────────┘         └─────────┘          │
│        ▲                                       │                │
│        │                                       │                │
│        └───────────────────────────────────────┘                │
│                                                                 │
│   Repeat until feature complete                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### RED: Write a Failing Test

1. Write a test for behavior that doesn't exist yet
2. Run it — **it MUST fail**
3. If it passes, your test is wrong or the behavior already exists
4. The failure message should be clear about what's missing

```typescript
// RED - this test fails because calculateTax doesn't exist
test("calculates 10% tax on order total", () => {
  const order = { items: [{ price: 100 }] };
  expect(calculateTax(order)).toBe(10);
});
// Error: calculateTax is not defined
```

### GREEN: Make It Pass (Quickly)

1. Write the **minimum code** to make the test pass
2. Don't worry about elegance — just make it work
3. Hardcoding is fine if it makes the test pass
4. You'll clean it up in REFACTOR

```typescript
// GREEN - simplest thing that works
function calculateTax(order: Order): number {
  return 10; // hardcoded! that's fine for now
}
// Test passes ✓
```

### REFACTOR: Clean It Up

1. Tests are passing — now improve the code
2. Remove duplication
3. Improve names
4. Extract functions/classes
5. **Run tests after every change** — they must stay green

```typescript
// REFACTOR - now make it real
function calculateTax(order: Order): number {
  const total = order.items.reduce((sum, item) => sum + item.price, 0);
  return total * 0.1;
}
// Tests still pass ✓
```

---

## Why This Order Matters

### RED First

- **Proves the test can fail** — a test that can't fail is worthless
- **Defines the target** — you know exactly what you're building
- **Documents intent** — the test IS the specification

### GREEN Second

- **Shortest path to working** — don't over-engineer
- **Builds confidence** — you have a safety net
- **Enables refactoring** — can't refactor without tests

### REFACTOR Third

- **Safe to change** — tests catch regressions
- **Incremental improvement** — small steps, always green
- **Design emerges** — patterns reveal themselves

---

## The Feathers Legacy Code Algorithm

When working with existing code that lacks tests:

```
1. Identify change points
2. Find test points
3. Break dependencies
4. Write tests (characterization tests first)
5. Make changes
6. Refactor
```

### Characterization Tests

When you don't know what code does, write tests that **document actual behavior**:

```typescript
// Step 1: Write a test you KNOW will fail
test("processOrder returns... something", () => {
  const result = processOrder({ id: 1, items: [] });
  expect(result).toBe("PLACEHOLDER"); // will fail
});

// Step 2: Run it, see actual output
// Error: Expected "PLACEHOLDER", got { status: "empty", total: 0 }

// Step 3: Update test to match reality
test("processOrder returns empty status for no items", () => {
  const result = processOrder({ id: 1, items: [] });
  expect(result).toEqual({ status: "empty", total: 0 });
});
// Now you've documented what it actually does
```

**Key insight**: Characterization tests don't verify correctness — they verify **preservation**. They let you refactor safely.

---

## Breaking Dependencies for Testability

From _Working Effectively with Legacy Code_:

### The Seam Model

A **seam** is a place where you can alter behavior without editing the source file.

```typescript
// BEFORE: Untestable - hard dependency
class OrderProcessor {
  process(order: Order) {
    const db = new ProductionDatabase(); // can't test this
    return db.save(order);
  }
}

// AFTER: Testable - dependency injection (object seam)
class OrderProcessor {
  constructor(private db: Database = new ProductionDatabase()) {}

  process(order: Order) {
    return this.db.save(order);
  }
}

// In tests:
const fakeDb = { save: jest.fn() };
const processor = new OrderProcessor(fakeDb);
```

### Common Dependency-Breaking Techniques

| Technique                    | When to Use                          |
| ---------------------------- | ------------------------------------ |
| **Parameterize Constructor** | Class has hidden dependencies        |
| **Extract Interface**        | Need to swap implementations         |
| **Subclass and Override**    | Can't change constructor signature   |
| **Extract Method**           | Need to isolate behavior for testing |
| **Introduce Static Setter**  | Global/singleton dependencies        |

---

## TDD in Swarm Context

### For New Features

```
1. Coordinator decomposes task
2. Worker receives subtask
3. Worker writes failing test FIRST
4. Worker implements until green
5. Worker refactors
6. swarm_complete runs verification gate
```

### For Bug Fixes

```
1. Write a test that reproduces the bug (RED)
2. Fix the bug (GREEN)
3. Refactor if needed
4. The test prevents regression forever
```

### For Refactoring

```
1. Write characterization tests for existing behavior
2. Verify tests pass (they document current state)
3. Refactor in small steps
4. Run tests after EVERY change
5. If tests fail, you broke something — revert
```

---

## Anti-Patterns

### ❌ Writing Tests After Code

- You don't know if the test can fail
- Tests often test implementation, not behavior
- Harder to achieve good coverage

### ❌ Skipping RED

- "I'll just write the code and test together"
- You lose the specification benefit
- Tests may not actually test what you think

### ❌ Big GREEN Steps

- Writing too much code before running tests
- Harder to debug when tests fail
- Loses the feedback loop benefit

### ❌ Skipping REFACTOR

- "It works, ship it"
- Technical debt accumulates
- Code becomes legacy code

### ❌ Refactoring Without Tests

- "I'll just clean this up real quick"
- No safety net
- Bugs introduced silently

---

## The Mantra

```
RED    → What do I want?
GREEN  → How do I get it?
REFACTOR → How do I make it right?
```

**Never skip a step. Never change the order.**

---

## References (In the Lore Crates)

These books are indexed in `pdf-brain`. Query for deeper wisdom:

```bash
# Find TDD fundamentals
pdf-brain_search(query="TDD red green refactor Kent Beck")

# Legacy code techniques
pdf-brain_search(query="Feathers seam dependency breaking test harness")

# Refactoring mechanics
pdf-brain_search(query="Fowler refactoring behavior preserving small steps")

# Simple design rules
pdf-brain_search(query="Kent Beck four rules simple design")
```

| Book                                     | Author           | Key Concepts                                                                           |
| ---------------------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| **Working Effectively with Legacy Code** | Michael Feathers | Seams, characterization tests, dependency breaking, "legacy code = code without tests" |
| **Refactoring**                          | Martin Fowler    | Behavior-preserving transformations, small steps, catalog of refactorings              |
| **Test-Driven Development: By Example**  | Kent Beck        | Red-green-refactor, fake it til you make it, triangulation                             |
| **4 Rules of Simple Design**             | Corey Haines     | Tests pass, reveals intent, no duplication, fewest elements                            |

### Key Quotes to Remember

> "Legacy code is simply code without tests." — Feathers

> "Refactoring is a disciplined technique for restructuring an existing body of code, altering its internal structure without changing its external behavior." — Fowler

> "The act of writing a unit test is more an act of design than of verification." — Beck

---

## Related Resources

- `@knowledge/testing-patterns.md` — Testing trophy, async patterns, common pitfalls
- `skills_use(name="testing-patterns")` — 25 dependency-breaking techniques catalog
- `pdf-brain_search()` — Deep dive into the source material
