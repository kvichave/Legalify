from time import sleep
import os
import re
import json
import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .utils import save_in_postgress

from agents_orch.compare_documents_agent import CompareDocumentsAgent
from agents_orch.compare_embeddings_agent import CompareWithEmbeddingsAgent
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def get_llm():
    from openai import OpenAI

    return OpenAI(
        api_key=os.getenv("OPENROUTER"), base_url="https://openrouter.ai/api/v1"
    )

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
def get_document_content(request, project_name, document_id):
    """Get the content of a document by its ID."""
    from .models import Document, Project

    try:
        project = Project.objects.get(name=project_name)
        document = Document.objects.get(id=document_id, project=project)
        file_path = document.file_path

        if not file_path or not os.path.exists(file_path):
            return Response({"error": "File not found on disk"}, status=404)

        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == ".pdf":
            return Response(
                {"error": "PDF files cannot be displayed as text"}, status=400
            )

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        return Response({"content": content, "filename": document.file_name})
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)
    except Document.DoesNotExist:
        return Response({"error": "Document not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


from django.http import FileResponse, Http404


@api_view(["GET"])
def download_document(request):
    """Download a document by project name and file path."""
    from .models import Document, Project

    project_name = request.GET.get("project")
    file_path = request.GET.get("path")

    if not project_name or not file_path:
        return Response({"error": "Project and path are required"}, status=400)

    try:
        full_path = os.path.join(BASE_PATH, project_name, file_path.replace("\\", "/"))

        if not os.path.exists(full_path):
            return Response({"error": "File not found"}, status=404)

        try:
            project = Project.objects.get(name=project_name)
            file_name = os.path.basename(file_path)
            document = Document.objects.filter(project=project, file_name=file_name).first()
            document_id = str(document.id) if document else None
        except Exception as e:
            logger.error(f"Error finding document: {e}")
            document_id = None

        file_handle = open(full_path, "rb")
        response = FileResponse(file_handle, content_type="application/pdf")
        response["Content-Disposition"] = "inline; filename=\"" + os.path.basename(full_path) + "\""
        response["Access-Control-Expose-Headers"] = "X-Document-Id"
        if document_id:
            response["X-Document-Id"] = document_id
        print(f"Serving file: {full_path} with document_id: {document_id}")
        print(response.items())
        return response

    except Exception as e:
        logger.error(f"Download error: {e}")
        return Response({"error": str(e)}, status=500)

    except Exception as e:
        logger.error(f"Download error: {e}")
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


import json
import os

from django.conf import settings
from dotenv import load_dotenv
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Document, Project
from .vector_service_hybrid import get_document_chunks

from agents_orch.compare_documents_agent import CompareDocumentsAgent
from agents_orch.compare_embeddings_agent import CompareWithEmbeddingsAgent

load_dotenv()

logger = logging.getLogger(__name__)


def get_llm():
    from openai import OpenAI

    return OpenAI(
        api_key=os.getenv("OPENROUTER"), base_url="https://openrouter.ai/api/v1"
    )


@api_view(["POST"])
def compare_documents(request):
    """Compare two documents and return differences using AI."""
    document_a_id = request.data.get("document_a_id")
    document_b_id = request.data.get("document_b_id")
    project_name = request.data.get("project_name")

    if not document_a_id or not document_b_id:
        return Response(
            {"error": "Both document_a_id and document_b_id are required"}, status=400
        )

    try:
        if project_name:
            project = Project.objects.get(name=project_name)
            doc_a = Document.objects.get(id=document_a_id, project=project)
            doc_b = Document.objects.get(id=document_b_id, project=project)
        else:
            doc_a = Document.objects.get(id=document_a_id)
            doc_b = Document.objects.get(id=document_b_id)

        content_a = ""
        content_b = ""

        if doc_a.file_path and os.path.exists(doc_a.file_path):
            with open(doc_a.file_path, "r", encoding="utf-8", errors="ignore") as f:
                content_a = f.read()

        if doc_b.file_path and os.path.exists(doc_b.file_path):
            with open(doc_b.file_path, "r", encoding="utf-8", errors="ignore") as f:
                content_b = f.read()

        if not content_a or not content_b:
            return Response(
                {
                    "error": "Could not read document content. Only text files are supported.",
                    "content_a": content_a[:500] if content_a else "",
                    "content_b": content_b[:500] if content_b else "",
                },
                status=400,
            )

        try:
            llm = get_llm()
            agent = CompareDocumentsAgent(llm=llm)
            result = agent.compare(
                document_a_content=content_a,
                document_b_content=content_b,
                doc_a_name=doc_a.file_name,
                doc_b_name=doc_b.file_name,
            )

            messages = result.get("messages", [])
            ai_result = messages[-1].content if messages else ""

            try:
                result_json = json.loads(ai_result)
                return Response(
                    {
                        "summary": result_json.get("summary", ""),
                        "differences": result_json.get("differences", []),
                        "similarities": result_json.get("similarities", []),
                        "raw_ai_response": ai_result,
                    }
                )
            except json.JSONDecodeError:
                return Response(
                    {
                        "summary": ai_result,
                        "differences": [],
                        "similarities": [],
                        "raw_ai_response": ai_result,
                    }
                )

        except Exception as e:
            logger.error(f"LLM error in comparison: {e}")
            return Response(
                {
                    "summary": f"Comparison completed but AI analysis failed: {str(e)}",
                    "differences": [],
                    "similarities": [],
                    "content_a_preview": content_a[:2000],
                    "content_b_preview": content_b[:2000],
                }
            )

    except Document.DoesNotExist as e:
        return Response({"error": f"Document not found: {str(e)}"}, status=404)
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def compare_documents_simple(request):
    """Simple text-based comparison of two documents without AI."""
    from .models import Document, Project

    document_a_id = request.data.get("document_a_id")
    document_b_id = request.data.get("document_b_id")
    project_name = request.data.get("project_name")
    file_a_path = request.data.get("file_a_path")
    file_b_path = request.data.get("file_b_path")

    logger.info(
        f"compare_documents_simple called: doc_a_id={document_a_id}, doc_b_id={document_b_id}, project={project_name}, file_a={file_a_path}, file_b={file_b_path}"
    )

    try:
        doc_a = None
        doc_b = None
        content_a = ""
        content_b = ""
        name_a = "Document A"
        name_b = "Document B"

        if document_a_id and str(document_a_id).lower() not in ["none", "null", ""]:
            try:
                if project_name:
                    project = Project.objects.get(name=project_name)
                    doc_a = Document.objects.get(id=document_a_id, project=project)
                else:
                    doc_a = Document.objects.get(id=document_a_id)
                logger.info(f"Found doc_a: {doc_a.file_name}")
            except (Document.DoesNotExist, ValueError) as e:
                logger.warning(f"doc_a not found: {e}")

        if document_b_id and str(document_b_id).lower() not in ["none", "null", ""]:
            try:
                if project_name:
                    project = Project.objects.get(name=project_name)
                    doc_b = Document.objects.get(id=document_b_id, project=project)
                else:
                    doc_b = Document.objects.get(id=document_b_id)
                logger.info(f"Found doc_b: {doc_b.file_name}")
            except (Document.DoesNotExist, ValueError) as e:
                logger.warning(f"doc_b not found: {e}")

        if doc_a and doc_a.file_path and os.path.exists(doc_a.file_path):
            with open(doc_a.file_path, "r", encoding="utf-8", errors="ignore") as f:
                content_a = f.read()
            name_a = doc_a.file_name
            logger.info(f"Loaded content from doc_a.file_path: {len(content_a)} chars")

        if file_a_path and not content_a:
            full_path = os.path.join(
                BASE_PATH, project_name, file_a_path.replace("\\", "/")
            )
            logger.info(f"Trying to load from file path: {full_path}")
            if os.path.exists(full_path):
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content_a = f.read()
                name_a = os.path.basename(file_a_path)
                logger.info(f"Loaded content from file_a_path: {len(content_a)} chars")
            else:
                logger.warning(f"File not found: {full_path}")

        if doc_b and doc_b.file_path and os.path.exists(doc_b.file_path):
            with open(doc_b.file_path, "r", encoding="utf-8", errors="ignore") as f:
                content_b = f.read()
            name_b = doc_b.file_name
            logger.info(f"Loaded content from doc_b.file_path: {len(content_b)} chars")

        if file_b_path and not content_b:
            full_path = os.path.join(
                BASE_PATH, project_name, file_b_path.replace("\\", "/")
            )
            logger.info(f"Trying to load from file path: {full_path}")
            if os.path.exists(full_path):
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content_b = f.read()
                name_b = os.path.basename(file_b_path)
                logger.info(f"Loaded content from file_b_path: {len(content_b)} chars")
            else:
                logger.warning(f"File not found: {full_path}")

        return Response(
            {
                "document_a": {
                    "id": str(doc_a.id) if doc_a else None,
                    "name": name_a,
                    "content": content_a,
                },
                "document_b": {
                    "id": str(doc_b.id) if doc_b else None,
                    "name": name_b,
                    "content": content_b,
                },
                "content_a_length": len(content_a),
                "content_b_length": len(content_b),
            }
        )

    except Exception as e:
        logger.error(f"Simple comparison error: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_pdf_highlights(request):
    """Get positions of specific lines/text in a PDF for highlighting."""
    project_name = request.GET.get("project")
    file_path = request.GET.get("path")
    line_number = request.GET.get("line")
    text = request.GET.get("text")

    if not project_name or not file_path:
        return Response({"error": "Project and path are required"}, status=400)

    try:
        full_path = os.path.join(BASE_PATH, project_name, file_path.replace("\\", "/"))

        if not os.path.exists(full_path):
            return Response({"error": "File not found"}, status=404)

        try:
            import fitz
        except ImportError:
            return Response({"error": "PyMuPDF not installed"}, status=500)

        doc = fitz.open(full_path)
        highlights = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text_dict = page.get_text("dict")

            page_height = page.rect.height
            page_width = page.rect.width

            current_line = 1

            for block in text_dict.get("blocks", []):
                if block.get("type") == 0:
                    for line in block.get("lines", []):
                        bbox = line.get("bbox", (0, 0, 0, 0))
                        line_text = " ".join(
                            [span.get("text", "") for span in line.get("spans", [])]
                        )

                        if isinstance(bbox, tuple) and len(bbox) == 4:
                            x0, y0, x1, y1 = bbox
                        else:
                            x0, y0, x1, y1 = 0, 0, 0, 0

                        if line_number and current_line == int(line_number):
                            highlights.append(
                                {
                                    "page": page_num + 1,
                                    "x0": x0,
                                    "y0": y0,
                                    "x1": x1,
                                    "y1": y1,
                                    "text": line_text,
                                    "normalized_y0": y0 / page_height
                                    if page_height
                                    else 0,
                                    "normalized_y1": y1 / page_height
                                    if page_height
                                    else 0,
                                }
                            )

                        if text and text.lower() in line_text.lower():
                            highlights.append(
                                {
                                    "page": page_num + 1,
                                    "x0": x0,
                                    "y0": y0,
                                    "x1": x1,
                                    "y1": y1,
                                    "text": line_text,
                                    "normalized_y0": y0 / page_height
                                    if page_height
                                    else 0,
                                    "normalized_y1": y1 / page_height
                                    if page_height
                                    else 0,
                                }
                            )

                        current_line += 1

        doc.close()

        return Response(
            {
                "highlights": highlights,
                "total_pages": len(fitz.open(full_path)),
            }
        )

    except Exception as e:
        logger.error(f"PDF highlight error: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_pdf_text_lines(request):
    """Get all text lines from a PDF with their positions."""
    project_name = request.GET.get("project")
    file_path = request.GET.get("path")
    page = request.GET.get("page")

    if not project_name or not file_path:
        return Response({"error": "Project and path are required"}, status=400)

    try:
        full_path = os.path.join(BASE_PATH, project_name, file_path.replace("\\", "/"))

        if not os.path.exists(full_path):
            return Response({"error": "File not found"}, status=404)

        try:
            import fitz
        except ImportError:
            return Response({"error": "PyMuPDF not installed"}, status=500)

        doc = fitz.open(full_path)
        lines = []

        page_num = int(page) - 1 if page else 0
        target_page = doc[page_num] if page_num < len(doc) else doc[0]
        page_height = target_page.rect.height
        page_width = target_page.rect.width

        text_dict = target_page.get_text("dict")
        line_num = 1

        for block in text_dict.get("blocks", []):
            if block.get("type") == 0:
                for line in block.get("lines", []):
                    bbox = line.get("bbox", (0, 0, 0, 0))
                    text = " ".join(
                        [span.get("text", "") for span in line.get("spans", [])]
                    )

                    if isinstance(bbox, tuple) and len(bbox) == 4:
                        x0, y0, x1, y1 = bbox
                    else:
                        x0, y0, x1, y1 = 0, 0, 0, 0

                    lines.append(
                        {
                            "line_number": line_num,
                            "text": text,
                            "page": page_num + 1,
                            "x0": round(x0, 2),
                            "y0": round(y0, 2),
                            "x1": round(x1, 2),
                            "y1": round(y1, 2),
                            "normalized_y0": round(y0 / page_height, 4)
                            if page_height
                            else 0,
                            "normalized_y1": round(y1 / page_height, 4)
                            if page_height
                            else 0,
                        }
                    )
                    line_num += 1

        doc.close()

        return Response(
            {
                "lines": lines,
                "total_lines": len(lines),
                "page": page_num + 1,
                "page_height": page_height,
                "page_width": page_width,
            }
        )

    except Exception as e:
        logger.error(f"PDF text lines error: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_document_embeddings(request):
    """Get embeddings for a document from Qdrant."""
    project_name = request.GET.get("project")
    document_id = request.GET.get("document_id")

    if not document_id or str(document_id).lower() in ["none", "null", ""]:
        return Response({"error": "document_id is required"}, status=400)

    try:
        from .vector_service_hybrid import get_document_chunks
        from .models import Document, Project

        doc = None
        if project_name:
            try:
                project = Project.objects.get(name=project_name)
                doc = Document.objects.get(id=document_id, project=project)
            except (Document.DoesNotExist, Project.DoesNotExist):
                pass
        if not doc:
            doc = Document.objects.get(id=document_id)

        if not doc:
            return Response({"error": "Document not found"}, status=404)

        chunks = get_document_chunks(str(doc.id), collection_name="legal_documents_hybrid")

        return Response({
            "document_id": str(doc.id),
            "document_name": doc.file_name,
            "chunks": chunks,
            "chunks_count": len(chunks) if chunks else 0,
        })

    except Exception as e:
        logger.error(f"Error getting document embeddings: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def compare_documents_with_embeddings(request):
    """Compare two documents using embeddings and AI."""
    from .models import Document, Project
    from .vector_service_hybrid import get_document_chunks, search_similar_chunks
    import json

    document_a_id = request.data.get("document_a_id")
    document_b_id = request.data.get("document_b_id")
    project_name = request.data.get("project_name")
    document_a_type = request.data.get("document_a").get("path").split("\\")[0]
    document_b_type = request.data.get("document_b").get("path").split("\\")[0]
    print(f"Received compare_documents_with_embeddings request: document_a_id={document_a_id}, document_b_id={document_b_id}, project_name={project_name}, document_a={document_a_type}, document_b={document_b_type}")
    print(f"compare_documents_with_embeddings called with: document_a_id={document_a_id}, document_b_id={document_b_id}, project_name={project_name}")

    if not document_a_id or not document_b_id:
        return Response(
            {"error": "Both document_a_id and document_b_id are required"}, status=400
        )

    if str(document_a_id).lower() in ["none", "null", ""] or str(document_b_id).lower() in ["none", "null", ""]:
        return Response(
            {"error": "Both document_a_id and document_b_id are required"}, status=400
        )

    try:
        doc_a = None
        doc_b = None

        if project_name:
            try:
                project = Project.objects.get(name=project_name)
                doc_a = Document.objects.get(id=document_a_id, project=project)
                doc_b = Document.objects.get(id=document_b_id, project=project)
            except (Document.DoesNotExist, Project.DoesNotExist):
                pass
        if not doc_a:
            doc_a = Document.objects.get(id=document_a_id)
        if not doc_b:
            doc_b = Document.objects.get(id=document_b_id)

        print("project name:", project_name)

        chunks_a = get_document_chunks(str(doc_a.id), collection_name="project_" + project_name + "_category_" + document_a_type)
        chunks_b = get_document_chunks(str(doc_b.id), collection_name="project_" + project_name + "_category_" + document_b_type)

        if not chunks_a or not chunks_b:
            return Response({
                "error": "Embeddings not found for one or both documents. Please ensure documents have been indexed.",
                "document_a_has_embeddings": bool(chunks_a),
                "document_b_has_embeddings": bool(chunks_b),
            }, status=400)

        try:
            llm = get_llm()
            agent = CompareWithEmbeddingsAgent(llm=llm)
            result = agent.compare(
                chunks_a=chunks_a,
                chunks_b=chunks_b,
                doc_a_name=doc_a.file_name,
                doc_b_name=doc_b.file_name,
            )

            messages = result.get("messages", [])
            ai_result = messages[-1].content if messages else ""

            try:
                result_json = json.loads(ai_result)
                return Response({
                    "document_a_id": str(doc_a.id),
                    "document_b_id": str(doc_b.id),
                    "document_a_name": doc_a.file_name,
                    "document_b_name": doc_b.file_name,
                    "summary": result_json.get("summary", ""),
                    "differences": result_json.get("differences", []),
                    "similarities": result_json.get("similarities", []),
                })
            except json.JSONDecodeError:
                return Response({
                    "document_a_id": str(doc_a.id),
                    "document_b_id": str(doc_b.id),
                    "document_a_name": doc_a.file_name,
                    "document_b_name": doc_b.file_name,
                    "summary": ai_result,
                    "differences": [],
                    "similarities": [],
                })

        except Exception as e:
            logger.error(f"LLM error in comparison: {e}")
            return Response({
                "error": f"LLM error: {str(e)}"
            }, status=500)

    except Document.DoesNotExist as e:
        return Response({"error": f"Document not found: {str(e)}"}, status=404)
    except Exception as e:
        logger.error(f"Comparison error with embeddings: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)
