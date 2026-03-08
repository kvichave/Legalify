from models import Document

def save_in_postgress(file_path,project_id,file_type):
    Document.objects.create(
    project_id=project_id,
    file_name=file_path.name,
    physical_path=file_path, # e.g., "projects/uuid/contract.pdf"
    file_type=file_type,
    extracted_metadata={
        "status": "pending_analysis",
        "file_size": file_path.size
    }
    )