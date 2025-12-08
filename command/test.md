---
description: Generate comprehensive tests for a file using vitest
---

Generate tests for a given source file.

## Usage

```
/test <file-path>
/test src/utils/parser.ts
/test --coverage src/services/auth.ts  # Focus on coverage gaps
```

## Step 1: Read the Source File

```bash
# Read the file to understand what to test
```

Use the Read tool to get the full file contents.

## Step 2: Analyze the Code

Identify:

- **Exports** - What functions/classes are public?
- **Dependencies** - What needs mocking?
- **Edge cases** - Null, empty, boundary conditions
- **Error paths** - What can throw/fail?
- **Types** - What are the input/output shapes?

## Step 3: Check Existing Tests

```bash
# Look for existing test file
ls -la "${FILE_PATH%.ts}.test.ts" 2>/dev/null || ls -la "${FILE_PATH%.tsx}.test.tsx" 2>/dev/null || echo "No existing tests"

# Or in __tests__ directory
ls -la "$(dirname $FILE_PATH)/__tests__/$(basename ${FILE_PATH%.ts}).test.ts" 2>/dev/null || echo "No __tests__ file"
```

## Step 4: Generate Tests

Create comprehensive tests covering:

### Unit Tests

- Happy path for each exported function
- Edge cases (empty input, null, undefined)
- Boundary conditions (min/max values)
- Type coercion scenarios

### Error Cases

- Invalid input handling
- Exception throwing
- Error message accuracy

### Integration Points

- Mock external dependencies
- Test async behavior
- Verify side effects

## Step 5: Write Test File

Write to adjacent `.test.ts` file (same directory as source):

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { functionName } from './filename'

describe('functionName', () => {
  describe('happy path', () => {
    it('should handle basic input', () => {
      // Arrange
      const input = ...

      // Act
      const result = functionName(input)

      // Assert
      expect(result).toEqual(...)
    })
  })

  describe('edge cases', () => {
    it('should handle empty input', () => {
      expect(functionName('')).toEqual(...)
    })

    it('should handle null', () => {
      expect(() => functionName(null)).toThrow()
    })
  })

  describe('error handling', () => {
    it('should throw on invalid input', () => {
      expect(() => functionName('invalid')).toThrow('Expected error message')
    })
  })
})
```

## Step 6: Verify Tests Run

```bash
# Run the tests
pnpm test <test-file-path> --run

# Or with vitest directly
npx vitest run <test-file-path>
```

## Test Writing Guidelines

- **AAA pattern** - Arrange, Act, Assert
- **One assertion per test** (when practical)
- **Descriptive names** - `should return empty array when input is null`
- **No test interdependence** - Each test should be isolated
- **Mock at boundaries** - External APIs, filesystem, network
- **Test behavior, not implementation**

## Mocking Patterns

```typescript
// Mock a module
vi.mock("./dependency", () => ({
  fetchData: vi.fn().mockResolvedValue({ data: "mocked" }),
}));

// Mock a function
const mockFn = vi.fn().mockReturnValue("result");

// Spy on object method
const spy = vi.spyOn(object, "method");

// Mock timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
```

## Output

After generating tests, report:

```markdown
## Tests Generated: [file-path]

### Test File

`[test-file-path]`

### Coverage

- [N] test suites
- [N] individual tests
- Functions covered: [list]

### Test Categories

- Happy path: [N] tests
- Edge cases: [N] tests
- Error handling: [N] tests

### Run Command

`pnpm test [test-file-path]`
```
