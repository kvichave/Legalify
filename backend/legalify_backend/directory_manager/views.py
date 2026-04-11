import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .utils import save_in_postgress
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

@api_view(['POST'])
def upload_document(request):
    project_id = request.data.get("project_id")
    uploaded_file = request.FILES.get("file")
    file_type = request.data.get("file_type")

    if not project_id or not uploaded_file:
        return Response({"error": "Missing project_id or file"}, status=400)

    # 1. Save file physically
    project_folder = os.path.join(BASE_PATH, project_id)
    os.makedirs(project_folder, exist_ok=True)

    file_path = os.path.join(project_folder, uploaded_file.name)
    with open(file_path, 'wb') as f:
        for chunk in uploaded_file.chunks():
            f.write(chunk)

    # 2. Save metadata in PostgreSQL
    save_in_postgress(file_path,project_id,file_type)

    return Response({"message": "Document uploaded successfully"})


@api_view(['GET'])
def list_projects(request):
    try:
        projects = os.listdir(BASE_PATH)
        return Response({"projects": projects})
    except Exception as e:
        return Response({"error": str(e)}, status=500)





@api_view(['GET'])
def list_project_contents(request, project_name):
    """List all files and folders within a project."""
    project_path = os.path.join(BASE_PATH, project_name)

    if not os.path.exists(project_path):
        return Response({"error": "Project not found"}, status=404)

    def get_contents(path):
        items = []
        try:
            for entry in os.scandir(path):
                item = {
                    "name": entry.name,
                    "type": "folder" if entry.is_dir() else "file",
                    "path": os.path.relpath(entry.path, project_path),
                }
                if entry.is_file():
                    item["size"] = entry.stat().st_size
                if entry.is_dir():
                    item["children"] = get_contents(entry.path)
                items.append(item)
        except PermissionError:
            pass
        return items

    contents = get_contents(project_path)
    return Response({"project": project_name, "contents": contents})



# In your View or Serializer
