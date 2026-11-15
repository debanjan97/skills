#!/usr/bin/env bash
# Symlink every skill in this repo into ~/.claude/skills/.
# An existing skill of the same name is left alone unless --force is given,
# in which case it is moved to ~/.claude/skills/.backup-<timestamp>/.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dest="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
force=false
[ "${1:-}" = "--force" ] && force=true

mkdir -p "$dest"
backup="$dest/.backup-$(date +%Y%m%d%H%M%S)"

for dir in "$repo"/*/; do
  name="$(basename "$dir")"
  [ -f "$dir/SKILL.md" ] || continue
  target="$dest/$name"
  if [ -L "$target" ] && [ "$(readlink "$target")" = "${dir%/}" ]; then
    echo "ok       $name (already linked)"
    continue
  fi
  if [ -e "$target" ] || [ -L "$target" ]; then
    if ! $force; then
      echo "skip     $name (exists; rerun with --force to replace)"
      continue
    fi
    mkdir -p "$backup"
    mv "$target" "$backup/"
    echo "backup   $name -> $backup/$name"
  fi
  ln -s "${dir%/}" "$target"
  echo "linked   $name"
done
