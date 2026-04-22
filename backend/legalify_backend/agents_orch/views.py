from rest_framework.decorators import api_view
from rest_framework.response import Response
import logging
import os
from dotenv import load_dotenv
from .chat_agent import MasterAgent
from langchain_core.messages import HumanMessage,AIMessage


load_dotenv()

logger = logging.getLogger(__name__)




@api_view(["POST"])
def chat(request):
    """Chat with vector data from selected projects."""
    from directory_manager.vector_service import search_vectors
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

        for collection in collection_names:
            try:
                chunks = search_vectors(message, collection, limit=5)
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
        sources = list(set([c.get("source", "Unknown") for c in all_chunks]))

        try:
            print("LLM initialized successfully")
            chat_agent = MasterAgent()
            print(f"Invoking chat agent with message: {message} and context length: {len(context)}")
            result = chat_agent.chat(message=message, context=context)
            print(f"Chat agent result: {result}")
            messages = result[0]["messages"]
            answer = messages[-1].content if messages else ""
        except Exception as e:
            logger.error(f"LLM error: {e}")
            answer = (
                f"Based on the documents, here is what I found:\n\n{context[:1500]}..."
            )

        return Response({"answer": answer, "sources": sources[:5]})

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def analyze_risk(request):
    """Analyze contracts for potential risks by comparing with other documents in the vector database."""
    from directory_manager.vector_service import search_vectors
    from directory_manager.models import Document, Project

    project_name = request.data.get("project", "")
    document_id = request.data.get("document_id")

    if not project_name and not document_id:
        return Response({"error": "Project or document_id is required"}, status=400)

    try:
        chat_agent = MasterAgent()
        collection_name = None

        if document_id:
            try:
                doc = Document.objects.get(id=document_id)
                collection_name = f"project_{doc.project.name}_category_{doc.file_type}"
                chunks = search_vectors("", collection_name, limit=20)
                doc_content = " ".join([c.get("text", "") for c in chunks])
                
                result = chat_agent.analyze_risk(
                    document_text=doc_content,
                    collection_name=collection_name
                )
                result["document_name"] = doc.file_name
            except Document.DoesNotExist:
                return Response({"error": "Document not found"}, status=404)
        else:
            try:
                project = Project.objects.get(name=project_name)
                collection_name = f"project_{project_name}_category_Master_Agreements"
                
                if "Supporting_Docs" in request.data.get("category", ""):
                    collection_name = f"project_{project_name}_category_Supporting_Docs"
                
                chunks = search_vectors("", collection_name, limit=20)
                doc_content = " ".join([c.get("text", "") for c in chunks])
                
                result = chat_agent.analyze_risk(
                    document_text=doc_content,
                    collection_name=collection_name
                )
            except Project.DoesNotExist:
                return Response({"error": "Project not found"}, status=404)

        return Response(result)

    except Exception as e:
        logger.error(f"Risk analysis error: {e}")
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def research(request):
    """Research a query using internet search."""
    query = request.data.get("query", "").strip()

    if not query:
        return Response({"error": "Query is required"}, status=400)

    try:
        chat_agent = MasterAgent()
        result = chat_agent.research(query)
        return Response(result)
    except Exception as e:
        logger.error(f"Research error: {e}")
        return Response({"error": str(e)}, status=500)




