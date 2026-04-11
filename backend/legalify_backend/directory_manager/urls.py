from django.urls import path
from .views import create_folder, list_projects, list_project_contents

urlpatterns = [
    path("create-folder/", create_folder),
    path("list-projects/", list_projects),
    path("projects/<str:project_name>/contents/", list_project_contents),
]