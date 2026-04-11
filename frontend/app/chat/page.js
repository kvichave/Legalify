"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function ChatPage() {
    const [projects, setProjects] = useState([]);
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadProjects = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/list-projects/");
            const data = await res.json();
            setProjects(data.projects || []);
        } catch (err) {
            console.error("Failed to load projects:", err);
        }
    };

    const toggleProject = (project) => {
        setSelectedProjects((prev) =>
            prev.includes(project)
                ? prev.filter((p) => p !== project)
                : [...prev, project]
        );
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        if (selectedProjects.length === 0) {
            setShowProjectPicker(true);
            return;
        }

        const userMessage = input.trim();
        setInput("");
        setLoading(true);

        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setMessages((prev) => [...prev, { role: "assistant", content: "", loading: true }]);

        try {
            const res = await fetch("http://127.0.0.1:8000/api/chat/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    projects: selectedProjects,
                }),
            });
            const data = await res.json();

            setMessages((prev) => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = {
                    role: "assistant",
                    content: data.answer || data.error || "Sorry, something went wrong.",
                    sources: data.sources || [],
                };
                return newMessages;
            });
        } catch (err) {
            setMessages((prev) => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = {
                    role: "assistant",
                    content: "Failed to get response. Please try again.",
                };
                return newMessages;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white">Chat</h1>
                    <span className="text-gray-500 text-sm">
                        {selectedProjects.length > 0
                            ? `${selectedProjects.length} project${selectedProjects.length !== 1 ? "s" : ""} selected`
                            : "Select projects to chat with"}
                    </span>
                </div>
                <button
                    onClick={() => setShowProjectPicker(!showProjectPicker)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {selectedProjects.length > 0
                        ? `${selectedProjects.length} Selected`
                        : "Select Projects"}
                </button>
            </div>

            {/* Project Picker Dropdown */}
            {showProjectPicker && (
                <div className="border-b border-gray-800 p-4 bg-gray-900">
                    <p className="text-gray-400 text-sm mb-3">
                        Select one or more projects to include in your search
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {projects.length === 0 ? (
                            <p className="text-gray-500 text-sm">No projects available</p>
                        ) : (
                            projects.map((project) => (
                                <button
                                    key={project}
                                    onClick={() => toggleProject(project)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        selectedProjects.includes(project)
                                            ? "bg-indigo-600 text-white"
                                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                                    }`}
                                >
                                    {selectedProjects.includes(project) && (
                                        <svg className="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {project}
                                </button>
                            ))
                        )}
                    </div>
                    {projects.length > 0 && (
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => setSelectedProjects([...projects])}
                                className="text-xs text-indigo-400 hover:text-indigo-300"
                            >
                                Select all
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                                onClick={() => setSelectedProjects([])}
                                className="text-xs text-gray-400 hover:text-gray-300"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <svg
                            className="w-16 h-16 text-gray-700 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                        <h2 className="text-xl font-semibold text-gray-300 mb-2">Start a conversation</h2>
                        <p className="text-gray-500 max-w-md">
                            Select projects above and ask questions about your legal documents. 
                            AI will search through your vector data and provide answers.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, idx) => (
                            <Message key={idx} message={msg} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="px-6 pb-6">
                <div className="relative flex items-center bg-gray-900 border border-gray-800 rounded-xl">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            selectedProjects.length === 0
                                ? "Select projects first..."
                                : "Ask a question..."
                        }
                        disabled={loading || selectedProjects.length === 0}
                        className="w-full px-4 py-3 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50"
                        rows={1}
                        style={{ maxHeight: "120px" }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim() || selectedProjects.length === 0}
                        className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                            </svg>
                        )}
                    </button>
                </div>
                {selectedProjects.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                        {selectedProjects.map((p) => (
                            <span
                                key={p}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-full"
                            >
                                {p}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Message({ message }) {
    const isUser = message.role === "user";
    
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[80%] px-4 py-3 rounded-xl ${
                    isUser
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-100"
                }`}
            >
                {message.loading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                ) : (
                    <>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {!isUser && message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                                <p className="text-xs text-gray-500 mb-1">Sources:</p>
                                <div className="flex flex-wrap gap-1">
                                    {message.sources.map((src, i) => (
                                        <span
                                            key={i}
                                            className="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded"
                                        >
                                            {src.split("/").pop()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}