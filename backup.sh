#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Laundry Man — GitHub backup
#  Saves a new version of the whole project and pushes it to GitHub.
#  Every run = a new version you can revert back to.
#
#  Usage:   bash backup.sh      (or double-click / run in Git Bash)
# ═══════════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")"

git add -A

if git diff --cached --quiet; then
  echo "Nothing new to back up — working tree is clean."
  exit 0
fi

git commit -m "Backup $(date '+%Y-%m-%d %H:%M')"
git push

echo ""
echo "✅ Backup pushed to GitHub:"
echo "   https://github.com/laundryman-Ind/LaundryMan"
echo ""
echo "To go back to an older version later:"
echo "   git log --oneline          # see all versions"
echo "   git checkout <hash> -- <file>   # restore one file"
