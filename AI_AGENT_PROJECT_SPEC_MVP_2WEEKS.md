# AI Agent Spec: Interview Scheduler MVP (2 Weeks)

## 1. Objective
Build a working MVP interview scheduling system in 14 days with:
- Auth + roles
- HR admin CRUD
- Google calendar connect for interviewers
- Automated scheduling with Meet link
- Basic dashboard + status tracking

This is optimized for speed and demo readiness.

## 2. Hard Constraints
- Timeline: 2 weeks total
- Tech:
  - Backend: Django + DRF
  - Async: Celery + Redis
  - Frontend: React + TypeScript + Vite + Tailwind
  - Auth: JWT
  - Calendar: Google OAuth + Calendar API
- Timezone default: Asia/Kolkata
- Must be deployable locally in one command per service

## 3. In-Scope Features (MVP)
1. Authentication
- JWT login/refresh/me
- Role checks: admin vs interviewer/user

2. Admin Management
- Areas CRUD (with active/inactive)
- AOM/interviewer CRUD (with active/inactive)
- Candidate CRUD (with active/inactive)
- Basic users CRUD (admin/user)

3. Calendar Integration
- Connect Google calendar per AOM
- Store access/refresh token + expiry
- Show OAuth connected/pending in admin UI

4. Scheduling Engine
- Input: candidate_id
- Select interviewers:
  - one same area
  - one different area
  - both active + interviewer flag true
- Validate both have OAuth tokens
- Fetch busy slots for 7 days
- Find earliest common 1-hour slot in business hours
- Create Google event + Meet link
- Save interview status and reason

5. Async Processing
- Schedule API enqueues Celery job
- Retry transient errors
- Fail fast on non-retryable Google 4xx errors

6. Basic Dashboard
- Counts: candidates, areas, AOMs, interviews
- Interview stats: scheduled/failed/pending/completed

## 4. Out of Scope (for MVP)
- ATS integrations
- Multi-round advanced orchestration
- Candidate self-serve portal
- SSO/SAML
- AI scoring/ML matching
- Complex workflow approvals

## 5. Minimal Data Model
- Area(id, name, is_active)
- User/AOM(id, username, email, role flags, is_active, is_interviewer, area_id, google tokens)
- Candidate(id, name, email, area_id, is_active)
- Interview(id, candidate_id, same_aom_id, diff_aom_id, scheduled_start, scheduled_end, status, failure_reason, google_event_id, meet_link)

## 6. Required APIs
### Auth
- POST /api/auth/login/
- POST /api/auth/refresh/
- GET /api/auth/me/
- GET /api/auth/google/start/?aom_id=<id>
- GET /api/auth/google/callback/

### Master Data
- GET/POST /api/areas/
- PATCH/DELETE /api/areas/{id}/
- GET/POST /api/aoms/
- PATCH/DELETE /api/aoms/{id}/
- GET/POST /api/users/
- GET/POST /api/candidates/
- PATCH/DELETE /api/candidates/{id}/

### Scheduling + Analytics
- POST /api/schedule-interview/
- GET /api/interviews/
- GET /api/interviews/{id}/
- GET /api/analytics/

## 7. UI Screens (MVP)
1. Login page
2. Dashboard page (summary + interview stats)
3. Schedule page (trigger scheduling by candidate)
4. Status page (list + interview details)
5. Admin page with tabs:
- Areas
- AOMs
- Users
- Candidates

Must-have admin UX:
- create/edit/enable-disable/delete
- connect calendar button on AOM card
- clear OAuth status badge

## 8. Scheduling Rules (Exact)
1. Candidate must be active.
2. same-area and cross-area interviewer pools must be non-empty.
3. Interviewers must be active, interviewer=true, OAuth connected.
4. Search window: next 7 days.
5. Working hours: 09:00 to 18:00 IST.
6. Duration: 60 minutes.
7. Slot step: 30 minutes.
8. Skip weekends.
9. Pick earliest common free slot.
10. If no slot, mark interview failed with reason.

## 9. Error Handling Policy
- Return clear API errors for validation/auth failures.
- For Celery scheduling:
  - Retry on transient exceptions and 5xx upstream errors.
  - Do not retry non-retryable Google 4xx (invalid grant, API disabled, bad request).
- Persist `failure_reason` always on failure.

## 10. Security Baseline
- Env-based secrets only
- JWT auth on protected APIs
- Admin-only access for management endpoints
- CORS/CSRF env-configured
- No hardcoded OAuth credentials

## 11. Test Scope (MVP)
### Backend (required)
- Auth tests (login, me, oauth start auth check)
- CRUD endpoint permission tests
- Scheduling service tests (success/no-slot/no-aom)
- Celery retry behavior tests

### Frontend (required)
- Admin tab render/switch
- Candidate schedule form happy path
- Dashboard stats render

## 12. 14-Day Execution Plan
## Day 1-2: Foundation
- Scaffold backend/frontend
- JWT auth + role model
- base entities and migrations

## Day 3-4: Admin APIs
- Areas/AOMs/Users/Candidates CRUD
- permission checks

## Day 5-6: Admin UI
- tabs + forms + list actions
- enable/disable/delete

## Day 7-8: OAuth Integration
- connect flow start/callback
- token persistence + status badge

## Day 9-10: Scheduling Engine
- AOM selection + slot finder + calendar event creation
- interview status persistence

## Day 11: Async Reliability
- Celery integration + retry policies
- non-retryable 4xx guard

## Day 12: Analytics + status UI
- counts and interview status metrics

## Day 13: Testing pass
- backend tests + frontend tests
- bug fixes

## Day 14: Final demo prep
- seed data
- runbook + screenshots + flowchart

## 13. Definition of Done (MVP)
- End-to-end demo works:
  - create AOM
  - connect calendar
  - create candidate
  - schedule interview
  - see Meet link + scheduled status
- Core test suites pass
- .env.example is complete
- Setup steps documented

## 14. Agent Prompt (Copy-Paste)
"""
Build a 2-week MVP interview scheduling platform with Django/DRF/Celery/Redis + React/TS/Vite.

Implement only MVP scope:
- JWT auth and role-based access
- CRUD for Areas, AOMs, Users, Candidates
- Google OAuth connect per AOM
- Scheduling engine with same-area + different-area interviewer selection
- FreeBusy lookup, earliest common slot, and Meet event creation
- Interview status tracking and analytics
- Celery retry policy with non-retryable Google 4xx handling
- Admin UI with connect calendar and OAuth status

Rules:
- Timezone Asia/Kolkata
- Business hours 9-18 IST
- 7-day search window, 1-hour interviews, 30-min step
- Always store failure reasons

Output:
- Full source code
- migrations
- env template
- local run commands
- tests and passing results
"""
