"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

const tools = [
  {
    id: "ai-assistant",
    name: "AI Assistant",
    description: "Chat with your legal documents using AI. Ask questions and get insights from your stored contracts and documents.",
    icon: "chat",
    href: "/chat",
    color: "bg-indigo-600",
  },
  {
    id: "research",
    name: "Research Agent",
    description: "Research any topic using internet search. Get up-to-date information, facts, and in-depth analysis with cited sources.",
    icon: "research",
    href: "/research",
    color: "bg-purple-600",
  },
  {
    id: "contract-comparison",
    name: "Contract Comparison",
    description: "Compare multiple contracts side-by-side. Identify differences, inconsistencies, and alignment opportunities.",
    icon: "compare",
    href: "/contracts/compare",
    color: "bg-blue-600",
  },
  {
    id: "risk-analysis",
    name: "Contract Risk Analysis",
    description: "Analyze contracts for potential risks, unfavorable clauses, and compliance issues.",
    icon: "shield",
    href: "/risk",
    color: "bg-red-600",
  },
  {
    id: "ai-auditing",
    name: "AI Auditing",
    description: "Perform AI-powered audits of your legal documents for compliance, accuracy, and governance.",
    icon: "search",
    href: "/audit",
    color: "bg-amber-600",
  },
  {
    id: "client-insights",
    name: "Client Insights & Analytics",
    description: "Get deep insights into your clients. Analyze patterns, track relationships, and generate analytics reports.",
    icon: "chart",
    href: "/insights",
    color: "bg-emerald-600",
  },
];

const iconMap = {
  chat: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  research: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  compare: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  shield: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  search: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

export default function ToolsPage() {
  const [stats, setStats] = useState({ projects: 0, documents: 0, embeddings: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/stats/");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tools</h1>
          <p className="text-gray-400">
            Access all Legalify tools for legal document management and analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="group block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-all hover:-translate-y-1"
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${tool.color} mb-4`}>
                <div className="text-white">{iconMap[tool.icon]}</div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                {tool.name}
              </h3>
              <p className="text-gray-400 text-sm">{tool.description}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-sm">Total Projects</p>
            <p className="text-2xl font-bold text-white">{stats.projects}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-sm">Documents</p>
            <p className="text-2xl font-bold text-white">{stats.documents}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-sm">Embeddings</p>
            <p className="text-2xl font-bold text-white">{stats.embeddings?.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}