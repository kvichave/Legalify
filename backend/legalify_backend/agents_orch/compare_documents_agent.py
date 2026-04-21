from typing import Any, Dict, List
from .deep_agent_base import DeepAgentBase


COMPARE_DOCUMENTS_SYSTEM_PROMPT = """You are a legal document comparison assistant. Your role is to compare two contract documents and identify key differences.

When comparing documents:
1. Provide a brief summary of what each document covers
2. Identify key clauses that differ between the documents
3. Note important clauses that are similar or identical
4. Explain any significant legal implications of the differences

Always respond in JSON format with the following structure:
{
    "summary": "Brief comparison summary",
    "differences": [
        {
            "clause": "Name of the clause/section",
            "text_a": "Text from Document A",
            "text_b": "Text from Document B",
            "impact": "Impact of this difference"
        }
    ],
    "similarities": [
        {
            "clause": "Name of the clause/section",
            "text": "The similar text"
        }
    ]
}"""


SUBAGENTS_COMPARE_DOCUMENTS: List[Dict[str, Any]] = [
    {
        "name": "document_analyzer",
        "description": "Analyzes individual legal documents to extract key clauses and provisions",
        "system_prompt": "You are a legal document analyzer. Extract and summarize the key clauses, sections, and provisions from legal documents. Focus on identifying the main purpose, parties involved, obligations, rights, and important terms.",
        "model": None,
    },
    {
        "name": "difference_detector",
        "description": "Identifies and highlights differences between two legal documents",
        "system_prompt": "You are a legal difference detector. Compare two documents and identify all meaningful differences. For each difference, explain the clause name, the text in each document, and the potential legal impact.",
        "model": None,
    },
    {
        "name": "similarity_analyzer",
        "description": "Finds and analyzes similar clauses between documents",
        "system_prompt": "You are a legal similarity analyzer. Identify clauses and provisions that are identical or very similar between two documents. Explain the significance of these similarities.",
        "model": None,
    },
]


class CompareDocumentsAgent(DeepAgentBase):
    """Agent for comparing two legal documents and identifying differences."""

    def __init__(
        self,
        llm: Any,
        checkpointer: Any = None,
    ) -> None:
        super().__init__(
            llm=llm,
            system_prompt=COMPARE_DOCUMENTS_SYSTEM_PROMPT,
            checkpointer=checkpointer,
        )
        self.workflow = self.build_workflow(SUBAGENTS_COMPARE_DOCUMENTS)

    def compare(self, document_a_content: str, document_b_content: str, doc_a_name: str = "Document A", doc_b_name: str = "Document B") -> Dict[str, Any]:
        """Compare two documents and return differences."""
        prompt = f"""Compare the two contract documents below and identify key differences.

Document A ({doc_a_name}):
{document_a_content[:8000]}

Document B ({doc_b_name}):
{document_b_content[:8000]}

Analyze both documents and provide the comparison in JSON format."""

        result = self.workflow.invoke({"messages": [("user", prompt)]})
        return result


class CompareDocumentsSimpleAgent(DeepAgentBase):
    """Agent for simple text-based document comparison without embeddings."""

    def __init__(
        self,
        llm: Any,
        checkpointer: Any = None,
    ) -> None:
        system_prompt = """You are a legal document comparison assistant. Perform a simple text-based comparison of two documents.
        
Provide:
1. A brief summary of what each document covers
2. Key clauses that differ (text-based comparison)
3. Similar or identical clauses
4. Basic word/phrase differences

Respond in JSON format:
{
    "summary": "Brief comparison summary",
    "differences": [{"clause": "Name", "text_a": "...", "text_b": "..."}],
    "similarities": [{"clause": "Name", "text": "..."}]
}"""
        super().__init__(
            llm=llm,
            system_prompt=system_prompt,
            checkpointer=checkpointer,
        )
        self.workflow = self.build_workflow([])

    def compare_simple(self, document_a_content: str, document_b_content: str, doc_a_name: str = "Document A", doc_b_name: str = "Document B") -> Dict[str, Any]:
        """Simply compare two documents textually."""
        prompt = f"""Compare Document A ({doc_a_name}) and Document B ({doc_b_name}):

Document A:
{document_a_content[:5000]}

Document B:
{document_b_content[:5000]}

Provide a simple comparison in JSON format."""

        result = self.workflow.invoke({"messages": [("user", prompt)]})
        return result
