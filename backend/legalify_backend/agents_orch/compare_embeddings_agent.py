from typing import Any, Dict, List, Optional
from .deep_agent_base import DeepAgentBase


COMPARE_WITH_EMBEDDINGS_SYSTEM_PROMPT = """You are a legal document comparison assistant using semantic embeddings. Your role is to compare two contract documents based on their semantic chunks and identify meaningful differences.

When comparing documents using embeddings:
1. Analyze the semantic meaning of each chunk
2. Identify concepts and clauses that differ semantically
3. Note similar semantic content even if wording differs
4. Explain legal implications of semantic differences

Respond in JSON format:
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


SUBAGENTS_COMPARE_EMBEDDINGS: List[Dict[str, Any]] = [
    {
        "name": "chunk_analyzer",
        "description": "Analyzes semantic chunks from embedded documents",
        "system_prompt": "You are a chunk analyzer. Analyze semantic chunks from legal documents, understanding the meaning and context of each chunk. Identify the main concepts and legal terms in each chunk.",
        "model": None,
    },
    {
        "name": "semantic_comparator",
        "description": "Compares semantic content between document chunks",
        "system_prompt": "You are a semantic comparator. Compare the semantic meaning of document chunks (not just literal text). Identify when concepts are similar even if worded differently, and when meanings differ even if similar words are used.",
        "model": None,
    },
    {
        "name": "legal_implications_explainer",
        "description": "Explains legal implications of semantic differences",
        "system_prompt": "You are a legal implications explainer. Analyze the legal significance of differences and similarities between documents. Explain how semantic differences might affect legal rights and obligations.",
        "model": None,
    },
]


class CompareWithEmbeddingsAgent(DeepAgentBase):
    """Agent for comparing documents using embeddings and semantic analysis."""

    def __init__(
        self,
        llm: Any,
        checkpointer: Any = None,
    ) -> None:
        super().__init__(
            llm=llm,
            system_prompt=COMPARE_WITH_EMBEDDINGS_SYSTEM_PROMPT,
            checkpointer=checkpointer,
        )
        self.workflow = self.build_workflow(SUBAGENTS_COMPARE_EMBEDDINGS)

    def compare(
        self,
        chunks_a: List[Dict[str, Any]],
        chunks_b: List[Dict[str, Any]],
        doc_a_name: str = "Document A",
        doc_b_name: str = "Document B",
    ) -> Dict[str, Any]:
        """Compare documents using their embedding chunks."""
        context_a = "\n\n".join([c["text"] for c in chunks_a[:20]])
        context_b = "\n\n".join([c["text"] for c in chunks_b[:20]])

        prompt = f"""Compare the two contract documents below using their semantic chunks and identify key differences.

Document A ({doc_a_name}) - Semantic Chunks:
{context_a[:15000]}

Document B ({doc_b_name}) - Semantic Chunks:
{context_b[:15000]}

Analyze both documents and provide the comparison in JSON format."""

        result = self.workflow.invoke({"messages": [("user", prompt)]})
        return result