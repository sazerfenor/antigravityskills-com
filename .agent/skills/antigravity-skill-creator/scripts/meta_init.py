#!/usr/bin/env python3
"""
Antigravity Skill Initializer - Creates a new skill from template

Usage:
    meta_init.py <skill-name> --path <path>

Examples:
    meta_init.py my-new-skill --path .agent/skills
    meta_init.py code-review --path ~/.gemini/antigravity/skills
"""

import sys
import re
from pathlib import Path

SKILL_TEMPLATE = """---
name: {skill_name}
description: [TODO: Write a Trigger-First description. Start with "Use this skill when..." and include specific keywords that activate this skill.]
metadata:
  version: "1.0.0"
  author: "antigravity-skill-creator"
---

# {skill_title}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Protocols

1. [TODO: First step]
2. [TODO: Second step]
3. [TODO: Third step]

## Usage Examples

**User**: "[Example user query that should trigger this skill]"
**Action**: [What the agent should do]

## Resources

[TODO: List any scripts or references if applicable]
"""

SCRIPT_TEMPLATE = '''#!/usr/bin/env python3
"""
{skill_title} - Helper Script

Usage:
    python {script_name}.py --help
"""

import argparse

def main():
    parser = argparse.ArgumentParser(description='{skill_title} helper script')
    parser.add_argument('--version', action='version', version='1.0.0')
    # Add your arguments here
    
    args = parser.parse_args()
    
    # TODO: Implement main logic
    print("Script executed successfully.")

if __name__ == "__main__":
    main()
'''

REFERENCE_TEMPLATE = """# {skill_title} - Reference Guide

## Overview

[TODO: Add detailed documentation here]

## API Reference

[TODO: Add API documentation if needed]

## Best Practices

[TODO: Add best practices]
"""


def validate_skill_name(name: str) -> tuple[bool, str]:
    """Validate skill name against Antigravity standards."""
    # Check length
    if len(name) < 1 or len(name) > 64:
        return False, "Name must be 1-64 characters"
    
    # Check pattern (kebab-case)
    if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', name):
        return False, "Name must be kebab-case (lowercase letters, numbers, and hyphens only)"
    
    # Check for leading/trailing hyphens
    if name.startswith('-') or name.endswith('-'):
        return False, "Name cannot start or end with hyphen"
    
    # Check for consecutive hyphens
    if '--' in name:
        return False, "Name cannot contain consecutive hyphens"
    
    return True, "Valid"


def title_case_skill_name(skill_name: str) -> str:
    """Convert hyphenated skill name to Title Case for display."""
    return ' '.join(word.capitalize() for word in skill_name.split('-'))


def init_skill(skill_name: str, path: str) -> Path | None:
    """
    Initialize a new skill directory with template files.
    
    Args:
        skill_name: Name of the skill (kebab-case)
        path: Path where the skill directory should be created
    
    Returns:
        Path to created skill directory, or None if error
    """
    # Validate name
    valid, message = validate_skill_name(skill_name)
    if not valid:
        print(f"❌ Invalid skill name: {message}")
        return None
    
    # Resolve path
    skill_dir = Path(path).expanduser().resolve() / skill_name
    
    # Check if directory already exists
    if skill_dir.exists():
        print(f"❌ Error: Skill directory already exists: {skill_dir}")
        return None
    
    # Create skill directory
    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"✅ Created skill directory: {skill_dir}")
    except Exception as e:
        print(f"❌ Error creating directory: {e}")
        return None
    
    # Create SKILL.md from template
    skill_title = title_case_skill_name(skill_name)
    skill_content = SKILL_TEMPLATE.format(
        skill_name=skill_name,
        skill_title=skill_title
    )
    
    skill_md_path = skill_dir / 'SKILL.md'
    try:
        skill_md_path.write_text(skill_content)
        print("✅ Created SKILL.md")
    except Exception as e:
        print(f"❌ Error creating SKILL.md: {e}")
        return None
    
    # Create optional directories
    try:
        # Create scripts/ directory
        scripts_dir = skill_dir / 'scripts'
        scripts_dir.mkdir(exist_ok=True)
        
        # Create example script
        example_script = scripts_dir / f'{skill_name.replace("-", "_")}.py'
        example_script.write_text(SCRIPT_TEMPLATE.format(
            skill_title=skill_title,
            script_name=skill_name.replace("-", "_")
        ))
        example_script.chmod(0o755)
        print(f"✅ Created scripts/{skill_name.replace('-', '_')}.py")
        
        # Create references/ directory
        references_dir = skill_dir / 'references'
        references_dir.mkdir(exist_ok=True)
        
        # Create example reference
        example_ref = references_dir / 'guide.md'
        example_ref.write_text(REFERENCE_TEMPLATE.format(skill_title=skill_title))
        print("✅ Created references/guide.md")
        
        # Create assets/ directory (empty)
        assets_dir = skill_dir / 'assets'
        assets_dir.mkdir(exist_ok=True)
        print("✅ Created assets/")
        
    except Exception as e:
        print(f"❌ Error creating resource directories: {e}")
        return None
    
    # Print next steps
    print(f"\n✅ Skill '{skill_name}' initialized successfully at {skill_dir}")
    print("\n📋 Next steps:")
    print("1. Edit SKILL.md to complete the TODO items")
    print("2. Write a Trigger-First description (start with 'Use this skill when...')")
    print("3. Customize or delete the example files in scripts/ and references/")
    print("4. Run meta_validate.py to check the skill structure")
    
    return skill_dir


def main():
    if len(sys.argv) < 4 or sys.argv[2] != '--path':
        print("Usage: meta_init.py <skill-name> --path <path>")
        print("\nSkill name requirements:")
        print("  - Kebab-case identifier (e.g., 'code-review')")
        print("  - Lowercase letters, digits, and hyphens only")
        print("  - 1-64 characters")
        print("  - Cannot start/end with hyphen or contain '--'")
        print("\nExamples:")
        print("  meta_init.py my-new-skill --path .agent/skills")
        print("  meta_init.py code-review --path ~/.gemini/antigravity/skills")
        sys.exit(1)
    
    skill_name = sys.argv[1]
    path = sys.argv[3]
    
    print(f"🚀 Initializing Antigravity Skill: {skill_name}")
    print(f"   Location: {path}")
    print()
    
    result = init_skill(skill_name, path)
    
    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
