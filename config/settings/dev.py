from .base import *
from corsheaders.defaults import default_headers

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Development-only CORS: keep local frontend unblocked.
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_HEADERS = [*default_headers, "x-tenant"]
