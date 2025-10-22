# Suggested Commands for Development

## Testing Commands

### Run all tests with coverage
```bash
cd backend
pytest
```

### Run tests without integration tests
```bash
cd backend
pytest -m "not integration"
```

### Run specific test file
```bash
cd backend
pytest tests/test_cache.py
```

### Run with verbose output
```bash
cd backend
pytest -v
```

### Generate coverage report
```bash
cd backend
pytest --cov=app --cov-report=html
```

## Linting and Type Checking

### Run ruff linter (check only)
```bash
cd backend
ruff check app
```

### Run ruff linter with auto-fix
```bash
cd backend
ruff check --fix app
```

### Run ruff formatter
```bash
cd backend
ruff format app
```

### Run mypy type checker
```bash
cd backend
mypy app
```

### Run all quality checks
```bash
cd backend
ruff check app && ruff format --check app && mypy app && pytest
```

## Running the Application

### Start backend via native messaging host
```bash
./scripts/start-backend.sh
```

### Package extension for installation
```bash
./scripts/package-extension.sh
```

### Manual backend testing (FastAPI server)
Note: The application is designed for native messaging, but you can run FastAPI directly for testing:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

## Project Management

### Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Activate conda environment
```bash
conda activate ai312
```

### Check git status
```bash
git status
```

### View recent commits
```bash
git log --oneline -10
```

## File Operations (Linux)

### List files in directory
```bash
ls -la
```

### Find files by pattern
```bash
find . -name "*.py" -type f
```

### Search code for pattern
```bash
grep -r "pattern" backend/app/
```

### Navigate directories
```bash
cd backend/app
pwd
```

## Extension Development

### Load temporary extension in Firefox
1. Open `about:debugging`
2. Click "Load Temporary Add-on"
3. Select `extension/manifest.json`

### Install packaged extension
1. Set `xpinstall.signatures.required = false` in `about:config`
2. Open `about:addons` → gear icon → "Install Add-on From File"
3. Select `dist/context-translator.xpi`

### Check extension logs
1. Open Firefox Developer Tools (F12)
2. Navigate to Console tab
3. Filter for extension messages

## LLM Server Testing

### Check if LLM server is running
```bash
curl http://localhost:1234/v1/models
```

### Test LMStudio endpoint
```bash
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## Database Management

### View cache database
```bash
sqlite3 cache/translations.db
```

### Clear cache manually
```bash
rm cache/translations.db
```

## Common Workflows

### Before committing changes
```bash
cd backend
ruff check app && ruff format app && mypy app && pytest
```

### Full project test
```bash
cd backend && pytest && cd .. && ./scripts/package-extension.sh
```

### Clean build artifacts
```bash
rm -rf backend/__pycache__ backend/.pytest_cache backend/.mypy_cache backend/.ruff_cache
rm -rf dist/
```
