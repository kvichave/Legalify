"use client";
import { useState, useEffect } from "react";

export default function ContractComparePage() {
    const [documents, setDocuments] = useState([]);
    const [docA, setDocA] = useState("");
    const [docB, setDocB] = useState("");
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        loadDocuments();
    }, []);
    
    const loadDocuments = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/list-projects/");
            const data = await res.json();
            
            const allDocs = [];
            for (const project of data.projects || []) {
                try {
                    const docsRes = await fetch(`http://127.0.0.1:8000/api/projects/${project}/contents/`);
                    const docsData = await docsRes.json();
                    const flattenFiles = (items) => {
                        items.forEach(item => {
                            if (item.type === "file") {
                                allDocs.push({ 
                                    id: item.id, 
                                    name: item.name, 
                                    project,
                                    file_path: item.path,
                                    isContract: Boolean(item.id)
                                });
                            } else if (item.children) {
                                flattenFiles(item.children);
                            }
                        });
                    };
                    flattenFiles(docsData.contents || []);
                } catch (e) {}
            }
            setDocuments(allDocs);
        } catch (err) {
            console.error("Failed to load documents:", err);
        }
    };
    
    const runComparison = async () => {
        if (!docA || !docB) return;
        
        setLoading(true);
        try {
            const res = await fetch("http://127.0.0.1:8000/api/contracts/compare/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    document_a_id: docA,
                    document_b_id: docB,
                }),
            });
            const data = await res.json();
            setComparison(data);
        } catch (err) {
            console.error("Comparison failed:", err);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Contract Comparison</h1>
                <p className="text-gray-400 mb-8">Compare two contracts side-by-side</p>
                
                {/* Selectors */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Contract A</label>
                        <select
                            value={docA}
                            onChange={(e) => setDocA(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">Select contract A...</option>
                            {documents
                                .filter(doc => doc.id)
                                .map(doc => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.name} ({doc.project})
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Contract B</label>
                        <select
                            value={docB}
                            onChange={(e) => setDocB(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">Select contract B...</option>
                            {documents
                                .filter(doc => doc.id)
                                .map(doc => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.name} ({doc.project})
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
                
                <button
                    onClick={runComparison}
                    disabled={loading || !docA || !docB}
                    className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl font-medium mb-8"
                >
                    {loading ? "Comparing..." : "Compare Contracts"}
                </button>
                
                {/* Results */}
                {comparison && (
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-2">Comparison Summary</h3>
                            <p className="text-gray-300">{comparison.summary}</p>
                        </div>
                        
                        {/* Differences */}
                        {comparison.differences?.length > 0 && (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-red-400 mb-4">Key Differences</h3>
                                <div className="space-y-4">
                                    {comparison.differences.map((diff, idx) => (
                                        <div key={idx} className="border-b border-gray-800 pb-4 last:border-0">
                                            <h4 className="text-white font-medium mb-2">{diff.clause}</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-red-900/20 border border-red-900 rounded p-3">
                                                    <p className="text-xs text-red-400 mb-1">Contract A</p>
                                                    <p className="text-gray-300 text-sm">{diff.text_a}</p>
                                                </div>
                                                <div className="bg-blue-900/20 border border-blue-900 rounded p-3">
                                                    <p className="text-xs text-blue-400 mb-1">Contract B</p>
                                                    <p className="text-gray-300 text-sm">{diff.text_b}</p>
                                                </div>
                                            </div>
                                            {diff.impact && (
                                                <p className="text-gray-500 text-sm mt-2">Impact: {diff.impact}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Similarities */}
                        {comparison.similarities?.length > 0 && (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-green-400 mb-4">Similar Clauses</h3>
                                <div className="space-y-3">
                                    {comparison.similarities.map((sim, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <div>
                                                <p className="text-white font-medium">{sim.clause}</p>
                                                <p className="text-gray-500 text-sm">{sim.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}