# Employee Training, Certification & Compliance System

MERN app: HR assigns training, employees complete courses and assessments, certificates are issued and tracked, and a compliance engine flags gaps and sends reminders.

## Run locally

Requires Node 20+ and a MongoDB instance (local or Atlas).

```bash
# API
cd server
cp .env.example .env      # set MONGO_URI, JWT secrets, Cloudinary (+ SMTP optional)
npm install
npm run seed              # creates the first Admin/HR user (SEED_ADMIN_* in .env)
npm run dev               # http://localhost:5000/api/v1

# Client (separate terminal)
cd client
npm install
npm run dev               # http://localhost:5173 (proxies /api to :5000)
```

Without SMTP settings, reminders are recorded as in-app notifications and email is skipped.
For quick testing set `REMINDER_CRON=*/1 * * * *`.

## Demo journey

1. Sign in as the seeded admin → create a department and employee users.
2. Trainings → create a published course (upload a PDF; set "valid for" months) → add an assessment.
3. Requirements → require that course for the department.
4. Assign training → department.
5. Sign in as the employee → open the course, mark material done, take the assessment.
6. A passing score issues a certificate PDF; the admin dashboard shows the employee as compliant.

## Structure

- `server/src/` — `models`, `controllers` (HTTP), `services` (business rules), `middleware` (auth/RBAC, validation, upload), `jobs` (node-cron), `validators` (zod).
- `client/src/` — `pages/{auth,admin,manager,employee}`, `layouts`, `hooks`, `services`.

Roles: `admin` (HR), `trainer`, `manager` (sees direct reports), `employee`. Authorization is enforced in the API; the UI only hides links.

## Tests

```bash
cd server && npm test
```

Uses an in-memory MongoDB and a faked Cloudinary. Covers role permissions, server-side scoring, attempt limits, certificate preconditions, upload failure rollback, expiry → compliance change, reminder de-duplication and CSV injection.

## Not yet done

Deployment config (Render/Vercel/Atlas), a Postman collection, editing/archiving courses in the UI, and a UI for per-employee compliance history (the API exists: `GET /compliance/employees/:id`).
