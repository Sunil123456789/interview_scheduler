# AI Agent Project Spec: Enterprise Interview Scheduling Platform

## 1. Purpose
Build a production-ready full-stack Interview Scheduling Platform that automates interviewer selection, calendar availability checks, meeting creation, multi-round workflows, and hiring analytics.

This document is designed to be used as direct input for an AI coding agent to generate a full working project.

## 2. Product Goals
- Minimize time-to-schedule interviews.
- Improve panel quality and fairness.
- Support HR/Admin operations with full UI controls.
- Integrate with Google Calendar and video meeting links.
- Provide auditable hiring workflow and analytics.

## 3. User Roles
- Super Admin: global settings, org-wide policies.
- HR Admin: manage candidates, interviewers, rounds, schedules.
- Interviewer (AOM): connect calendar, attend interviews, submit scorecards.
- Hiring Manager: view pipeline, approve/override decisions.
- Candidate: optional portal for slot selection/reschedule.

## 4. Core Features (Must Have)
1. Authentication and RBAC
- JWT auth (login/refresh/me).
- Role-based permissions and endpoint guards.

2. Master Data Management
- Areas/Departments.
- Interviewers (AOMs) with active/inactive state.
- Candidates with active/inactive state.

3. Google OAuth + Calendar Integration
- Connect calendar per interviewer.
- Store and refresh OAuth tokens securely.
- Fetch free/busy availability.
- Create calendar events with Meet link.

4. Scheduling Engine
- Select one same-area interviewer + one cross-area interviewer.
- Enforce active interviewer and token connection checks.
- Find earliest common free slot within policy window.
- Business-hours and timezone aware scheduling.

5. Async Scheduling Execution
- Queue scheduling jobs with Celery.
- Retry transient errors only.
- Fail fast on non-retryable 4xx provider errors.

6. Admin UI
- Dashboard (counts, success/failure rates).
- CRUD for Areas, AOMs, Candidates, Users.
- Inline edit, enable/disable, delete.
- Calendar connection status and action.

7. Interview Tracking
- Pending/scheduled/failed/completed states.
- Failure reason capture.
- Meet link and event ID persistence.

## 5. Advanced Features (Should Have)
- Multi-round interview templates by role.
- Scorecards and feedback submission deadlines.
- Auto reminders (email + in-app).
- Candidate self-service reschedule portal.
- Load balancing across interviewers.
- Audit logs for every critical action.

## 6. Stretch Features (Could Have)
- ATS integrations (Greenhouse/Lever/Workday).
- SSO (Google/Microsoft/SAML).
- AI-based interviewer matching and feedback quality checks.
- Slack/Teams webhook notifications.

## 7. Non-Functional Requirements
- Security: strict RBAC, token encryption-at-rest preferred.
- Reliability: idempotent task behavior, retry strategy by error class.
- Performance: list endpoints paginated; analytics cached where useful.
- Observability: structured logs, error tracing, task metrics.
- Compliance: audit trail, PII minimization, retention policy options.

## 8. Proposed Tech Stack
- Backend: Django + Django REST Framework
- Async: Celery + Redis
- DB: PostgreSQL (SQLite for local dev allowed)
- Frontend: React + TypeScript + Vite + Tailwind
- Auth: JWT (simplejwt)
- Calendar: Google Calendar API + OAuth2
- Tests: Django TestCase + Vitest + React Testing Library
- Deployment: Docker + Nginx + Gunicorn (or equivalent)

## 9. High-Level Architecture
- Frontend SPA calls REST APIs.
- Backend handles auth, RBAC, CRUD, analytics.
- Scheduling API enqueues Celery task.
- Task service reads candidate + interviewer pools, queries calendar free/busy, computes slot, creates event, updates interview status.
- Admin panel consumes analytics and management endpoints.

## 10. Domain Model (Logical)
- User
  - id, username, email, password_hash
  - role: superadmin/admin/user/interviewer
  - is_active, is_staff, created_at

- Area
  - id, name, is_active

- InterviewerProfile
  - user_id FK(User)
  - area_id FK(Area)
  - is_interviewer
  - google_calendar_id
  - google_access_token
  - google_refresh_token
  - token_expiry
  - timezone

- Candidate
  - id, name, email, area_id FK(Area)
  - is_active, applied_at

- Interview
  - id, candidate_id FK(Candidate)
  - same_area_interviewer_id FK(User)
  - cross_area_interviewer_id FK(User)
  - scheduled_start, scheduled_end
  - status: pending/scheduled/failed/completed/cancelled
  - failure_reason
  - google_event_id
  - meet_link
  - round_number
  - created_at, updated_at

- Scorecard
  - id, interview_id FK(Interview)
  - interviewer_id FK(User)
  - ratings JSON
  - recommendation
  - comments
  - submitted_at

- AuditLog
  - id, actor_id FK(User)
  - action
  - entity_type
  - entity_id
  - before_json
  - after_json
  - created_at

## 11. API Contract (Minimum)
### Auth
- POST /api/auth/login/
- POST /api/auth/refresh/
- GET /api/auth/me/
- GET /api/auth/google/start/?aom_id=<id>
- GET /api/auth/google/callback/

