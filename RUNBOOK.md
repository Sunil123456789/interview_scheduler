# Runbook (Local Development)

## Prerequisites
- Python 3.12+
- Node.js 18+
- Redis running on `localhost:6379`
- Google OAuth client configured (Web App)

## 1. Backend Setup
```powershell
cd c:\Users\sunil.kumar8\Desktop\interview_scheduler
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
```

## 2. Environment Configuration
Create/update `.env` in repo root with at least:

```env
SECRET_KEY=<long-random-string-32plus>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/
GOOGLE_OAUTH_SUCCESS_REDIRECT=http://localhost:5173/admin?oauth=success
GOOGLE_OAUTH_FAILURE_REDIRECT=http://localhost:5173/admin?oauth=error
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
```

Google Console requirements:
- Enable Google Calendar API.
- OAuth client type: **Web application**.
- Authorized redirect URI: `http://localhost:8000/api/auth/google/callback/`

## 3. Start Services (3 terminals)

### Terminal A: Django API
```powershell
cd c:\Users\sunil.kumar8\Desktop\interview_scheduler
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

### Terminal B: Celery Worker
```powershell
cd c:\Users\sunil.kumar8\Desktop\interview_scheduler
.\.venv\Scripts\Activate.ps1
celery -A interview_scheduler worker -l info
```

### Terminal C: Frontend
```powershell
cd c:\Users\sunil.kumar8\Desktop\interview_scheduler\frontend
npm install
npm run dev
```

## 4. Basic Verification
1. Open `http://localhost:5173`.
2. Login as admin/HR user.
3. In Admin -> AOMs, click `Connect Calendar` for target AOM.
4. Confirm callback URL shows `oauth=success`.
5. Create/select candidate and schedule interview.
6. Check interview status becomes `scheduled` and `meet_link` is present.

## 5. Test Commands

### Backend tests
```powershell
cd c:\Users\sunil.kumar8\Desktop\interview_scheduler
.\.venv\Scripts\Activate.ps1
python manage.py test
```

### Frontend tests/build
```powershell
cd c:\Users\sunil.kumar8\Desktop\interview_scheduler\frontend
npm run build
npm test
```

## 6. Common Issues
- `accessNotConfigured`:
  - Enable Google Calendar API in the same Google project used by OAuth credentials.
- `oauth=error&reason=...` after callback:
  - Check redirect URI exact match and consent screen/test users.
- Celery not picking tasks:
  - Verify Redis is running and worker is started.
- Old code behavior after changes:
  - Restart Django and Celery processes.
