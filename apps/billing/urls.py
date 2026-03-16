from django.urls import path

from apps.billing.views import create_order

urlpatterns = [
    path("create-order/", create_order, name="billing-create-order"),
]
