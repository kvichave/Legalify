"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ProjectDetailPage() {
    const params = useParams();
    const projectName = decodeURIComponent(params.projectName);
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchContents();
    }, [projectName]);

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

    const formatSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

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
            <div className="flex items-center justify-between mb-8">
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
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </Link>
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

            {/* Contents */}
            {!loading && !error && contents.length > 0 && (
                <div className="space-y-3">
                    {contents.map((item) => (
                        <ContentItem key={item.path} item={item} formatSize={formatSize} depth={0} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ContentItem({ item, formatSize, depth }) {
    const [open, setOpen] = useState(true);
    const isFolder = item.type === "folder";
    const childCount = isFolder ? (item.children?.length || 0) : 0;

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
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
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
                        <ContentItem key={child.path} item={child} formatSize={formatSize} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
