import os
from typing import Any, Dict, List
from langgraph.checkpoint.memory import InMemorySaver


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
    ) -> None:
        self.llm = llm
        self.system_prompt = system_prompt
        # Use provided checkpointer or fall back to in-memory saver
        self.checkpointer = checkpointer if checkpointer is not None else InMemorySaver()

    def build_workflow(self, subagents: List[Dict[str, Any]]):
        """Create a DeepAgent workflow given a list of subagents.

        Each subagent item should be a dict compatible with the structure used
        by deepagents.create_deep_agent (e.g., keys: name, description,
        system_prompt, model).
        """
        from deepagents import create_deep_agent  # local import to keep this module lightweight

        workflow = create_deep_agent(
            subagents=subagents,
            model=self.llm,
            system_prompt=self.system_prompt,
            checkpointer=self.checkpointer,
        )
        return workflow
