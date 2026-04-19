    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def compare_documents(request):
    """Compare two documents and return differences using AI."""
    from .models import Document, Project
    from dotenv import load_dotenv

    load_dotenv()

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

        prompt = f"""You are a legal document comparison assistant. Compare the two contract documents below and identify key differences.

Document A ({doc_a.file_name}):
{content_a[:8000]}

Document B ({doc_b.file_name}):
{content_b[:8000]}

Analyze both documents and provide:
1. A brief summary of what each document covers
2. Key clauses that differ between the documents
3. Important clauses that are similar or identical
4. Any significant legal implications of the differences

Provide your response in JSON format:
{{
    "summary": "Brief comparison summary",
    "differences": [
        {{
            "clause": "Name of the clause/section",
            "text_a": "Text from Document A",
            "text_b": "Text from Document B",
            "impact": "Impact of this difference"
        }}
    ],
    "similarities": [
        {{
            "clause": "Name of the clause/section",
            "text": "The similar text"
