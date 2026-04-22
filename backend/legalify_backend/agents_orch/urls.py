from django.urls import path
from .views import chat, analyze_risk, research

urlpatterns = [
    path("chat/", chat),
    path("analyze-risk/", analyze_risk),
    path("research/", research),
]
