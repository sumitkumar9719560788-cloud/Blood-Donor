# LifeLink

LifeLink is a full-stack blood donation and emergency blood-bank discovery platform.

## Project structure

- `forntend/` – React + Vite frontend for blood search, donor registration, emergency requests, and dashboard views.
- `backend/` – Express + TypeScript API using MongoDB and Prisma.

## Frontend

The frontend connects to the API configured by `VITE_API_URL` (defaults to `http://localhost:5000/api`). It includes:

- Home landing page
- Blood search page
- Donor search page
- Emergency request form
- Dashboard page
- Login and registration screens
- Opt-in donor search and request responses

Run it:

```bash
cd forntend
npm install
copy .env.example .env
npm run dev
```

## Backend

The backend contains:

- Prisma schema for users, donors, blood banks, blood requests, and reports
- Express routes for auth, donors, blood banks, requests, and admin
- JWT auth and role protection middleware
- Zod validation and rate limiting
- Seed script for demo data

Setup:

```bash
cd backend
npm install
copy .env.example .env
```

Set `JWT_SECRET` in `.env` to a random secret with at least 32 characters, and set `DATABASE_URL` to your MongoDB connection string. The local example expects MongoDB running as a replica set named `rs0`; MongoDB Atlas is already configured as a replica set. Then run:

```bash
npx prisma generate
npm run prisma:push
npm run seed
npm run dev
```

The former PostgreSQL migration files are not used by MongoDB. If you have existing PostgreSQL data, migrate it separately before switching the application to MongoDB.

The API is available at `http://localhost:5000/api`. The seed script creates demonstration users with non-production passwords; change or remove these before any deployment.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/banks?city=&bloodGroup=`
- `GET /api/donors/nearby?city=&bloodGroup=`, `POST /api/donors`
- `POST /api/requests`, `GET /api/requests`, `GET /api/requests/opportunities`, `GET /api/requests/assigned`, `POST /api/requests/:id/respond`
- `GET /api/admin/stats`, `GET /api/admin/reports`
- `GET /api/admin/banks/pending`, `POST /api/admin/banks`, `PATCH /api/admin/banks/:id/verification`
- `POST /api/reports`
- `GET /api/health`

## Notes

- Donor contact data is never returned by public search. Requests are shown to matching opted-in donors only after the requester consents to sharing.
- Donor responses change a request to `CONTACTING`; the app does not send SMS, call emergency services, or guarantee blood availability.
- This project is designed for a local development environment.
- Replace `.env` secrets before using in production.
- The emergency and donor features clearly indicate they are verification-based and should not be treated as emergency medical service dispatch systems.
