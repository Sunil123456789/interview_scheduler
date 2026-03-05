## Interview Scheduler - Software Functional Design (SFD/SFC)

### 1. System Overview

The **Interview Scheduler** system automatically schedules interviews between a candidate and two Area Operations Managers (AOMs) by:
- Selecting one AOM from the candidate’s area and one from a different area.
- Finding a common free time slot in both AOMs’ Google Calendars within the next 7 days.
- Creating a Google Calendar event (with a Google Meet link) including both AOMs and the candidate.

**Tech stack**: Django, Django REST Framework, Celery for async tasks, Google Calendar API, PostgreSQL/relational DB (generic Django ORM).

Main Django apps:
- `accounts`: user and candidate management.
- `scheduler`: interview scheduling logic, services, and APIs.

---

### 2. Modules and Responsibilities

#### 2.1 `accounts` App

**Models**
- **`Area`**
  - Represents a geographical or organizational area.
  - Fields:
    - `name`: `CharField`, area name.

- **`AOM`** (extends `AbstractUser`)
  - Represents an Area Operations Manager.
  - Fields:
    - `area`: FK to `Area`, with `related_name='aoms'`.
    - `google_calendar_id`: ID of the AOM’s Google Calendar (default: `primary`).
    - `google_access_token`: OAuth2 access token.
    - `google_refresh_token`: OAuth2 refresh token.
    - `token_expiry`: expiry datetime of the access token.
  - Purpose: stores both identity and Google Calendar credentials for scheduling.

- **`Candidate`**
  - Represents a job candidate.
  - Fields:
    - `name`: candidate full name.
    - `email`: candidate email.
    - `area`: FK to `Area`, candidate’s associated area.
    - `applied_at`: auto timestamp when candidate is created.

---

#### 2.2 `scheduler` App

##### 2.2.1 `Interview` Model

Represents a single interview instance.

- Fields:
  - `candidate`: FK to `Candidate`, `related_name='interviews'`.
  - `same_area_aom`: FK to `AOM` in the candidate’s area, nullable.
  - `diff_area_aom`: FK to `AOM` from a different area, nullable.
  - `scheduled_start`: datetime of interview start, nullable.
  - `scheduled_end`: datetime of interview end, nullable.
  - `google_event_id`: ID of the Google Calendar event.
  - `meet_link`: Google Meet URL.
  - `status`: `CharField` with choices:
    - `pending`
    - `scheduled`
    - `failed`
    - `completed`
  - `failure_reason`: text explaining why scheduling failed (if applicable).
  - `created_at`: auto timestamp when record is created.

---

##### 2.2.2 Services Layer (`scheduler/services`)

**a) `slot_finder.py`**

Purpose: find the earliest common free slot between two AOMs.

- Constants:
  - `INTERVIEW_DURATION` = 1 hour.
  - `WORK_START_HOUR` = 9 (09:00 UTC).
  - `WORK_END_HOUR` = 18 (18:00 UTC).
  - `SLOT_STEP` = 30 minutes (granularity of search).
  - `SEARCH_DAYS` = 7 (search window from now).

- Functions:
  - `is_slot_free(slot_start, slot_end, busy) -> bool`
    - Checks whether `[slot_start, slot_end)` overlaps with any interval in the `busy` list.
  - `find_common_slot(aom1, aom2, search_from=None) -> Optional[dict]`
    - Inputs: two `AOM` objects and optional `search_from` datetime (defaults to current UTC hour).
    - Retrieves busy slots for both AOMs via `get_busy_slots`.
    - Iterates from `search_from` up to `SEARCH_DAYS` ahead, in `SLOT_STEP` increments.
    - Skips:
      - hours before `WORK_START_HOUR` and after `WORK_END_HOUR`.
      - weekends (`weekday() >= 5`).
    - For each candidate start time:
      - Computes `slot_end = start + INTERVIEW_DURATION`.
      - Verifies the full hour slot is within work hours.
      - Checks both AOMs are free for that interval.
    - Returns:
      - `{'start': datetime, 'end': datetime}` for first common free slot, or
      - `None` if no slot is found.

