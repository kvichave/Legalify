import os
from typing import Any, Dict, List
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import create_react_agent


class DeepAgentBase:
    """A minimal, reusable wrapper around the DeepAgent workflow.

    This provides a common foundation for all project tools (risk analysis,
    document comparison, etc.) by centralizing LLM setup and the
    DeepAgent construction logic.
    """

    def __init__(
        self,
        llm: Any,
        system_prompt: str = "",
        checkpointer: Any = None,
        tools: List[Any] = None,
    ) -> None:
        self.llm = llm
        self.system_prompt = system_prompt
        self.checkpointer = checkpointer if checkpointer is not None else InMemorySaver()
        self.tools = tools or []

    def build_workflow(self, subagents: List[Dict[str, Any]] = None):
        """Create a DeepAgent workflow given a list of subagents."""
        workflow = create_react_agent(
            model=self.llm,
            tools=self.tools,
            prompt=self.system_prompt,
        )
        return workflow
