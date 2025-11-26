# Semester Volunteer Matching System

## Overview

The Semester Volunteer Matching System is an administrative tool for Mount Royal University that automates the process of matching students (learners) seeking academic help with volunteer tutors (learning peers). The system ingests participant data from Google Sheets, runs a constraint-based matching algorithm, and provides an administrative interface for reviewing and managing proposed groups.

**Core Purpose**: Efficiently match 1-4 learners per group with qualified learning peers based on course requirements, instructor preferences, and schedule availability, while minimizing manual administrative overhead.

**Key Workflows**:
1. Data ingestion from Google Sheets (learner requests, peer availability, schedules)
2. Algorithmic matching with hard constraints (group size, volunteer load, schedule conflicts, instructor requirements)
3. Administrative review and approval of proposed groups
4. Tracking of unmatched participants with constraint failure explanations

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling

**Design Philosophy**: Linear-inspired productivity interface with Material Design data patterns, optimized for administrative workflows with minimal cognitive load

**State Management**: 
- TanStack Query (React Query) for server state management with automatic refetching and caching
- Local component state for UI interactions
- No global state library (Redux/Zustand) - server state is the source of truth

**Routing**: Wouter for lightweight client-side routing with five main routes:
- `/` - Dashboard with overview statistics
- `/run-matching` - Trigger matching runs and monitor progress
- `/review-groups` - Review and approve/reject proposed groups
- `/unmatched` - View unmatched participants with failure reasons
- `/settings` - System configuration

**Key UI Patterns**:
- Sidebar navigation with fixed 16rem width
- Card-based layouts for grouping related information
- Stat cards for key metrics (total learners, peers, match rate)
- Table-based views for detailed data (unmatched participants)
- Modal dialogs for email previews and confirmations
- Real-time progress indicators for matching runs

### Backend Architecture

**Runtime**: Node.js with Express.js server

**Language**: TypeScript with ESM module format

**API Design**: RESTful HTTP endpoints with JSON payloads
- `POST /api/matching-runs` - Start new matching run
- `GET /api/matching-runs` - Retrieve matching run history
- `GET /api/groups` - Retrieve proposed groups for review
- `POST /api/groups/:id/approve` - Approve a group
- `POST /api/groups/:id/reject` - Reject and re-queue a group
- `GET /api/unmatched` - Retrieve unmatched participants

**Data Storage Strategy**: PostgreSQL database with `DbStorage` class implementing `IStorage` interface
- **Database**: Replit-provided Neon-backed PostgreSQL database
- **Schema**: Three main tables (matching_runs, proposed_groups, unmatched_participants) managed via Drizzle ORM
- **Data Persistence**: All matching runs, proposed groups, and manual adjustments survive server restarts
- **JSONB Columns**: Learner data, time slots, and peer info stored as JSONB for flexibility
- **Performance**: Indexed on run_id, status, and course_code for optimized queries
- **Concurrency Safety**: Explicit runId parameters prevent race conditions between simultaneous matching runs
- **Legacy Support**: MemStorage class retained for testing, but production uses DbStorage
- **Primary Data Source**: Google Sheets remains read-only source; database holds derived/computed state

**Matching Algorithm Design**:

*Hard Constraints* (must be satisfied):
- Group size: 1-4 learners per group, same course code
- Volunteer load: Maximum 2 groups per learning peer
- Schedule conflicts: No overlaps with class times (5-minute buffer for travel)
- Instructor matching: When `instructorMatchRequired === true`, learner must be grouped with peers having the same normalized instructor

*Optimization Priorities* (in order):
1. Minimize unmatched participants
2. Maximize group sizes (prefer 3-4 learners over 1-2)
3. Prefer time slots within preferred proximity windows
4. Balance peer workloads across groups

*Algorithm Approach*:
- **Two-phase prioritization**: Process instructor-required groups first to reserve peers for learners with specific instructor needs
- **Mixed cohort groups**: Instructor-flexible learners can join instructor-specific groups to maximize group sizes (e.g., 1 instructor-required learner + 3 flexible learners = group of 4)
- **Combinatorial search**: For each potential group, try all combinations of 1-4 learners to find the best fit (limited to 20 combinations for performance)
- **Backtracking**: When peers are reserved for instructor-required matches, any unused capacity remains available for later general matching
- Track unmatched participants with specific failure reasons (schedule conflicts, no peers available, instructor mismatch)

