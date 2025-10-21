# Development Guide

## Prerequisites

- Python 3.12+
- Conda (miniconda recommended)
- LLM Server (LMStudio or llama.cpp)

## Setup

### 1. Clone and Enter Directory

```bash
cd context-translator
```

### 2. Create/Activate Conda Environment

```bash
conda create -n ai312 python=3.12
conda activate ai312
```

### 3. Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Configure LLM Server

Edit `config.yaml` to match your setup. Default configuration assumes LMStudio running on `localhost:1234`.

## Running the Backend

### Development Mode (with auto-reload)

```bash
cd backend
uvicorn app.main:app --reload --host localhost --port 8080
```

### Production Mode

```bash
cd backend
python -m app.main
```

## Testing

### Run All Tests

```bash
cd backend
pytest tests/ -v
```

### Run with Coverage

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

### Run Specific Test File

```bash
cd backend
pytest tests/test_config.py -v
```

### Run Specific Test

```bash
cd backend
pytest tests/test_config.py::test_load_default_config_when_file_missing -v
```

## Code Quality

### Linting

```bash
cd backend
ruff check .
```

### Type Checking

```bash
cd backend
mypy app/
```

### Auto-fix Linting Issues

```bash
cd backend
ruff check --fix .
```

### Format Code

```bash
cd backend
ruff format .
```

## Project Structure

```
backend/
├── app/                    # Application code
│   ├── main.py            # FastAPI app and endpoints
│   ├── config.py          # Configuration management
│   ├── models.py          # Pydantic models
│   ├── cache.py           # SQLite caching layer
│   ├── llm_client.py      # LLM abstraction
│   └── prompts.py         # Prompt templates
├── tests/                 # Test suite
│   ├── conftest.py        # Pytest configuration
│   ├── test_*.py          # Test modules
│   └── __init__.py
├── requirements.txt       # Python dependencies
└── pyproject.toml        # Tool configuration
```

## Development Workflow

1. **Write a failing test** for the feature/fix
2. **Implement the feature** to make the test pass
3. **Run linters and type checker**
4. **Run all tests** to ensure nothing broke
5. **Commit** with a descriptive message

## Testing Strategy

### Unit Tests
- Test individual functions and classes in isolation
- Mock external dependencies (LLM, network, file system)
- Fast execution (<1s for all unit tests)

### Integration Tests
- Test component interactions
- Use real database (in-memory SQLite)
- Mock only external services (LLM server)

### Coverage Goals
- Overall: >85%
- Critical modules (cache, llm_client, main): >90%

## Common Tasks

### Add a New Endpoint

1. Add Pydantic models to `models.py`
2. Write tests in `tests/test_integration.py`
3. Implement endpoint in `main.py`
4. Run tests and verify coverage
5. Update API documentation in README

### Add a New LLM Provider

1. Create new client class in `llm_client.py` inheriting from `LLMClient`
2. Write tests in `tests/test_llm_client.py`
3. Update config parsing in `config.py`
4. Add factory function to select provider
5. Update configuration examples

### Modify Prompt Templates

1. Update templates in `prompts.py`
2. Add/update tests in `tests/test_prompts.py`
3. Test with real LLM server (manual testing)
4. Document changes and rationale

## Debugging

### Enable Debug Logging

Modify logging level in `main.py`:

```python
logging.basicConfig(
    level=logging.DEBUG,  # Changed from INFO
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
```

### Inspect Cache Database

```bash
sqlite3 cache/translations.db
.schema
SELECT * FROM translations LIMIT 10;
.quit
```

### Test LLM Connection

```bash
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma-2-27b-it",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Performance Profiling

### Profile an Endpoint

```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Run endpoint

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
```

### Monitor Cache Performance

Enable DEBUG logging and grep for cache operations:

```bash
uvicorn app.main:app --log-level debug 2>&1 | grep -i cache
```

## Troubleshooting

### Tests Failing

1. Check Python version: `python --version` (should be 3.12+)
2. Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
3. Clear pytest cache: `rm -rf .pytest_cache`
4. Check for leftover test databases in `/tmp`

### Type Checking Errors

1. Update type stubs: `pip install -U types-*`
2. Check for missing `py.typed` marker in dependencies
3. Add `# type: ignore` for known false positives (sparingly)

### Linting Errors

1. Auto-fix where possible: `ruff check --fix .`
2. Review remaining errors manually
3. Add `# noqa: <code>` for false positives (sparingly)

## Best Practices

### Code Style

- Follow PEP 8
- Use type hints everywhere
- Prefer explicit over implicit
- Keep functions small and focused
- Use descriptive variable names

### Error Handling

- Use specific exception types
- Log errors with context
- Provide user-friendly error messages
- Never expose internal details to users

### Testing

- One assertion per test (when possible)
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies
- Avoid testing implementation details

### Documentation

- Document all public APIs
- Keep README up to date
- Add docstrings for complex functions
- Comment "why", not "what"

## Next Steps

See [implementation.md](implementation.md:1) for the complete development roadmap and upcoming features.