**b) `google_calendar.py`**

Purpose: interface with Google Calendar using stored AOM OAuth tokens.

- Functions:
  - `get_credentials(aom) -> Credentials`
    - Builds a `Credentials` object from `AOM.google_access_token`, `google_refresh_token`, etc.
    - If token is expired and refresh token is available, refreshes the token:
      - Updates `aom.google_access_token` and `aom.token_expiry`.
  - `get_busy_slots(aom, time_min, time_max) -> list`
    - Calls Google Calendar `freebusy().query` API using the AOM’s `google_calendar_id`.
    - Returns a list of busy windows:
      - `{'start': datetime, 'end': datetime}`.
  - `create_calendar_event(aom1, aom2, candidate_email, start, end, summary) -> dict`
    - Uses `aom1`’s Google Calendar as the primary calendar.
    - Creates an event with:
      - `summary`, description.
      - UTC `start` and `end` datetimes.
      - Attendees: `aom1.email`, `aom2.email`, `candidate_email`.
      - Google Meet conference (`conferenceData.createRequest`).
      - Email + popup reminders.
    - Returns the created event object, including:
      - `id` (Google event ID).
      - `hangoutLink` (Meet URL).

**c) `interview_booker.py`**

Purpose: orchestrate the full scheduling flow for a candidate.

- Functions:
  - `pick_aoms(candidate) -> (same_area_aom, diff_area_aom)`
    - Fetches:
      - active AOMs in the candidate’s area.
      - active AOMs in other areas.
    - Randomly picks one from each set.
    - Raises `ValueError` if:
      - no AOM in candidate’s area, or
      - no AOM outside candidate’s area.

  - `schedule_interview(candidate_id) -> Interview`
    - Loads the `Candidate` by ID.
    - Creates an `Interview` with `status='pending'`.
    - Steps:
      1. **Pick AOMs**: calls `pick_aoms(candidate)`; assigns `same_area_aom` and `diff_area_aom`.
      2. **Find slot**: calls `find_common_slot(same_aom, diff_aom)`.
      3. **If no slot**:
         - Set `interview.status = 'failed'`.
         - Set appropriate `failure_reason` (e.g., “No common free slot found in next 7 days”).
         - Save interview.
         - Notify admins via `mail_admins`.
         - Return the `Interview`.
      4. **If slot found**:
         - Call `create_calendar_event(...)` with AOMs and candidate email.
         - Save:
           - `scheduled_start`, `scheduled_end`.
           - `google_event_id` from event.
           - `meet_link` from event.
         - Set `status = 'scheduled'`.
         - Save and return `Interview`.
      5. **Error handling**:
         - On any exception:
           - Set status to `failed`, `failure_reason` to the error string.
           - Save, then re-raise exception for outer layers (e.g., Celery) to handle.

---

##### 2.2.3 Celery Tasks (`scheduler/tasks.py`)

**`schedule_interview_task`**
- Decorated as `@shared_task(bind=True, max_retries=3, default_retry_delay=300)`.
- Input: `candidate_id` integer.
- Behaviour:
  - Calls `schedule_interview(candidate_id)`.
  - On success, returns:
    - `status` (e.g., `scheduled` or `failed`).
    - `interview_id`.
    - `meet_link`.
  - On failure, retries up to 3 times with 5-minute delay.

---

##### 2.2.4 API Layer (`scheduler/views.py`)

Uses Django REST Framework `APIView`.

**`ScheduleInterviewView`**
- Endpoint: `POST /api/schedule-interview/`
- Request body:
  - JSON: `{"candidate_id": <int>}`
- Behaviour:
  - Validates that `candidate_id` is provided.
  - Verifies candidate exists.
  - Enqueues `schedule_interview_task.delay(candidate_id)`.
  - Returns `202 Accepted` with:
    - `message`: `"Scheduling started"`.
    - `task_id`: Celery task ID.

