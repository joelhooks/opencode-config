# AI-Optimized Content

Write content that's legible to both humans and LLMs. Structure pages so AI systems can extract, chunk, and cite your content accurately.

## Core Principle

LLMs deconstruct pages into semantic chunks. Your job is to pre-chunk the content by writing in discrete, self-contained units. Every paragraph should be a perfect "Lego brick" that can snap into an AI-generated response.

## Heading Hierarchy

**Single H1 per page.** This is the topic. Everything else flows from it.

```
h1: What is Swarm Mail?
  h2: How It Works
    h3: Message Routing
    h3: File Reservations
  h2: Getting Started
  h2: API Reference
```

**Why it matters:** LLMs use heading structure as a blueprint. Flat structure (multiple h1s, illogical nesting) signals "everything is equally important" - which means nothing stands out.

## Front-Load Everything

Put the answer first. Then elaborate.

**Bad:**
> After years of working with distributed systems and encountering various coordination challenges, we developed a solution that addresses the fundamental problem of...

**Good:**
> Swarm Mail is an actor-model messaging system for multi-agent coordination. It provides inbox management, file reservations, and acknowledgment patterns.

The TL;DR goes at the top. Supporting details follow.

## One Idea Per Paragraph

Each paragraph = one extractable chunk.

**Bad:**
> The system uses event sourcing which means all changes are stored as immutable events and you can replay them to rebuild state, plus we added file reservations so agents don't conflict when editing the same files, and there's also semantic memory for persistent learning.

**Good:**
> **Event Sourcing.** All changes are stored as immutable events. Replay them to rebuild any historical state.
>
> **File Reservations.** Agents reserve files before editing. No conflicts, no lost work.
>
> **Semantic Memory.** Learnings persist across sessions. Search by similarity, validate accuracy.

Short paragraphs become clean chunks. Long paragraphs become messy, low-value chunks.

## Structured Formats

Lists, tables, and FAQs are pre-chunked by nature. Use them liberally.

**Features as a list:**
- Swarm Mail - Actor-model messaging
- Event Sourcing - Immutable event log
- File Reservations - Conflict prevention

**Comparison as a table:**

| Feature | Swarm Mail | Raw MCP |
|---------|-----------|---------|
| Reservations | ✅ | ❌ |
| Acknowledgments | ✅ | ❌ |
| Context limits | Enforced | None |

**Common questions as FAQ:**
```html
<script type="application/ld+json">
{
  "@type": "FAQPage",
  "mainEntity": [...]
}
</script>
```

## Explicit Signposts

Use transitional phrases that signal content function:

- "The key takeaway is..."
- "To summarize..."
- "Step 1:", "Step 2:"
- "A common mistake is..."
- "In contrast to X, Y does..."

These help LLMs categorize passages. Don't edit them out as "AI speak" - they're functional.

## Schema Markup (JSON-LD)

Add structured data to label your content's purpose:

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication', // or FAQPage, HowTo, Article, etc.
  name: 'Swarm Tools',
  description: '...',
  author: {
    '@type': 'Person',
    name: 'Joel Hooks',
    url: 'https://github.com/joelhooks'
  },
  // ...
};
```

**Critical:** Schema must be server-side rendered. AI crawlers (GPTBot, ClaudeBot, PerplexityBot) don't execute JavaScript. Client-side injected schema is invisible to them.

## Trust Signals (E-E-A-T)

Prove why you're qualified to speak on the topic:

1. **Author attribution** - Link to author pages with credentials
2. **Expert quotes** - Cite recognized authorities
3. **First-person experience** - "After building 50 agents, I've found..."
4. **Cited sources** - Link to primary research, not just other blogs
5. **Proprietary data** - Original research beats aggregated content

## Implementation Checklist

When creating a page:

- [ ] Single, clear `<h1>` defining the topic
- [ ] Logical heading hierarchy (h1 > h2 > h3)
- [ ] Key answer in first paragraph
- [ ] One idea per paragraph
- [ ] Lists/tables for scannable data
- [ ] JSON-LD schema (server-rendered)
- [ ] Author attribution with links
- [ ] Canonical URL set
- [ ] Meta description front-loads the answer

## Next.js Implementation

```tsx
// app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Topic - Site Name',
  description: 'Direct answer to what this page is about.',
  alternates: { canonical: 'https://example.com/page' },
  openGraph: { /* ... */ },
  twitter: { card: 'summary_large_image', /* ... */ },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  // ...
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <h1>Clear Topic Definition</h1>
        <p>Direct answer first. Then elaborate.</p>
        {/* ... */}
      </article>
    </>
  );
}
```

## Tags

seo, content, ai, llm, structured-data, schema, accessibility
