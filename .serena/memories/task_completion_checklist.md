# Task Completion Checklist

When completing a coding task, always perform these checks before considering the task done:

## 1. Code Quality Checks

### Run Ruff Linter
```bash
cd backend
ruff check app
```
- Should have zero errors
- Fix any issues with `ruff check --fix app` or manually

### Run Ruff Formatter
```bash
cd backend
ruff format app
```
- Ensures consistent code formatting
- Line length: 100 characters
- Python 3.12 style

### Run Mypy Type Checker
```bash
cd backend
mypy app
```
- Strict mode enabled - must pass with zero errors
- All functions must have type hints
- No implicit Optional, no untyped definitions

## 2. Testing

### Run Full Test Suite
```bash
cd backend
pytest
```
- All tests must pass (currently 65 tests)
- Coverage should remain at or above 80%
- Watch for any new warnings or deprecations

### Run Integration Tests
```bash
cd backend
pytest -m integration
```
- Ensure integration tests pass if modified integration points
- May require LLM server running for some tests

### Verify Test Coverage
```bash
cd backend
pytest --cov=app --cov-report=term-missing
```
- New code should be covered by tests
- Aim for 80%+ overall coverage
- Check `--cov-report=html` for detailed view

## 3. Functional Testing

### If Backend Changes:
1. Test native messaging host:
   ```bash
   ./scripts/start-backend.sh
   ```
2. Verify no startup errors
3. Test with extension if possible

### If Extension Changes:
1. Package extension:
   ```bash
   ./scripts/package-extension.sh
   ```
2. Load in Firefox (about:debugging)
3. Test actual translation functionality
4. Check browser console for errors

## 4. Documentation

### Update if Needed:
- **README.md**: If user-facing features changed
- **Docstrings**: For new/modified functions (when non-obvious)
- **Type hints**: Must be present for all new code
- **Tests**: Add or update tests for new/modified functionality

### Avoid:
- Adding unnecessary comments (prefer clear code)
- Writing scripts to test one-off ideas (clean up after)
- Adding emojis to documents or code

## 5. Code Review Self-Check

Before considering task complete, ask yourself:
- ✅ Is this the best approach? Are there simpler alternatives?
- ✅ Are variable names meaningful and consistent with existing code?
- ✅ Does the code follow functional programming patterns where appropriate?
- ✅ Is the code maintainable and secure?
- ✅ Are tests comprehensive and actually checking the real implementation?
- ✅ Would a seasoned professional approve this implementation?

## 6. Git Best Practices

### Before Committing:
- Run full quality check:
  ```bash
  cd backend
  ruff check app && ruff format app && mypy app && pytest
  ```
- Ensure all checks pass
- Stage only relevant changes
- Write clear, atomic commits

### Commit Message Format:
```
type: brief description

Longer explanation if needed
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Example:
```
feat: add cache eviction for size limits

Implements LRU eviction when cache exceeds max_size_mb.
Includes tests for eviction logic.
```

## 7. Critical Checks for Specific Changes

### If Modified Dependencies:
- ✅ Pin exact versions in `requirements.txt`
- ✅ Test with fresh virtual environment
- ✅ Update README if new dependencies added

### If Modified API/Interfaces:
- ✅ Update all callers
- ✅ Update tests
- ✅ Consider backward compatibility

### If Modified Database Schema:
- ✅ Update `SCHEMA_VERSION` in `cache.py`
- ✅ Handle migration from old schema
- ✅ Test with existing databases

### If Modified Configuration:
- ✅ Update `config.yaml` example
- ✅ Update README configuration section
- ✅ Handle missing/invalid config gracefully

## One-Line Quality Check

For quick verification, run:
```bash
cd backend && ruff check app && ruff format app && mypy app && pytest
```

All must pass before considering task complete.
