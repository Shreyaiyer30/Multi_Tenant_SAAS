from django.urls import path

from apps.reporting.views import ReportingExportCSVAPIView, ReportingExportPDFAPIView, ReportingStatsAPIView

urlpatterns = [
    path("reporting/stats/", ReportingStatsAPIView.as_view(), name="reporting-stats"),
    path("reporting/export/csv/", ReportingExportCSVAPIView.as_view(), name="reporting-export-csv"),
    path("reporting/export/pdf/", ReportingExportPDFAPIView.as_view(), name="reporting-export-pdf"),
]
