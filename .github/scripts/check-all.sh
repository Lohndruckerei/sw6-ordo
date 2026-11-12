#!/bin/bash
# Alle Prüfungen lokal (gleiche Schritte wie .github/workflows/ci.yml). Aus dem Plugin-Verzeichnis aufrufen.
set -euo pipefail
echo "== PHP-Syntax"
LINT=$(find src -name '*.php' -print0 | xargs -0 -n1 php -l 2>&1 | grep -v '^No syntax errors' || true)
[ -z "$LINT" ] || echo "$LINT"
if grep -q 'Parse error' <<< "$LINT"; then echo "PHP-Syntaxfehler"; exit 1; fi
echo "== Snippets"
node .github/scripts/check-snippets.mjs
echo "✓ Alle Prüfungen bestanden."
