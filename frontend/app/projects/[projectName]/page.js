"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ProjectDetailPage() {
    const params = useParams();
    const projectName = decodeURIComponent(params.projectName);
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [classifyingFile, setClassifyingFile] = useState(null);
    const [classifyingIndex, setClassifyingIndex] = useState(0);
    const [classifyingTotal, setClassifyingTotal] = useState(0);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchContents();
    }, [projectName]);

    // Auto-hide upload result after 4s
    useEffect(() => {
        if (uploadResult) {
            const t = setTimeout(() => setUploadResult(null), 4000);
            return () => clearTimeout(t);
        }
    }, [uploadResult]);

    const fetchContents = async () => {
        try {
            setLoading(true);
            const res = await fetch(
                `http://127.0.0.1:8000/api/projects/${encodeURIComponent(projectName)}/contents/`
            );
            if (!res.ok) throw new Error("Project not found");
            const data = await res.json();
            setContents(data.contents || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadResult(null);
        setClassifyingTotal(files.length);

        try {
            const results = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setClassifyingFile(file.name);
                setClassifyingIndex(i + 1);

                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch(
                    `http://127.0.0.1:8000/api/projects/${encodeURIComponent(projectName)}/upload-classify/`,
                    { method: "POST", body: formData }
                );
                const data = await res.json();
                if (res.ok) {
                    results.push({ name: file.name, folder: data.classified_as, ok: true });
                } else {
                    results.push({ name: file.name, error: data.error, ok: false });
                }
            }
            setUploadResult(results);
            // Refresh contents
            await fetchContents();
        } catch (err) {
            setUploadResult([{ name: "Upload", error: err.message, ok: false }]);
        } finally {
            setUploading(false);
            setClassifyingFile(null);
            setClassifyingIndex(0);
            setClassifyingTotal(0);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Filter contents recursively based on search query
    const filteredContents = useMemo(() => {
        if (!searchQuery.trim()) return contents;
        const q = searchQuery.toLowerCase();

        function filterItems(items) {
            return items.reduce((acc, item) => {
                const nameMatch = item.name.toLowerCase().includes(q);
                if (item.type === "folder") {
                    const filteredChildren = filterItems(item.children || []);
                    if (nameMatch || filteredChildren.length > 0) {
                        acc.push({ ...item, children: filteredChildren });
                    }
                } else {
                    if (nameMatch) acc.push(item);
                }
                return acc;
            }, []);
        }
        return filterItems(contents);
    }, [contents, searchQuery]);

    return (
        <div className="min-h-screen bg-gray-950 px-8 py-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <Link href="/projects" className="hover:text-gray-300 transition-colors">
                    Projects
                </Link>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-300">{projectName}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400">
                        <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{projectName}</h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            {contents.length} item{contents.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Upload & Auto-Classify Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer"
                    >
                        {uploading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        )}
                        {uploading ? "Uploading..." : "Upload & Auto-Classify"}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleUpload}
                    />
                    {/* Back */}
                    <Link
                        href="/projects"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                </div>
            </div>

            {/* Upload Result Toast */}
            {uploadResult && (
                <div className="mb-6 space-y-2">
                    {uploadResult.map((r, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${r.ok
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                : "bg-red-500/10 border-red-500/30 text-red-300"
                                }`}
                        >
                            {r.ok ? (
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            {r.ok ? (
                                <span><strong>{r.name}</strong> → classified into <strong>{r.folder}</strong></span>
                            ) : (
                                <span><strong>{r.name}</strong>: {r.error}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Search Box */}
            <div className="relative mb-6">
                <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search files and folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-red-400 text-lg font-medium">{error}</p>
                    <Link href="/projects" className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">
                        ← Back to projects
                    </Link>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && contents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-300">This project is empty</h3>
                    <p className="text-gray-500 mt-1">Upload documents to get started.</p>
                </div>
            )}

            {/* No search results */}
            {!loading && !error && contents.length > 0 && filteredContents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-400">No results for &quot;{searchQuery}&quot;</p>
                </div>
            )}

            {/* Contents */}
            {!loading && !error && filteredContents.length > 0 && (
                <div className="space-y-3">
                    {filteredContents.map((item) => (
                        <ContentItem key={item.path} item={item} formatSize={formatSize} depth={0} searchQuery={searchQuery} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ContentItem({ item, formatSize, depth, searchQuery }) {
    const [open, setOpen] = useState(true);
    const isFolder = item.type === "folder";
    const childCount = isFolder ? (item.children?.length || 0) : 0;

    // Highlight matching text
    const highlightName = (name) => {
        if (!searchQuery.trim()) return name;
        const idx = name.toLowerCase().indexOf(searchQuery.toLowerCase());
        if (idx === -1) return name;
        return (
            <>
                {name.slice(0, idx)}
                <span className="bg-indigo-500/30 text-indigo-200 rounded px-0.5">{name.slice(idx, idx + searchQuery.length)}</span>
                {name.slice(idx + searchQuery.length)}
            </>
        );
    };

    return (
        <div style={{ marginLeft: depth * 16 }}>
            <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 ${isFolder
                    ? "bg-gray-900 border-gray-800 hover:border-gray-700 cursor-pointer"
                    : "bg-gray-900/50 border-gray-800/60 hover:border-gray-700"
                    }`}
                onClick={isFolder ? () => setOpen(!open) : undefined}
            >
                {/* Icon */}
                {isFolder ? (
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                ) : (
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{highlightName(item.name)}</p>
                    {isFolder && (
                        <p className="text-gray-500 text-xs mt-0.5">
                            {childCount} item{childCount !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {/* File size */}
                {!isFolder && item.size !== undefined && (
                    <span className="text-gray-500 text-xs">{formatSize(item.size)}</span>
                )}

                {/* Chevron for folders */}
                {isFolder && (
                    <svg
                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                )}
            </div>

            {/* Children */}
            {isFolder && open && item.children && item.children.length > 0 && (
                <div className="mt-1 space-y-1">
                    {item.children.map((child) => (
                        <ContentItem key={child.path} item={child} formatSize={formatSize} depth={depth + 1} searchQuery={searchQuery} />
                    ))}
                </div>
            )}
        </div>
    );
}
