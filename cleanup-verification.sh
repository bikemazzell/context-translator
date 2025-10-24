#!/bin/bash
# Cleanup Verification Script

echo "=== Context Translator Cleanup Verification ==="
echo ""

echo "1. Checking deleted files don't exist..."
DELETED_FILES=(
  "extension/background/service-worker-old.js"
  "extension/background/service-worker-v2.js"
  "extension/background/message-handler-old.js"
  "extension/background/message-handler-v2.js"
  "extension/content/main-new.js"
  "extension/content/main.js.backup"
  "extension/tests/message-handler-v2.test.js"
  "extension/tests/browser-api.test.js"
  "fix-lint-errors.sh"
)

FAIL=0
for file in "${DELETED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   ❌ FOUND: $file (should be deleted)"
    FAIL=1
  fi
done

DELETED_DIRS=(
  "extension/lib/browser"
  "extension/lib/storage"
  "extension/lib/ui"
)

for dir in "${DELETED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "   ❌ FOUND: $dir/ (should be deleted)"
    FAIL=1
  fi
done

if [ $FAIL -eq 0 ]; then
  echo "   ✅ All deleted files/directories confirmed removed"
fi

echo ""
echo "2. Checking required files still exist..."
REQUIRED_FILES=(
  "extension/lib/translation/translation-cache.js"
  "extension/lib/translation/llm-client.js"
  "extension/lib/external/browser-polyfill.js"
  "extension/shared/settings-manager.js"
  "extension/shared/language-manager.js"
  "extension/background/service-worker-main.js"
  "extension/content/main.js"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "   ❌ MISSING: $file (required)"
    FAIL=1
  fi
done

if [ $FAIL -eq 0 ]; then
  echo "   ✅ All required files present"
fi

echo ""
echo "3. Running syntax checks..."
node --check extension/background/service-worker-main.js 2>&1 && echo "   ✅ service-worker-main.js syntax OK" || echo "   ❌ service-worker-main.js syntax error"
node --check extension/content/main.js 2>&1 && echo "   ✅ main.js syntax OK" || echo "   ❌ main.js syntax error"

echo ""
echo "4. Extension structure..."
echo "   lib/ directory:"
ls -1 extension/lib/ | sed 's/^/      /'

echo ""
if [ $FAIL -eq 0 ]; then
  echo "=== ✅ VERIFICATION PASSED ==="
else
  echo "=== ❌ VERIFICATION FAILED ==="
  exit 1
fi
