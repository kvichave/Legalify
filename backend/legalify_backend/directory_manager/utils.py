import os
import logging
from .models import Document, Project
from .vector_service import store_document_vector

logger = logging.getLogger(__name__)


def save_in_postgress(file_path, project_id, file_type):
    try:
        print(
            f"Saving document to DB: file_path={file_path}, project_id={project_id}, file_type={file_type}"
        )

        project, created = Project.objects.get_or_create(
            name=project_id, defaults={"description": ""}
        )
        print(f"Project: {project.name}, created={created}")

        document = Document.objects.create(
            project=project,
            file_name=os.path.basename(file_path),
            file_path=file_path,
            file_type=file_type or "unknown",
            status="processing",
            metadata={
                "status": "processing",
                "file_size": os.path.getsize(file_path),
            },
        )
        print(f"Document created with status=processing: {document.id}")
        collection_name = "project_"+project_id+"_category_"+file_type
        print("from save_in_postgress, collection_name ::::", collection_name)
        store_document_vector(
            document.id, file_path, collection_name=str(collection_name)
        )


        document.status = "ready"
        document.metadata["status"] = "ready"
        document.save()

        print(f"Document {document.id} vectorized and status updated to ready")
        return document

    except Exception as e:
        print(f"Error saving document to DB: {str(e)}")
        raise
