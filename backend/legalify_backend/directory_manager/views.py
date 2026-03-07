import os
from rest_framework.decorators import api_view
from rest_framework.response import Response

BASE_PATH = r"C:\Users\Kunal\Desktop\Folders"   # change this path

@api_view(['POST'])
def create_folder(request):

    folder_name = request.data.get("folder_name")

    if not folder_name:
        return Response({"error": "Folder name required"}, status=400)

    path = os.path.join(BASE_PATH, folder_name)

    try:
        os.makedirs(path, exist_ok=False)
        return Response({"message": "Folder created", "path": path})

    except FileExistsError:
        return Response({"error": "Folder already exists"}, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=500)