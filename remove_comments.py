#!/usr/bin/env python3
"""
Script to remove all comments from .ts, .tsx, and .js files in the apps directory.
Handles both single-line (//) and multi-line (/* */) comments while preserving
comments inside strings and template literals.
"""

import os
import re
from pathlib import Path
from typing import List


def remove_comments_from_code(content: str) -> str:
    """
    Remove comments from JavaScript/TypeScript code while preserving strings and template literals.
    """
    result = []
    i = 0
    length = len(content)
    
    while i < length:
        # Check for single-line comment
        if i < length - 1 and content[i:i+2] == '//':
            # Skip until end of line
            while i < length and content[i] != '\n':
                i += 1
            if i < length:
                result.append('\n')
                i += 1
            continue
        
        # Check for multi-line comment
        if i < length - 1 and content[i:i+2] == '/*':
            # Skip until end of comment
            i += 2
            while i < length - 1:
                if content[i:i+2] == '*/':
                    i += 2
                    break
                i += 1
            continue
        
        # Check for template literal
        if content[i] == '`':
            result.append(content[i])
            i += 1
            while i < length:
                if content[i] == '\\' and i + 1 < length:
                    result.append(content[i])
                    result.append(content[i + 1])
                    i += 2
                elif content[i] == '`':
                    result.append(content[i])
                    i += 1
                    break
                else:
                    result.append(content[i])
                    i += 1
            continue
        
        # Check for single-quoted string
        if content[i] == "'":
            result.append(content[i])
            i += 1
            while i < length:
                if content[i] == '\\' and i + 1 < length:
                    result.append(content[i])
                    result.append(content[i + 1])
                    i += 2
                elif content[i] == "'":
                    result.append(content[i])
                    i += 1
                    break
                else:
                    result.append(content[i])
                    i += 1
            continue
        
        # Check for double-quoted string
        if content[i] == '"':
            result.append(content[i])
            i += 1
            while i < length:
                if content[i] == '\\' and i + 1 < length:
                    result.append(content[i])
                    result.append(content[i + 1])
                    i += 2
                elif content[i] == '"':
                    result.append(content[i])
                    i += 1
                    break
                else:
                    result.append(content[i])
                    i += 1
            continue
        
        # Check for regex literal (simplified detection)
        if content[i] == '/' and i > 0:
            # Look back to see if this could be a regex
            prev_chars = content[max(0, i-20):i].strip()
            if prev_chars and (prev_chars[-1] in '=([,;:!&|?+-%*<>'):
                result.append(content[i])
                i += 1
                while i < length:
                    if content[i] == '\\' and i + 1 < length:
                        result.append(content[i])
                        result.append(content[i + 1])
                        i += 2
                    elif content[i] == '/':
                        result.append(content[i])
                        i += 1
                        # Handle regex flags
                        while i < length and content[i] in 'gimsuvy':
                            result.append(content[i])
                            i += 1
                        break
                    elif content[i] == '\n':
                        result.append(content[i])
                        i += 1
                        break
                    else:
                        result.append(content[i])
                        i += 1
                continue
        
        # Regular character
        result.append(content[i])
        i += 1
    
    return ''.join(result)


def process_file(file_path: Path) -> bool:
    """
    Process a single file to remove comments.
    Returns True if file was modified, False otherwise.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        new_content = remove_comments_from_code(original_content)
        
        if original_content != new_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False


def find_and_process_files(root_dir: str) -> None:
    """
    Find all .ts, .tsx, and .js files in the apps directory and remove comments.
    """
    apps_path = Path(root_dir) / 'apps'
    
    if not apps_path.exists():
        print(f"Error: '{apps_path}' directory not found!")
        return
    
    extensions = {'.ts', '.tsx', '.js'}
    files_processed = 0
    files_modified = 0
    
    print(f"Scanning for files in {apps_path}...\n")
    
    for file_path in apps_path.rglob('*'):
        if file_path.is_file() and file_path.suffix in extensions:
            # Skip node_modules and other common exclusions
            if 'node_modules' in file_path.parts or '.next' in file_path.parts or 'dist' in file_path.parts:
                continue
            
            files_processed += 1
            print(f"Processing: {file_path.relative_to(apps_path)}")
            
            if process_file(file_path):
                files_modified += 1
                print(f"  ✓ Modified")
            else:
                print(f"  - No changes")
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Files processed: {files_processed}")
    print(f"  Files modified: {files_modified}")
    print(f"{'='*60}")


if __name__ == "__main__":
    # Get the script's directory (should be the workspace root)
    script_dir = Path(__file__).parent.resolve()
    
    print("=" * 60)
    print("JavaScript/TypeScript Comment Removal Script")
    print("=" * 60)
    print(f"Working directory: {script_dir}\n")
    
    find_and_process_files(script_dir)
    
    print("\nDone!")

