from typing import Any, Dict, List
from langchain.agents import create_agent
from langgraph.checkpoint.memory import MemorySaver
from langgraph.store.memory import InMemoryStore
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatOpenAI(
    model="DeepSeek-V3.2",
    base_url="https://agentic-p.openai.azure.com/openai/v1/",
    api_key=os.getenv("AZURE_MODEL"),
    temperature=0,
)

CHAT_SYSTEM_PROMPT = """You are a helpful legal assistant. Based on the context from legal documents provided, answer the user's question.

Instructions:
- Provide a clear, direct answer based only on the context provided
- If the context doesn't contain enough information to fully answer the question, state what you know and what you're uncertain about
- Be precise and cite specific details when available
- Keep your response concise but informative"""

RISK_ANALYSIS_PROMPT = """You are a legal risk analyst specializing in contract analysis. Your role is to identify, categorize, and assess risks within legal documents.

OUTPUT FORMAT - Use this EXACT format for your response:

===
SUMMARY
[Overall risk level: HIGH/MEDIUM/LOW] - [1-2 sentence summary]

RISKS
• [RISK NAME]
  Category: [CATEGORY]
  Severity: [HIGH/MEDIUM/LOW] | Impact: [FINANCIAL/LEGAL/OPERATIONAL/REGULATORY/COMMERCIAL]
  Current Clause: "[exact quote from document]"
  Analysis: [how this compares to standard terms]
  Recommendation: [specific action to take]

• [Next risk...]

MISSING_CLAUSES
- [Clause that should be added]

POSITIVE_CLAUSES
✓ [Good clause found in document]

===

Risk Categories:
1. FINANCIAL - Payment terms, penalties, interest, obligations
2. LEGAL - Liability, indemnification, force majeure, disputes
3. OPERATIONAL - Termination, assignment, service levels
4. REGULATORY - Compliance, data protection, audit
5. COMMERCIAL - Pricing, exclusivity, non-compete

IMPORTANT: Keep format consistent. Use "•" for risks, "✓" for positive items, "-" for missing clauses."""

RESEARCH_PROMPT = """You are a great researcher. Search the internet for accurate, up-to-date information. Always cite your sources. Be thorough but concise in your research summaries."""


# -----------------------------
# CREATE SUBAGENTS DIRECTLY
# -----------------------------
@tool
def search_legal_documents(query: str, collection_name: str = "legal_documents", limit: int = 5) -> str:
    """Search for similar legal documents in the vector database.
    
    Use this tool to find related legal documents, contracts, or clauses that may be relevant
    for comparison when analyzing risks in a document.
    
    Args:
        query: The search query (e.g., a clause, term, or description to find similar documents)
        collection_name: The name of the collection to search in (default: "legal_documents")
        limit: Maximum number of results to return (default: 5)
    
    Returns:
        JSON string containing similar documents with their text, scores, and metadata
    """
    from directory_manager.vector_service import search_vectors
    try:
        results = search_vectors(query, collection_name=collection_name, limit=limit)
        if not results:
            return "No similar documents found in the database."
        
        formatted = []
        for r in results:
            formatted.append({
                "text": r.get("text", "")[:1500],
                "score": r.get("score", 0),
                "document_id": r.get("document_id"),
            })
        return str(formatted)
    except Exception as e:
        return f"Error searching documents: {str(e)}"


risk_analyzer_agent = create_agent(
    model=llm,
    tools=[search_legal_documents],
    system_prompt=RISK_ANALYSIS_PROMPT,
)

research_agent = create_agent(
    model=llm,
    tools=[],
    system_prompt=RESEARCH_PROMPT,
)

# -----------------------------
# WRAPPER CONFIGS FOR MAIN AGENT
# -----------------------------
risk_analyzer_subagent = {
    "name": "risk-analyzer",
    "description": "Analyzes contracts and documents for potential risks, unfavorable clauses, and compliance issues",
    "agent": risk_analyzer_agent,
}

research_subagent = {
    "name": "research-agent",
    "description": "Used to research more in depth questions via internet search",
    "agent": research_agent,
}

agents = [risk_analyzer_agent, research_agent]
subagents = [risk_analyzer_subagent, research_subagent]

TOOLS = []


class MasterAgent:
    def __init__(self):
        print("Initializing MasterAgent with LLM and subagents")
        self.memory = InMemoryStore()
        self.checkpointer = MemorySaver()
        self.research_agent = research_agent
        self.risk_analyzer = risk_analyzer_agent
        self.agent = create_agent(
            model=llm,
            tools=TOOLS,
            system_prompt=CHAT_SYSTEM_PROMPT,
        )
        print("MasterAgent initialized with LLM and subagents")

    def chat(self, message: str, context: str = "") -> Dict[str, Any]:
        config = {
            "configurable": {"thread_id": "session_001"},
            "recursion_limit": 200
        }
        prompt = f"""Context from legal documents:
{context}

User Query: {message}

Answer:"""
        result = self.agent.invoke(
            {"messages": [{"role": "user", "content": prompt}]},
            config=config
        )
        return result

    def research(self, query: str) -> Dict[str, Any]:
        config = {"configurable": {"thread_id": f"research_{query[:20]}"}}
        result = self.research_agent.invoke(
            {"messages": [{"role": "user", "content": query}]},
            config=config
        )
        messages = result[0]["messages"] if isinstance(result, list) else result.get("messages", [])
        return {"status": "success", "response": messages[-1].content if messages else ""}




    def analyze_risk(self, document_text: str, collection_name: str = None, project_name: str = None) -> Dict[str, Any]:
            config = {"configurable": {"thread_id": "risk_analysis"}}
            
            prompt = f"""Analyze this legal document for risks.

DOCUMENT:
{document_text[:8000]}

INSTRUCTIONS:
1. First, use search_legal_documents tool to find related legal documents for comparison
   - Use collection name: "project_{project_name}_category_Master_Agreements" (or SOW or Supporting_Docs if more appropriate)
   for example-project_{project_name}_category_SOW, project_{project_name}_category_Supporting_Docs
   - Search for key terms/clauses from the document

2. Output your analysis in this EXACT format:

===
SUMMARY
[Overall risk level: HIGH/MEDIUM/LOW] - [1-2 sentence summary]

RISKS
• [RISK NAME]
  Category: [CATEGORY]
  Severity: [HIGH/MEDIUM/LOW] | Impact: [FINANCIAL/LEGAL/OPERATIONAL/REGULATORY/COMMERCIAL]
  Current Clause: "[exact quote from document]"
  Analysis: [how this compares to similar documents/industry standards]
  Recommendation: [specific action to take]

• [Next risk...]

MISSING_CLAUSES
- [Clause that should be added]

POSITIVE_CLAUSES
✓ [Good clause found in document]
===

Be specific with quotes from the document. Use consistent formatting."""
            
            result = self.risk_analyzer.invoke(
                {"messages": [{"role": "user", "content": prompt}]},
                config=config
            )
            messages = result[0]["messages"] if isinstance(result, list) else result.get("messages", [])
            return {"status": "success", "analysis": messages[-1].content if messages else ""}