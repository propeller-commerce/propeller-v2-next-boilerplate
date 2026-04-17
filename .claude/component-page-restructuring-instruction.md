# Component Page Restructuring Instruction

You are transforming UI component documentation files. You receive a single markdown file documenting one component. You output a single markdown file with the same content reorganized into a tabbed Docusaurus format.

## Your task

1. Read the entire source file before doing anything else.
2. Classify every section in the source file using the categories defined below.
3. Restructure the content into the output format.
4. Verify your output against the checklist at the end.

Do not start writing output until you have fully read and classified the source.

---

## Input

A markdown file documenting a UI component. It may contain any combination of:

- An introduction/description
- Usage examples (JSX/TSX code blocks)
- Props tables
- Labels/strings tables
- Behavioral documentation (business logic, flows, rules)
- GraphQL mutations or queries
- SDK service/method references
- A "Building Your Own" section with non-React code examples

Not every source file will have all of these. Work only with what is present.

## Output format

A single markdown file in Docusaurus MDX format with this structure:

```
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ComponentName

Introduction paragraph

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">
    (usage examples)
  </TabItem>
  <TabItem value="byo" label="Build Your Own">
    (SDK-based examples)
  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">
    (props tables)
  </TabItem>
  <TabItem value="byo" label="Build Your Own">
    (function signature, options, callbacks)
  </TabItem>
</Tabs>

## Labels                ← only if source has labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">
    (labels table)
  </TabItem>
  <TabItem value="byo" label="Build Your Own">
    (labels as plain object + explanation)
  </TabItem>
</Tabs>

---

## Behavior              ← only if source has behavioral docs
## GraphQL Mutation       ← only if source has a mutation/query
## SDK Services           ← only if source has SDK references
```

Every `<Tabs>` must use `groupId="implementation"` so tab selection syncs across sections.

---

## Step-by-step process

### Step 1: Read and classify

Read the full source file. For each section, assign it to one of these categories:

| Category | Goes to | Rule |
|---|---|---|
| Introduction/description paragraph | Top of page, no tabs | Remove framework-specific language. If it says "a React component that renders…" rewrite as "renders…". Do not add new content. |
| Usage examples (JSX/TSX code blocks) | Usage → React tab | Move as-is. Keep all scenarios and their explanatory paragraphs. |
| "Building Your Own" code examples | Usage → Build Your Own tab | Move as-is. These become the seed for the BYO tab. |
| Props tables | Configuration → React tab | Move as-is, keep grouping (Required, Cart, Behavior, etc.). |
| Labels/strings table | Labels → React tab | Move as-is. |
| Behavioral docs (quantity rules, cart resolution, toast behavior, stock validation, modal behavior, address assignment, any business logic) | Behavior section, no tabs | Move as-is. |
| GraphQL mutations/queries and variable examples | GraphQL Mutation section, no tabs | Move as-is. |
| SDK service/method tables and type lists | SDK Services section, no tabs | Move as-is. |

If a section does not fit any category, keep it in the shared (non-tabbed) area closest to where it logically belongs.

### Step 2: Build the React tabs

Place all classified React content into the appropriate tabs. This is a move operation. Do not rewrite, summarize or omit anything.

### Step 3: Build the Build Your Own tabs

This is the only step where you create new content, and it is tightly constrained.

**Usage → BYO tab:**

- If the source contains a "Building Your Own" section, move its code examples here.
- For each React usage scenario that has no BYO equivalent yet, write the equivalent TypeScript code calling the SDK directly.
- CRITICAL CONSTRAINT: You may only use SDK methods and types that appear somewhere in the source file (in the SDK Services table, the "Building Your Own" section, the GraphQL section, or the props descriptions). If the source file does not document how to do something via the SDK, do not guess. Instead write a comment in the code block: `// Not documented in source — implement based on your setup`.

**Configuration → BYO tab:**

Build this section from the information already in the source file's props tables. Structure it as:

1. **Function signature** — Show the required parameters and return type. Derive the types from the SDK types listed in the source. If the source does not list a return type, use the type returned by the primary SDK method documented in the source.

2. **Options table** — Create a table with columns: Field, Type, Default, Maps to. Only include fields that map to data/API props from the source (things like product identifiers, quantities, pricing, language, cart IDs, cluster IDs, child items, notes). Derive every row from an actual prop in the source. Do not add fields that have no corresponding prop.

