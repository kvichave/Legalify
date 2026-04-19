"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

function CompareResultsContent() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("differences");

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem("compareResults");
            if (stored) {
                setData(JSON.parse(stored));
            }
        } catch (err) {
            console.error("Failed to load comparison data:", err);
        }
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">No comparison data available</p>
                    <Link
                        href="/contracts/compare"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        Go to Compare
                    </Link>
                </div>
            </div>
        );
    }

    const differences = data.differences || [];
    const similarities = data.similarities || [];

    return (
        <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href="/contracts/compare"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-xl font-bold text-white">Comparison Results</h1>
                    <div className="ml-auto flex items-center gap-3">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded">A</span>
                        <span className="text-sm text-gray-400">{data.document_a_name}</span>
                        <span className="text-gray-500">vs</span>
                        <span className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded">B</span>
                        <span className="text-sm text-gray-400">{data.document_b_name}</span>
                    </div>
                </div>
            </div>

            {data.summary && (
                <div className="px-6 py-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-white mb-2">Summary</h2>
                    <p className="text-gray-300 text-sm leading-relaxed">{data.summary}</p>
                </div>
            )}

            <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveTab("differences")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === "differences"
                                ? "bg-red-600 text-white"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                        }`}
                    >
                        Differences ({differences.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("similarities")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === "similarities"
                                ? "bg-green-600 text-white"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                        }`}
                    >
                        Similarities ({similarities.length})
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "differences" && (
                    <div className="space-y-4">
                        {differences.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-gray-500">No significant differences found</p>
                            </div>
                        ) : (
                            differences.map((diff, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-900 border border-red-800/50 rounded-xl overflow-hidden"
                                >
                                    <div className="px-5 py-4 bg-red-900/20 border-b border-red-800/30">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-red-300">{diff.clause}</h3>
                                            {diff.impact && (
                                                <span className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
                                                    {diff.impact}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">A</span>
                                                    <span className="text-xs text-gray-500">Document A</span>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {diff.text_a?.substring(0, 500)}
                                                    {diff.text_a?.length > 500 && "..."}
                                                </p>
                                            </div>
                                            <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded">B</span>
                                                    <span className="text-xs text-gray-500">Document B</span>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {diff.text_b?.substring(0, 500)}
                                                    {diff.text_b?.length > 500 && "..."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === "similarities" && (
                    <div className="space-y-4">
                        {similarities.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-gray-500">No similar clauses found</p>
                            </div>
                        ) : (
                            similarities.map((sim, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-900 border border-green-800/50 rounded-xl overflow-hidden"
                                >
                                    <div className="px-5 py-4 bg-green-900/20 border-b border-green-800/30">
                                        <h3 className="text-lg font-semibold text-green-300">{sim.clause}</h3>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            {sim.text?.substring(0, 800)}
                                            {sim.text?.length > 800 && "..."}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CompareResultsPage() {
    return <CompareResultsContent />;
}