"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

export default function ContractAnalysisPage() {
    const params = useParams();
    const documentId = params.id;
    
    const [contract, setContract] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [clauses, setClauses] = useState([]);
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState("summary");
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    
    useEffect(() => {
        loadContract();
    }, [documentId]);
    
    const loadContract = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/contracts/get-analysis/${documentId}/`);
            if (res.ok) {
                const data = await res.json();
                setContract(data.contract);
                setAnalysis(data.analysis);
                setClauses(data.clauses || []);
                setRisks(data.risks || []);
            }
        } catch (err) {
            console.error("Failed to load contract:", err);
        } finally {
            setLoading(false);
        }
    };
    
    const runAnalysis = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/contracts/analyze/${documentId}/`, {
                method: "POST",
            });
            if (res.ok) {
                await loadContract();
            }
        } catch (err) {
            console.error("Analysis failed:", err);
        } finally {
            setAnalyzing(false);
        }
    };
    
    const sendMessage = async () => {
        if (!input.trim() || chatLoading) return;
        
        const userMessage = input.trim();
        setInput("");
        setChatLoading(true);
        
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/contracts/chat/${documentId}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage }),
            });
            const data = await res.json();
            
            setMessages(prev => [...prev, { 
                role: "assistant", 
                content: data.answer,
                clauses: data.referenced_clauses
            }]);
        } catch (err) {
            setMessages(prev => [...prev, { 
                role: "assistant", 
                content: "Failed to get response" 
            }]);
        } finally {
            setChatLoading(false);
        }
    };
    
    const getSeverityColor = (severity) => {
        switch (severity) {
            case "critical": return "bg-red-600";
            case "high": return "bg-orange-500";
            case "medium": return "bg-yellow-500";
            default: return "bg-green-500";
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-950">
                <div className="text-white">Loading contract...</div>
            </div>
        );
    }
    
    if (!contract) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
                <div className="text-white mb-4">No contract found</div>
                <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                >
                    {analyzing ? "Analyzing..." : "Analyze Document"}
                </button>
            </div>
        );
    }
    
    return (
        <div className="flex h-screen bg-gray-950">
            {/* Left Panel - Document Viewer */}
            <div className="flex-1 flex flex-col border-r border-gray-800">
                <div className="p-4 border-b border-gray-800">
                    <h1 className="text-xl font-bold text-white">Contract Analysis</h1>
                    <p className="text-gray-400 text-sm">
                        {contract?.contract_type || "Contract Document"} 
                        {analysis?.key_terms?.parties?.length > 0 && ` - ${analysis.key_terms.parties.join(", ")}`}
                    </p>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    {["summary", "clauses", "risks", "missing"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-sm font-medium transition-colors ${
                                activeTab === tab 
                                    ? "text-indigo-400 border-b-2 border-indigo-400" 
                                    : "text-gray-400 hover:text-gray-300"
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === "summary" && (
                        <div className="space-y-4">
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
                                <p className="text-gray-300">{analysis?.summary || "No analysis available"}</p>
                            </div>
                            
                            {analysis?.key_terms && Object.keys(analysis.key_terms).length > 0 && (
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">Key Terms</h3>
                                    <div className="space-y-2">
                                        {Object.entries(analysis.key_terms).map(([key, value]) => (
                                            <div key={key} className="flex justify-between">
                                                <span className="text-gray-400 capitalize">{key.replace(/_/g, " ")}</span>
                                                <span className="text-white">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                <h3 className="text-lg font-semibold text-white mb-2">Risk Score</h3>
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                        (analysis?.overall_risk_score || 0) > 5 ? "bg-red-600" :
                                        (analysis?.overall_risk_score || 0) > 2 ? "bg-yellow-500" : "bg-green-500"
                                    }`}>
                                        <span className="text-white font-bold">{analysis?.overall_risk_score || 0}</span>
                                    </div>
                                    <span className="text-gray-400">
                                        {(analysis?.overall_risk_score || 0) > 5 ? "High Risk" :
                                         (analysis?.overall_risk_score || 0) > 2 ? "Medium Risk" : "Low Risk"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === "clauses" && (
                        <div className="space-y-3">
                            {clauses.length === 0 ? (
                                <p className="text-gray-500">No clauses extracted</p>
                            ) : (
                                clauses.map((clause, idx) => (
                                    <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-indigo-400 font-medium">
                                                {clause.clause_number} - {clause.clause_title}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                clause.importance === "critical" ? "bg-red-600" :
                                                clause.importance === "important" ? "bg-orange-500" :
                                                "bg-gray-700"
                                            } text-white`}>
                                                {clause.importance}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 text-sm">{clause.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    
                    {activeTab === "risks" && (
                        <div className="space-y-3">
                            {risks.length === 0 ? (
                                <p className="text-gray-500">No risks identified</p>
                            ) : (
                                risks.map((risk, idx) => (
                                    <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium">{risk.category}</span>
                                            <span className={`px-2 py-1 rounded text-xs text-white ${getSeverityColor(risk.severity)}`}>
                                                {risk.severity}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 text-sm mb-2">{risk.description}</p>
                                        {risk.recommendation && (
                                            <p className="text-gray-500 text-sm">Recommendation: {risk.recommendation}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    
                    {activeTab === "missing" && (
                        <div className="space-y-3">
                            {analysis?.missing_clauses?.length === 0 ? (
                                <p className="text-gray-500">No missing clauses detected</p>
                            ) : (
                                <div className="bg-gray-900 border border-yellow-800 rounded-xl p-4">
                                    <h3 className="text-lg font-semibold text-yellow-500 mb-3">Missing Clauses</h3>
                                    <ul className="space-y-2">
                                        {(analysis?.missing_clauses || []).map((clause, idx) => (
                                            <li key={idx} className="flex items-center text-gray-300">
                                                <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                {clause}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Right Panel - Chat */}
            <div className="w-96 flex flex-col bg-gray-900">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-lg font-semibold text-white">Ask About Contract</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            <p>Ask questions about this contract</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`${msg.role === "user" ? "text-right" : "text-left"}`}>
                                <div className={`inline-block max-w-[90%] px-4 py-2 rounded-xl ${
                                    msg.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-100"
                                }`}>
                                    <p>{msg.content}</p>
                                    {msg.clauses && msg.clauses.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-700">
                                            <p className="text-xs text-gray-500 mb-1">Referenced clauses:</p>
                                            {msg.clauses.map((c, i) => (
                                                <p key={i} className="text-xs text-gray-400">{c.clause_number}: {c.clause_title}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="p-4 border-t border-gray-800">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            placeholder="Ask about this contract..."
                            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={chatLoading || !input.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-lg text-white"
                        >
                            {chatLoading ? "..." : "→"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}