Document all relevant changes made in this session following our documentation structure and naming conventions.

## Steps

1. **Analyze Changes**: Review all files modified in this session and categorize them:
   - New features or significant enhancements → `docs/guides/`
   - Architecture decisions or system design → `docs/architecture/`
   - Bug fixes → `docs/operations/bug-tracker.md`
   - Completed session work → `docs/archive/YYYY-MM-DD-descriptive-name.md`

2. **Update Existing Docs**: Check if changes affect existing documentation:
   - `docs/guides/homepage.md` - Homepage system
   - `docs/guides/*.md` - Feature-specific guides
   - `CLAUDE.md` - If patterns, conventions, or key files changed
   - `docs/README.md` - If new docs were created

3. **Create Archive Entry**: Create a dated summary in `docs/archive/` with:
   - Summary of all changes
   - Files modified (grouped by category)
   - Interface/prop changes
   - Bug fixes with root cause and solution
   - Any breaking changes or migration notes

4. **Audit Documentation Structure**: Verify our docs remain organized:
   - Check `docs/README.md` accurately reflects current structure
   - Ensure no orphaned or outdated docs
   - Verify cross-references are valid
   - Confirm naming conventions are followed (YYYY-MM-DD prefix for archive)

5. **Update CLAUDE.md**: If any of these changed:
   - New patterns or conventions established
   - New important files added
   - Key utilities or functions added
   - Database schema changes
   - Environment variables added

6. **Report**: Provide summary of:
   - Documents created/updated
   - Any documentation gaps identified
   - Recommendations for future documentation

## Naming Conventions

- Archive: `YYYY-MM-DD-feature-name.md` (e.g., `2025-12-02-homepage-ux-improvements.md`)
- Guides: `feature-name.md` (lowercase, hyphenated)
- Bug tracker entries: Use existing format in `bug-tracker.md`
- User bugs: `UB-YYMMDD-NN` format in `user-bugs.md`

## Documentation Locations

| Change Type | Location |
|-------------|----------|
| Feature guide | `docs/guides/` |
| Architecture decision | `docs/architecture/` |
| Internal bug fix | `docs/operations/bug-tracker.md` |
| User-reported bug | `docs/operations/user-bugs.md` |
| Session summary | `docs/archive/` |
| Codebase patterns | `CLAUDE.md` |
