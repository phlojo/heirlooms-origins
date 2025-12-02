# Heirlooms Documentation

## Quick Links

| Need To... | Go To |
|------------|-------|
| Understand the codebase | [CLAUDE.md](../CLAUDE.md) |
| Understand media system | [architecture/media-system.md](architecture/media-system.md) |
| Fix an internal bug | [operations/bug-tracker.md](operations/bug-tracker.md) |
| Track a user-reported bug | [operations/user-bugs.md](operations/user-bugs.md) |
| Run tests | [TESTING.md](../TESTING.md) |
| Deploy | [DEPLOYMENT-CHECKLIST.md](../DEPLOYMENT-CHECKLIST.md) |

## Documentation Structure

```
docs/
├── architecture/           # System design and architecture decisions
│   └── media-system.md     # Gallery, Blocks, Media Picker independence
├── guides/                 # How-to guides for specific features
│   ├── artifact-gallery-editor.md  # Gallery drag-and-drop implementation
│   ├── artifact-grid-layout.md     # Masonry grid system
│   ├── artifact-types.md           # Type badges and categories
│   ├── collection-picker.md        # Collection picker with thumbnail grid
│   ├── community-showcase.md       # CommunityShowcase component for public artifacts
│   ├── homepage.md                 # Dual homepage (marketing + dashboard)
│   └── navigation.md               # Routing and navigation
├── operations/             # Runbooks for production operations
│   ├── bug-tracker.md      # Internal bugs and fixes
│   ├── user-bugs.md        # User-reported bugs (UB-YYMMDD-NN format)
│   ├── cron-jobs.md        # Scheduled tasks
│   └── migration-execution-guide.md  # Database migrations
├── planning/               # Feature design docs (in progress)
│   └── *.md                # Proposals and implementation status
└── archive/                # Historical documents
    ├── 2025-12-01-phase-3-cloudinary-migration.md  # Phase 3 migration execution
    └── 2025-*.md           # Completed work, for reference only
```

## Root-Level Documents

| File | Purpose | When to Use |
|------|---------|-------------|
| `CLAUDE.md` | AI assistant context | Starting point for any codebase work |
| `TESTING.md` | Test infrastructure guide | Writing or running tests |
| `ARCHITECTURE.md` | High-level architecture | Understanding overall design |
| `MEDIA-ARCHITECTURE.md` | Storage system details | Working with uploads/media |
| `DEPLOYMENT-CHECKLIST.md` | Deploy process | Before deployments |
| `ROLLBACK-GUIDE.md` | Emergency rollback | Production issues |

## Key Concepts

### Media System (Gallery vs Blocks)

The media system separates **where media is stored** from **how it's displayed**:

- **user_media** - Central library of all uploaded files
- **artifact_media** - Links media to artifacts with roles
- **Gallery** - Carousel showcase (role="gallery")
- **Media Blocks** - Inline content (role="inline_block")

See [architecture/media-system.md](architecture/media-system.md) for full details.

### Phase Naming Convention

Documents in `archive/` use date prefixes (`2025-01-*`) to indicate when work was completed. These are kept for historical reference but should not be modified.

## Contributing to Docs

1. **New features** → Create guide in `guides/`
2. **Architecture decisions** → Add to `architecture/`
3. **Internal bug fixes** → Document in `operations/bug-tracker.md`
4. **User-reported bugs** → Track in `operations/user-bugs.md` (format: UB-YYMMDD-NN)
5. **Completed work** → Move to `archive/` with date prefix
