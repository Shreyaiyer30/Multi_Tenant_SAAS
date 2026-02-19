# TaskSaaS — Complete Application Instructions

> **Version:** 2.0
> **Audience:** Small teams & startups
> **Stack:** Django · DRF · PostgreSQL · JWT (SimpleJWT) · Celery · Stripe
> **Tenancy Model:** Shared schema, row-level isolation via `tenant` FK
> **Tenant Resolution:** `X-Tenant` request header (slug-based)
> **API Base:** `/api/v1/`
> **API Docs:** `/api/v1/docs/` (Swagger/OpenAPI via drf-spectacular)

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [API Conventions & Versioning](#2-api-conventions--versioning)
3. [JWT Authentication](#3-jwt-authentication)
4. [Password Management](#4-password-management)
5. [User Profile](#5-user-profile)
6. [Tenant / Workspace Management](#6-tenant--workspace-management)
7. [Tenant Isolation](#7-tenant-isolation)
8. [User Membership & Roles](#8-user-membership--roles)
9. [Role-Based Access Control](#9-role-based-access-control)
10. [Projects Module](#10-projects-module)
11. [Tasks Module](#11-tasks-module)
12. [Task Filtering & Search](#12-task-filtering--search)
13. [Comments Module](#13-comments-module)
14. [Task Activity Log](#14-task-activity-log)
15. [Notifications](#15-notifications)
16. [Tenant Admin Dashboard](#16-tenant-admin-dashboard)
17. [SaaS Plans & Limits](#17-saas-plans--limits)
18. [Stripe Billing Integration](#18-stripe-billing-integration)
19. [Reporting & Exports](#19-reporting--exports)
20. [Swagger / OpenAPI Documentation](#20-swagger--openapi-documentation)
21. [Deployment & Production Config](#21-deployment--production-config)
22. [Error Reference](#22-error-reference)
23. [Running Locally](#23-running-locally)

---

## 1. System Architecture

### How Every Request Flows

```
Incoming HTTP Request
        │
        ▼
  ┌─────────────────────────────┐
  │   Django Middleware Stack   │
  │                             │
  │ 1. SecurityMiddleware       │
  │ 2. CORSMiddleware           │
  │ 3. JWTAuthMiddleware        │  → attaches request.user
  │ 4. TenantMiddleware         │  → attaches request.tenant
  │                             │        + request.membership
  └─────────────────────────────┘
        │
        ▼
  ┌─────────────────────────────┐
  │   DRF Router / URLconf      │
  │   /api/v1/...               │
  └─────────────────────────────┘
        │
        ▼
  ┌─────────────────────────────┐
  │   DRF Permission Classes    │
  │                             │
  │ · IsAuthenticated           │
  │ · IsTenantMember            │
  │ · IsTenantAdminOrOwner      │
  │ · PlanLimitPermission       │
  └─────────────────────────────┘
        │
        ▼
  ┌─────────────────────────────┐
  │   ViewSet + Serializer      │
  │                             │
  │ · get_queryset() always     │
  │   filters by request.tenant │
  │ · tenant FK auto-injected   │
  │   on create; never from     │
  │   user-supplied input       │
  └─────────────────────────────┘
        │
        ▼
  ┌─────────────────────────────┐
  │   PostgreSQL                │
  │   Composite indexes on      │
  │   (tenant_id, id) for all   │
  │   tenant-scoped tables      │
  └─────────────────────────────┘
        │
        ▼
  JSON Response
```

### Project File Structure

```
tasksaas/
├── manage.py
├── requirements.txt
├── .env
├── .gitignore
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── apps/
│   ├── common/
│   │   ├── models.py        # UUIDModel, TimeStampedModel, TenantScopedModel
│   │   ├── middleware.py    # TenantMiddleware
│   │   ├── permissions.py   # All DRF permission classes
│   │   ├── mixins.py        # TenantScopedModelMixin for viewsets
│   │   ├── pagination.py    # CursorPagination config
│   │   └── exceptions.py   # Custom exception handler
│   ├── accounts/            # User model, auth, profile, password
│   ├── tenants/             # Tenant, Membership, plan limits
│   ├── projects/            # Project CRUD
│   ├── tasks/               # Task, Comment, Activity, Notification
│   ├── billing/             # Stripe plans, subscriptions, webhooks
│   └── reporting/           # Stats, CSV/PDF export
└── tests/
    ├── test_tenant_isolation.py
    ├── test_auth.py
    ├── test_tasks.py
    ├── test_permissions.py
    └── test_billing.py
```

---

## 2. API Conventions & Versioning

### Versioning

All endpoints are prefixed with `/api/v1/`. Versioning is path-based for simplicity and cacheability. When a breaking change is introduced, `/api/v2/` is launched alongside v1. v1 receives a deprecation header and is sunset after 6 months.

### Required Headers (all tenant-scoped endpoints)

```
Authorization: Bearer <access_token>
X-Tenant: <workspace-slug>
Content-Type: application/json
```

### Endpoints Exempt from X-Tenant

```
POST /api/v1/auth/register/
POST /api/v1/auth/login/
POST /api/v1/auth/refresh/
POST /api/v1/auth/logout/
POST /api/v1/auth/password/forgot/
POST /api/v1/auth/password/reset/
GET  /api/v1/auth/me/
GET  /api/v1/notifications/
POST /api/v1/notifications/read/
POST /api/v1/notifications/unread/
GET  /health/
GET  /api/v1/docs/
GET  /api/v1/schema/
```

### Standard List Envelope

```json
{
  "count": 42,
  "next": "https://api.tasksaas.com/api/v1/tasks/?cursor=xyz",
  "previous": null,
  "results": []
}
```

### Standard Single Object Response

No wrapper envelope — the object itself is returned directly.

### Pagination

Cursor-based on all list endpoints. Default page size: **25**. Maximum: **100**.
Query params: `?limit=25&cursor=<opaque_string>`

### Partial Updates

Use `PATCH` for all updates. `PUT` is not supported. Only fields present in the request body are modified.

### Timestamps

ISO 8601 UTC everywhere: `2025-07-15T10:30:00Z`

### IDs

All primary keys: UUID v4 strings.

---

## 3. JWT Authentication

### Token Specifications

| Token | Lifetime | Recommended Storage |
|---|---|---|
| `access` | 15 minutes | JavaScript memory (React state / module variable) |
| `refresh` | 7 days | HttpOnly cookie set by the backend |

### Register

`POST /api/v1/auth/register/`

Creates a new user. When `create_workspace: true`, atomically creates a Tenant (with a slug auto-derived from `workspace_name`) and a Membership record with role `owner`.

**Request:**
```json
{
  "email": "alice@acme.com",
  "password": "SecurePass123!",
  "first_name": "Alice",
  "last_name": "Smith",
  "create_workspace": true,
  "workspace_name": "Acme Corp"
}
```

**Response `201`:**
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>",
  "user": {
    "id": "uuid",
    "email": "alice@acme.com",
    "first_name": "Alice",
    "last_name": "Smith",
    "avatar_url": null
  },
  "workspace": {
    "id": "uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "plan": "free"
  }
}
```

**Server-side password rules:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 digit
- Cannot be entirely numeric
- Cannot be too similar to the email address

**Validation error `400`:**
```json
{
  "error": "validation_error",
  "detail": {
    "email": ["A user with this email already exists."],
    "password": ["This password is too similar to your email address."]
  }
}
```

---

### Login

`POST /api/v1/auth/login/`

**Request:**
```json
{
  "email": "alice@acme.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>",
  "user": {
    "id": "uuid",
    "email": "alice@acme.com",
    "first_name": "Alice",
    "last_name": "Smith",
    "avatar_url": "https://cdn.tasksaas.com/avatars/uuid.jpg"
  }
}
```

**Failed `401`:**
```json
{
  "error": "authentication_failed",
  "detail": "No active account found with the given credentials."
}
```

> After 5 consecutive failed attempts from the same IP within 10 minutes → `429`. Resets automatically.

---

### Refresh Token

`POST /api/v1/auth/refresh/`

**Request:** `{ "refresh": "<refresh_token>" }`

**Response `200`:** `{ "access": "<new_access_token>" }`

**Expired / blacklisted `401`:** `{ "error": "token_expired" }`

---

### Logout

`POST /api/v1/auth/logout/`

Blacklists the refresh token via SimpleJWT's token blacklist app. The access token remains valid for its remaining lifetime (max 15 min) — acceptable for short-lived tokens.

**Request:** `{ "refresh": "<refresh_token>" }`

**Response `205 Reset Content`** (no body)

---

### Silent Refresh (Frontend Behaviour)

The frontend should intercept any `401` response, silently call `/auth/refresh/`, replace the stored access token, and retry the original request. If the refresh also returns `401`, clear all tokens and redirect to `/login`.

---

## 4. Password Management

### Change Password (Authenticated)

`POST /api/v1/auth/password/change/`

Verifies the current password before applying the new one. On success, all existing refresh tokens for this user are blacklisted — all other signed-in devices are kicked out.

**Request:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecure456!",
  "confirm_password": "NewSecure456!"
}
```

**Success `200`:**
```json
{ "message": "Password changed. All other sessions have been signed out." }
```

---

### Forgot Password

`POST /api/v1/auth/password/forgot/`

Unauthenticated. Always returns `200` regardless of whether the email exists — prevents email enumeration.

**Request:** `{ "email": "alice@acme.com" }`

**Response `200`:**
```json
{ "message": "If an account exists with this email, a reset link has been sent." }
```

Reset link format:
```
https://app.tasksaas.com/reset-password?token=<token>&uid=<user_id_b64>
```

Token properties: cryptographically random, expires in 1 hour, single-use.

---

### Reset Password

`POST /api/v1/auth/password/reset/`

Unauthenticated.

**Request:**
```json
{
  "uid": "<user_id_b64>",
  "token": "<reset_token>",
  "new_password": "FreshStart789!",
  "confirm_password": "FreshStart789!"
}
```

**Success `200`:** `{ "message": "Password reset. You can now sign in." }`

**Invalid / expired `400`:** `{ "error": "invalid_token" }`

---

## 5. User Profile

### Get My Profile

`GET /api/v1/auth/me/`

No `X-Tenant` required. Returns the authenticated user's profile and all workspace memberships.

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "alice@acme.com",
  "first_name": "Alice",
  "last_name": "Smith",
  "display_name": "Alice Smith",
  "avatar_url": "https://cdn.tasksaas.com/avatars/uuid.jpg",
  "date_joined": "2025-01-15T09:00:00Z",
  "workspaces": [
    { "id": "uuid", "name": "Acme Corp", "slug": "acme-corp", "plan": "pro", "role": "owner" },
    { "id": "uuid", "name": "Side Project", "slug": "side-project", "plan": "free", "role": "member" }
  ]
}
```

---

### Update Profile

`PATCH /api/v1/auth/me/`

Only provided fields are updated. Email changes are not supported via this endpoint.

**Request:** `{ "first_name": "Alicia", "last_name": "Smith-Jones" }`

**Response `200`:** Full updated profile object.

---

### Upload Avatar

`POST /api/v1/auth/me/avatar/`

Multipart form-data, field name `avatar`. Constraints: max 5 MB, JPEG/PNG/WebP only. Image is resized server-side to 256×256 px and stored in S3-compatible object storage.

**Response `200`:** `{ "avatar_url": "https://cdn.tasksaas.com/avatars/uuid.jpg" }`

---

### Delete Avatar

`DELETE /api/v1/auth/me/avatar/`

Removes the uploaded avatar. Frontend falls back to initials-based generated avatar.

**Response `204 No Content`**

---

## 6. Tenant / Workspace Management

### Tenant Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String (max 100) | Display name |
| `slug` | String (unique) | URL-safe, lowercase, hyphenated; used in `X-Tenant` |
| `logo_url` | String (nullable) | Workspace logo |
| `plan` | Choice | `free`, `pro`, `enterprise` |
| `is_active` | Boolean | Inactive → all access blocked |
| `max_users` | Integer | Set by plan; overridable for enterprise |
| `max_projects` | Integer | Set by plan |
| `stripe_customer_id` | String (nullable) | Set on first billing event |
| `stripe_subscription_id` | String (nullable) | Active Stripe subscription |
| `created_at` | DateTime | Auto-set |
| `updated_at` | DateTime | Auto-updated |

### Workspace Endpoints

#### Get Current Workspace

`GET /api/v1/workspace/`

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "logo_url": null,
  "plan": "free",
  "is_active": true,
  "member_count": 3,
  "limits": {
    "max_users": 3,
    "max_projects": 5,
    "current_users": 3,
    "current_projects": 2
  },
  "created_at": "2025-01-15T09:00:00Z"
}
```

---

#### Update Workspace Settings

`PATCH /api/v1/workspace/`

**Owner only.**

**Request:**
```json
{ "name": "Acme Corporation", "slug": "acme-corporation" }
```

Slug change rules: must be globally unique, lowercase letters/digits/hyphens only. Existing clients using the old slug will receive `404` until updated. A warning is returned on success.

**Response `200`:**
```json
{
  "slug": "acme-corporation",
  "warning": "Slug changed. Update your X-Tenant header to 'acme-corporation'."
}
```

---

#### Upload Workspace Logo

`POST /api/v1/workspace/logo/`

**Owner only.** Same constraints as avatar (5 MB max, JPEG/PNG/WebP). Resized to 128×128 px.

**Response `200`:** `{ "logo_url": "https://cdn.tasksaas.com/logos/uuid.png" }`

---

#### Delete Workspace Logo

`DELETE /api/v1/workspace/logo/`

**Owner only. Response `204 No Content`**

---

#### Deactivate Workspace

`POST /api/v1/workspace/deactivate/`

**Owner only.** Sets `is_active = false`. All members lose API access immediately. Stripe subscription is cancelled.

**Request:** `{ "confirm": "DEACTIVATE" }`

The string `"DEACTIVATE"` must be sent exactly — prevents accidental deactivation from buggy clients.

**Response `200`:** `{ "message": "Workspace deactivated." }`

---

## 7. Tenant Isolation

Isolation is a defence-in-depth strategy applied at five independent layers.

### Layer 1: Middleware (Request Boundary)

`TenantMiddleware` runs on every request:

```
1. X-Tenant header present?       NO → 400 missing_tenant_header
2. Slug matches a tenant?          NO → 404 tenant_not_found
3. Tenant is active?               NO → 403 tenant_inactive
4. User is a member?               NO → 403 tenant_access_denied
5. All checks pass:
   → attach request.tenant
   → attach request.membership
   → continue to view
```

### Layer 2: ViewSet Queryset (ORM Boundary)

Every tenant-scoped ViewSet inherits `TenantScopedModelMixin`:

```python
def get_queryset(self):
    return super().get_queryset().filter(tenant=self.request.tenant)
```

A request for a UUID belonging to Tenant B (while authenticated to Tenant A) returns `404 Not Found`, not `403` — returning `403` would confirm the resource exists, leaking cross-tenant information.

### Layer 3: Serializer (Write Boundary)

`tenant` is `read_only=True` in all serializers. `perform_create()` always injects it:

```python
def perform_create(self, serializer):
    serializer.save(tenant=self.request.tenant, created_by=self.request.user)
```

There is no code path where a user can set the tenant field via request body input.

### Layer 4: Database (Storage Boundary)

All tenant-scoped models carry composite indexes:

```python
class Meta:
    indexes = [
        models.Index(fields=["tenant", "id"]),
        models.Index(fields=["tenant", "created_at"]),
    ]
```

These ensure the `tenant_id` filter is always index-covered, preventing full-table scans as data grows.

### Layer 5: Automated Tests (Verification Boundary)

`tests/test_tenant_isolation.py` runs in CI and verifies:

- User from Tenant A cannot **list** Tenant B's resources
- User from Tenant A cannot **fetch by UUID** a resource in Tenant B (expects `404`)
- User from Tenant A cannot **update** or **delete** a resource in Tenant B (expects `404`)
- Missing `X-Tenant` header → `400`
- Nonexistent slug → `404`
- Valid slug, no membership → `403`
- Deactivated tenant → `403`

---

## 8. User Membership & Roles

### Membership Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenant` | FK → Tenant | The workspace |
| `user` | FK → User | The team member |
| `role` | Choice | `owner`, `admin`, `member` |
| `invited_by` | FK → User (nullable) | Who sent the invite |
| `joined_at` | DateTime | When membership was created |

**Unique constraint:** `(tenant, user)` — one membership per user per workspace.

A user can belong to multiple workspaces with different roles in each. The `X-Tenant` header determines which membership context applies.

### Membership Endpoints

#### List Members

`GET /api/v1/members/`

Visible to all workspace members.

**Response `200`:**
```json
{
  "count": 3,
  "results": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "email": "alice@acme.com",
        "display_name": "Alice Smith",
        "avatar_url": "https://..."
      },
      "role": "owner",
      "joined_at": "2025-01-15T09:00:00Z"
    }
  ]
}
```

---

#### Invite Member

`POST /api/v1/members/`

**Admin or Owner only.** Adds a user to the workspace by email.

Plan limit: if the workspace is on the free plan and already has `max_users` members → `403 plan_limit_reached`.

**Request:**
```json
{ "email": "bob@acme.com", "role": "member" }
```

**Success `201`:** Created membership object.

**User not found `404`** | **Already a member `400`**

---

#### Update Member Role

`PATCH /api/v1/members/{membership_id}/`

**Admin or Owner only.** Owners can change any role. Admins can only change `member` ↔ `admin`. Demoting the last owner → `400 cannot_demote_last_owner`.

**Request:** `{ "role": "admin" }`

---

#### Remove Member

`DELETE /api/v1/members/{membership_id}/`

**Admin or Owner only.** Cannot remove the last owner → `400 cannot_remove_last_owner`.

**Response `204 No Content`**

---

#### Leave Workspace

`DELETE /api/v1/members/me/`

Any authenticated member. Cannot leave if you are the last owner → `400 transfer_ownership_first`.

**Response `204 No Content`**

---

## 9. Role-Based Access Control

### Permission Matrix

| Action | Member | Admin | Owner |
|---|---|---|---|
| **Workspace** | | | |
| View workspace info | ✅ | ✅ | ✅ |
| Update name / logo | ❌ | ❌ | ✅ |
| Deactivate workspace | ❌ | ❌ | ✅ |
| **Members** | | | |
| View members | ✅ | ✅ | ✅ |
| Invite / remove members | ❌ | ✅ | ✅ |
| Change roles (member ↔ admin) | ❌ | ✅ | ✅ |
| Change owner role | ❌ | ❌ | ✅ |
| **Projects** | | | |
| View all projects | ✅ | ✅ | ✅ |
| Create project | ❌ | ✅ | ✅ |
| Edit project | ❌ | ✅ | ✅ |
| Delete project | ❌ | ❌ | ✅ |
| **Tasks** | | | |
| View all tasks | ✅ | ✅ | ✅ |
| Create task | ✅ | ✅ | ✅ |
| Edit / delete own task | ✅ | ✅ | ✅ |
| Edit / delete any task | ❌ | ✅ | ✅ |
| Assign task to any member | ❌ | ✅ | ✅ |
| Assign task to self | ✅ | ✅ | ✅ |
| **Comments** | | | |
| Post comment | ✅ | ✅ | ✅ |
| Edit / delete own comment | ✅ | ✅ | ✅ |
| Delete any comment | ❌ | ✅ | ✅ |
| **Dashboard & Reports** | | | |
| View admin dashboard | ❌ | ✅ | ✅ |
| Export CSV / PDF | ❌ | ✅ | ✅ |
| **Billing** | | | |
| View plan & invoices | ❌ | ❌ | ✅ |
| Upgrade / cancel plan | ❌ | ❌ | ✅ |

### Permission Classes

**`IsTenantMember`** — Applied to all tenant-scoped endpoints. Verifies `request.membership` exists.

**`IsTenantAdminOrOwner`** — Role must be `admin` or `owner`.

**`IsTenantOwner`** — Role must be `owner`.

**`IsResourceOwnerOrTenantAdmin`** — Applied to task/comment edit and delete. Allows if `request.user` is the resource creator OR role is `admin`/`owner`.

**`PlanLimitPermission`** — Checks workspace plan limits before member and project create operations.

### Permission Evaluation Order

```
1. Valid JWT?                         → 401 if not
2. X-Tenant header present?           → 400 if not
3. Tenant exists?                     → 404 if not
4. Tenant active?                     → 403 if not
5. User is a member?                  → 403 if not
6. User's role meets requirement?     → 403 if not
7. Plan limits satisfied?             → 403 if not
8. Resource belongs to this tenant?   → 404 if not
9. User can act on this resource?     → 403 if not
```

---

## 10. Projects Module

### Project Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenant` | FK → Tenant | Isolation key |
| `name` | String (max 120) | Required |
| `description` | Text | Optional |
| `color` | String (7 chars) | Hex colour e.g. `#6366F1` |
| `created_by` | FK → User | Auto-set |
| `created_at` | DateTime | Auto-set |
| `updated_at` | DateTime | Auto-updated |

**Plan limit:** Free plan max 5 projects. Attempting to create a 6th → `403 plan_limit_reached`.

### Project Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/projects/` | Member | List all tenant projects |
| `POST` | `/api/v1/projects/` | Admin, Owner | Create project |
| `GET` | `/api/v1/projects/{id}/` | Member | Project detail |
| `PATCH` | `/api/v1/projects/{id}/` | Admin, Owner | Update project |
| `DELETE` | `/api/v1/projects/{id}/` | Owner | Delete project (cascades tasks) |
| `GET` | `/api/v1/projects/{id}/board/` | Member | Kanban board grouped by status |
| `GET` | `/api/v1/projects/{id}/stats/` | Admin, Owner | Project statistics |

### Project List Response (per item)

```json
{
  "id": "uuid",
  "name": "Website Redesign",
  "description": "Full redesign of the marketing site.",
  "color": "#6366F1",
  "created_by": { "id": "uuid", "display_name": "Alice Smith", "avatar_url": "..." },
  "task_counts": { "todo": 8, "in_progress": 3, "in_review": 1, "done": 22, "total": 34 },
  "created_at": "2025-01-15T09:00:00Z",
  "updated_at": "2025-07-10T14:00:00Z"
}
```

### Board Endpoint

`GET /api/v1/projects/{id}/board/`

Returns all tasks grouped by status. Single request for board rendering — no client-side grouping needed.

```json
{
  "project": { "id": "uuid", "name": "Website Redesign", "color": "#6366F1" },
  "columns": {
    "todo": [ /* task objects, ordered by position ASC */ ],
    "in_progress": [ /* ... */ ],
    "in_review": [ /* ... */ ],
    "done": [ /* ... */ ]
  }
}
```

---

## 11. Tasks Module

### Task Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenant` | FK → Tenant | Isolation key |
| `project` | FK → Project | Must belong to same tenant |
| `title` | String (max 255) | Required |
| `description` | Text | Markdown supported |
| `status` | Choice | `todo`, `in_progress`, `in_review`, `done` |
| `priority` | Choice | `low`, `medium`, `high`, `urgent` |
| `due_date` | Date (nullable) | Optional deadline |
| `created_by` | FK → User | Auto-set from request.user |
| `assignee` | FK → User (nullable) | Must be a member of this tenant |
| `position` | Integer | Order within (project, status). Default: max+1 |
| `created_at` | DateTime | Auto-set |
| `updated_at` | DateTime | Auto-updated |

**Assignee validation:** Assignee must be a member of `request.tenant`. Cross-tenant assignee → `400 invalid_assignee`.

**Project validation:** Project must belong to `request.tenant`. → `400 invalid_project`.

`is_overdue` is a computed read-only field: `true` if `due_date < today AND status != 'done'`.

### Task Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/tasks/` | Member | List tasks with filters |
| `POST` | `/api/v1/tasks/` | Member | Create task |
| `GET` | `/api/v1/tasks/{id}/` | Member | Task detail |
| `PATCH` | `/api/v1/tasks/{id}/` | Creator / Admin / Owner | Update task |
| `DELETE` | `/api/v1/tasks/{id}/` | Creator / Admin / Owner | Delete task |
| `PATCH` | `/api/v1/tasks/{id}/move/` | Creator / Admin / Owner | Move task (status + position) |

### Task Create Request

```json
{
  "project": "uuid",
  "title": "Fix login redirect bug",
  "description": "After login, users land on `/` instead of `/dashboard`.",
  "status": "todo",
  "priority": "high",
  "assignee": "uuid",
  "due_date": "2025-08-01"
}
```

### Task Move Endpoint

`PATCH /api/v1/tasks/{id}/move/`

Designed for Kanban drag-and-drop. Backend handles adjacent task reordering in a single transaction.

```json
{ "status": "in_progress", "position": 0 }
```

`position: 0` = place at top. Omit to place at bottom of target column.

---

## 12. Task Filtering & Search

All filters are optional query parameters on `GET /api/v1/tasks/`.

| Parameter | Type | Example | Notes |
|---|---|---|---|
| `project` | UUID | `?project=uuid` | Filter by project |
| `status` | String | `?status=in_progress` | Comma-separated: `?status=todo,in_progress` |
| `priority` | String | `?priority=urgent` | Comma-separated: `?priority=high,urgent` |
| `assignee` | UUID | `?assignee=uuid` | Filter by assigned user |
| `assignee_me` | Boolean | `?assignee_me=true` | Tasks assigned to requesting user |
| `created_by` | UUID | `?created_by=uuid` | Filter by creator |
| `due_date_before` | ISO date | `?due_date_before=2025-12-31` | Inclusive |
| `due_date_after` | ISO date | `?due_date_after=2025-01-01` | Inclusive |
| `overdue` | Boolean | `?overdue=true` | due_date < today AND status ≠ done |
| `search` | String | `?search=login+bug` | Case-insensitive on title + description |
| `ordering` | String | `?ordering=-created_at` | Fields: `created_at`, `due_date`, `priority`, `status`, `position`. Prefix `-` for desc |

---

## 13. Comments Module

### Comment Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenant` | FK → Tenant | Isolation key |
| `task` | FK → Task | Parent task |
| `author` | FK → User | Auto-set from request.user |
| `body` | Text | Markdown supported |
| `edited` | Boolean | Set to `true` on first edit; permanent |
| `created_at` | DateTime | Auto-set |
| `updated_at` | DateTime | Auto-updated |

### Comment Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/tasks/{id}/comments/` | Member | List comments (oldest first) |
| `POST` | `/api/v1/tasks/{id}/comments/` | Member | Post comment |
| `PATCH` | `/api/v1/tasks/{id}/comments/{cid}/` | Author / Admin / Owner | Edit comment |
| `DELETE` | `/api/v1/tasks/{id}/comments/{cid}/` | Author / Admin / Owner | Delete comment |

### Comment List Response (per item)

```json
{
  "id": "uuid",
  "author": { "id": "uuid", "display_name": "Alice Smith", "avatar_url": "..." },
  "body": "Confirmed — also broken on Safari.",
  "edited": false,
  "created_at": "2025-07-15T10:30:00Z",
  "updated_at": "2025-07-15T10:30:00Z"
}
```

---

## 14. Task Activity Log

Every meaningful change to a task is recorded as an immutable activity event. Events are append-only — never updated or deleted.

### Activity Event Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tenant` | FK → Tenant | Isolation key |
| `task` | FK → Task | Parent task |
| `actor` | FK → User | Who performed the action |
| `event_type` | Choice | See table below |
| `data` | JSON | Before/after values |
| `created_at` | DateTime | Auto-set, never modified |

### Event Types

| Event Type | When | `data` Shape |
|---|---|---|
| `task_created` | Task created | `{}` |
| `title_changed` | Title updated | `{"from": "old", "to": "new"}` |
| `description_changed` | Description updated | `{}` (content not stored) |
| `status_changed` | Status updated | `{"from": "todo", "to": "in_progress"}` |
| `priority_changed` | Priority updated | `{"from": "medium", "to": "urgent"}` |
| `assignee_changed` | Assignee updated | `{"from": null, "to": {"id": "uuid", "display_name": "Bob"}}` |
| `due_date_changed` | Due date updated | `{"from": "2025-07-01", "to": "2025-08-01"}` |
| `comment_added` | Comment posted | `{"comment_id": "uuid"}` |
| `comment_deleted` | Comment deleted | `{"comment_id": "uuid"}` |

### Activity Endpoint

`GET /api/v1/tasks/{id}/activity/`

Returns events ordered newest-first.

```json
{
  "count": 4,
  "results": [
    {
      "id": "uuid",
      "actor": { "id": "uuid", "display_name": "Bob Jones", "avatar_url": "..." },
      "event_type": "status_changed",
      "data": { "from": "todo", "to": "in_progress" },
      "created_at": "2025-07-16T08:45:00Z"
    }
  ]
}
```

Activity is recorded via Django `post_save` signals that compare changed fields against the previous instance and create `ActivityEvent` records in bulk.

---

## 15. Notifications

### What Triggers a Notification

| Trigger | Recipients |
|---|---|
| Task assigned to a user | The assignee |
| Task due date is tomorrow | The assignee |
| Task is overdue (daily 08:00 UTC, Celery beat) | The assignee |
| Comment posted on a task | Task creator + assignee (if different from commenter) |
| User invited to workspace | The invited user |
| Task status changed by someone else | Task creator (if not the one who changed it) |

### Notification Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `recipient` | FK → User | Who receives this |
| `actor` | FK → User (nullable) | Who triggered it (null for system notifications) |
| `event_type` | String | e.g. `task_assigned`, `comment_added`, `due_date_reminder` |
| `task` | FK → Task (nullable) | Related task |
| `body` | String | Pre-rendered message |
| `is_read` | Boolean | `false` on creation |
| `created_at` | DateTime | Auto-set |

### Notification Endpoints

#### List My Notifications

`GET /api/v1/notifications/`

No `X-Tenant` required. User-scoped.

Query params: `?is_read=false`, `?limit=20` (max 50)

**Response `200`:**
```json
{
  "unread_count": 4,
  "count": 12,
  "results": [
    {
      "id": "uuid",
      "actor": { "display_name": "Alice Smith", "avatar_url": "..." },
      "event_type": "task_assigned",
      "body": "Alice Smith assigned you to 'Fix login redirect bug'",
      "task": { "id": "uuid", "title": "Fix login redirect bug", "project_id": "uuid", "workspace_slug": "acme-corp" },
      "is_read": false,
      "created_at": "2025-07-16T10:00:00Z"
    }
  ]
}
```

#### Mark as Read / Unread

`POST /api/v1/notifications/read/`
`POST /api/v1/notifications/unread/`

**Request:** `{ "ids": ["uuid", "uuid"] }` or `{ "all": true }`

**Response `200`:** `{ "updated": 3 }`

### Email Notifications (Celery)

Email is sent asynchronously via Celery workers, never synchronously in the request cycle.

Emails sent for: task assignment (immediate), due date reminders (daily digest at 08:00 UTC), workspace invites (immediate). Templates use Django's templating system with a simple responsive HTML layout.

---

## 16. Tenant Admin Dashboard

`GET /api/v1/workspace/dashboard/`

**Admin or Owner only.**

**Response `200`:**
```json
{
  "overview": {
    "total_members": 4,
    "total_projects": 6,
    "total_tasks": 89,
    "active_tasks": 34,
    "completed_tasks": 55,
    "overdue_tasks": 3
  },
  "tasks_by_status": { "todo": 18, "in_progress": 12, "in_review": 4, "done": 55 },
  "tasks_by_priority": { "low": 20, "medium": 35, "high": 25, "urgent": 9 },
  "recent_activity": [ /* last 10 ActivityEvents across all tenant tasks */ ],
  "members_summary": [
    {
      "user": { "id": "uuid", "display_name": "Alice Smith" },
      "role": "owner",
      "assigned_tasks": 12,
      "completed_tasks": 8
    }
  ],
  "projects_summary": [
    {
      "id": "uuid",
      "name": "Website Redesign",
      "task_counts": { "todo": 5, "in_progress": 3, "in_review": 1, "done": 12 }
    }
  ]
}
```

---

## 17. SaaS Plans & Limits

### Plan Definitions

| Feature | Free | Pro | Enterprise |
|---|---|---|---|
| Max members | 3 | Unlimited | Unlimited |
| Max projects | 5 | Unlimited | Unlimited |
| Comments + Activity log | ✅ | ✅ | ✅ |
| CSV export | ❌ | ✅ | ✅ |
| PDF export | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ |
| Custom subdomain | ❌ | ❌ | ✅ |
| Price | Free | $12/month | Custom |

### Plan Limit Enforcement

Enforced via `PlanLimitPermission` on every `POST` for members and projects:

```json
{
  "error": "plan_limit_reached",
  "limit": "members",
  "current": 3,
  "max": 3,
  "upgrade_url": "https://app.tasksaas.com/billing"
}
```

Plan and limits are stored directly on the `Tenant` model. When a Stripe webhook confirms an upgrade, `tenant.plan`, `tenant.max_users`, and `tenant.max_projects` are updated atomically.

---

## 18. Stripe Billing Integration

The backend never stores credit card data. Stripe customer and subscription IDs are stored on the `Tenant` model.

### Billing Endpoints

#### Get Billing Status

`GET /api/v1/billing/`

**Owner only.**

```json
{
  "plan": "free",
  "stripe_customer_id": "cus_xxx",
  "stripe_subscription_id": null,
  "subscription_status": null,
  "current_period_end": null,
  "cancel_at_period_end": false,
  "invoices": []
}
```

---

#### Create Checkout Session (Upgrade)

`POST /api/v1/billing/checkout/`

**Owner only.** Creates a Stripe Checkout Session. Returns a URL the frontend redirects to.

**Request:** `{ "plan": "pro" }`

**Response `200`:** `{ "checkout_url": "https://checkout.stripe.com/pay/cs_xxx" }`

---

#### Cancel Subscription

`POST /api/v1/billing/cancel/`

**Owner only.** Sets `cancel_at_period_end = true`. Workspace retains Pro features until the period ends.

**Response `200`:** `{ "cancel_date": "2025-08-15T00:00:00Z" }`

---

#### List Invoices

`GET /api/v1/billing/invoices/`

**Owner only.**

```json
{
  "results": [
    {
      "id": "in_xxx",
      "amount_paid": 1200,
      "currency": "usd",
      "status": "paid",
      "period_start": "2025-07-01T00:00:00Z",
      "period_end": "2025-08-01T00:00:00Z",
      "invoice_pdf": "https://stripe.com/invoice/xxx.pdf"
    }
  ]
}
```

---

### Stripe Webhook Handler

`POST /api/v1/billing/webhook/`

Unauthenticated. Validates `Stripe-Signature` header. Invalid signatures → `400`.

| Stripe Event | Action |
|---|---|
| `checkout.session.completed` | Set customer/subscription IDs on Tenant, upgrade plan |
| `customer.subscription.updated` | Update plan and limits |
| `customer.subscription.deleted` | Downgrade to free plan |
| `invoice.payment_failed` | Log, email owner |
| `invoice.payment_succeeded` | Update `current_period_end` |

All webhook handlers are idempotent — replaying the same event produces the same result.

---

## 19. Reporting & Exports

### Workspace Stats

`GET /api/v1/reporting/stats/`

**Admin or Owner only. Pro plan required.**

Query params: `?range=week` (default), `?range=month`, `?range=quarter`

**Response `200`:**
```json
{
  "range": "month",
  "tasks_created": 34,
  "tasks_completed": 28,
  "tasks_overdue": 3,
  "completion_rate": 82.4,
  "completed_by_week": [
    { "week_start": "2025-07-01", "completed": 8 },
    { "week_start": "2025-07-08", "completed": 11 }
  ],
  "member_productivity": [
    {
      "user": { "id": "uuid", "display_name": "Alice Smith" },
      "tasks_assigned": 15,
      "tasks_completed": 13,
      "completion_rate": 86.7
    }
  ]
}
```

---

### Export Tasks as CSV

`GET /api/v1/reporting/export/csv/`

**Admin or Owner only. Pro plan required.**

Accepts same filter params as `GET /api/v1/tasks/`. Returns `text/csv` file download.

CSV headers:
```
Task ID, Title, Project, Status, Priority, Assignee, Due Date, Created By, Created At, Updated At
```

---

### Export Tasks as PDF

`GET /api/v1/reporting/export/pdf/`

**Admin or Owner only. Pro plan required.**

Returns `application/pdf` — a formatted report including workspace name, export date, filters applied, and task table.

---

## 20. Swagger / OpenAPI Documentation

**Library:** `drf-spectacular`

| URL | Purpose |
|---|---|
| `/api/v1/docs/` | Swagger UI (interactive, test requests from browser) |
| `/api/v1/docs/redoc/` | ReDoc UI (cleaner read-only format for sharing) |
| `/api/v1/schema/` | Raw OpenAPI 3.0 JSON schema (for SDK generation) |

Every ViewSet action must include `@extend_schema(summary=..., description=..., tags=[...], responses={...})` decorators. The Swagger UI includes a Bearer token input field so developers can authenticate and test endpoints directly.

---

## 21. Deployment & Production Config

### Required Environment Variables

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=api.tasksaas.com
DJANGO_SETTINGS_MODULE=config.settings.prod

# Database
DB_NAME=tasksaas
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=db
DB_PORT=5432

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=15
REFRESH_TOKEN_LIFETIME_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=https://app.tasksaas.com

# Storage (S3-compatible)
USE_S3=True
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=tasksaas-media
AWS_S3_REGION_NAME=us-east-1
AWS_S3_CUSTOM_DOMAIN=cdn.tasksaas.com

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your_sendgrid_api_key
DEFAULT_FROM_EMAIL=noreply@tasksaas.com

# Celery / Redis
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
```

### Production Security Checklist

- `DEBUG = False`
- `SECRET_KEY` randomly generated, never in source control
- `ALLOWED_HOSTS` contains only production domains
- `SECURE_SSL_REDIRECT = True`
- `SESSION_COOKIE_SECURE = True`
- `CSRF_COOKIE_SECURE = True`
- `SECURE_HSTS_SECONDS = 31536000`
- `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`
- `SECURE_CONTENT_TYPE_NOSNIFF = True`
- `X_FRAME_OPTIONS = 'DENY'`
- CORS: no wildcard in production
- Login rate limiting via `django-axes`
- General rate limiting via `django-ratelimit`

### Gunicorn

```bash
gunicorn config.wsgi:application \
  --workers 4 \
  --worker-class gthread \
  --threads 2 \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
```

### Celery

```bash
# Worker
celery -A config worker --loglevel=info --concurrency=4

# Beat scheduler (for due date reminders)
celery -A config beat --loglevel=info \
  --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Logging

Structured JSON logs in production (via `python-json-logger`). Fields: `timestamp`, `level`, `logger`, `message`, `request_id`, `user_id`, `tenant_slug`. `ERROR`+ sent to Sentry; `WARNING`+ to log aggregator; `DEBUG` only in development.

---

## 22. Error Reference

All errors use this envelope:
```json
{ "error": "machine_readable_code", "detail": "Human-readable message or field-level error map" }
```

| HTTP | Code | When |
|---|---|---|
| 400 | `missing_tenant_header` | `X-Tenant` header absent |
| 400 | `validation_error` | Request body invalid; `detail` is field→errors map |
| 400 | `invalid_token` | Password reset token invalid or expired |
| 400 | `passwords_do_not_match` | `new_password` ≠ `confirm_password` |
| 400 | `cannot_demote_last_owner` | Changing the only owner's role |
| 400 | `cannot_remove_last_owner` | Removing the only owner |
| 400 | `transfer_ownership_first` | Last owner trying to leave |
| 400 | `invalid_assignee` | Assignee not a member of this tenant |
| 400 | `invalid_project` | Project not in this tenant |
| 400 | `already_a_member` | User already has a membership here |
| 401 | `authentication_failed` | JWT missing, malformed, or invalid |
| 401 | `token_expired` | Access token expired; client should refresh |
| 403 | `tenant_inactive` | Workspace `is_active = false` |
| 403 | `tenant_access_denied` | No membership in this tenant |
| 403 | `insufficient_role` | Role does not permit this action |
| 403 | `plan_limit_reached` | Workspace hit a plan limit |
| 403 | `plan_feature_unavailable` | Feature requires a higher plan |
| 404 | `tenant_not_found` | Slug in `X-Tenant` matches no tenant |
| 404 | `not_found` | Resource doesn't exist or is in another tenant |
| 429 | `rate_limited` | Too many requests; `detail.retry_after` in seconds |
| 500 | `server_error` | Unhandled internal exception |

---

## 23. Running Locally

```bash
# 1. Clone and set up environment
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY, DB credentials

# 3. Create the database
createdb tasksaas

# 4. Apply migrations
python manage.py migrate --settings=config.settings.dev

# 5. Create a Django superuser
python manage.py createsuperuser --settings=config.settings.dev

# 6. (Optional) Load seed data
python manage.py loaddata fixtures/dev_seed.json --settings=config.settings.dev

# 7. Start the dev server
python manage.py runserver --settings=config.settings.dev

# 8. Start Celery worker (separate terminal)
celery -A config worker --loglevel=debug

# 9. Start Celery beat (separate terminal)
celery -A config beat --loglevel=debug

# Run all tests
python manage.py test tests --settings=config.settings.dev -v 2

# Run with coverage
coverage run manage.py test tests --settings=config.settings.dev
coverage report --omit="*/migrations/*,*/tests/*"
```

### Local API Docs

```
Swagger UI:  http://localhost:8000/api/v1/docs/
ReDoc:       http://localhost:8000/api/v1/docs/redoc/
Raw schema:  http://localhost:8000/api/v1/schema/
```