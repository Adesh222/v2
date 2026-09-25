# MediQueue

**Smart Hospital Queue & Appointment Management System**

MediQueue is an internship-level single-hospital OPD application. Patients book appointments and receive live queue tokens, doctors control their queues, and hospital administrators monitor appointments, departments, doctors, and operational statistics.

## Architecture

```text
React + Vite
     │
     │ REST/JSON
     ▼
FastAPI + Pydantic + PyJWT
     │
     │ PyMongo
     ▼
MongoDB / MongoDB Atlas
```

The browser never connects to MongoDB directly. FastAPI owns authentication, authorization, validation, queue logic, and all database writes.

> **Database decision:** MongoDB is the only application database. PostgreSQL, SQLite, MySQL, PGLite, and SQLAlchemy are not used.

---

## What problem it solves

Traditional OPD token systems tell a patient only a number. MediQueue turns that token into a live queue experience:

- queue number, e.g. `GM-026`
- patients ahead
- current doctor status
- estimated waiting time
- live “now serving” board
- appointment history

The wait estimate is explainable:

```text
estimated wait = patients ahead × average consultation duration
```

The average starts from the doctor's configured consultation duration. After at least three completed consultations for that doctor on the same day, the backend calculates the mean of actual consultation durations and clamps it to 5–40 minutes.

---

## Roles

### Hospital admin

- Secure login
- Dashboard and statistics
- Manage hospital profile
- Create, activate, and deactivate doctor accounts
- Manage departments
- View all appointments
- Monitor live queues
- View queue activity/audit events

### Doctor

- Secure login
- Today's appointments and queue
- Call next patient
- Mark completed
- Mark skipped
- Mark no-show
- View appointment history
- Open public waiting-room display

### Patient

- Self-registration
- Login
- Browse departments and doctors
- View available slots
- Book appointments
- Receive queue number
- Track patients ahead and ETA
- Cancel eligible appointments
- View appointment history

Doctor accounts cannot be created through patient registration. They are created by a hospital administrator.

---

## MongoDB collections

| Collection | Purpose |
|---|---|
| `users` | Authentication identities and roles. Passwords are stored as PBKDF2 hashes. |
| `hospitals` | Single-hospital configuration. |
| `departments` | Active/inactive OPD departments and queue prefixes. |
| `doctors` | Doctor profile linked to a user. |
| `appointments` | Booking, slot, queue token, status, and timestamps. |
| `queues` | One queue counter/state document per doctor and date. |
| `queue_events` | Audit trail for created/called/completed/skipped/no-show/cancelled events. |

### Important indexes

- `users.email` — unique
- `doctors.user_id` — unique
- `appointments.patient_id`
- `appointments.doctor_id`
- `appointments.department_id`
- `appointments.date`
- `appointments.status`
- `appointments(doctor_id, date, queue_seq)`
- `appointments(doctor_id, date, slot_start)` — unique for active appointments
- `queues(doctor_id, date)` — unique
- `queue_events.timestamp`

Queue sequence allocation uses an atomic MongoDB update, so two simultaneous bookings cannot receive the same queue sequence.

---

## Authentication and security

- Passwords are never stored as plain text.
- Password hashing uses PBKDF2-HMAC-SHA256 with a per-password random salt.
- Login issues a signed JWT containing user ID, role, email, and expiry.
- Protected endpoints load the user from MongoDB on every request.
- Role checks are enforced by FastAPI dependencies.
- Patients cannot reach admin or doctor actions by changing a URL.
- MongoDB credentials stay server-side in environment variables.
- CORS is configurable with `CORS_ORIGINS`.
- Input validation is handled with Pydantic.
- API errors return safe messages instead of database credentials or stack traces.

For a production medical deployment, use httpOnly secure cookies/refresh-token rotation, rate limiting, stronger observability, and a formal security/privacy review.

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Hospital admin | `admin@mediqueue.demo` | `MediQueue@Admin1` |
| Doctor | `doctor@mediqueue.demo` | `MediQueue@Doctor1` |
| Patient | `patient@mediqueue.demo` | `MediQueue@Patient1` |

These are fictional demo credentials only.

The demo patient is seeded into the General Medicine queue when the database is empty, making a live queue demonstration possible immediately after startup.

---

## Project structure

```text
mediqueue/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── catalog.py
│   │   │   ├── appointments.py
│   │   │   ├── queue.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── queue.py
│   │   │   └── analytics.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── security.py
│   │   ├── seed.py
│   │   └── main.py
│   ├── tests/test_flow.py
│   └── requirements.txt
├── src/
│   ├── components/
│   ├── lib/api.ts
│   ├── lib/session.ts
│   ├── routes/
│   ├── main.tsx
│   ├── router.tsx
│   └── styles.css
├── docs/VIVA.md
├── index.html
├── vercel.json
├── vite.config.ts
├── .env.example
├── .gitignore
└── README.md
```

---

## Environment variables

Copy `.env.example` to `.env` for local development.

```text
MONGODB_URI=mongodb://127.0.0.1:27017/mediqueue
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE_HOURS=12
CORS_ORIGINS=http://localhost:8080
HOSPITAL_TZ=Asia/Kolkata
VITE_API_BASE_URL=
```

