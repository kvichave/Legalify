"use client";
import { useState } from "react";
import Link from "next/link";

export default function ResearchPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [searchHistory, setSearchHistory] = useState([]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const res = await fetch("http://127.0.0.1:8000/api/research/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: query.trim() }),
            });
            const data = await res.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            setResults(data);
            setSearchHistory(prev => [
                { query: query.trim(), timestamp: new Date().toISOString() },
                ...prev.slice(0, 9)
            ]);
        } catch (err) {
            setError("Failed to perform research. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleHistoryClick = (histQuery) => {
        setQuery(histQuery);
        setQuery(histQuery);
        const form = document.getElementById("search-form");
        if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));
    };

    return (
        <div className="min-h-screen bg-gray-950">
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/tools"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Research Agent</h1>
                        <p className="text-gray-400 text-sm">Search the internet for up-to-date information</p>
                    </div>
                </div>

                <form id="search-form" onSubmit={handleSearch} className="mb-8">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Enter your research query..."
                            className="w-full pl-12 pr-32 py-4 bg-gray-900 border border-gray-700 rounded-xl text-white text-lg focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="absolute inset-y-0 right-0 px-6 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-r-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Researching...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    Research
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                        {error && (
                            <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-3 text-red-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        {results && results.status === "success" && (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded">
                                            Complete
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                            {results.query}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(results.response)}
                                        className="px-3 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed font-sans bg-transparent p-0 m-0">
                                            {results.response}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!results && !error && !loading && (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                                <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-400 mb-2">Start Your Research</h3>
                                <p className="text-gray-500">Enter a query above to search the internet for information</p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-800">
                                <h3 className="text-sm font-medium text-white">Recent Searches</h3>
                            </div>
                            <div className="p-2 max-h-96 overflow-y-auto">
                                {searchHistory.length > 0 ? (
                                    <div className="space-y-1">
                                        {searchHistory.map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleHistoryClick(item.query)}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors truncate"
                                            >
                                                {item.query}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm text-center py-4">No recent searches</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-4">
                            <div className="px-4 py-3 border-b border-gray-800">
                                <h3 className="text-sm font-medium text-white">Search Tips</h3>
                            </div>
                            <div className="p-4 space-y-3 text-sm text-gray-400">
                                <div className="flex gap-3">
                                    <span className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded">Tip</span>
                                    <span>Be specific with your queries for better results</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded">Tip</span>
                                    <span>Use quotes for exact phrase matching</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded">Tip</span>
                                    <span>Add &quot;definition&quot; or &quot;examples&quot; for specific searches</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}