### Admin Master Data
- GET/POST /api/areas/
- PATCH/DELETE /api/areas/{id}/
- GET/POST /api/aoms/
- PATCH/DELETE /api/aoms/{id}/
- GET/POST /api/users/
- GET/POST /api/candidates/
- PATCH/DELETE /api/candidates/{id}/

### Scheduling
- POST /api/schedule-interview/ { candidate_id }
- GET /api/interviews/
- GET /api/interviews/{id}/

### Analytics
- GET /api/analytics/

### Optional Round Workflow
- GET/POST /api/interview-templates/
- POST /api/interviews/{id}/advance-round/
- POST /api/interviews/{id}/scorecards/

## 12. Scheduling Decision Logic (Required)
1. Validate candidate exists and is active.
2. Build interviewer pools:
- pool A: same area, active, interviewer=true
- pool B: different area, active, interviewer=true
3. Random or weighted pick from each pool.
4. Validate both selected interviewers have connected calendars.
5. Pull busy slots for each interviewer in configured search window.
6. Evaluate candidate slots in configured time step.
7. Keep slots inside working hours and non-weekend policy.
8. Choose earliest common free slot.
9. If found: create calendar event and Meet link.
10. Update Interview status + metadata.
11. If not found or failure: mark failed with reason.

## 13. Timezone Policy
- Application default timezone: Asia/Kolkata.
- Persist datetimes as timezone-aware.
- Convert for UI display per user timezone preference.
- Google events should be created with explicit timezone.

## 14. Error Handling Policy
- Retryable: network timeout, 5xx from provider, transient auth refresh issues.
- Non-retryable: 400/401/403 provider errors due to config, invalid grant, disabled API.
- All failures must persist clear failure_reason.

## 15. Security Requirements
- CSRF/CORS configured by environment.
- Secrets only via env vars (no hardcoded credentials).
- JWT with reasonable expiry and refresh flow.
- Restrict admin endpoints to admin/staff role.
- Optional: encrypt OAuth tokens at rest.

## 16. UI Requirements
- Responsive desktop/mobile layout.
- Role-aware navigation.
- Admin tabs for Analytics, Areas, AOMs, Users, Candidates.
- Connect Calendar action in AOM list.
- Clear status chips (Active/Disabled, OAuth Connected/Pending).
- Inline forms for edit/save/cancel.

## 17. Testing Requirements
### Backend
- Unit tests for selection logic, slot finder, calendar adapter boundaries.
- API tests for auth, permissions, CRUD, scheduling.
- Celery task tests for retry vs non-retry behavior.

### Frontend
- Component tests for Admin, Dashboard, Schedule flows.
- API integration mocking for success/failure states.

### End-to-End Acceptance
- Create AOM, connect calendar, create candidate, schedule interview, verify Meet link and status.

## 18. Milestone Plan (Agent Execution Plan)
### Phase 1: Foundation (Week 1)
- Project scaffolding, auth, roles, base entities, migrations.
- Basic admin CRUD endpoints + UI skeleton.

### Phase 2: Calendar + Scheduling (Week 2)
- OAuth connect flow, token persistence, free/busy integration.
- Slot finder + interview booking and status updates.

### Phase 3: Reliability + Analytics (Week 3)
- Celery retry policy, failure handling, analytics dashboard.
- Logs and operational observability.

### Phase 4: Workflow Expansion (Week 4)
- Multi-round templates, scorecards, notifications.
- Candidate self-service reschedule.

### Phase 5: Hardening (Week 5)
- Security pass, test coverage expansion, deployment docs.
- Performance checks and pagination.

## 19. Definition of Done
- All must-have endpoints and UI flows implemented.
- OAuth and scheduling fully functional in local environment.
- Tests passing (backend + frontend).
- No blocker severity bugs in core scheduling path.
- Setup guide and env documentation complete.

## 20. Agent Input Block (Direct Prompt)
Use the block below as direct input to an AI coding agent.

"""
Build a production-ready Interview Scheduling Platform based on this spec.

Constraints:
- Backend: Django + DRF + Celery + Redis.
- Frontend: React + TypeScript + Vite + Tailwind.
- Auth: JWT + role-based permissions.
- Calendar: Google OAuth + FreeBusy + event creation with Meet links.
- Timezone default: Asia/Kolkata.
- Must implement full CRUD UI for Areas, AOMs, Users, Candidates.
- Must implement scheduling engine with same-area and cross-area interviewer selection.
- Must persist clear interview status and failure reasons.
- Must include tests for critical backend and frontend flows.

Implementation order:
1) data models and migrations
2) auth and permissions
3) admin CRUD APIs
4) OAuth connect flow
5) scheduling engine + Celery task
6) analytics endpoints + dashboard
7) tests + docs

Output requirements:
- Full source code
- Migration files
- .env.example
- API endpoint documentation
- Run instructions for local setup
- Test commands and expected output
"""

## 21. Local Run Checklist
- Configure .env with JWT and Google credentials.
- Enable Google Calendar API for the project.
- Set OAuth redirect URI.
- Run migrations.
- Start Redis.
- Start Django + Celery worker + frontend.
- Validate connect calendar and schedule interview flow.