**Instructor Normalization**: Case-insensitive, whitespace-trimmed matching for instructor names (e.g., "Sarah Haughey", "Sarah haughey", "sarah haughey" all treated as same instructor)

**Recent Improvements** (Nov 2025):
- **Specific Constraint Failure Reasons** (Nov 26): Unmatched participants now show exactly why they weren't matched:
  - "No eligible peers" - No peers available for the course
  - "No eligible peers with instructor" - No peers for course + specific instructor requirement
  - "Schedule conflict" - Lists which peers were tried but had no common time slots
  - "Peer capacity exhausted" - Lists which peers are at their maximum group limit
  - "Missing schedule" - Learner's class schedule not found in Google Sheets
- **Database Persistence** (Nov 24): Migrated from MemStorage to PostgreSQL with full data persistence across server restarts
  - Manual group adjustments now survive server restarts, code refactoring, and new matching runs
  - Fixed critical concurrency bug by removing latestRunId singleton and using explicit runId parameters
  - Added database indexes on run_id, status, course_code for optimized query performance
  - Architect-approved as production-ready with all concurrency issues resolved
- **Matching Algorithm**: Fixed critical bug where instructor-flexible matching incorrectly rejected peers with different instructors (improved match rate from 4 to 21 learners)
- **Instructor Normalization**: Implemented case-insensitive matching to prevent duplicate groups from case sensitivity
- **Mixed Cohorts**: Allow flexible learners to fill instructor-specific groups (maintains 21-learner throughput while honoring all instructor requirements)
- **Time Slot Intelligence**: Gap detection with scoring (3=between classes, 2=within 1hr, 1=within 2hrs, 0=far from classes)
  - Group-level gap detection maximizes convenience when different participants arrive from/stay for classes

### External Dependencies

**Google Sheets API Integration**:
- **Purpose**: Primary data source for all participant information
- **Authentication**: OAuth2 via Replit Connectors with automatic token refresh
- **Spreadsheet Structure**: Single spreadsheet with 4 worksheets:
  - `Requests` - Learner requests (timestamp, email, name, course, instructor, section)
  - `Learning Peers` - Volunteer tutors (email, name, courses 1-3, other courses)
  - `Volunteer Class Schedule` - Peer availability (email, name, Mon-Fri time slots)
  - `Learner Class Schedule` - Learner class times (email, name, Mon-Fri time slots)
- **Data Access Module**: `server/googleSheets.ts` with dedicated loader functions:
  - `loadRequests()` - Parse learner requests, validate instructor match requirements
  - `loadLearningPeers()` - Parse peer data, extract course/instructor pairs from "Other Courses"
  - `loadVolunteerSchedules()` - Parse peer schedules as blocked time slots
  - `loadLearnerSchedules()` - Parse learner schedules as blocked time slots
- **Schedule Format**: Time slots represented as "0830-0950; 1000-1120" (semicolon-separated ranges during which participants are unavailable)
- **Data Cleaning**: Trim whitespace, strip grade markers (A+, B-, etc.) from course entries, exclude test email "chickey@test"

**Third-Party UI Libraries**:
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Unstyled, accessible component primitives (dialogs, dropdowns, accordions, etc.)
- **Tailwind CSS**: Utility-first CSS framework with custom theme (neutral base color, Linear-inspired spacing)
- **Lucide React**: Icon library for UI elements
- **date-fns**: Date manipulation and formatting

**Development Tools**:
- **Drizzle ORM**: Type-safe ORM with PostgreSQL dialect - actively used for database persistence
- **Database Migrations**: Use `npm run db:push` to sync schema changes (add `--force` if needed)
- **Vite**: Build tool and dev server with HMR
- **TypeScript**: Type safety across client, server, and shared schemas
- **Zod**: Runtime schema validation for data parsing and type inference

**Deployment Environment**: Replit with environment variables managed through Replit Secrets
- `REPLIT_CONNECTORS_HOSTNAME` - Connector API hostname
- `REPL_IDENTITY` / `WEB_REPL_RENEWAL` - Authentication tokens for Google Sheets connector
- `DATABASE_URL` - PostgreSQL connection string (actively used for Neon database)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - PostgreSQL connection details

**Font Delivery**: Google Fonts CDN for Inter (UI text) and JetBrains Mono (data/monospace)