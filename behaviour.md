# TaskSaaS — Complete Behaviour & Design Specification

> **UI Style:** Bold & Modern (Linear-inspired)
> **Audience:** Small teams & startups
> **Theme:** Dark-first, light mode toggle
> **Frontend Stack:** React · Tailwind CSS · shadcn/ui
> **Version:** 2.0

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Colour System](#2-colour-system)
3. [Typography](#3-typography)
4. [Spacing & Grid](#4-spacing--grid)
5. [Application Shell & Layout](#5-application-shell--layout)
6. [Authentication Screens](#6-authentication-screens)
7. [Password Management Screens](#7-password-management-screens)
8. [User Profile Screen](#8-user-profile-screen)
9. [Tenant Switcher](#9-tenant-switcher)
10. [Workspace Settings Screen](#10-workspace-settings-screen)
11. [Role-Based UI Behaviour](#11-role-based-ui-behaviour)
12. [User Membership Screen](#12-user-membership-screen)
13. [Project List Screen](#13-project-list-screen)
14. [Kanban Board](#14-kanban-board)
15. [Task List View](#15-task-list-view)
16. [Task Detail Drawer](#16-task-detail-drawer)
17. [Task Comments](#17-task-comments)
18. [Activity Log Tab](#18-activity-log-tab)
19. [Notifications](#19-notifications)
20. [Admin Dashboard](#20-admin-dashboard)
21. [Billing & Plans Screen](#21-billing--plans-screen)
22. [Reporting & Exports](#22-reporting--exports)
23. [Empty & Loading States](#23-empty--loading-states)
24. [Motion & Transitions](#24-motion--transitions)
25. [Keyboard Shortcuts](#25-keyboard-shortcuts)
26. [Responsive Behaviour](#26-responsive-behaviour)
27. [Component Library Reference](#27-component-library-reference)

---

## 1. Design Philosophy

TaskSaaS should feel like software built by engineers who also genuinely care about design. Not a design portfolio masquerading as a product — a tool that gets out of the way and lets teams do their best work.

### Core Principles

**Speed is the primary feature.** Every interaction must feel near-instant. Skeleton loaders appear within 50ms. Optimistic UI updates fire before the API responds. No user action should make the interface wait visibly.

**Dark by default, always polished.** Dark mode is the primary experience. Long working sessions deserve low eye-strain defaults. Light mode is fully supported but treated as a preference, not the baseline.

**Roles are invisible.** Members should not encounter greyed-out buttons or disabled states everywhere. If they lack permission, the control simply does not appear. Exception: if a role-restricted action is triggered via keyboard shortcut, a brief, non-accusatory toast explains why.

**Progressive disclosure.** The initial view shows only the most relevant information. Filters, bulk actions, advanced settings, and secondary metadata live one level deeper — accessible but not intrusive.

**Errors are calm and specific.** Validation errors are inline, below the relevant field, in quiet red text — not modal alerts or aggressive toasts. Toasts are reserved for action confirmations, not form failures.

**Spatial consistency.** The sidebar, top bar, and primary content area never shift as the user navigates. Users should develop muscle memory for where controls live.

---

## 2. Colour System

All colours are defined as CSS custom properties on `:root.dark` and `:root.light`. The `<html>` element receives `class="dark"` or `class="light"` based on user preference, stored in `localStorage`.

### Dark Theme (Default)

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#0F0F10` | Root app background |
| `--bg-surface` | `#1A1A1D` | Cards, sidebar, modals, drawers |
| `--bg-elevated` | `#242428` | Hover states, dropdowns, tooltips |
| `--bg-highlight` | `#2E2E38` | Selected rows, active nav items |
| `--border` | `#2A2A32` | Card borders, dividers, input borders |
| `--border-focus` | `#6366F1` | Input focus ring |
| `--text-primary` | `#F0F0F2` | Headings, body text, button labels |
| `--text-secondary` | `#8B8B98` | Metadata, timestamps, secondary labels |
| `--text-muted` | `#55555F` | Placeholder text, disabled elements |
| `--accent` | `#6366F1` | Primary CTA, active nav, links, focus rings |
| `--accent-hover` | `#4F52DA` | Hover state on accent elements |
| `--accent-subtle` | `rgba(99,102,241,0.12)` | Tag backgrounds, soft highlights |
| `--success` | `#22C55E` | Done status, success toasts, positive stats |
| `--success-subtle` | `rgba(34,197,94,0.12)` | Done column header, success badge bg |
| `--warning` | `#F59E0B` | In-review status, due-soon indicator |
| `--warning-subtle` | `rgba(245,158,11,0.12)` | Warning badge bg |
| `--danger` | `#EF4444` | Urgent priority, destructive actions, overdue |
| `--danger-subtle` | `rgba(239,68,68,0.12)` | Urgent badge bg, error states |
| `--info` | `#3B82F6` | In-progress status, info toasts |
| `--info-subtle` | `rgba(59,130,246,0.12)` | In-progress column header |

### Light Theme

| Token | Hex |
|---|---|
| `--bg-base` | `#F8F8FA` |
| `--bg-surface` | `#FFFFFF` |
| `--bg-elevated` | `#F1F1F5` |
| `--bg-highlight` | `#EBEBF5` |
| `--border` | `#E2E2EA` |
| `--text-primary` | `#111114` |
| `--text-secondary` | `#68687A` |
| `--text-muted` | `#A0A0AE` |
| `--accent` | `#4F52DA` |

All status and priority colours remain the same across both themes for consistency.

---

## 3. Typography

**Primary font:** `Inter` — loaded via Google Fonts or self-hosted for performance.

**Monospace font:** `JetBrains Mono` — used for UUIDs, code snippets in task descriptions, and API key display.

| Element | Weight | Size | Line Height | Letter Spacing |
|---|---|---|---|---|
| App name / logo | 700 | 16px | 1.0 | -0.02em |
| Page title (H1) | 600 | 22px | 1.2 | -0.02em |
| Section heading (H2) | 600 | 16px | 1.3 | -0.01em |
| Card / item title | 500 | 14px | 1.4 | 0 |
| Body text | 400 | 14px | 1.6 | 0 |
| Secondary / meta | 400 | 12px | 1.5 | 0 |
| Button label | 500 | 14px | 1.0 | 0 |
| Badge / tag | 500 | 11px | 1.0 | 0.02em |
| Monospace | 400 | 12px | 1.6 | 0 |

Numbers in counts and stats use `font-variant-numeric: tabular-nums` for consistent column alignment.

---

## 4. Spacing & Grid

Base unit: `4px`. All spacing values are multiples of 4.

Common values: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64px`

- Sidebar width: **240px** (desktop fixed), **52px** (tablet icon rail), **full-screen drawer** (mobile)
- Top bar height: **52px** (sticky)
- Task card padding: **12px 14px**
- Card border-radius: **8px** (small: 6px, modal: 12px)
- Page content max-width: **1200px** (centred on large screens)
- Page content padding: **24px** (desktop), **16px** (mobile)

---

## 5. Application Shell & Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)              │  MAIN AREA                       │
│  ─────────────────────────────────  │  ───────────────────────────────  │
│  [App Logo]  [Workspace name  ▾]    │  TOP BAR (52px sticky)            │
│                                     │  [Breadcrumb]      [Plan] [CTA]  │
│  ─ My Work ──────────────────────   │  ──────────────────────────────── │
│  ◎  Inbox              (3)          │                                   │
│  ◎  My Tasks                        │  PAGE CONTENT (scrollable)        │
│                                     │  padding: 24px                    │
│  ─ Projects ─────────────────────   │                                   │
│  ▸  Website Redesign                │                                   │
│  ▸  Mobile App                      │                                   │
│     + New Project                   │                                   │
│                                     │                                   │
│  ─ Team ─────────────────────────   │                                   │
│  ◎  Members                         │                                   │
│  ◎  Dashboard        [Admin badge]  │                                   │
│                                     │                                   │
│  ─ Settings ─────────────────────   │                                   │
│  ◎  Workspace                       │                                   │
│  ◎  Billing                         │                                   │
│                                     │                                   │
│  ──────────────────────────────     │                                   │
│  [🌙] [Bell (3)]  [Avatar] Alice ▸  │                                   │
└─────────────────────────────────────┴───────────────────────────────────┘
```

### Sidebar Details

- Background: `--bg-surface`, right border: `1px solid --border`
- Section labels: `--text-muted`, 11px, uppercase, letter-spacing 0.06em
- Nav item height: 36px, border-radius 6px, padding 0 8px
- Active item: `background: --bg-highlight`, `border-left: 3px solid --accent`, `color: --text-primary`
- Hover item: `background: --bg-elevated`, `color: --text-primary`, 100ms ease
- Unread badge: `background: --accent-subtle`, `color: --accent`, 10px font-size, min-width 18px, border-radius 9px
- Dashboard and Billing nav items only visible to admins/owners (conditionally rendered)

### Top Bar

- Background: `--bg-base` with `backdrop-filter: blur(8px)`
- Border-bottom: `1px solid --border`
- Left: breadcrumb trail (`Workspace › Project Name`)
- Right: plan badge (e.g., "Free" in `--warning-subtle` / "Pro" in `--accent-subtle`) + primary CTA button (contextual)

### Plan Badge in Top Bar

Shows the current workspace plan. Clicking it navigates to `/settings/billing` (Owners only).

| Plan | Badge style |
|---|---|
| Free | `--warning-subtle` background, `--warning` text |
| Pro | `--accent-subtle` background, `--accent` text |
| Enterprise | `--success-subtle` background, `--success` text |

---

## 6. Authentication Screens

### Shared Layout

All auth screens (login, register, forgot password, reset password) share a layout: full-viewport dark page, subtle indigo radial gradient from centre, centred card.

- Page background: `#0A0A0B` + `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.06), transparent)`
- Card: `--bg-surface`, border `--border`, border-radius 12px, padding 40px, max-width 440px, `box-shadow: 0 24px 64px rgba(0,0,0,0.5)`
- Logo: centred above the card — app icon (32px) + app name in `--text-primary`, 18px, weight 700

---

### Login Screen (`/login`)

Elements, top to bottom:
1. "Welcome back" — H1, 22px, weight 600
2. "Sign in to your workspace" — 14px, `--text-secondary`
3. Email input (label above, not placeholder-only)
4. Password input with show/hide toggle (eye icon button, right edge)
5. "Forgot password?" — 12px, `--accent`, right-aligned above the button
6. "Sign in" button — full width, `--accent` background, border-radius 8px, height 44px
7. Divider line with centred "or" text, `--text-muted`
8. "Create an account →" — centred link

**Submit behaviour:**
- Button: label replaced with 16px spinner while in flight; disabled during request
- On success: redirect to `/` (routes to user's most recently accessed workspace, or workspace picker if multiple)
- On failure: red inline error message below the password field — never a toast for auth errors

**Field validation:**
- Email: validated on blur only
- Empty submit: both fields get red border + "This field is required" below each

---

### Register Screen (`/register`)

Form fields:
1. First name + Last name — side by side on desktop, stacked on mobile
2. Email
3. Password — with live strength meter below (appears once typing begins)
4. Toggle: **"Create a new workspace"** — on by default, slide-down animation (200ms ease)
5. If toggle ON: Workspace name input

**Password strength meter:**
- Four equal segments below the password field
- Fills progressively: `--danger` → `--warning` → `--info` → `--success`
- Label: "Weak" / "Fair" / "Good" / "Strong" in matching colour, 12px

**Submit behaviour:**
- On success: redirect to new workspace's project list with a one-time welcome toast: "Welcome to TaskSaaS! Your workspace is ready."
- On failure: field-level errors appear inline beneath each invalid field

---

## 7. Password Management Screens

### Forgot Password (`/forgot-password`)

Card layout (same as auth screens). Email input + "Send reset link" button + "← Back to sign in" link.

After submit: the button becomes a green checked state ("Email sent ✓"). Below the button: "If an account exists for that email, a link will arrive within a few minutes. Check your spam folder." Button stays in sent state — no second submit without page refresh.

---

### Reset Password (`/reset-password?token=...&uid=...`)

On page load: silently validate the token via `GET /api/v1/auth/password/reset/validate/`.

**If invalid/expired:** show an error card — no form, just: "This reset link has expired or is invalid." + "Request a new link" button.

**If valid:** show the reset form — New password (with strength meter) + Confirm password + "Set new password" button.

On success: full-card success state — "Password updated! You can now sign in." + "Sign in →" button. No auto-redirect — users should explicitly click.

---

### Change Password (In-App, Authenticated)

Located at `/settings/security` as a form section within a card.

Fields:
1. Current password
2. New password (with strength meter)
3. Confirm new password
4. "Update password" button — secondary style (border, not fill)

On success: green inline success text below the button: "Password updated. All other devices have been signed out." The form clears. No page transition.

On wrong current password: red inline error below the current password field only.

---

## 8. User Profile Screen

Route: `/settings/profile`

Two-column layout: 300px left column for avatar section, flex-1 right column for form.

### Avatar Section

- Large circle, 96px diameter
- User's avatar or initials-based generated avatar (colour derived deterministically from UUID; always consistent across sessions)
- Hover: dark overlay with camera icon + "Change photo" text (100ms fade)
- Click: opens file picker (JPEG/PNG/WebP, max 5 MB)
- After file selected: inline square-crop modal appears with rounded preview
- Confirm → upload → avatar updates in-place with fade transition
- "Remove photo" link below avatar — only shown if a custom avatar is set

### Form Fields

| Field | Input type | Notes |
|---|---|---|
| First name | Text | |
| Last name | Text | |
| Email | Read-only text + lock icon | Tooltip: "Email cannot be changed yet" |

"Save changes" button — primary style. Disabled until a field is dirtied.

On save: inline "Saved ✓" text appears next to the button for 2 seconds, then fades.

### Stats Row (below form)

Three small stat tiles in a row:
- Member since: formatted date (e.g., "January 15, 2025")
- Workspaces: count
- Tasks completed: lifetime count

---

## 9. Tenant Switcher

Located in the sidebar header — shows current workspace name + chevron-down icon.

### Behaviour

Clicking opens a **popover dropdown** anchored below the header (not a modal).

**Dropdown contents:**
- All workspaces the user belongs to — each row: workspace name + role badge
- Active workspace: checkmark on right
- Divider
- "Create new workspace" at the bottom with a `+` icon (navigates to `/create-workspace`)

**Selecting a different workspace:**
- Updates active tenant context (updates `X-Tenant` header in all subsequent requests)
- Navigates to that workspace's project list
- Sidebar workspace name updates with a 150ms crossfade
- No full page reload — React context updates

**Role badges in dropdown:**

| Role | Badge |
|---|---|
| Owner | `--accent-subtle` background, `--accent` text |
| Admin | `--info-subtle` background, `--info` text |
| Member | `--bg-elevated` background, `--text-secondary` text |

---

## 10. Workspace Settings Screen

Route: `/settings/workspace` (Owner only — sidebar link hidden for others)

Two sections:

### General Settings Card

Fields:
- Workspace name (text input)
- Workspace slug (text input, monospace font) — shows current slug + warning text: "Changing the slug will invalidate any existing API integrations using the old slug."
- Workspace logo — 64px circle preview + "Upload logo" button + "Remove" link

"Save changes" button. On success: toast "Workspace settings updated."

If slug changes: additional yellow inline warning in the response: "Your X-Tenant header must now use 'new-slug'."

### Danger Zone Card

Red-bordered card at the bottom. Title: "Danger Zone". Contents:

- "Deactivate workspace" — descriptive text: "This will immediately revoke access for all members and cancel your subscription." + "Deactivate" button (outlined red, not filled)
- Clicking Deactivate: opens a confirmation modal requiring the user to type `DEACTIVATE` into a text field before the confirm button activates

---

## 11. Role-Based UI Behaviour

The interface adapts silently based on the current user's role in the active workspace.

### Element Visibility Rules

| UI Element | Member | Admin | Owner |
|---|---|---|---|
| "New Project" button | Hidden | Visible | Visible |
| Project ··· → Edit | Hidden | Visible | Visible |
| Project ··· → Delete | Hidden | Hidden | Visible |
| "Invite Member" button | Hidden | Visible | Visible |
| Member role dropdown | Displays own role (static) | Editable | Editable |
| Member ··· → Remove | Hidden | Visible | Visible |
| "Dashboard" nav item | Hidden | Visible | Visible |
| "Billing" nav item | Hidden | Hidden | Visible |
| "Workspace settings" nav item | Hidden | Hidden | Visible |
| Task ··· → Edit (others') | Hidden | Visible | Visible |
| Task ··· → Delete (others') | Hidden | Visible | Visible |
| Comment ··· → Delete (others') | Hidden | Visible | Visible |
| Export CSV / PDF buttons | Hidden | Visible | Visible |

### Keyboard Shortcut Role Intercept

If a user triggers a role-restricted action via keyboard shortcut:

```
Toast (info type, 3 seconds, no dismiss button):
"You don't have permission to create projects. Ask an admin or owner."
```

---

## 12. User Membership Screen

Route: `/settings/members`

Visible to all members; editing capabilities depend on role.

### Page Header

- Title: "Team" · Subtitle: `4 members`
- Right: "Invite Member" button (Admin/Owner only) · Plan badge with member limit ("3 / 3 members — Upgrade for more" on free plan)

### Members Table

Columns: **Member** (avatar + name + email) · **Role** · **Joined** · **Actions**

| Column | Detail |
|---|---|
| Member | 32px avatar + display name (bold, 14px) + email below (12px, `--text-secondary`) |
| Role | Badge pill + dropdown arrow if editable by current user |
| Joined | "2 months ago" — tooltip shows full ISO date |
| Actions | `···` icon button, appears on row hover |

**Role dropdown (editable rows):**
- Clicking the role badge opens an inline `<select>`-style popover with available role options
- Owners see all roles; Admins see `Member` and `Admin` only
- Selecting a new role fires `PATCH /api/v1/members/{id}/` immediately
- While saving: dropdown shows a 12px spinner; row is non-interactive
- On success: role badge updates in-place, brief "✓" flash
- On error: toast "Failed to update role"

**Actions menu (···):**
- "View profile" — opens a profile popover (avatar, name, email, role, joined date)
- "Remove from workspace" — confirmation modal before proceeding (Admin/Owner only)
- "Transfer ownership" — confirmation modal (Owner only, when viewing a non-owner)

### "Invite Member" Modal

Fields:
- Email (autofocus, required)
- Role (dropdown, defaults to Member)

"Send Invite" button — disabled until email is filled.

On success: modal closes, new row slides into table, toast: "Invitation sent to bob@acme.com."

On error (user not found): inline error below email field: "No account found. They'll need to register first."

On plan limit: modal shows plan limit warning banner before the fields: "Your workspace is at the member limit (3/3). Upgrade to Pro to add more." The email field is hidden; only an "Upgrade Plan" button is shown.

### Leave Workspace

At the bottom of the members page (for non-owner members only): small "Leave this workspace" link, `--danger` colour, 12px. Clicking shows a confirmation modal. If the user is the last owner, the modal prevents leaving and says "Transfer your ownership first."

---

## 13. Project List Screen

Route: `/` or `/projects/`

### Layout

3-column grid on desktop, 2 on tablet, 1 on mobile. Gap: 16px.

### Project Card

- Background: `--bg-surface`, border: `1px solid --border`, border-radius 10px, padding 20px
- Top accent bar: 4px height, full card width, background = project's `color` field, top border-radius only
- Project name: 15px, weight 500, `--text-primary`
- Description: 2-line clamp, 13px, `--text-secondary`
- Task count pills (below description): small coloured pills per status — "8 todo · 3 in progress · 1 in review · 22 done"
- Bottom row: creator avatar (20px) + "Created by Alice" (12px, `--text-secondary`) + date (right-aligned)
- Hover: `border-color` transitions to `--accent`, `box-shadow: 0 0 0 1px --accent`, translate Y -1px — all 150ms ease
- `···` icon button top-right: appears on hover — Edit / Delete (role-gated)
- Click (anywhere except `···`): navigate to project board

### "New Project" Button

Top-right of page header. Opens a modal (Admin/Owner only — button not rendered for members).

**New Project Modal:**
- Project name (autofocus, required)
- Description (optional, 3-row textarea)
- Colour picker: 8 swatch circles — indigo, violet, sky, emerald, amber, rose, slate, orange
- "Create project" button disabled until name is filled
- On create: modal closes, new card slides into grid, toast "Project created"

On plan limit (free, 5 projects reached): button is hidden; instead a subtle banner shows at top of page: "You've reached the 5-project limit on the Free plan. Upgrade to Pro for unlimited projects." with an "Upgrade" link.

---

## 14. Kanban Board

Route: `/projects/{slug}/board`

### Board Layout

Four equal-width columns in a horizontally scrollable container. Column width: 300px. Gap: 12px. Columns have a min-height to fill the viewport.

```
[ To Do (8) ]     [ In Progress (3) ]    [ In Review (1) ]    [ Done (22) ]
┌───────────┐     ┌─────────────────┐    ┌──────────────┐    ┌────────────┐
│  card     │     │  card           │    │  card        │    │  card      │
│  card     │     │  card           │    └──────────────┘    │  card      │
│  card     │     │  card           │    + Add task          │  card ...  │
│  ...      │     │  + Add task     │                         │  + Add     │
│  + Add    │     └─────────────────┘                        └────────────┘
└───────────┘
```

### Column Header

- Status name: 13px, weight 600, `--text-primary`
- Count badge: `--bg-elevated` background, `--text-secondary`, 10px, border-radius 10px, padding 2px 7px
- Left accent line: 3px × 20px vertical bar in status colour

| Status | Header accent | Status colour |
|---|---|---|
| To Do | `--text-muted` | (no colour) |
| In Progress | `--info` | `#3B82F6` |
| In Review | `--warning` | `#F59E0B` |
| Done | `--success` | `#22C55E` |

### Task Card (Kanban)

- Background: `--bg-surface`, border: `1px solid --border`, border-radius 8px, padding 12px 14px
- Cursor: `grab` on hover
- **Title:** 14px, weight 500, `--text-primary`, 3-line clamp
- **Priority badge:** top-right corner pill

| Priority | Text colour | Background |
|---|---|---|
| Urgent | `--danger` | `--danger-subtle` |
| High | `--warning` | `--warning-subtle` |
| Medium | `--accent` | `--accent-subtle` |
| Low | `--text-muted` | `--bg-elevated` |

- **Bottom row:**
  - Left: due date badge — "Aug 1", 11px, turns `--danger` + red bg if overdue, `--warning` + amber bg if due within 2 days
  - Left (after due date): comment count bubble (speech icon + number), 11px, `--text-secondary`
  - Right: assignee avatar circle, 24px; initials fallback if no photo
- **Hover:** `box-shadow: 0 4px 16px rgba(0,0,0,0.35)`, translateY(-1px), 120ms ease
- **Click** (not drag): opens Task Detail Drawer

### Drag and Drop

- **Drag start:** card opacity → 0.5, a ghost placeholder appears at the origin with a dashed `--border` border and `--bg-elevated` background
- **Drag over column:** column background washes to `--accent-subtle`, 100ms
- **Drop (same column):** optimistic position update — card snaps to position immediately, `PATCH /tasks/{id}/move/` fires in background
- **Drop (new column):** card disappears from origin column, appears at drop position in new column immediately; `PATCH /tasks/{id}/move/` fires with new `status` + `position`
- **API failure:** card snaps back to original position + toast "Couldn't save that change. Please try again."

### "+ Add Task" Button

Ghost row at the bottom of each column.

- Text: `+ Add task`, `--text-muted`, 13px
- Hover: `--text-secondary`, `background: --bg-elevated`, border-radius 6px

Clicking opens an **inline quick-create form** within the column (not a modal):
- Text input, autofocused, placeholder "Task title..."
- Enter to create (status pre-set to this column's status)
- Escape to dismiss without saving
- New card slides in at top of column

---

## 15. Task List View

Route: `/projects/{slug}/list`

### View Toggle

In the project top bar (right side): two icon buttons — Kanban grid icon / List icon. Active view is visually highlighted (accent bg). Selection persists per-project in `localStorage`.

### List Table

Sticky column headers. Row height: 40px.

| Column | Width | Content |
|---|---|---|
| Priority | 32px | Coloured dot (Urgent=red, High=amber, Medium=indigo, Low=grey) |
| Title | flex-grow | Task title, 14px, weight 500. Truncated at 1 line. Click → opens Drawer |
| Assignee | 32px | Avatar circle (24px). Tooltip on hover: full name |
| Due Date | 80px | "Aug 1" format. Red if overdue, amber if ≤2 days |
| Status | 100px | Badge pill |
| ··· | 32px | Row actions — visible on row hover |

- Row hover: `background: --bg-elevated`, 80ms ease
- Row actions (···) menu: Edit / Change status / Assign / Delete (role-gated)

### Multi-Select & Bulk Actions

- Checkbox appears on left of row on hover; stays visible when checked
- `Shift+click` for range select
- **Bulk actions bar** (slides up from bottom, 48px, when ≥1 task selected):
  - `[N] tasks selected` · Assign to · Change status · Change priority · Delete · `× Clear`
  - Bar background: `--bg-elevated`, border-top: `--border`, border-radius top corners 12px

---

## 16. Task Detail Drawer

Opens from the right as a fixed overlay. Board/list behind remains visible and interactive.

- Width: 640px (desktop), 100vw (mobile)
- Background: `--bg-surface`, left border: `1px solid --border`
- Entry: slides in from right, 200ms `cubic-bezier(0.16, 1, 0.3, 1)`
- Exit: slides out right, 150ms ease-in
- Mobile overlay: `rgba(0,0,0,0.5)` behind drawer; clicking it closes the drawer

### Drawer Header (sticky, 52px)

- Left: Task title — displays as styled text; **click to activate inline edit** (becomes a `<textarea>`, no visible border, same font, `--bg-elevated` bg on focus)
- Right: "Open full page" icon button → navigates to `/tasks/{id}/` (full dedicated page) + "×" close button

### Auto-Save Indicator (in header)

- Appears when editing title or description
- States: "Saving…" (grey, spinner) → "Saved ✓" (green, 1.5s) → disappears
- Debounce: 800ms after last keystroke

### Metadata Row (below header, sticky)

Inline interactive chips for each field. Click any chip to edit:

| Chip | Default display | Edit control |
|---|---|---|
| Status | Coloured status badge | Dropdown with all 4 status options |
| Priority | Coloured priority badge | Dropdown with all 4 priority options |
| Assignee | Avatar + name, or "Unassigned" | Searchable member picker popover |
| Due date | Formatted date, or "No due date" | Date picker popover |
| Project | Project name | Dropdown (Admin/Owner can move tasks between projects) |

All metadata changes save immediately (no debounce — the PATCH is fired on selection).

### Description Section

- **View mode:** Rendered Markdown — supports **bold**, _italic_, `inline code`, bullet lists, numbered lists, hyperlinks
- **Edit mode:** Plain textarea with a minimal floating toolbar: Bold · Italic · Code · Link · Unordered list · Ordered list
- Click anywhere on the description to enter edit mode
- Click outside or press `Escape` to exit edit mode
- Auto-saves 800ms after last keystroke

### Tabs

Two tab buttons below the description: **Comments** (default) · **Activity**

Tab indicator: 2px bottom border in `--accent` on the active tab, 150ms transition.

---

## 17. Task Comments

Visible in the "Comments" tab of the Task Detail Drawer.

### Comment List

Each comment (oldest at top):
- **Left:** Author avatar circle, 32px
- **Right column:**
  - Header: Author display name (14px, weight 500) + relative timestamp ("2 hours ago", 12px, `--text-secondary`) + "Edited" label if applicable (12px, `--text-muted`, italic)
  - Body: Rendered Markdown, 14px, `--text-primary`
  - Edit / Delete buttons: appear on comment hover, to the right of the timestamp — small ghost icon buttons, 12px, `--text-secondary`

Edit button visible to: comment author, admins, owners.
Delete button visible to: comment author, admins, owners.

**Edit mode (inline):**
- Comment body converts to an editable textarea
- "Save" and "Cancel" appear below
- `Escape` cancels
- On save: body updates in-place, "Edited" label appears

**Delete confirmation:**
- Small inline popover below the comment: "Delete this comment? This can't be undone." + "Cancel" + "Delete" (red)
- Not a full modal — keeps the interaction local

### Comment Composer (bottom of drawer, always visible)

- Textarea: 2 rows default, grows to max 6 rows; `--bg-elevated` background, `--border` border, border-radius 8px, padding 10px 12px
- Placeholder: "Add a comment… (Markdown supported)"
- "Post" button: right-aligned below textarea, `--accent` background, disabled until textarea has content
- Keyboard: `Cmd+Enter` / `Ctrl+Enter` to submit
- **Optimistic post:** comment appears immediately at the bottom of the list; composer clears; `POST` fires in background. If the API call fails, the optimistic comment is removed and a toast error appears.

---

## 18. Activity Log Tab

Visible in the "Activity" tab of the Task Detail Drawer.

A chronological feed of all task changes, oldest at top, newest at bottom.

### Activity Event Row

- **Left:** Actor avatar, 28px
- **Right:**
  - Actor name (weight 500) + event description (regular weight) on one line
  - Relative timestamp below, 12px, `--text-secondary`

### Event Display Examples

| Event | Display text |
|---|---|
| `task_created` | **Alice** created this task |
| `status_changed` | **Alice** moved from `Todo` → `In Progress` |
| `priority_changed` | **Bob** changed priority from `Medium` → `Urgent` |
| `assignee_changed` | **Alice** assigned this to **Bob Jones** |
| `assignee_changed` (unassign) | **Alice** removed the assignee |
| `due_date_changed` | **Bob** set due date to `August 1, 2025` |
| `comment_added` | **Alice** added a comment |
| `title_changed` | **Bob** updated the title |

Status and priority values inside activity events are displayed as inline coloured badges (identical style to card badges) — the visual contrast makes the change immediately obvious.

---

## 19. Notifications

### Notification Bell (Top Bar)

- Bell icon, `--text-secondary`, 20px
- Unread indicator: solid red dot (8px) at top-right of icon — not a count badge (cleaner at small sizes)
- On desktop: clicking opens the Notification Dropdown Panel
- On mobile: clicking navigates to the full `/notifications` page

### Notification Dropdown Panel

- Anchored below the bell, 320px wide, max-height 480px, scrollable
- Background: `--bg-surface`, border: `--border`, border-radius 10px, `box-shadow: 0 16px 48px rgba(0,0,0,0.4)`

**Panel header:** "Notifications" (14px, weight 600) + "Mark all read" link (12px, `--accent`, right-aligned)

**Notification row:**
- Height: ~56px; unread rows: `--bg-highlight` bg; read rows: `--bg-surface` bg
- Left: actor avatar (28px) or system icon (bell outline) for automated notifications
- Right: notification body text (13px, `--text-primary`, 2-line clamp) + relative timestamp (11px, `--text-secondary`)
- Unread dot: 6px `--accent` circle, far left of row
- Hover: `--bg-elevated` background, 80ms
- Click: marks as read + navigates to the related task/workspace + closes dropdown

**Panel footer:** "See all notifications →" link, centred, 12px

---

### Full Notifications Page (`/notifications`)

Full-page layout with more breathing room. Three filter tabs at top: **All** · **Unread** · **Mentions**

Rows are larger (64px), with more space for the body text. Grouped by date: "Today", "Yesterday", "This Week", "Earlier".

---

### Toast Notifications

Bottom-right corner stack. Maximum 3 toasts visible simultaneously (4th replaces the oldest).

**Toast structure:**
```
[coloured 4px left border] [icon] [message text] [optional action button] [× dismiss]
```

| Type | Border + Icon | Auto-dismiss |
|---|---|---|
| Success | `--success` · checkmark | 4 seconds |
| Error | `--danger` · X circle | 8 seconds |
| Info | `--info` · info circle | 4 seconds |
| Warning | `--warning` · warning triangle | 6 seconds |

**Undo toast (for destructive actions):**
```
✓  Task deleted.                          [Undo]  ×
```
The API call is delayed by 5 seconds to allow undo. The undo button cancels the pending delete. If the undo window closes (5s), the call executes. Task reappears in the board/list immediately if undo is clicked.

---

## 20. Admin Dashboard

Route: `/dashboard` (Admin/Owner only)

### Layout

Full-page content with a 4-column stats row at top, then charts and detail sections below.

### Stats Cards Row (4 tiles)

Each tile: `--bg-surface`, `--border`, border-radius 8px, padding 20px.

| Tile | Metric | Icon |
|---|---|---|
| Total Tasks | Number | CheckSquare |
| Active Tasks | todo + in_progress + in_review | Clock |
| Completed | done count | CheckCircle (green) |
| Overdue | Overdue count | AlertCircle (red) |

Each tile also shows a small percentage delta vs. the previous period (e.g., "+12% this week" in green or "-3% this week" in red).

### Tasks by Status Chart

Horizontal bar chart showing task distribution across the four statuses. Bar segments use the status colour tokens. Chart is rendered via Recharts.

### Tasks by Priority Chart

Donut chart — four segments (low/medium/high/urgent) with legend. Rendered via Recharts.

### Members Productivity Table

Table: **Member** (avatar + name) · **Assigned** · **Completed** · **Completion Rate** (progress bar)

### Recent Activity Feed

List of the last 10 activity events across all tasks in the workspace. Same format as the task activity log but shows the project and task name as context.

### Projects Summary

Compact list: each project with a mini horizontal stacked bar showing the task status distribution.

---

## 21. Billing & Plans Screen

Route: `/settings/billing` (Owner only)

### Layout

Three sections in a single-column layout:

### Current Plan Card

Shows: Plan name (large, `--accent`) · Price · Billing period · Status (Active / Cancelling / Expired) · Next billing date (or cancellation date if `cancel_at_period_end = true`).

If Free plan: large "Upgrade to Pro" button, `--accent` background, full-width card CTA.

If Pro/cancelling: "Cancel subscription" button (outlined red) + descriptive text "Access continues until [date]."

### Plan Comparison Table

Three columns: Free · Pro · Enterprise

| Feature | Free | Pro | Enterprise |
|---|---|---|---|
| Members | 3 | Unlimited | Unlimited |
| Projects | 5 | Unlimited | Unlimited |
| Comments & activity | ✅ | ✅ | ✅ |
| CSV / PDF export | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ |

Active plan column: `--accent-subtle` background, `--accent` border.

### Invoices Section

Titled "Billing History". Table: **Date** · **Amount** · **Status** · **Download PDF link**.

Status badges: "Paid" (`--success-subtle`, `--success`) / "Failed" (`--danger-subtle`, `--danger`).

Empty state if no invoices: "No invoices yet. Your first invoice will appear here after your first payment."

---

## 22. Reporting & Exports

Route: `/reporting` (Admin/Owner only, Pro plan only)

### Layout

Top: date range selector (Last 7 days / Last 30 days / Last 90 days) + filter bar (project, assignee). Apply button.

### Stats Section

Four tiles: Tasks Created · Tasks Completed · Completion Rate · Overdue Tasks — for the selected range.

### Completed Tasks Over Time Chart

Line chart showing tasks completed per week over the selected range. X-axis: week start dates. Y-axis: count. Rendered via Recharts.

### Member Productivity Table

Table: **Member** · **Assigned** · **Completed** · **Completion Rate** (% bar)

### Export Buttons

Two buttons, right-aligned above the stats section:

- "Export CSV" — fires `GET /api/v1/reporting/export/csv/` with current filters applied. Browser downloads the file.
- "Export PDF" — fires `GET /api/v1/reporting/export/pdf/`. Browser downloads the file.

Both buttons: `--bg-surface` background, `--border` border, `--text-primary`, with download icon. Hover: `--bg-elevated`.

If on Free plan: buttons are hidden; in their place a banner: "CSV and PDF exports are available on the Pro plan." + "Upgrade" link.

---

## 23. Empty & Loading States

### Skeleton Screens

All list and board views show **skeleton screens** while data loads — not spinners. Skeletons use `--bg-elevated` as the base colour with a left-to-right shimmer animation.

```css
/* Shimmer animation */
background: linear-gradient(
  90deg,
  var(--bg-elevated) 25%,
  var(--bg-highlight) 50%,
  var(--bg-elevated) 75%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite linear;
```

Skeleton shapes match the exact dimensions of real content — task cards, list rows, project cards, stat tiles.

### Empty States

Each has: a small geometric SVG illustration (abstract, indigo tones — not clip art), a heading, a sub-line, and an optional CTA.

| Context | Heading | Sub-line | CTA |
|---|---|---|---|
| No projects | "Your workspace is empty" | "Create your first project to start organising work." | "Create Project" |
| No tasks in Kanban column | "Nothing here yet" | "Drag tasks here or add a new one." | "+ Add task" |
| No tasks (filtered) | "No tasks match your filters" | "Try adjusting your filters or clearing them." | "Clear filters" |
| Inbox empty | "You're all caught up" | "No tasks are currently assigned to you." | — |
| No comments | "No comments yet" | "Be the first to comment on this task." | — |
| No notifications | "Nothing to see here" | "We'll let you know when something needs your attention." | — |
| No members | "Just you so far" | "Invite your teammates to start collaborating." | "Invite Member" |
| No invoices | "No invoices yet" | "Your billing history will appear here." | — |
| No search results | "No results for '[query]'" | "Try different keywords or check for typos." | "Clear search" |

---

## 24. Motion & Transitions

All transitions must respect `prefers-reduced-motion` — when active, all durations reduce to 0ms and transforms are removed.

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Page navigation | Opacity fade | 100ms | ease |
| Sidebar collapse / expand | Width + opacity | 200ms | ease-in-out |
| Drawer open (right) | translateX(100%) → 0 + opacity | 200ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Drawer close | Reverse | 150ms | ease-in |
| Modal open | scale(0.96) + opacity → 1 | 180ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Modal close | Reverse | 130ms | ease-in |
| Dropdown open | opacity 0→1 + translateY(-4px)→0 | 120ms | ease-out |
| Dropdown close | opacity 1→0 | 80ms | ease-in |
| Task card hover | translateY(-1px) + shadow | 120ms | ease |
| Toast entry | slideInRight + opacity | 200ms | ease-out |
| Toast exit | opacity + slideDown | 150ms | ease-in |
| Kanban drag start | opacity → 0.5 | 80ms | ease |
| New list item | slideDown + opacity | 200ms | ease-out |
| Skeleton shimmer | Infinite left→right | 1.5s | linear |
| Role badge update | opacity flash (100%→0→100%) | 300ms | ease |
| Metadata chip save | Brief `--success` border flash | 400ms | ease |

---

## 25. Keyboard Shortcuts

Shortcuts are disabled when focus is inside an `<input>`, `<textarea>`, or `contenteditable` element.

| Shortcut | Action |
|---|---|
| `C` | Open Create Task modal |
| `P` | Open Create Project modal (Admin/Owner) |
| `F` | Toggle filter / search panel |
| `/` | Focus global search input |
| `G` then `H` | Go to Home (project list) |
| `G` then `I` | Go to Inbox |
| `G` then `M` | Go to My Tasks |
| `G` then `D` | Go to Dashboard (Admin/Owner) |
| `1` | Switch to Kanban board view |
| `2` | Switch to List view |
| `Escape` | Close active drawer, modal, or dropdown |
| `Cmd/Ctrl + Enter` | Submit active comment or form |
| `Cmd/Ctrl + K` | Open command palette (future) |
| `?` | Open keyboard shortcuts reference modal |

The shortcuts reference modal (`?`) opens as a centred modal listing all shortcuts grouped by section. Press `Escape` to close.

---

## 26. Responsive Behaviour

| Breakpoint | Width | Layout Changes |
|---|---|---|
| Desktop | ≥ 1280px | Sidebar fixed 240px · Kanban full width with horizontal scroll · All table columns visible |
| Tablet | 768px – 1279px | Sidebar collapses to 52px icon rail (labels hidden, hover tooltip) · Kanban horizontally scrollable |
| Mobile | < 768px | Sidebar becomes full-height drawer (hamburger icon in top bar) · Kanban defaults to List view · Drawers full width · Modals full screen · Action bars move to bottom of screen |

### Sidebar Rail Mode (Tablet)

- 52px wide, shows only icon for each nav item
- Hover: tooltip label appears to the right of the icon, 100ms delay
- Logo collapses to icon mark only
- Workspace name hidden; just the avatar remains in the footer

### Mobile-Specific Behaviour

- No drag-and-drop on Kanban (replaced by a "Move to…" long-press context menu)
- Swipe right on a list row → reveals quick actions: "Mark done" + "Assign to me"
- Swipe left on a list row → "Delete" (with inline confirmation)
- Tap-and-hold on a task card → opens a bottom sheet action menu

---

## 27. Component Library Reference

All components use **shadcn/ui** as the base with custom Tailwind tokens mapped to the design system.

| Component | Key Customisations |
|---|---|
| `Button` | 4 variants: `primary` (accent fill) · `secondary` (surface + border) · `ghost` (transparent) · `destructive` (danger fill). Height: 36px (default), 44px (large), 28px (small) |
| `Input` | Default border `--border` · Focus ring `--border-focus` · Error: `--danger` border + `--danger-subtle` bg · Label above (not placeholder-only) |
| `Textarea` | Same as Input. Grows vertically on content, min 2 rows, max defined per context |
| `Select` / `Dropdown` | `--bg-elevated` background · hover `--bg-highlight` · border-radius 8px · 14px items |
| `Modal` | Overlay `rgba(0,0,0,0.6)` · card `--bg-surface` · border-radius 12px · max-width 560px (default) |
| `Badge` | 10 variants: 4 statuses × 2 priorities + neutral. All use subtle bg + matching text colour. 11px, weight 500, letter-spacing 0.02em, border-radius 99px, padding 2px 8px |
| `Avatar` | Circular. Sizes: 20px (project card) · 24px (kanban card) · 28px (activity) · 32px (comment) · 40px (list row) · 96px (profile). Initials fallback: 2 chars, colour from UUID hash |
| `Tooltip` | `--bg-elevated` background · `--text-primary` · border-radius 6px · 8px padding · 150ms show delay · appear above target by default |
| `Toast` | Custom stack component — not shadcn default. Left border accent bar, bottom-right position, max 3 visible |
| `Skeleton` | CSS shimmer animation on `--bg-elevated` base |
| `Tabs` | Underline style (not pill) — 2px bottom border on active tab in `--accent`. 150ms transition |
| `Popover` | `--bg-surface` background · `--border` border · border-radius 8px · `box-shadow: 0 8px 32px rgba(0,0,0,0.3)` |
| `DatePicker` | Calendar-style popover. Selected date: `--accent` background. Today: `--accent-subtle` background. Hover: `--bg-elevated` |
| `ProgressBar` | Height 6px · background `--bg-elevated` · fill `--accent` (default), `--success` (completed), `--danger` (overdue) · border-radius 99px |
| `ConfirmModal` | Centred modal · Title in `--text-primary` · Body in `--text-secondary` · Cancel (ghost) + Confirm (`destructive` or `primary`) buttons. Dangerous confirmations require typing a specific word |