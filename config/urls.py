from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.tenants.urls")),
    path("", include("apps.projects.urls")),
    path("", include("apps.dashboard.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.tasks.urls")),
    path("", include("apps.reporting.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", lambda request: JsonResponse({"status": "ok"}), name="health"),
    path("api/v1/", include(api_urlpatterns)),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
