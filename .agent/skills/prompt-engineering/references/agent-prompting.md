# Agent Prompting Best Practices

Based on Anthropic's official best practices for agent prompting.

## Context Window

The "context window" is the model's "working memory" - the total text it can reference when generating responses.

**Key characteristics:**
- **Progressive token accumulation**: Each turn accumulates within the context window
- **Linear growth pattern**: Previous turns are preserved completely
- **200K token capacity**: Maximum for Claude

**Each turn consists of:**
- Input phase: All previous history + current message
- Output phase: Generated response that becomes part of future input

## Concise is Key

The context window is a shared resource. Your prompt shares space with:
- System prompt
- Conversation history
- Other commands, skills, hooks, metadata
- Actual request

**Default assumption**: Claude is already very smart.

Only add context Claude doesn't already have:
- "Does Claude really need this explanation?"
- "Can I assume Claude knows this?"
- "Does this paragraph justify its token cost?"

### Good vs Bad Example

**Good (≈50 tokens):**

```markdown
## Extract PDF text

Use pdfplumber for text extraction:

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
```

**Bad (≈150 tokens):**

```markdown
## Extract PDF text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available for PDF processing, but we
recommend pdfplumber because it's easy to use and handles most cases well.
First, you'll need to install it using pip. Then you can use the code below...
```

The concise version assumes Claude knows what PDFs are and how libraries work.

## Degrees of Freedom

Match specificity to task fragility and variability.

### High Freedom (text-based instructions)

**Use when:**
- Multiple approaches are valid
- Decisions depend on context
- Heuristics guide the approach

```markdown
## Code review process

1. Analyze the code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability and maintainability
4. Verify adherence to project conventions
```

### Medium Freedom (pseudocode/scripts with parameters)

**Use when:**
- A preferred pattern exists
- Some variation is acceptable
- Configuration affects behavior

```markdown
## Generate report

Use this template and customize as needed:

```python
def generate_report(data, format="markdown", include_charts=True):
    # Process data
    # Generate output in specified format
    # Optionally include visualizations
```
```

### Low Freedom (specific scripts, few parameters)

**Use when:**
- Operations are fragile and error-prone
- Consistency is critical
- A specific sequence must be followed

```markdown
## Database migration

Run exactly this script:

```bash
python scripts/migrate.py --verify --backup
```

Do not modify the command or add additional flags.
```

## The Bridge Analogy

Think of Claude as a robot exploring a path:

- **Narrow bridge with cliffs**: Only one safe way forward. Provide specific guardrails and exact instructions (low freedom). Example: database migrations.

- **Open field with no hazards**: Many paths lead to success. Give general direction and trust Claude to find the best route (high freedom). Example: code reviews.
