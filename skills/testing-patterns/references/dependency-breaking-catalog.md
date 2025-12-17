# Dependency-Breaking Techniques Catalog

From Michael Feathers' "Working Effectively with Legacy Code" - 25 techniques for getting code under test.

## Constructor Problems

### Parameterize Constructor

**When**: Constructor creates dependencies internally.

```typescript
// Before
class ReportGenerator {
  private db: Database;
  constructor() {
    this.db = new ProductionDatabase();
  }
}

// After
class ReportGenerator {
  private db: Database;
  constructor(db: Database = new ProductionDatabase()) {
    this.db = db;
  }
}

// Test
const generator = new ReportGenerator(new FakeDatabase());
```

### Extract and Override Factory Method

**When**: Constructor creates object you can't easily replace.

```typescript
// Before
class OrderProcessor {
  private validator: Validator;
  constructor() {
    this.validator = new ComplexValidator();
  }
}

// After
class OrderProcessor {
  private validator: Validator;
  constructor() {
    this.validator = this.createValidator();
  }

  protected createValidator(): Validator {
    return new ComplexValidator();
  }
}

// Test subclass
class TestableOrderProcessor extends OrderProcessor {
  protected createValidator(): Validator {
    return new SimpleValidator();
  }
}
```

### Supersede Instance Variable

**When**: Can't change constructor, but can add setter.

```typescript
class PaymentService {
  private gateway = new StripeGateway();

  // Add for testing only
  _setGatewayForTesting(gateway: PaymentGateway) {
    this.gateway = gateway;
  }
}
```

**Warning**: Use sparingly. Prefer constructor injection.

## Method Problems

### Extract and Override Call

**When**: Method makes problematic call you need to isolate.

```typescript
// Before
class OrderService {
  process(order: Order) {
    // ... logic
    this.sendEmail(order.customer); // problematic
    // ... more logic
  }

  private sendEmail(customer: Customer) {
    emailService.send(customer.email, "Order confirmed");
  }
}

// After - make protected, override in test
class OrderService {
  process(order: Order) {
    // ... logic
    this.sendEmail(order.customer);
    // ... more logic
  }

  protected sendEmail(customer: Customer) {
    emailService.send(customer.email, "Order confirmed");
  }
}

class TestableOrderService extends OrderService {
  emailsSent: Customer[] = [];

  protected sendEmail(customer: Customer) {
    this.emailsSent.push(customer);
  }
}
```

### Parameterize Method

**When**: Method uses hardcoded value that should vary.

```typescript
// Before
function getRecentOrders() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return db.query(`SELECT * FROM orders WHERE date > ?`, cutoff);
}

// After
function getRecentOrders(days: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return db.query(`SELECT * FROM orders WHERE date > ?`, cutoff);
}
```

### Replace Function with Function Pointer

**When**: Need to swap out a function call (especially in C/procedural code).

```typescript
// Before
function processData(data: Data) {
  const validated = validateData(data); // hardcoded call
  return transform(validated);
}

// After
function processData(data: Data, validate: (d: Data) => Data = validateData) {
  const validated = validate(data);
  return transform(validated);
}
```

## Interface Techniques

### Extract Interface

**When**: Need to create test double for a class.

```typescript
// 1. Identify methods used by client
class PaymentGateway {
  charge(amount: number): Receipt { ... }
  refund(receiptId: string): void { ... }
  getBalance(): number { ... }
}

// 2. Extract interface with only needed methods
interface Chargeable {
  charge(amount: number): Receipt;
}

// 3. Implement interface
class PaymentGateway implements Chargeable { ... }

// 4. Create test double
class FakeChargeable implements Chargeable {
  charges: number[] = [];
  charge(amount: number): Receipt {
    this.charges.push(amount);
    return { id: 'fake-receipt' };
  }
}
```

### Extract Implementer

**When**: Class is concrete but you need interface. Similar to Extract Interface but you rename the original.

