from rest_framework.decorators import api_view
from rest_framework.response import Response
import logging
import os
from dotenv import load_dotenv

load_dotenv()   

logger = logging.getLogger(__name__)


@api_view(["POST"])
def chat(request):
    """Chat with vector data from selected projects."""
    from directory_manager.vector_service import search_vectors, get_embedding_model
    from directory_manager.models import Document, Project

    message = request.data.get("message", "").strip()
    projects = request.data.get("projects", [])

    if not message:
        return Response({"error": "Message is required"}, status=400)

    if not projects:
        return Response({"error": "At least one project is required"}, status=400)

    try:
        all_chunks = []
        collection_names = []

        for project_name in projects:
            try:
                project = Project.objects.get(name=project_name)
                documents = Document.objects.filter(project=project, status="ready")
                for doc in documents:
                    collection_name = f"project_{project_name}_category_{doc.file_type}"
                    collection_names.append(collection_name)
            except Project.DoesNotExist:
                continue

        model = get_embedding_model()
        query_embedding = model.encode(message).tolist()

        for collection in collection_names:
            try:
                chunks = search_vectors(collection, query_embedding, limit=5)
                all_chunks.extend(chunks)
            except Exception as e:
                logger.warning(f"Error searching collection {collection}: {e}")

        if not all_chunks:
            return Response(
                {
                    "answer": "I couldn't find any relevant information in the selected projects to answer your question.",
                    "sources": [],
                }
            )

        context = "\n\n".join([c["text"] for c in all_chunks[:10]])
        sources = list(set([c.get("file_path", "Unknown") for c in all_chunks]))

        prompt = f"""You are a helpful legal assistant. Based on the following context from legal documents, answer the user's question.

Context:
{context}

User Question: {message}

Instructions:
- Provide a clear, direct answer based only on the context provided
- If the context doesn't contain enough information to fully answer the question, state what you know and what you're uncertain about
- Be precise and cite specific details when available
- Keep your response concise but informative

Answer:"""

        try:
            from openai import OpenAI

            client = OpenAI(api_key=os.getenv("OPENROUTER"), base_url="https://openrouter.ai/api/v1")
            response = client.chat.completions.create(
                model="nvidia/nemotron-3-super-120b-a12b:free",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000,
            )
            answer = response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM error: {e}")
            answer = (
                f"Based on the documents, here is what I found:\n\n{context[:1500]}..."
            )

        return Response({"answer": answer, "sources": sources[:5]})

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return Response({"error": str(e)}, status=500)
