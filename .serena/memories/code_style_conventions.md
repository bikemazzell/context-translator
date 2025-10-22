# Code Style and Conventions

## General Principles (from CLAUDE.md)
- Follow best practices for each programming language/framework
- Always evaluate alternatives against current/suggested approach
- Use meaningful variable names consistent with existing code
- Avoid comments unless code is extremely obscure (prefer refactoring)
- Prefer functional programming patterns where appropriate
- Write comprehensive tests - no cheating on tests
- Focus on quality, simplicity, maintainability, and security
- No emojis in code or documents (unprofessional)

## Python Style

### Formatting (Ruff Configuration)
- **Line length**: 100 characters max
- **Target version**: Python 3.12
- **Indentation**: Standard Python (4 spaces)
- **String quotes**: Consistent with existing code

### Type Hints (mypy strict mode)
- **All functions must have type hints** (parameters and return types)
- **No implicit Optional** - be explicit with `Optional[T]` or `T | None`
- **Generic types must be parameterized** - use `list[str]`, not `list`
- **Strict mode enabled** - no untyped definitions allowed
- **Exception**: Test files have relaxed type requirements

### Naming Conventions
- **Functions/methods**: `snake_case` (e.g., `get_config`, `setup_logging`)
- **Classes**: `PascalCase` (e.g., `TranslationCache`, `LLMClient`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `SCHEMA_VERSION`, `DEFAULT_TIMEOUT`)
- **Private methods**: Leading underscore `_method_name` (use sparingly)
- **Module-level variables**: `snake_case`

### Code Organization
- **Dependency injection**: Use FastAPI's dependency injection (see `main.py`)
- **Async/await**: Use async patterns consistently throughout
- **Error handling**: Structured logging with context (endpoint, model, etc.)
- **Module structure**: One class per concern, clear separation

## Ruff Lint Rules (Enabled)
The project uses extensive ruff rule sets:
- **E, F, W**: Core pycodestyle and Pyflakes rules
- **I**: Import sorting and organization
- **N**: PEP 8 naming conventions
- **UP**: pyupgrade - modern Python syntax
- **ANN**: Comprehensive type annotations required
- **B**: flake8-bugbear - avoid common bugs
- **A**: flake8-builtins - no shadowing builtins
- **C4**: flake8-comprehensions - better comprehensions
- **DTZ**: flake8-datetimez - timezone-aware datetimes
- **EM**: flake8-errmsg - proper error messages
- **PT**: flake8-pytest-style - pytest best practices
- **SIM**: flake8-simplify - code simplification
- **ARG**: flake8-unused-arguments - no unused args
- **PTH**: flake8-use-pathlib - prefer pathlib over os.path
- **PL**: Pylint rules - comprehensive quality checks
- **RUF**: Ruff-specific rules

### Ruff Ignored Rules
- **ANN101**: No self annotation required
- **ANN102**: No cls annotation required
- **ANN401**: Any type allowed in specific cases

### Per-File Exceptions
- **tests/***: Relaxed rules (ANN201, ANN001, PLR2004, S101, ARG001, PLC0415, SIM117)
- **app/main.py**: Allows globals for FastAPI, os.path in __main__ (PLW0603, ARG001, PTH110)
- **app/llm_client.py**: Complex branching allowed for robust text cleaning (PLR0912)

## Testing Conventions
- **Location**: `backend/tests/` directory
- **Naming**: `test_*.py` files with `test_*` functions
- **Async tests**: Use pytest-asyncio with `asyncio_mode = "auto"`
- **Fixtures**: Define in `conftest.py` for shared test setup
- **Coverage**: Target 80%+ code coverage
- **Integration tests**: Mark with `@pytest.mark.integration`
- **Test structure**: Arrange-Act-Assert pattern
- **No cheating**: Tests must verify real implementation

## Documentation
- **Docstrings**: Use when function purpose isn't immediately clear
- **Type hints**: Serve as primary documentation for signatures
- **README**: Keep comprehensive with examples
- **Comments**: Only for truly obscure code (prefer refactoring)

## Commits
- **Atomic commits**: One logical change per commit
- **Conventional commits**: Use standard prefixes (feat:, fix:, docs:, refactor:)
- **Well-described**: Clear description of what and why

## JavaScript (Extension Code)
- Vanilla JavaScript, no frameworks
- Clear separation: background/, content/, popup/
- Event-driven architecture
- Dark mode support via CSS variables
- Native messaging protocol compliance
