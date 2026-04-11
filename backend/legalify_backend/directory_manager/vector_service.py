import os
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
import uuid
import PyPDF2
import docx

logger = logging.getLogger(__name__)

QDRANT_HOST = os.environ.get("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.environ.get("QDRANT_PORT", 6333))
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

_client = None
_model = None


def get_qdrant_client():
    global _client
    if _client is None:
        _client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    return _client


def get_embedding_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def extract_text_from_file(file_path):
    """Extract text content from PDF or DOCX files."""
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == ".pdf":
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                return text
        elif ext == ".docx":
            doc = docx.Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        else:
            logger.warning(f"Unsupported file type: {ext}")
            return ""
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return ""


def store_document_vector(document_id, file_path, collection_name="legal_documents"):
    """Store document embedding in Qdrant and return the vector ID."""
    try:
        client = get_qdrant_client()
        model = get_embedding_model()

        client.recreate_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=model.get_sentence_embedding_dimension(), distance=Distance.COSINE
            ),
        )

        text = extract_text_from_file(file_path)
        if not text.strip():
            logger.warning(f"No text extracted from {file_path}")
            return None

        chunks = split_into_chunks(text, chunk_size=500)

        points = []
        for i, chunk in enumerate(chunks):
            embedding = model.encode(chunk).tolist()
            point_id = str(uuid.uuid4())
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "document_id": str(document_id),
                        "chunk_index": i,
                        "text": chunk,
                        "file_path": file_path,
                    },
                )
            )

        client.upsert(
            collection_name=collection_name,
            points=points,
        )

        logger.info(f"Stored {len(points)} chunks for document {document_id} in Qdrant")
        return True

    except Exception as e:
        logger.error(f"Error storing vector in Qdrant: {e}")
        raise


def split_into_chunks(text, chunk_size=500):
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size // 4):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def delete_document_vectors(document_id, collection_name):
    """Delete all vector points for a document from Qdrant."""
    try:
        client = get_qdrant_client()

        scroll_result = client.scroll(
            collection_name=collection_name,
            scroll_filter=None,
            limit=100,
            with_payload=True,
        )

        points_to_delete = []
        for point in scroll_result[0]:
            if point.payload and point.payload.get("document_id") == str(document_id):
                points_to_delete.append(point.id)

        if points_to_delete:
            client.delete(
                collection_name=collection_name,
                points_selector=points_to_delete,
            )
            logger.info(
                f"Deleted {len(points_to_delete)} vectors for document {document_id}"
            )

        return True
    except Exception as e:
        logger.error(f"Error deleting vectors from Qdrant: {e}")
        raise


def search_vectors(collection_name, query_embedding, limit=5):
    """Search for similar vectors in a collection."""
    try:
        client = get_qdrant_client()

        search_result = client.query_points(
            collection_name=collection_name,
            query=query_embedding,
            limit=limit,
            with_payload=True,
        )

        chunks = []
        points = (
            search_result.points if hasattr(search_result, "points") else search_result
        )
        for point in points:
            payload = point.payload or {}
            chunks.append(
                {
                    "text": payload.get("text", ""),
                    "file_path": payload.get("file_path", ""),
                    "score": point.score,
                }
            )

        return chunks
    except Exception as e:
        logger.error(f"Error searching vectors in {collection_name}: {e}")
        return []
