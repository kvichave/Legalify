from time import sleep
import os
import re
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .utils import save_in_postgress

BASE_PATH = r"C:\Users\DNFH3173\Desktop\Legalify\workspaces"  # change this path


# Regex patterns for auto-classifying files into subfolders
CLASSIFICATION_RULES = [
    {
        "folder": "Master_Agreements",
        "patterns": [
            r"(?i)master[\s_\-]?agreement",
            r"(?i)msa[\s_\-\.]",
            r"(?i)service[\s_\-]?agreement",
            r"(?i)license[\s_\-]?agreement",
            r"(?i)nda[\s_\-\.]",
            r"(?i)non[\s_\-]?disclosure",
            r"(?i)framework[\s_\-]?agreement",
            r"(?i)contract[\s_\-]?agreement",
            r"(?i)terms[\s_\-]?(of|and)[\s_\-]?conditions",
        ],
    },
    {
        "folder": "SOW",
        "patterns": [
            r"(?i)sow[\s_\-\.]",
            r"(?i)statement[\s_\-]?of[\s_\-]?work",
            r"(?i)work[\s_\-]?order",
            r"(?i)scope[\s_\-]?of[\s_\-]?work",
            r"(?i)project[\s_\-]?proposal",
            r"(?i)engagement[\s_\-]?letter",
        ],
    },
    {
        "folder": "Supporting_Docs",
        "patterns": [
            r"(?i)amendment",
            r"(?i)addendum",
            r"(?i)annex",
            r"(?i)appendix",
            r"(?i)exhibit",
            r"(?i)schedule",
            r"(?i)invoice",
            r"(?i)receipt",
            r"(?i)certificate",
            r"(?i)supporting",
            r"(?i)correspondence",
            r"(?i)memo",
            r"(?i)notice",
        ],
    },
]
import time


def classify_file(filename):
    time.sleep(5)
    """Classify a file into a subfolder based on its name using regex patterns."""
    for rule in CLASSIFICATION_RULES:
        for pattern in rule["patterns"]:
            if re.search(pattern, filename):
                return rule["folder"]

    # Default: Supporting_Docs
    return "Supporting_Docs"


@api_view(["POST"])
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


@api_view(["POST"])
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
    with open(file_path, "wb") as f:
        for chunk in uploaded_file.chunks():
            f.write(chunk)

    # Save metadata in PostgreSQL
    try:
        save_in_postgress(file_path, project_id, file_type)
    except Exception as e:
        return Response({"error": f"Database save failed: {str(e)}"}, status=500)

    return Response({"message": "Document uploaded successfully"})


@api_view(["GET"])
def list_projects(request):
    try:
        projects = os.listdir(BASE_PATH)
        return Response({"projects": projects})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def list_project_contents(request, project_name):
    """List all files and folders within a project."""
    from .models import Document, Project

    project_path = os.path.join(BASE_PATH, project_name)

    if not os.path.exists(project_path):
        return Response({"error": "Project not found"}, status=404)

    try:
        project = Project.objects.get(name=project_name)
        docs = Document.objects.filter(project=project)
        doc_map = {}
        for doc in docs:
            if doc.file_path:
                doc_map[doc.file_path] = doc.id
                doc_map[os.path.basename(doc.file_path)] = doc.id
                rel = (
                    doc.file_path.replace(BASE_PATH, "")
                    .lstrip("\\")
                    .lstrip("/")
                    .replace("\\", "/")
                )
                doc_map[rel] = doc.id
    except Project.DoesNotExist:
        doc_map = {}

    def get_contents(path):
        items = []
        try:
            for entry in os.scandir(path):
                rel_path = os.path.relpath(entry.path, project_path)
                item = {
                    "name": entry.name,
                    "type": "folder" if entry.is_dir() else "file",
                    "path": rel_path,
                }
                if entry.is_file():
                    item["size"] = entry.stat().st_size
                    item["id"] = (
                        str(doc_map.get(rel_path))
                        or str(doc_map.get(entry.name))
                        or None
                    )
                if entry.is_dir():
                    item["children"] = get_contents(entry.path)
                items.append(item)
        except PermissionError:
            pass
        return items

    contents = get_contents(project_path)
    return Response({"project": project_name, "contents": contents})


@api_view(["POST"])
def upload_and_classify(request, project_name):
    """Upload a file and auto-classify it into the correct subfolder."""
    uploaded_file = request.FILES.get("file")

    if not uploaded_file:
        return Response({"error": "No file provided"}, status=400)

    project_path = os.path.join(BASE_PATH, project_name)
    if not os.path.exists(project_path):
        return Response({"error": "Project not found"}, status=404)

    # Classify the file based on its name
    classified_folder = classify_file(uploaded_file.name)
    target_dir = os.path.join(project_path, classified_folder)
    os.makedirs(target_dir, exist_ok=True)

    # Save the file
    file_path = os.path.join(target_dir, uploaded_file.name)
    with open(file_path, "wb") as f:
        for chunk in uploaded_file.chunks():
            f.write(chunk)

    # Save metadata in PostgreSQL
    try:
        save_in_postgress(file_path, project_name, classified_folder)
    except Exception as e:
        return Response({"error": f"Database save failed: {str(e)}"}, status=500)

    return Response(
        {
            "message": "File uploaded and classified successfully",
            "filename": uploaded_file.name,
            "classified_as": classified_folder,
            "path": os.path.relpath(file_path, project_path),
        }
    )


@api_view(["GET"])
def get_document_statuses(request, project_name):
    """Get document statuses for a project."""
    from .models import Document, Project

    try:
        project = Project.objects.get(name=project_name)
        documents = Document.objects.filter(project=project).values(
            "file_name", "file_type", "status", "created_at"
        )
        return Response({"documents": list(documents)})
    except Project.DoesNotExist:
        return Response({"documents": []})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["DELETE"])
def delete_document(request, project_name):
    """Delete a document from folder, database, and Qdrant."""
    from .models import Document, Project
    from .vector_service import delete_document_vectors

    file_name = request.data.get("file_name")
    file_path = request.data.get("file_path")

    if not file_name:
        return Response({"error": "file_name is required"}, status=400)

    try:
        project = Project.objects.get(name=project_name)

        document = Document.objects.filter(project=project, file_name=file_name).first()

        if document:
            collection_name = f"project_{project_name}_category_{document.file_type}"
            try:
                delete_document_vectors(document.id, collection_name)
            except Exception as e:
                print(f"Failed to delete vectors from Qdrant: {e}")

            document.delete()
        r_project_path = os.path.join(BASE_PATH, project_name)
        file_path = r_project_path + "/" + file_path
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        else:
            print("File not found", file_path)

        return Response({"message": f"Document '{file_name}' deleted successfully"})

    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_stats(request):
    """Get overall statistics for Legalify."""
    from .models import Document, Project

    try:
        projects_count = Project.objects.count()
        documents_count = Document.objects.count()
        embeddings_count = 0

        client = None
        try:
            from .vector_service import get_qdrant_client

            client = get_qdrant_client()
        except Exception:
            pass

        if client:
            try:
                collections = client.get_collections().collections
                for coll in collections:
                    try:
                        info = client.get_collection(coll.name)
                        embeddings_count += info.vectors_count
                    except Exception:
                        pass
            except Exception:
                pass

        return Response(
            {
                "projects": projects_count,
                "documents": documents_count,
                "embeddings": embeddings_count,
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=500)
