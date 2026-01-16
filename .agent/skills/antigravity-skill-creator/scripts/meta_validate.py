#!/usr/bin/env python3
"""
Antigravity Skill Validator - Validates skill against Antigravity standards

Usage:
    meta_validate.py <skill-directory>

Examples:
    meta_validate.py .agent/skills/my-skill
    meta_validate.py ~/.gemini/antigravity/skills/code-review
"""

import sys
import re
from pathlib import Path


def count_tokens_approximate(text: str) -> int:
    """Approximate token count (rough estimate: 4 chars per token)."""
    return len(text) // 4


def validate_skill(skill_path: str) -> tuple[float, list[str], list[str]]:
    """
    Validate a skill directory against Antigravity standards.
    
    Returns:
        Tuple of (score, errors, warnings)
    """
    skill_path = Path(skill_path).expanduser().resolve()
    errors = []
    warnings = []
    scores = {}
    
    # Check SKILL.md exists
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        errors.append("SKILL.md not found")
        return 0.0, errors, warnings
    
    content = skill_md.read_text()
    
    # === Dimension 1: Frontmatter (20%) ===
    if not content.startswith('---'):
        errors.append("No YAML frontmatter found (must start with ---)")
        scores['frontmatter'] = 0
    else:
        match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        if not match:
            errors.append("Invalid frontmatter format")
            scores['frontmatter'] = 0
        else:
            frontmatter = match.group(1)
            
            if 'name:' not in frontmatter:
                errors.append("Missing 'name' in frontmatter")
                scores['frontmatter'] = 0
            elif 'description:' not in frontmatter:
                errors.append("Missing 'description' in frontmatter")
                scores['frontmatter'] = 0
            else:
                scores['frontmatter'] = 2  # Full points
    
    # === Dimension 2: Name Compliance (10%) ===
    name_match = re.search(r'name:\s*(.+)', content)
    if name_match:
        name = name_match.group(1).strip()
        
        # Check kebab-case
        if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', name):
            errors.append(f"Name '{name}' is not valid kebab-case")
            scores['name'] = 0
        elif name.startswith('-') or name.endswith('-'):
            errors.append(f"Name '{name}' cannot start/end with hyphen")
            scores['name'] = 0
        elif '--' in name:
            errors.append(f"Name '{name}' cannot contain consecutive hyphens")
            scores['name'] = 0
        elif len(name) > 64:
            errors.append(f"Name '{name}' exceeds 64 character limit")
            scores['name'] = 0
        else:
            # Check if name matches directory name
            if name != skill_path.name:
                warnings.append(f"Name '{name}' doesn't match directory name '{skill_path.name}'")
                scores['name'] = 0.5
            else:
                scores['name'] = 1  # Full points
    else:
        scores['name'] = 0
    
    # === Dimension 3: Description Quality (30%) ===
    desc_match = re.search(r'description:\s*(.+?)(?:\n[a-z]|\n---|\Z)', content, re.DOTALL)
    if desc_match:
        description = desc_match.group(1).strip()
        
        # Check for angle brackets (often leftover from templates)
        if '<' in description or '>' in description:
            errors.append("Description cannot contain angle brackets")
            scores['description'] = 0
        elif '[TODO' in description:
            warnings.append("Description contains TODO placeholder")
            scores['description'] = 0
        else:
            # Check for Trigger-First pattern
            trigger_patterns = [
                r'use this skill when',
                r'trigger when',
                r'activate when',
                r'when the user',
                r'when you need to',
            ]
            
            desc_lower = description.lower()
            has_trigger = any(re.search(p, desc_lower) for p in trigger_patterns)
            
            if has_trigger:
                scores['description'] = 3  # Full points
            elif len(description) > 50:
                warnings.append("Description lacks Trigger-First format (should start with 'Use this skill when...')")
                scores['description'] = 1.5
            else:
                warnings.append("Description is too short and lacks trigger information")
                scores['description'] = 0.5
    else:
        scores['description'] = 0
    
    # === Dimension 4: Structure Clarity (20%) ===
    # Check for Overview and Protocols sections
    has_overview = '## Overview' in content or '## overview' in content.lower()
    has_protocols = '## Protocols' in content or '## Usage' in content or '## Workflow' in content
    
    # Check for long code blocks (> 50 lines)
    code_blocks = re.findall(r'```[\s\S]*?```', content)
    long_code_blocks = [b for b in code_blocks if b.count('\n') > 50]
    
    if has_overview and has_protocols and not long_code_blocks:
        scores['structure'] = 2  # Full points
    elif has_overview or has_protocols:
        if long_code_blocks:
            warnings.append(f"Found {len(long_code_blocks)} code block(s) > 50 lines - consider moving to scripts/")
        scores['structure'] = 1
    else:
        warnings.append("Missing Overview and/or Protocols sections")
        scores['structure'] = 0.5
    
    # === Dimension 5: Resource Separation (10%) ===
    # Check if scripts/ and references/ exist when needed
    token_count = count_tokens_approximate(content)
    
    if token_count > 5000:
        warnings.append(f"SKILL.md has ~{token_count} tokens (recommended < 5000)")
        
        # Check if resources are properly separated
        scripts_dir = skill_path / 'scripts'
        references_dir = skill_path / 'references'
        
        if scripts_dir.exists() or references_dir.exists():
            scores['separation'] = 0.5  # Partial - has dirs but content too long
        else:
            scores['separation'] = 0
    else:
        scores['separation'] = 1  # Full points
    
    # === Dimension 6: Safety (10%) ===
    dangerous_patterns = [
        r'rm\s+-rf\s+/',
        r'sudo\s+rm',
        r'chmod\s+777',
        r'eval\s*\(',
        r'exec\s*\(',
    ]
    
    has_dangerous = False
    for pattern in dangerous_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            errors.append(f"Dangerous pattern found: {pattern}")
            has_dangerous = True
    
    scores['safety'] = 0 if has_dangerous else 1
    
    # Calculate total score
    weights = {
        'frontmatter': 2,
        'name': 1,
        'description': 3,
        'structure': 2,
        'separation': 1,
        'safety': 1
    }
    
    total = sum(scores.get(k, 0) for k in weights.keys())
    max_total = sum(weights.values())
    normalized_score = (total / max_total) * 10
    
    return normalized_score, errors, warnings


def main():
    if len(sys.argv) != 2:
        print("Usage: meta_validate.py <skill-directory>")
        print("\nExamples:")
        print("  meta_validate.py .agent/skills/my-skill")
        print("  meta_validate.py ~/.gemini/antigravity/skills/code-review")
        sys.exit(1)
    
    skill_path = sys.argv[1]
    print(f"🔍 Validating Antigravity Skill: {skill_path}")
    print()
    
    score, errors, warnings = validate_skill(skill_path)
    
    # Print results
    print("=" * 50)
    print(f"📊 Score: {score:.1f}/10")
    print("=" * 50)
    
    if errors:
        print("\n❌ Errors:")
        for e in errors:
            print(f"   - {e}")
    
    if warnings:
        print("\n⚠️  Warnings:")
        for w in warnings:
            print(f"   - {w}")
    
    if score >= 8.0:
        print("\n✅ Verification Passed!")
        sys.exit(0)
    elif score >= 6.0:
        print("\n⚠️  Needs improvement. Please address warnings.")
        sys.exit(0)
    else:
        print("\n❌ Verification Failed. Please fix errors.")
        sys.exit(1)


if __name__ == "__main__":
    main()