3. **Cart resolution** — Include this only if the source documents cart-related props (`cartId`, `createCart`, `onCartCreated` or similar). Describe the SDK call sequence using only methods from the source file's SDK Services section. Do not write full implementation code; reference the Usage BYO tab examples instead.

4. **Callbacks table** — Include this only if the source documents callback props. Create a table with columns: Callback, When it fires, What to implement. Derive every row from an actual callback prop in the source.

5. **UI-only props callout** — List the props from the source that are purely presentational (e.g. `className`, `showModal`, `allowIncrDecr`, `labels`). State that these are not part of the SDK layer and are the developer's responsibility. Only list props that actually exist in the source.

**Labels → BYO tab:**

- Only if the source has a labels section.
- Show the exact same keys and defaults as the React tab, formatted as a plain object in a code block.
- Add one sentence: "These are suggested defaults. Override per-key to support localization."

### Step 4: Assemble the shared sections

Move Behavior, GraphQL Mutation and SDK Services content into their respective sections outside any tab wrapper. Reproduce this content exactly as it appears in the source.

### Step 5: Self-check

Before outputting, walk through every item in the verification checklist below. If any item fails, fix it before responding.

---

## Constraints

These apply throughout the entire process. Violating any of these is a failure.

1. **No content removal.** Every piece of information from the source file must appear in the output. You are reorganizing, not summarizing.
2. **No fabrication.** Do not invent SDK methods, props, types, parameter names, GraphQL fields or code patterns that are not present in the source file. If you are unsure whether something exists, do not include it.
3. **Source file is the single source of truth.** If the source is ambiguous or incomplete, preserve the ambiguity. Do not fill gaps with assumptions.
4. **No empty sections.** If the source has no labels, do not create a Labels section. If there is no GraphQL mutation, do not create that section. Only create sections where the source provides content.
5. **BYO code must be verifiable.** Every SDK method call in a BYO code example must trace back to a method listed in the source file. If you write `cartService.someMethod()`, the string `someMethod` must appear in the source.

---

## Decision logic for common edge cases

**The source has no "Building Your Own" section at all:**
You still create the BYO tabs. Derive the BYO usage examples from the SDK methods and GraphQL mutations documented elsewhere in the source. If the source has neither SDK methods nor GraphQL docs, the BYO Usage tab should contain only a note: "The source documentation for this component does not include SDK-level usage examples. Refer to the SDK Services section for available methods."

**The source has a BYO section but it only covers 1-2 scenarios while the React tab has 6+:**
Move the existing BYO examples and write additional ones for the remaining scenarios, following constraint #5 (every method call must be traceable to the source).

**A React prop has no BYO equivalent:**
If the prop is purely UI-related (styling, modal toggles, button visibility), list it in the UI-only props callout. If the prop is data/API-related but you cannot determine the SDK equivalent from the source, add it to the options table with a note in the description: "See source component for implementation details."

**The source mixes behavioral docs into the props section:**
Move the behavioral content to the shared Behavior section. Leave only the prop name, type, default and a short description in the props table.

---

## Verification checklist

Check every item. Do not output until all pass.

- [ ] The Tabs import appears at the top of the file
- [ ] Introduction paragraph contains no framework-specific language
- [ ] Every usage scenario from the source appears in the React tab
- [ ] Every React usage scenario has a corresponding BYO example (or a documented reason why not)
- [ ] Every BYO code example only calls SDK methods that appear in the source file
- [ ] Every prop from the source appears in the React Configuration tab
- [ ] The BYO Configuration tab has: function signature, options table, and (where applicable) cart resolution, callbacks table, UI-only props callout
- [ ] Labels section exists only if the source has labels, and both tabs use identical keys and defaults
- [ ] Behavior section is outside all tab wrappers
- [ ] GraphQL section (if present) is outside all tab wrappers
- [ ] SDK Services section (if present) is outside all tab wrappers
- [ ] All `<Tabs>` use `groupId="implementation"`
- [ ] No content from the source file is missing in the output
- [ ] No fabricated SDK methods, props or types exist in the output
- [ ] No empty sections exist in the output
