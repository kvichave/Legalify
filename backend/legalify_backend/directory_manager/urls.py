from django.urls import path
from .views import create_folder

urlpatterns = [
    path("create-folder/", create_folder),
]