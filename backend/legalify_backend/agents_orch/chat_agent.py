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

Risk Categories to Analyze:
1. FINANCIAL RISKS - Payment terms, penalties, interest rates, financial obligations
2. LEGAL/LIABILITY RISKS - Liability caps, indemnification, force majeure, dispute resolution
3. OPERATIONAL RISKS - Termination clauses, assignment restrictions, service level requirements
4. REGULATORY/COMPLIANCE RISKS - Compliance requirements, data protection, audit rights
5. COMMERCIAL RISKS - Pricing changes, exclusivity, non-compete, market-related terms

For each risk identified, provide:
- Risk Category
- Risk Description
- Severity (High/Medium/Low)
- Location in Document
- Recommendation"""

RESEARCH_PROMPT = """You are a great researcher. Search the internet for accurate, up-to-date information. Always cite your sources. Be thorough but concise in your research summaries."""


# -----------------------------
# CREATE SUBAGENTS DIRECTLY
# -----------------------------
risk_analyzer_agent = create_agent(
    model=llm,
    tools=[],
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

    def analyze_risk(self, document_text: str, collection_name: str = None) -> Dict[str, Any]:
        from directory_manager.vector_service import search_vectors
        
        config = {"configurable": {"thread_id": "risk_analysis"}}
        
        similar_docs = []
        if collection_name:
            try:
                chunks = search_vectors(document_text[:500], collection_name, limit=10)
                similar_docs = [c.get("text", "") for c in chunks]
            except Exception as e:
                print(f"Error searching similar documents: {e}")
        
        prompt = """You are a legal risk analyst. Analyze this document for risks by comparing it with similar documents in the database.
"""
        
        prompt += f"""
CURRENT DOCUMENT:
{document_text[:5000]}

"""
        
        if similar_docs:
            separator = "=" * 60
            related_docs = "\n".join([f"Document {i+1}:\n{doc[:1000]}\n" for i, doc in enumerate(similar_docs[:5])])
            prompt += f"""
{separator}
RELATED DOCUMENTS FROM DATABASE:
{related_docs}
{separator}

Use these related documents as reference to identify:
1. Unfavorable clauses in the current document compared to standard terms
2. Missing protections that exist in similar documents
3. Clauses that deviate significantly from industry norms
4. Potential red flags or concerning terms
"""
        else:
            prompt += """No related documents found. Analyze based solely on the document content.
"""
        
        prompt += """
Provide a structured risk analysis:

## RISK ASSESSMENT SUMMARY
[High/Medium/Low overall risk rating with brief explanation]

## IDENTIFIED RISKS
For each risk:
### [Risk Name]
- **Category:** [Financial/Legal/Operational/Regulatory/Commercial]
- **Severity:** [High/Medium/Low]
- **Current Clause:** [Quote the specific clause from the document]
- **Comparison:** [How this compares to similar documents/industry standards]
- **Recommendation:** [Specific action to take]

## MISSING PROTECTIONS
[Clauses present in similar documents but absent here]

## POSITIVE ASPECTS
[Well-structured or favorable clauses]
"""
        
        result = self.risk_analyzer.invoke(
            {"messages": [{"role": "user", "content": prompt}]},
            config=config
        )
        messages = result[0]["messages"] if isinstance(result, list) else result.get("messages", [])
        return {"status": "success", "analysis": messages[-1].content if messages else ""}