```typescript
// Before
class MessageQueue {
  send(msg: Message) { ... }
  receive(): Message { ... }
}

// After
interface MessageQueue {
  send(msg: Message): void;
  receive(): Message;
}

class ProductionMessageQueue implements MessageQueue {
  send(msg: Message) { ... }
  receive(): Message { ... }
}
```

### Introduce Instance Delegator

**When**: Static methods prevent testing.

```typescript
// Before - static method
class DateUtils {
  static now(): Date {
    return new Date();
  }
}

// After - instance method delegates to static
class DateUtils {
  static now(): Date {
    return new Date();
  }

  // Instance method for testability
  getCurrentDate(): Date {
    return DateUtils.now();
  }
}

// Or better - extract interface
interface Clock {
  now(): Date;
}

class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

class FakeClock implements Clock {
  private time: Date;
  constructor(time: Date) {
    this.time = time;
  }
  now(): Date {
    return this.time;
  }
}
```

## Class Extraction

### Break Out Method Object

**When**: Long method with many local variables. Extract to class where locals become fields.

```typescript
// Before - 200 line method with 15 local variables
class ReportGenerator {
  generate(data: Data): Report {
    let total = 0;
    let items: Item[] = [];
    let categories: Map<string, number> = new Map();
    // ... 200 lines using these variables
  }
}

// After - method becomes class
class ReportGeneration {
  private total = 0;
  private items: Item[] = [];
  private categories: Map<string, number> = new Map();

  constructor(private data: Data) {}

  run(): Report {
    this.calculateTotals();
    this.categorize();
    return this.buildReport();
  }

  private calculateTotals() { ... }
  private categorize() { ... }
  private buildReport() { ... }
}

class ReportGenerator {
  generate(data: Data): Report {
    return new ReportGeneration(data).run();
  }
}
```

### Expose Static Method

**When**: Method doesn't use instance state. Make static to test without instantiation.

```typescript
// Before
class Calculator {
  // Doesn't use 'this' at all
  computeTax(amount: number, rate: number): number {
    return amount * rate;
  }
}

// After
class Calculator {
  static computeTax(amount: number, rate: number): number {
    return amount * rate;
  }
}

// Test without instantiating Calculator
expect(Calculator.computeTax(100, 0.1)).toBe(10);
```

## Global/Static State

### Introduce Static Setter

**When**: Singleton or global state blocks testing.

```typescript
// Before - untestable singleton
class Configuration {
  private static instance: Configuration;

  static getInstance(): Configuration {
    if (!this.instance) {
      this.instance = new Configuration();
    }
    return this.instance;
  }
}

// After - add setter for tests
class Configuration {
  private static instance: Configuration;

  static getInstance(): Configuration {
    if (!this.instance) {
      this.instance = new Configuration();
    }
    return this.instance;
  }

  // For testing only
  static _setInstanceForTesting(config: Configuration) {
    this.instance = config;
  }

  static _resetForTesting() {
    this.instance = undefined!;
  }
}
```

**Warning**: This is a last resort. Prefer dependency injection.

### Encapsulate Global References

**When**: Code uses global variables directly.

```typescript
// Before
let globalConfig: Config;

function processOrder(order: Order) {
  if (globalConfig.taxEnabled) {
    // ...
  }
}

// After - wrap in accessor
class ConfigAccess {
  static getConfig(): Config {
    return globalConfig;
  }

  static _setConfigForTesting(config: Config) {
    globalConfig = config;
  }
}

function processOrder(order: Order) {
  if (ConfigAccess.getConfig().taxEnabled) {
    // ...
  }
}
```

## Subclass Techniques

### Subclass and Override Method

**When**: Need to neutralize or sense a method call.

