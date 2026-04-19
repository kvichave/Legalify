import os
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    SparseVectorParams,
    SparseVector,
    Modifier,
)
from sentence_transformers import SentenceTransformer
from fastembed import TextEmbedding, SparseTextEmbedding, LateInteractionTextEmbedding
import uuid
import PyPDF2
import docx

logger = logging.getLogger(__name__)

QDRANT_HOST = os.environ.get("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.environ.get("QDRANT_PORT", 6333))
DENSE_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
BM25_MODEL = "Qdrant/bm25"
LATE_INTERACTION_MODEL = "colbert-ir/colbertv2.0"

_client = None
_dense_model = None
_sparse_model = None
_late_model = None


def get_qdrant_client():
    global _client
    if _client is None:
        _client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    return _client


def get_dense_embedding_model():
    global _dense_model
    if _dense_model is None:
        _dense_model = TextEmbedding(DENSE_MODEL)
    return _dense_model


def get_sparse_embedding_model():
    global _sparse_model
    if _sparse_model is None:
        _sparse_model = SparseTextEmbedding(BM25_MODEL)
    return _sparse_model


def get_late_interaction_model():
    global _late_model
    if _late_model is None:
        _late_model = LateInteractionTextEmbedding(LATE_INTERACTION_MODEL)
    return _late_model


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


def create_hybrid_collection(collection_name):
    """Create a collection that supports dense, sparse, and late interaction vectors."""
    try:
        client = get_qdrant_client()
        dense_model = get_dense_embedding_model()
        late_model = get_late_interaction_model()

        sample_dense = list(dense_model.embed(["sample"]))
        sample_late = list(late_model.embed(["sample"]))

        client.create_collection(
            collection_name=collection_name,
            vectors_config={
                DENSE_MODEL: VectorParams(
                    size=len(sample_dense[0]),
                    distance=Distance.COSINE,
                ),
                LATE_INTERACTION_MODEL: VectorParams(
                    size=len(sample_late[0][0]),
                    distance=Distance.COSINE,
                    multivector_config={"comparator": "max_sim"},
                    hnsw_config={"m": 0},
                ),
            },
            sparse_vectors_config={
                BM25_MODEL: SparseVectorParams(modifier=Modifier.IDF)
            },
        )
        logger.info(f"Created hybrid collection: {collection_name}")
    except Exception as e:
        logger.error(f"Error creating hybrid collection: {e}")
        raise


def store_document_hybrid(
    document_id, file_path, collection_name="legal_documents_hybrid"
):
    """Store document with hybrid embeddings in Qdrant."""
    try:
        client = get_qdrant_client()
        dense_model = get_dense_embedding_model()
        sparse_model = get_sparse_embedding_model()
        late_model = get_late_interaction_model()

        try:
            client.get_collection(collection_name=collection_name)
        except Exception:
            create_hybrid_collection(collection_name)

        text = extract_text_from_file(file_path)
        if not text.strip():
            logger.warning(f"No text extracted from {file_path}")
            return None

        chunks = split_into_chunks(text, chunk_size=500)

        points = []
        for i, chunk in enumerate(chunks):
            dense_embedding = list(dense_model.embed([chunk]))[0]
            sparse_embedding = list(sparse_model.embed([chunk]))[0]
            late_embedding = list(late_model.embed([chunk]))[0]

            point_id = str(uuid.uuid4())
            points.append(
                PointStruct(
                    id=point_id,
                    vector={
                        DENSE_MODEL: dense_embedding,
                        BM25_MODEL: sparse_embedding.as_object(),
                        LATE_INTERACTION_MODEL: late_embedding,
                    },
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

        logger.info(f"Stored {len(points)} hybrid chunks for document {document_id}")
        return True

    except Exception as e:
        logger.error(f"Error storing hybrid vector: {e}")
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


def search_vectors_hybrid(query, collection_name="legal_documents_hybrid", limit=5):
    """Search using hybrid approach with reranking."""
    try:
        client = get_qdrant_client()
        dense_model = get_dense_embedding_model()
        sparse_model = get_sparse_embedding_model()
        late_model = get_late_interaction_model()

        dense_query = list(dense_model.query_embed([query]))[0]
        sparse_query = list(sparse_model.query_embed([query]))[0]
        late_query = list(late_model.query_embed([query]))[0]

        prefetch = [
            {
                "query": dense_query,
                "using": DENSE_MODEL,
                "limit": 20,
            },
            {
                "query": sparse_query,
                "using": BM25_MODEL,
                "limit": 20,
            },
        ]

        results = client.query_points(
            collection_name=collection_name,
            prefetch=prefetch,
            query=late_query,
            using=LATE_INTERACTION_MODEL,
            with_payload=True,
            limit=limit,
        )

        search_results = []
        for point in results.points:
            search_results.append(
                {
                    "id": point.id,
                    "score": point.score,
                    "text": point.payload.get("text"),
                    "document_id": point.payload.get("document_id"),
                    "chunk_index": point.payload.get("chunk_index"),
                    "source": point.payload.get("file_path"),
                }
            )

        logger.info(f"Hybrid search found {len(search_results)} results for: {query}")
        return search_results

    except Exception as e:
        logger.error(f"Error in hybrid search: {e}")
        raise


def get_document_chunks(document_id, collection_name="legal_documents_hybrid"):
    """Retrieve all chunks for a specific document from Qdrant."""
    try:
        client = get_qdrant_client()

        from qdrant_client.models import Filter, HasIdCondition

        scroll_result = client.scroll(
            collection_name=collection_name,
            scroll_filter=Filter(
                must=[
                    HasIdCondition(
                        condition="should",
                        ids=[str(document_id)],
                    )
                ]
            ) if False else None,
            limit=1000,
            with_payload=True,
        )

        chunks = []
        for point in scroll_result[0]:
            if point.payload and point.payload.get("document_id") == str(document_id):
                chunks.append({
                    "id": point.id,
                    "chunk_index": point.payload.get("chunk_index"),
                    "text": point.payload.get("text"),
                    "document_id": point.payload.get("document_id"),
                    "file_path": point.payload.get("file_path"),
                })

        chunks.sort(key=lambda x: x.get("chunk_index", 0))
        logger.info(f"Retrieved {len(chunks)} chunks for document {document_id}")
        return chunks

    except Exception as e:
        logger.error(f"Error getting document chunks: {e}")
        return []


def search_similar_chunks(document_id, target_document_id, collection_name="legal_documents_hybrid", limit=10):
    """Search for chunks in target document similar to source document chunks."""
    try:
        source_chunks = get_document_chunks(document_id, collection_name)
        if not source_chunks:
            return []

        client = get_qdrant_client()
        dense_model = get_dense_embedding_model()

        similar_chunks = []
        for chunk in source_chunks[:5]:
            query_embedding = list(dense_model.query_embed([chunk["text"]]))[0]

            results = client.query_points(
                collection_name=collection_name,
                query=query_embedding,
                limit=limit,
                with_payload=True,
                query_filter=Filter(
                    must_not=[
                        {"field": "document_id", "match": {"value": str(document_id)}}
                    ]
                ),
            )

            for point in results.points:
                if point.payload.get("document_id") == str(target_document_id):
                    similar_chunks.append({
                        "id": point.id,
                        "score": point.score,
                        "text": point.payload.get("text"),
                        "chunk_index": point.payload.get("chunk_index"),
                    })

        similar_chunks.sort(key=lambda x: x.get("score", 0), reverse=True)
        return similar_chunks[:limit]

    except Exception as e:
        logger.error(f"Error searching similar chunks: {e}")
        return []
