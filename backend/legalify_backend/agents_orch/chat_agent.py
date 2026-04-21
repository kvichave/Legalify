from typing import Any, Dict, List

from deepagents import create_deep_agent
from langgraph.store.memory import InMemoryStore


CHAT_SYSTEM_PROMPT = """You are a helpful legal assistant. Based on the context from legal documents provided, answer the user's question.

Instructions:
- Provide a clear, direct answer based only on the context provided
- If the context doesn't contain enough information to fully answer the question, state what you know and what you're uncertain about
- Be precise and cite specific details when available
- Keep your response concise but informative"""


SUBAGENTS: List[Dict[str, Any]] = [
    {
        "name": "document_retriever",
        "description": "Retrieves relevant document chunks based on user queries",
        "system_prompt": "You are a document retriever. Given a user query, identify what information would be most relevant from legal documents. Think about keywords, legal terms, and concepts that would help find the right information.",
        "model": None,
    },
    {
        "name": "context_synthesizer",
        "description": "Synthesizes retrieved document chunks into coherent context",
        "system_prompt": "You are a context synthesizer. Combine multiple retrieved document chunks into a coherent, organized context that addresses the user's question. Remove redundancy and organize by topic.",
        "model": None,
    },
    {
        "name": "answer_generator",
        "description": "Generates answers based on synthesized context",
        "system_prompt": "You are an answer generator. Based on the provided context from legal documents, generate a clear, accurate answer to the user's question. Cite specific details when available.",
        "model": None,
    },
]
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
load_dotenv()
llm = ChatOpenAI(
    model="DeepSeek-V3.2",
    base_url="https://agent-factory.openai.azure.com/openai/v1/",
    api_key=os.getenv("AZURE_MODEL"),
    temperature=0,
)




class MasterAgent:

    def __init__(self):
        self.agent = create_deep_agent(
            model=llm,
            subagents=SUBAGENTS,
            system_prompt=CHAT_SYSTEM_PROMPT,
            memory = InMemorySaver()

        )
    def setup(self):
        self.agent = create_deep_agent(
 model=llm,
                         subagents=SUBAGENTS,
            system_prompt=CHAT_SYSTEM_PROMPT,
            checkpointer=self.memory

        )
    def chat(self, message: str, context: str) -> Dict[str, Any]:
        prompt = f"""Context from legal documents:
        {context}

        User Question: {message}

        Answer:"""

        