"""Django settings shared across environments."""

import os
import sys
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

import dj_database_url
from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


def _build_database_settings():
    database_url = os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")
    debug_mode = os.getenv("DEBUG", "False").lower() == "true"
    settings_module = os.getenv("DJANGO_SETTINGS_MODULE", "")
    is_dev_settings = settings_module.endswith(".dev")
    local_dev_mode = debug_mode or is_dev_settings
    running_tests = "test" in sys.argv or bool(os.getenv("PYTEST_CURRENT_TEST"))
    force_postgres_tests = os.getenv("USE_POSTGRES_FOR_TESTS", "False").lower() == "true"
    use_database_url_in_debug = os.getenv("USE_DATABASE_URL_IN_DEBUG", "False").lower() == "true"
    ssl_required = os.getenv(
        "DB_SSL_REQUIRE",
        "False" if debug_mode else "True",
    ).lower() == "true"

    db_name = os.getenv("DB_NAME")
    db_host = os.getenv("DB_HOST")
    pg_host = os.getenv("PGHOST")
    pg_name = os.getenv("PGDATABASE")

    # Default to SQLite for tests to keep local/CI runs deterministic when
    # DATABASE_URL points to an unreachable private database host.
    if running_tests and not force_postgres_tests:
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "test_db.sqlite3",
        }

    # Local development should not accidentally use a private cloud DB URL
    # when explicit DB_* values are present.
    if local_dev_mode and not use_database_url_in_debug and db_name:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_name,
            "USER": os.getenv("DB_USER", ""),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": db_host or "127.0.0.1",
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": 600,
        }

    if database_url:
        if local_dev_mode and not use_database_url_in_debug:
            parsed_host = (urlparse(database_url).hostname or "").lower()
            if parsed_host.endswith(".internal"):
                return {
                    "ENGINE": "django.db.backends.sqlite3",
                    "NAME": BASE_DIR / "db.sqlite3",
                }
        return dj_database_url.parse(
            database_url,
            conn_max_age=600,
            ssl_require=ssl_required,
        )

    if pg_host and pg_name:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": pg_name,
            "USER": os.getenv("PGUSER", ""),
            "PASSWORD": os.getenv("PGPASSWORD", ""),
            "HOST": pg_host,
            "PORT": os.getenv("PGPORT", "5432"),
            "CONN_MAX_AGE": 600,
        }

    if db_name:
        if not db_host and not local_dev_mode:
            raise ImproperlyConfigured(
                "DB_HOST must be set when using DB_NAME in non-debug environments."
            )
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_name,
            "USER": os.getenv("DB_USER", ""),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": db_host or "127.0.0.1",
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": 600,
        }

    if not local_dev_mode:
        raise ImproperlyConfigured(
            "Database configuration missing. Set DATABASE_URL, PGHOST/PGDATABASE, "
            "or DB_NAME/DB_HOST."
        )

    # Development-only fallback for environments without a Postgres configuration.
    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }


SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-change-me")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# ALLOWED_HOSTS = [
#     host.strip()
#     for host in os.getenv("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")
#     if host.strip()
# ]
ALLOWED_HOSTS = [
    "multitenantsaas-production.up.railway.app",
]
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "apps.common",
    "apps.accounts",
    "apps.tenants",
    "apps.projects",
    "apps.tasks",
    "apps.audit",
    "apps.notifications",
    "apps.dashboard",
    "apps.reporting",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.TenantMiddleware",
   ]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {"default": _build_database_settings()}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.DefaultPageNumberPagination",
    "EXCEPTION_HANDLER": "apps.common.exceptions.drf_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.getenv("ACCESS_TOKEN_LIFETIME_MINUTES", "15"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("REFRESH_TOKEN_LIFETIME_DAYS", "7"))
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "TaskSaaS API",
    "DESCRIPTION": "Multi-tenant task management API",
    "VERSION": "1.0.0",
}

# CORS_ALLOWED_ORIGINS = [
#     origin.strip()
#     for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
#     if origin.strip()
# ]
CORS_ALLOWED_ORIGINS = [
    "https://natural-sparkle-production-a4a9.up.railway.app",
]
CORS_ALLOW_HEADERS = [*default_headers, "x-tenant"]

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
