# ENTI 633 Generative AI and Prompting

***

# Tutor Match Scheduler

Our mission is to accelerate student success by using intelligent automation to match learners with qualified peer tutors—quickly, fairly, and at scale—so that every student can access timely, impactful academic support and realize their full learning potential.

## Table of Contents
- About
- Features
- Problem Statement
- Tech Stack
- Getting Started
- Usage
- Testing
- Repository Structure
- Contributors
- License

***

## About

This project was developed by MBA students at the Haskayne School of Business, University of Calgary, as part of ENTI 633 L01 (Fall 2025). TutorMatchScheduler is a purpose-built web app that transforms the Peer Learning Program’s group matching process. It leverages generative AI to rapidly, fairly, and accurately match hundreds of students (“Learners”) with volunteer Learning Peers (tutors) each semester. By automating a process that currently takes weeks, it maximizes learning impact for students, increases operational efficiency, and preserves the program’s unique human-centered mentorship model.

## Problem Statement

Existing matching processes take 2–3 weeks due to high demand, complex eligibility/instructor rules, and limited staff resources. Each week of delay means missed learning opportunities—and evidence shows students gain most from 8+ uninterrupted sessions.
No off-the-shelf system has met these needs, so a tailored solution is essential.
TutorMatchScheduler is designed to address these specific constraints, maximizing session availability and matching speed while maintaining academic integrity.

## Features

- **[Feature 1]:** Automated constraint-based group matching
- **[Feature 2]:** Course, instructor, and availability filtering
- **[Feature 3]:** Peer and learner profile management (Google Sheets friendly)
- **[Feature 4]:** Staff dashboard for review and overrides
- **[Feature 5]:** Transparent reporting and constraint failure alerts

## Tech Stack

This application uses industry-standard, AI-friendly technologies for rapid prototyping and reliable deployment:

**Frontend:** React with TypeScript, Vite

**UI Components:** shadcn/ui (Radix UI primitives), Tailwind CSS

**Routing:** Wouter

**State Management:** TanStack Query (React Query)

**Backend:** Node.js with Express.js (TypeScript)

**Database:** PostgreSQL (Neon) with Drizzle ORM

**Data Integration:** Google Sheets API via Replit Connectors

**Icons:** Lucide React

**Development & Deployment:** Replit

**Version Control:** Git

***

## Getting Started

**Prerequisites:**  
Node.js (v18 or higher recommended)

Git

A Replit account (for AI/automation and cloud running)

Access to Google Sheets with test data

**Setup Steps:**
```bash
# Clone this repository
git clone https://github.com/your-org/your-app.git
cd your-app

# Install dependencies
npm install

# Start development server
npm start

# The app will run at http://localhost:3000/
```

_For Replit cloud development:_  
- Fork the repo in Replit
- Click the “Run” button

***

## Usage

- Open the app in your browser at `http://localhost:3000/` (or cloud link if deployed).

Workflow for new users:
- Log in as staff, peer, or learner (depending on your role).
- For staff/admin:
Upload current Google Sheets containing Learning Peer and Learner availability, group limits, and instructor/course details.
Trigger the Automated Matching Engine from the dashboard.
Review and approve or adjust proposed groups and schedules.
- For students (learners): Submit a course support request form. Receive notification of your assigned group and meeting time.
- For peers: View your assigned group(s) and confirmed schedule.
  
- Troubleshooting:
If the dashboard doesn’t load, check your console for errors or verify your Google Sheet formatting matches the provided template (see /docs/setup.md).

- Screenshots:  
  _Add UI screenshots here as the app develops._

***

## Testing

**Manual Testing:**  
- After installation, run through the full workflow: import test data, run the matcher, and verify group assignments in the admin dashboard.

***

## Repository Structure

```plaintext
/Sources        # Source code (components, pages, logic)
/Public         # Static assets (images, icons)
/Documentation  # Documentation (extended guides, meeting notes)
/Data           # Data sets or API config (if used)
/tests          # Automated tests (if used)
README.md       # This file
```

***

## Contributors

- **Jaydon** – Lead Developer  
- **Natasha** – Data Analyst  
- **Carina** – Product Owner  
- **Alexis** – Repository Manager  
- **Jordyn** – Communications & Media Lead  

Haskayne School of Business, University of Calgary

***

## License

Open-source under the [MIT License](LICENSE).

***
