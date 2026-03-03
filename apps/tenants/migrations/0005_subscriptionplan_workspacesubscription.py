from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0004_remove_tenant_cancel_at_period_end_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="SubscriptionPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=100, unique=True)),
                ("code", models.CharField(choices=[("free", "Free"), ("pro", "Pro"), ("enterprise", "Enterprise")], default="pro", max_length=20)),
                ("price", models.PositiveIntegerField()),
                ("max_projects", models.PositiveIntegerField()),
                ("max_users", models.PositiveIntegerField()),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["price", "name"],
            },
        ),
        migrations.CreateModel(
            name="WorkspaceSubscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("razorpay_order_id", models.CharField(blank=True, max_length=255)),
                ("razorpay_payment_id", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=False)),
                ("start_date", models.DateTimeField(blank=True, null=True)),
                ("plan", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="workspace_subscriptions", to="tenants.subscriptionplan")),
                ("workspace", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="subscription", to="tenants.tenant")),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
