---
name: docx
description: Use this skill when you need to create, edit, or analyze Microsoft Word (.docx) documents, especially for tasks involving tracked changes (redlining), comments, authentic formatting, or deep XML inspection.
metadata:
  version: "2.0.0"
  author: "antigravity-skill-creator"
---

# Docx

## Overview

Comprehensive document creation, editing, and analysis toolset for professional Word documents (.docx). Support includes tracked changes (redlining), comments, formatting preservation, and text extraction via both high-level APIs and low-level XML manipulation.

## Protocols

### 1. Decision Tree

#### Reading/Analyzing Content
1. **Text Extraction**: Use `pandoc` to convert to markdown (preserves tracked changes).
   - Command: `pandoc --track-changes=all input.docx -o output.md`
2. **Raw XML Access**: Use `ooxml/scripts/unpack.py` to inspect `word/document.xml`, comments, or media.

#### Creating New Documents
1. **Method**: Use **docx-js** (JavaScript/TypeScript).
2. **Reference**: Read `references/docx-js.md` completely before starting.

#### Editing Existing Documents
- **Simple Changes (Own Doc)**: Use "Basic OOXML editing" workflow.
- **Redlining / Review (External Doc)**: Use **Redlining workflow** (Mandatory for legal/business docs).
- **Complex Edits**: Use **Document Library** (Python OOXML manipulation).

### 2. Redlining Workflow (Tracked Changes)

Use this for legal, academic, or business documents requiring review traces.

1. **Convert to Markdown**: `pandoc --track-changes=all doc.docx -o current.md`
2. **Identify Changes**: Group edits into batches (3-10 changes per batch).
3. **Study Documentation**: Read `references/ooxml.md` completely.
4. **Implementation**:
   - Unpack: `python ooxml/scripts/unpack.py doc.docx unpacked_dir`
   - Edit: Write Python script using XML manipulation (see `references/ooxml.md`).
   - Pack: `python ooxml/scripts/pack.py unpacked_dir new_doc.docx`
5. **Verify**: Convert back to MD and grep for expected changes.

### 3. XML & Scripting Resources

- **Document Library & Python OOXML**: See `references/ooxml.md`
- **JS Document Creation**: See `references/docx-js.md`

## Usage Examples

**User**: "Read this contract and tell me the termination date."
**Action**: Convert to markdown using `pandoc` to extract text while preserving structure.

**User**: "Create a new invoice template in Word."
**Action**: Use `docx-js` workflow. Read `references/docx-js.md` first.

**User**: "Change 'Vendor' to 'Client' in this agreement and show tracked changes."
**Action**: Use Redlining workflow. Unpack document, use Python to modify XML with `<w:ins>` and `<w:del>` tags, then repack.

## Dependencies

- **pandoc**: Text extraction (`sudo apt-get install pandoc`)
- **docx**: JS creation (`npm install -g docx`)
- **Poppler**: PDF to Image (`sudo apt-get install poppler-utils`)
- **defusedxml**: XML security (`pip install defusedxml`)

## Resources

- **Creation Guide**: `references/docx-js.md`
- **Editing & XML Guide**: `references/ooxml.md`
- **Unpack Script**: `ooxml/scripts/unpack.py`
- **Pack Script**: `ooxml/scripts/pack.py`
