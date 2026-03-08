import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .utils import extract_data
BASE_PATH = r"C:\Users\Kunal\Desktop\Legalify\workspaces"   # change this path

@api_view(['POST'])
def create_folder(request):

    folder_name = request.data.get("project_name")

    if not folder_name:
        return Response({"error": "Project name required"}, status=400)

    path = os.path.join(BASE_PATH, folder_name)

    try:
        os.makedirs(path, exist_ok=False)
        os.makedirs(os.path.join(path, "Master_Agreements"), exist_ok=False)
        os.makedirs(os.path.join(path, "SOW"), exist_ok=False)
        os.makedirs(os.path.join(path, "Supporting_Docs"), exist_ok=False)
        return Response({"message": "Project created", "path": path})

    except FileExistsError:
        return Response({"error": "Project already exists"}, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
def list_projects(request):
    try:
        projects = os.listdir(BASE_PATH)
        return Response({"projects": projects})
    except Exception as e:
        return Response({"error": str(e)}, status=500)






