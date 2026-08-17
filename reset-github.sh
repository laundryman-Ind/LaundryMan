#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Laundry Man — Wipe GitHub & push fresh
#  Deletes ALL history on GitHub and re-pushes the current folder as
#  ONE brand-new commit. The old remote history is NOT recoverable.
#  Your local files are never deleted — only the git history on
#  GitHub gets replaced.
#
#  Usage:   bash reset-github.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

echo "── 1/4 create a fresh empty history branch"
git checkout --orphan fresh-$(date +%s)

echo "── 2/4 stage everything and commit"
git add -A
git commit -m "Backup $(date '+%Y-%m-%d %H:%M') — fresh single commit (full wipe)"

echo "── 3/4 replace the old main branch"
git branch -D main
git branch -m main

echo "── 4/4 force-push (this deletes all old history on GitHub)"
git push -f origin main

echo ""
echo "✅ GitHub wiped and re-pushed with a single fresh commit:"
git log --oneline -1