**`InterviewStatusView`**
- Endpoint: `GET /api/interviews/<id>/`
- Behaviour:
  - Retrieves `Interview` by primary key.
  - If found, returns:
    - `id`
    - `candidate` (name)
    - `status`
    - `scheduled_start`
    - `scheduled_end`
    - `meet_link`
    - `same_area_aom` (string)
    - `diff_area_aom` (string)
    - `failure_reason`
  - If not found, returns `404` with error message.

---

### 3. Main Functional Flows

#### 3.1 Candidate Onboarding
- Candidate is created (via admin or separate API) with:
  - `name`, `email`, `area`.
- No interview is created at this point.

#### 3.2 Initiate Interview Scheduling
- Client (front-end or external system) sends:
  - `POST /api/schedule-interview/` with `candidate_id`.
- Backend:
  - Validates input and candidate existence.
  - Enqueues Celery `schedule_interview_task`.
  - Immediately responds with `task_id` and status message.

#### 3.3 Background Scheduling Orchestration
- Celery worker processes `schedule_interview_task`:
  1. Loads candidate and creates `Interview` (status `pending`).
  2. Picks same-area and different-area AOMs.
  3. Queries Google Calendar (free/busy) for both AOMs.
  4. Searches for the first 1-hour weekday slot within work hours in the next 7 days.
  5. If slot is found:
     - Creates Google Calendar event with Meet link and attendees.
     - Updates `Interview` with time, event id, Meet link.
     - Sets status to `scheduled`.
  6. If slot not found or any error occurs:
     - Sets status to `failed`, records `failure_reason`.
     - Optionally notifies admins when no slot is available.

#### 3.4 Status Polling / Retrieval
- Client polls:
  - `GET /api/interviews/<id>/`
- Response allows client UI to display:
  - Current status (`pending`, `scheduled`, `failed`, `completed`).
  - Scheduled time (if any).
  - Meet link (if scheduled).
  - Failure explanation (if failed).

---

### 4. External Integrations and Assumptions

- **Google Calendar API**
  - Used for free/busy lookup and event creation.
  - Each `AOM` stores OAuth tokens; `get_credentials` refreshes tokens when needed.
  - Client ID and secret should be provided via environment or Django settings (currently placeholders).

- **Celery**
  - Used for async processing of interview scheduling, ensuring API remains responsive.
  - Requires broker (e.g., Redis/RabbitMQ) and worker processes.

- **Email (Django `mail_admins`)**
  - Used to notify admins when scheduling fails due to no common slot.
  - Requires email settings configured in Django.

---

### 5. Non-Functional Notes

- **Scalability**
  - Slot search is linear in the number of candidate slots within 7 days; acceptable for moderate usage.
  - Celery enables horizontal scaling of scheduling tasks.

- **Reliability**
  - Celery task retries transient failures (e.g., network issues with Google APIs) up to 3 times.

- **Security**
  - OAuth tokens are stored in the database on `AOM`.
  - Client credentials must be protected and not hard-coded in production.

### 6. AOM Calendar Connection Flow

- **OAuth Start Endpoint**
  - `GET /api/auth/google/start/`
  - Requires JWT authentication.
  - Optional query param for HR/Admin: `aom_id`.
  - Returns JSON with `auth_url` to open Google consent.

- **OAuth Callback Endpoint**
  - `GET /api/auth/google/callback/`
  - Verifies signed OAuth state and exchanges auth code for tokens.
  - Stores tokens on target AOM:
    - `google_access_token`
    - `google_refresh_token`
    - `token_expiry`

- **Admin UI Support**
  - In Admin -> AOMs tab, each AOM has a `Connect Calendar` action.
  - HR/Admin can trigger OAuth for a newly created AOM.

- **Scheduling Guardrail**
  - If selected AOMs are missing access token, scheduling fails early with clear `failure_reason`.

- **Required Environment Variables**
  - `GOOGLE_OAUTH_CLIENT_SECRETS_FILE`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - `GOOGLE_OAUTH_SUCCESS_REDIRECT`
  - `GOOGLE_OAUTH_FAILURE_REDIRECT`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