For a separately deployed frontend, set `VITE_API_BASE_URL` to the public FastAPI API including `/api`, for example:

```text
VITE_API_BASE_URL=https://your-api.example.com/api
```

Never commit `.env`.

---

## Local development

Requirements:

- Python 3.10+
- Node.js 20+
- MongoDB Community Server **or** a MongoDB Atlas connection string

### Backend

```bash
python -m pip install -r backend/requirements.txt
```

Set `MONGODB_URI` and `JWT_SECRET`, then:

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000` and Swagger/OpenAPI at `/docs`.

### Frontend

In a second terminal:

```bash
npm install
npm run dev
```

Open `http://localhost:8080`.

The Vite development server proxies `/api/*` to FastAPI on port 8000.

---

## API overview

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public; patient only |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| GET | `/api/public/snapshot` | Public |
| GET/PUT | `/api/hospital` | Public read / admin write |
| GET/POST/PATCH | `/api/departments` | Authenticated / admin write |
| GET/POST/PATCH | `/api/doctors` | Authenticated / admin write |
| GET | `/api/appointments/slots` | Authenticated |
| GET/POST | `/api/appointments` | Role-filtered / patient creates |
| GET | `/api/appointments/{id}` | Owner or staff |
| POST | `/api/appointments/{id}/cancel` | Owner or staff |
| GET | `/api/queue/mine` | Doctor |
| GET | `/api/queue/doctor/{doctorId}` | Doctor owner or admin |
| GET | `/api/queue/appointment/{id}` | Owner or staff |
| POST | `/api/queue/call-next` | Doctor |
| POST | `/api/queue/complete` | Doctor |
| POST | `/api/queue/skip` | Doctor |
| POST | `/api/queue/no-show` | Doctor |
| GET | `/api/queue/display/{doctorId}` | Public |
| GET | `/api/admin/stats` | Admin |
| GET | `/api/admin/overview` | Admin |
| GET | `/api/admin/activity` | Admin |
| GET | `/api/health` | Public |

---

## Testing

### Project integrity check

```bash
npm test
```

This verifies the expected project structure and confirms that forbidden SQL database dependencies are not present in the frontend package or backend requirements.

### Backend API flow

Start MongoDB and FastAPI first, then:

```bash
python backend/tests/test_flow.py
```

The flow covers health, invalid login, all three demo logins, role isolation, admin doctor creation, queue reads, doctor queue movement, patient booking, and unauthenticated booking rejection.

### Manual acceptance checklist

1. Admin login works.
2. Doctor login works.
3. Patient registration works.
4. Patient login works.
5. Patient cannot access admin APIs.
6. Admin can create/deactivate a doctor.
7. Patient can book an available slot.
8. Appointment is stored in MongoDB.
9. Queue token is assigned.
10. Patient sees live queue position.
11. ETA uses the documented formula.
12. Doctor calls the next patient.
13. Doctor completes/skips/no-shows the patient.
14. Queue moves forward.
15. Patient view updates.
16. Appointment history is visible.
17. Invalid input is rejected.
18. Empty states are handled.
19. MongoDB outage returns a clear 503 response.
20. Mobile layouts remain usable.

### Test honesty

The repository was inspected and the Python source was syntax-checked during preparation. Full frontend dependency installation/build and live MongoDB API execution were **not possible in the preparation environment because external package downloads were unavailable**. Therefore this package does not claim a fresh end-to-end build/test pass from this environment.

---

## Deployment target

```text
Vercel/static React frontend
          │
          │ HTTPS JSON API
          ▼
FastAPI service
          │
          ▼
MongoDB Atlas
```

The project includes `vercel.json` for SPA routing and supports `VITE_API_BASE_URL` for a separately hosted API.

For the backend, a Python-capable host such as Render, Railway, Fly.io, or another currently available provider can be used. Provider pricing/free tiers change, so verify current availability before selecting one.

### Backend start command

```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Required backend environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRE_HOURS`
- `CORS_ORIGINS`
- `HOSPITAL_TZ`

### Frontend build

```bash
npm install
npm run build
```

Deploy the generated `dist` directory with `VITE_API_BASE_URL` pointing to the public FastAPI `/api` endpoint.

---

## Known limitations

- Single hospital / single campus.
- Polling is used for live updates instead of WebSockets.
- JWT access token is stored in browser local storage; httpOnly cookies are preferable for a production deployment.
- No SMS, WhatsApp, email, payment, insurance, or clinical-note features.
- Wait time is an explainable statistical estimate, not a clinical or ML prediction.
- Demo seed data is fictional.
- This is an internship/demo system and is not a certified medical device or production healthcare platform.

## Future improvements

- WebSocket/SSE live queue updates
- Secure httpOnly session cookies and refresh tokens
- SMS/WhatsApp token alerts
- Doctor leave and roster management
- Appointment reminders
- Queue priority rules with explicit hospital policy
- Accessibility audit and multilingual UI
- Audit export and observability
- Production privacy/security review

See [`docs/VIVA.md`](docs/VIVA.md) for the internship presentation and viva explanation.
