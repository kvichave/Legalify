from django.urls import path
from .views import (
    create_folder,
    list_projects,
    list_project_contents,
    upload_and_classify,
    get_document_statuses,
    delete_document,
    get_stats,
)

urlpatterns = [
    path("create-project/", create_folder),
    path("list-projects/", list_projects),
    path("stats/", get_stats),
    path("projects/<str:project_name>/contents/", list_project_contents),
    path("projects/<str:project_name>/upload-classify/", upload_and_classify),
    path("projects/<str:project_name>/document-statuses/", get_document_statuses),
    path("projects/<str:project_name>/delete-document/", delete_document),
]
