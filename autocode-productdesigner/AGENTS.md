# AGENTS.md

This repository currently has no code. The guidelines below provide a default
set of conventions for agentic coding work in a Python CLI-style project. Update
once the real codebase is restored.

## Build / Lint / Test Commands

> These are placeholder commands. Replace with project-specific commands once
> the codebase is restored.

- **Install dependencies**
  - `python -m pip install -e .`
  - If using a virtualenv: `python -m venv .venv` and `./.venv/Scripts/activate`
- **Run the app (CLI)**
  - `python -m <package> --help`
- **Format (if black)**
  - `python -m black .`
- **Lint (if ruff)**
  - `python -m ruff check .`
- **Type check (if mypy/pyright)**
  - `python -m mypy .`
- **Run all tests (pytest)**
  - `python -m pytest`
- **Run a single test file (pytest)**
  - `python -m pytest tests/test_example.py`
- **Run a single test (pytest)**
  - `python -m pytest tests/test_example.py -k "test_name"`
- **Run a single test class (pytest)**
  - `python -m pytest tests/test_example.py -k "TestClassName"`
- **Run a single test by node id (pytest)**
  - `python -m pytest tests/test_example.py::TestClassName::test_name`

## Code Style Guidelines

### General Principles
- Prefer small, focused functions with clear inputs/outputs.
- Avoid unnecessary abstraction. Keep changes minimal and localized.
- Use existing project patterns and naming conventions when discovered.
- Keep side effects explicit and easy to follow.
- Prefer clear, descriptive names over cleverness.

### Imports
- Use standard library imports first, then third-party, then local imports.
- Keep imports grouped and separated by a single blank line.
- Prefer explicit imports over wildcard imports.
- Avoid circular imports; refactor if needed.

### Formatting
- Use 4 spaces for indentation.
- Keep line length at or below 88-100 characters.
- Prefer trailing commas in multiline literals for cleaner diffs.
- Use black-compatible formatting if black is adopted.

### Types and Annotations
- Add type hints for public APIs and non-trivial functions.
- Use `Optional[T]` only when `None` is a valid value.
- Prefer concrete types (e.g., `list[str]`) over `Any`.
- Add `TypedDict` or `dataclass` for structured data.

### Naming Conventions
- Modules: `snake_case.py`
- Functions and variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private/internal helpers: prefix with `_`

### Error Handling
- Prefer explicit error handling over silent failures.
- Raise specific exceptions with clear messages.
- Avoid bare `except:`; catch specific exception types.
- Include context in error messages (ids, filenames, state).

### Logging
- Use structured logging when available.
- Avoid `print` in library code; reserve for CLI entry points.
- Keep logs concise and actionable.

### CLI Conventions
- Use clear, consistent option names.
- Provide helpful `--help` strings for all commands and options.
- Avoid breaking changes to CLI flags without documentation.
- Validate inputs early and provide friendly errors.

### Testing
- Keep tests deterministic and independent.
- Prefer unit tests for logic; use integration tests for I/O boundaries.
- Name tests clearly: `test_<behavior>_<condition>`.
- Avoid network calls in tests unless explicitly mocked.

### Filesystem and I/O
- Avoid global state where possible.
- Keep file paths explicit and configurable.
- Use `Pathlib` for path handling.

### Documentation
- Keep docstrings short and focused.
- Document public functions and classes.
- Update README or help text when behavior changes.

## Cursor / Copilot Rules

- No Cursor rules found (`.cursor/rules/` or `.cursorrules` not present).
- No GitHub Copilot instructions found (`.github/copilot-instructions.md`).

## Notes

- Replace placeholder commands and guidelines once the real codebase is
  restored.
- If you add more rules, keep them concise and practical for agents.
