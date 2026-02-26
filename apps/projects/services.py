from django.db import models
from django.utils import timezone

from apps.projects.models import Project
from apps.tasks.models import Task


class ProjectService:
    @staticmethod
    def recompute_completion(project: Project) -> Project:
        tasks = Task.objects.filter(tenant=project.tenant, project=project)
        total = tasks.count()
        done = tasks.filter(status=Task.Status.DONE).count()
        
        # Ensure all tasks have 100% if DONE, 0% otherwise as per new spec
        tasks.filter(status=Task.Status.DONE).exclude(progress_percent=100).update(progress_percent=100)
        tasks.exclude(status=Task.Status.DONE).exclude(progress_percent=0).update(progress_percent=0)

        completion = int((done / total) * 100) if total else 0

        project.completion_percent = completion
        if completion >= 100 and total > 0:
            project.status = Project.Status.COMPLETED
            project.completed_at = project.completed_at or timezone.now()
        elif project.status == Project.Status.COMPLETED and completion < 100:
            project.status = Project.Status.ONGOING
            project.completed_at = None
        elif project.status != Project.Status.STOPPED:
            project.status = Project.Status.ONGOING

        project.save(update_fields=["completion_percent", "status", "completed_at", "updated_at"])
        return project

