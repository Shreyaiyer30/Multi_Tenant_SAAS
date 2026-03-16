import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from .base import *

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "").split(",")
    if host.strip()
]

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]

database_url = os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")
if database_url:
    DATABASES = {
        "default": dj_database_url.parse(
            database_url,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    pg_host = os.getenv("PGHOST", "").strip()
    pg_name = os.getenv("PGDATABASE", "").strip()
    if pg_host and pg_name:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": pg_name,
                "USER": os.getenv("PGUSER", ""),
                "PASSWORD": os.getenv("PGPASSWORD", ""),
                "HOST": pg_host,
                "PORT": os.getenv("PGPORT", "5432"),
                "CONN_MAX_AGE": 600,
            }
        }
    else:
        db_name = os.getenv("DB_NAME", "").strip()
        db_host = os.getenv("DB_HOST", "").strip()
        if db_name and db_host:
            if db_host in {"127.0.0.1", "localhost", "::1"}:
                raise ImproperlyConfigured(
                    "Invalid production database host: localhost/127.0.0.1. "
                    "Set DATABASE_URL or a reachable external DB host."
                )
            DATABASES = {
                "default": {
                    "ENGINE": "django.db.backends.postgresql",
                    "NAME": db_name,
                    "USER": os.getenv("DB_USER", ""),
                    "PASSWORD": os.getenv("DB_PASSWORD", ""),
                    "HOST": db_host,
                    "PORT": os.getenv("DB_PORT", "5432"),
                    "CONN_MAX_AGE": 600,
                    "OPTIONS": {"sslmode": "require"},
                }
            }
        else:
            raise ImproperlyConfigured(
                "Database configuration missing for production. Set DATABASE_URL, "
                "PGHOST/PGDATABASE, or DB_HOST/DB_NAME."
            )
