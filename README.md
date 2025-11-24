# Heirlooms

**Preserve, organize, and share your family's meaningful artifacts and memories.**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/phlojos-projects/v0-heirloom-v0)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/Lu9T5qbha92)

---

## Overview

Heirlooms is a web application designed to help users preserve, document, and share family artifacts, memorabilia, and heirlooms. Built with modern web technologies and AI-powered analysis, Heirlooms transforms how families preserve their stories for future generations.

### Key Features

- **📸 Rich Media Support** - Upload and organize images, videos, and audio recordings
- **🤖 AI-Powered Analysis** - Automatic image captioning, video summarization, and audio transcription
- **📚 Collections** - Group related artifacts into organized collections
- **🔒 Privacy Controls** - Public or private collections with granular sharing
- **📱 Mobile-First Design** - Responsive interface with gesture-based navigation
- **🎨 Artifact Types** - Categorize by cars, watches, general collectibles, or custom types
- **🔍 Search & Discovery** - Find artifacts and collections easily
- **🎯 Clean UX** - Modern, accessible interface built with Radix UI primitives

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16.0 (App Router)
- **UI Library:** React 19.2
- **Language:** TypeScript 5.1
- **Styling:** Tailwind CSS 4.1
- **Components:** Radix UI, Shadcn/ui
- **Icons:** Lucide React
- **Animations:** Framer Motion

### Backend & Services
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth (Email/Password, Google OAuth)
- **Media Storage:** Cloudinary
- **AI Services:** OpenAI (GPT-4o, Whisper)
- **Hosting:** Vercel
- **Analytics:** Vercel Analytics

### Testing
- **Unit/Component:** Vitest + React Testing Library
- **E2E:** Playwright
- **Coverage:** 66% (target: 80%+)
- **Status:** Phases 1-3 complete (169 tests)

---

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm (package manager)
- Supabase account
- Cloudinary account
- OpenAI API key

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/phlojo/heirlooms-v0.git
cd heirlooms-v0

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run database migrations (Supabase)
# See docs/operations/database-setup.md

# Start development server
pnpm dev
\`\`\`

Visit `http://localhost:3000` to see the app.

### Environment Variables

Required environment variables:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OpenAI
OPENAI_API_KEY=your-openai-key

# Optional: Cron job security
CRON_SECRET=your-random-secret
\`\`\`

---

## Project Structure

\`\`\`
heirlooms-v0/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (analysis, auth, cron)
│   ├── artifacts/         # Artifact pages
│   ├── collections/       # Collection pages
│   └── ...
├── components/            # React components
│   ├── artifact/          # Artifact-specific
│   ├── ui/                # Shadcn/Radix UI
│   └── navigation/        # Nav components
├── lib/                   # Core libraries
│   ├── actions/           # Server actions
│   ├── supabase/          # Supabase client
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
├── __tests__/             # Test suites
│   ├── unit/              # Unit tests
│   ├── components/        # Component tests
│   ├── integration/       # Integration tests (Phase 4)
│   └── e2e/               # E2E tests (Phase 5)
├── docs/                  # Documentation
│   ├── guides/            # User & dev guides
│   ├── architecture/      # Technical decisions
│   ├── operations/        # Runbooks
│   └── archive/           # Historical snapshots
├── public/                # Static assets
└── scripts/               # Utility scripts
\`\`\`

---

## Documentation

### Core Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architectural decisions and patterns
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and notable changes
- **[TESTING.md](./TESTING.md)** - Comprehensive testing guide

### Guides
- **[Navigation System](./docs/guides/navigation.md)** - Responsive navigation patterns
- **[Artifact Types Management](./docs/guides/artifact-types.md)** - Dynamic type system
- **[Google OAuth Setup](./docs/guides/google-oauth-setup.md)** - OAuth configuration
- **[Media Audit System](./docs/guides/media-audit.md)** - Media cleanup operations

### Operations
- **[Bug Tracker](./docs/operations/bug-tracker.md)** - Known issues and fixes
- **[Cron Jobs](./docs/operations/cron-jobs.md)** - Scheduled tasks

### Future Features
- **[Artifact Gallery](./docs/planning/artifact-gallery-feature.md)** - Planned gallery feature

---

## Scripts

\`\`\`bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
pnpm typecheck        # TypeScript checking

# Testing
pnpm test             # Run unit/component tests
pnpm test:watch       # Watch mode
pnpm test:ui          # Interactive test dashboard
pnpm test:coverage    # Generate coverage report
pnpm test:e2e         # Run E2E tests
pnpm test:all         # Run all checks (lint, type, test)
\`\`\`

---

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `pnpm test:all`
4. Commit with descriptive message
5. Push and create a pull request

### Code Style

- **TypeScript:** Strict mode enabled
- **Formatting:** Prettier with 2-space indentation
- **Linting:** ESLint with Next.js config
- **Commits:** Conventional commits preferred

### Testing Requirements

- New features must include tests
- Maintain or improve coverage (target: 80%+)
- E2E tests for critical user flows

---

## Deployment

### Automatic Deployment

This repository is connected to Vercel and deploys automatically:
- **Production:** Deploys from `main` branch
- **Preview:** Deploys from pull requests

### Manual Deployment

\`\`\`bash
# Build and test locally
pnpm build
pnpm test:all

# Deploy to Vercel
vercel --prod
\`\`\`

### Environment Setup

Ensure all environment variables are configured in Vercel project settings.

---

## Roadmap

### Current Phase: Testing Infrastructure
- ✅ Phases 1-3 complete (unit, component tests)
- 🚧 Phase 4: Integration tests (100-120 tests)
- 📅 Phase 5: E2E tests (50-80 tests)
- 📅 Phase 6: CI/CD automation

### Future Features
- Artifact gallery with horizontal carousel
- Video frame extraction and analysis
- Batch AI processing
- Export/import functionality
- Mobile app (React Native)
- Real-time collaboration
- Custom domain support

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architectural plans.

---

## License

[Your License Here]

---

## Support

- **Issues:** [GitHub Issues](https://github.com/phlojo/heirlooms-v0/issues)
- **Documentation:** See `docs/` directory
- **Contact:** [Your Contact Info]

---

## Acknowledgments

- Built with [v0.app](https://v0.app) by Anthropic
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons by [Lucide](https://lucide.dev)
- Hosted on [Vercel](https://vercel.com)

---

**Last Updated:** 2025-01-23
