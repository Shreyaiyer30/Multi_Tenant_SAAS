# Multi-Tenant SaaS Management System

A full-stack multi-tenant task management SaaS built with Django REST Framework (backend), React + Tailwind + Vite (frontend), PostgreSQL, JWT authentication, and Razorpay billing.

## Core Features

- Multi-tenant workspace model with strict tenant isolation.
- JWT-based auth (`register`, `login`, `refresh`, `logout`, `me`).
- Tenant-aware APIs using `x-tenant` header.
- Project, task, comment, activity, and notification workflows.
- Role-based access control (`owner`, `admin`, `member`, `viewer`).
- Billing and subscription flow with Razorpay:
  - `create-order`
  - `verify-payment`
  - subscription/plan updates
- Dashboard and reporting endpoints.
- API schema and Swagger docs via drf-spectacular.

## Tech Stack

- Backend: Django 5, Django REST Framework, SimpleJWT, PostgreSQL, psycopg
- Frontend: React 18, Vite, TailwindCSS, Axios, Recharts
- Payments: Razorpay
- Testing: Django test runner, pytest/pytest-django, Vitest/Playwright (frontend scripts available)

## Repository Structure

```text
.
├── apps/
│   ├── accounts/        # auth and user APIs
│   ├── billing/         # create-order endpoint + billing services
│   ├── tenants/         # workspaces, members, invites, subscription verify
│   ├── projects/        # project APIs
│   ├── tasks/           # task APIs + task notifications
│   ├── dashboard/       # dashboard summaries/activity
│   ├── reporting/       # reporting/stats/export
│   ├── notifications/   # notification center APIs
│   ├── audit/
│   └── common/          # middleware, permissions, pagination, shared logic
├── config/              # Django settings and root URLs
├── frontend/            # React application
├── tests/               # backend test suite
├── manage.py
└── requirements.txt
```

## Backend Setup (Django)

### 1) Prerequisites

- Python 3.11+ (project currently tested in local environment with 3.14)
- PostgreSQL (optional for local dev; SQLite fallback is supported in debug mode)

### 2) Install dependencies

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

On macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3) Configure environment

Create `.env` in project root (or copy from `.env.example`):

```env
SECRET_KEY=django-insecure-change-me
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

DB_NAME=tasksaas
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
USE_DATABASE_URL_IN_DEBUG=False

ACCESS_TOKEN_LIFETIME_MINUTES=15
REFRESH_TOKEN_LIFETIME_DAYS=7

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### 4) Run migrations

```bash
python manage.py migrate
```

### 5) Start backend server

```bash
python manage.py runserver
```

Backend default URL: `http://127.0.0.1:8000`

## Frontend Setup (React + Vite)

### 1) Install dependencies

```bash
cd frontend
npm install
```

### 2) Configure frontend env

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1/
```

### 3) Start frontend dev server

```bash
npm run dev
```

### 4) Production build

```bash
npm run build
```

## API Base and Docs

- Base URL: `/api/v1/`
- Health: `/api/v1/health/`
- OpenAPI Schema: `/api/v1/schema/`
- Swagger UI: `/api/v1/docs/`

## Multi-Tenant Request Rules

Most authenticated tenant-scoped APIs require:

- `Authorization: Bearer <access_token>`
- `x-tenant: <workspace_slug>`

If `x-tenant` is missing/invalid, middleware can return:

- `404 missing_tenant_header`
- `404 tenant_not_found`
- `404 tenant_inactive`
- `403 tenant_access_denied`

## Billing Flow (Razorpay)

### Create Order

`POST /api/v1/billing/create-order/`

Example request:

```http
Authorization: Bearer <access_token>
x-tenant: <workspace_slug>
Content-Type: application/json
```

```json
{
  "plan": "pro"
}
```

Example success response:

```json
{
  "order_id": "order_XXXXXXXX",
  "amount": 59900,
  "currency": "INR",
  "key": "rzp_test_xxxxx"
}
```

### Verify Payment

`POST /api/v1/billing/verify-payment/`

```json
{
  "razorpay_order_id": "order_XXXXXXXX",
  "razorpay_payment_id": "pay_XXXXXXXX",
  "razorpay_signature": "generated_signature"
}
```

## Main Endpoint Groups

- `auth/*` - register, login, refresh, logout, me
- `workspaces/`, `members/`, `invites/*`
- `projects/` (DRF viewset routes)
- `tasks/` (DRF viewset routes)
- `notifications/*`
- `dashboard/*`
- `reporting/*`
- `billing/create-order/`, `billing/plans/`, `billing/verify-payment/`

## Running Tests

Backend:

```bash
python manage.py test tests -v 2
```

or

```bash
pytest
```

Frontend (from `frontend/`):

```bash
npm run test:unit
npm run test:e2e
```

## Deployment Notes

- Production typically uses `config.settings.prod` with `DATABASE_URL` and SSL-enabled Postgres.
- Set Razorpay keys in deployment environment variables.
- Ensure frontend `VITE_API_BASE_URL` points to deployed backend API base.
- Ensure CORS/CSRF origins are configured for deployed frontend domain.

## Troubleshooting

### 1) `OperationalError` / DB host not reachable

- Check `DATABASE_URL` or `DB_HOST/DB_NAME` values.
- For local dev, use a reachable local Postgres host (e.g. `127.0.0.1`) or rely on SQLite fallback in debug.

### 2) `401 Unauthorized` on billing APIs

- Verify `Authorization` header includes a valid access token.
- Confirm `x-tenant` header is present and matches a workspace where user has membership.

### 3) `400 Bad Request` on `create-order`

- Ensure request method is `POST`.
- Send a valid plan value (e.g. `pro`, `free`, `enterprise`) or a valid `plan_id`.

### 4) Razorpay import/config issues

- Ensure dependencies are installed from `requirements.txt` (includes `razorpay` and `setuptools`).
- Confirm `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set.
