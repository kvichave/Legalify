from django.urls import path
from .views import create_folder, list_projects

urlpatterns = [
    path("create-folder/", create_folder),
    path("list-projects/", list_projects),
]