```typescript
class NotificationService {
  notify(user: User, message: string) {
    this.sendPush(user, message);
    this.sendEmail(user, message);
    this.logNotification(user, message);
  }

  protected sendPush(user: User, message: string) {
    pushService.send(user.deviceId, message);
  }

  protected sendEmail(user: User, message: string) {
    emailService.send(user.email, message);
  }

  protected logNotification(user: User, message: string) {
    logger.info(`Notified ${user.id}: ${message}`);
  }
}

// Test subclass - override problematic methods
class TestableNotificationService extends NotificationService {
  pushes: Array<{ user: User; message: string }> = [];
  emails: Array<{ user: User; message: string }> = [];

  protected sendPush(user: User, message: string) {
    this.pushes.push({ user, message });
  }

  protected sendEmail(user: User, message: string) {
    this.emails.push({ user, message });
  }
}
```

### Push Down Dependency

**When**: Only a few methods have problematic dependencies.

```typescript
// Before - whole class untestable due to one method
class DataProcessor {
  process(data: Data): Result {
    const validated = this.validate(data);
    const transformed = this.transform(validated);
    return this.save(transformed); // problematic
  }

  private save(data: Data): Result {
    return database.insert(data); // real DB call
  }
}

// After - push dependency to subclass
abstract class DataProcessor {
  process(data: Data): Result {
    const validated = this.validate(data);
    const transformed = this.transform(validated);
    return this.save(transformed);
  }

  protected abstract save(data: Data): Result;
}

class ProductionDataProcessor extends DataProcessor {
  protected save(data: Data): Result {
    return database.insert(data);
  }
}

class TestableDataProcessor extends DataProcessor {
  saved: Data[] = [];
  protected save(data: Data): Result {
    this.saved.push(data);
    return { success: true };
  }
}
```

## Adapter Techniques

### Adapt Parameter

**When**: Parameter type is hard to construct in tests.

```typescript
// Before - HttpRequest is hard to construct
function handleRequest(request: HttpRequest): Response {
  const userId = request.headers.get("X-User-Id");
  const body = request.body;
  // ... process
}

// After - extract what you need
interface RequestData {
  userId: string;
  body: unknown;
}

function handleRequest(request: HttpRequest): Response {
  return processRequest({
    userId: request.headers.get("X-User-Id"),
    body: request.body,
  });
}

function processRequest(data: RequestData): Response {
  // ... process - now testable with simple object
}
```

### Skin and Wrap the API

**When**: Third-party API is hard to mock.

```typescript
// Before - direct AWS SDK usage everywhere
async function uploadFile(file: Buffer) {
  const s3 = new S3Client({});
  await s3.send(
    new PutObjectCommand({
      Bucket: "my-bucket",
      Key: "file.txt",
      Body: file,
    }),
  );
}

// After - wrap in your own interface
interface FileStorage {
  upload(key: string, content: Buffer): Promise<void>;
}

class S3Storage implements FileStorage {
  private client = new S3Client({});

  async upload(key: string, content: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: "my-bucket",
        Key: key,
        Body: content,
      }),
    );
  }
}

class FakeStorage implements FileStorage {
  files: Map<string, Buffer> = new Map();

  async upload(key: string, content: Buffer): Promise<void> {
    this.files.set(key, content);
  }
}
```

## Quick Reference

| Problem                         | Technique                           |
| ------------------------------- | ----------------------------------- |
| Constructor creates dependency  | Parameterize Constructor            |
| Constructor does complex work   | Extract and Override Factory Method |
| Can't change constructor        | Supersede Instance Variable         |
| Method makes problematic call   | Extract and Override Call           |
| Method uses hardcoded value     | Parameterize Method                 |
| Need test double for class      | Extract Interface                   |
| Static methods block testing    | Introduce Instance Delegator        |
| Long method, many locals        | Break Out Method Object             |
| Method doesn't use instance     | Expose Static Method                |
| Singleton blocks testing        | Introduce Static Setter             |
| Global variable usage           | Encapsulate Global References       |
| Need to sense/neutralize method | Subclass and Override Method        |
| Few methods have dependencies   | Push Down Dependency                |
| Parameter hard to construct     | Adapt Parameter                     |
| Third-party API hard to mock    | Skin and Wrap the API               |
