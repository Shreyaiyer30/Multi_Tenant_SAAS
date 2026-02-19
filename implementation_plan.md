Phase 1: Project Scaffolding & Settings
Goal Description
Initialize a production-ready Django 5.x project called tasksaas. Set up a robust folder structure, split settings (base, dev, prod), identify dependencies, and ensure the environment is ready for multi-tenant development.

User Review Required
NOTE

Review the requirements.txt versions to ensure they match your environment preferences (e.g., Python 3.10+).

Proposed Changes
Project Root
[NEW] 
requirements.txt
Pin Django, DRF, SimpleJWT, Celery, Redis, Stripe, etc.
[NEW] 
.gitignore
Standard Python/Django gitignore.
[NEW] 
.env.example
Template for environment variables.
Configuration (config/)
[NEW] 
config/settings/base.py
Common settings: Installed apps, Middleware, Database (env), DRF defaults, JWT settings, Logging.
[NEW] 
config/settings/dev.py
DEBUG = True, Console email backend, local development settings.
[NEW] 
config/settings/prod.py
DEBUG = False, Security headers, S3 storage, Sentry (placeholder), SMTP email.
[NEW] 
config/urls.py
Root URL configuration with API versioning (api/v1/).
Directory Structure
Create apps/ directory with __init__.py.
Create apps/common, apps/accounts, apps/tenants, apps/projects, apps/tasks, apps/billing, apps/reporting (empty for now, just folders).
Verification Plan
Automated Tests
Run python manage.py check --settings=config.settings.dev to verify configuration.
Run python manage.py runserver --settings=config.settings.dev to ensure the server starts.
Manual Verification
Check if http://localhost:8000/api/v1/docs/ (Swagger) loads (if configured in Phase 1, otherwise just health check).