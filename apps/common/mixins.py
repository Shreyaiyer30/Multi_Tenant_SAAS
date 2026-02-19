from django.http import Http404


class TenantScopedQuerysetMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        tenant = getattr(self.request, "tenant", None)
        if tenant is None:
            return queryset.none()
        return queryset.filter(tenant=tenant)

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        try:
            return queryset.get(**{self.lookup_field: lookup_value})
        except queryset.model.DoesNotExist as exc:
            raise Http404 from exc
