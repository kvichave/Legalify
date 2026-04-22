"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("@embedpdf/react-pdf-viewer").then(mod => mod.PDFViewer), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
});

export default function RiskAnalysisPage() {
    const router = useRouter();
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [pickerProject, setPickerProject] = useState("");
    const [pickerContents, setPickerContents] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pdfId, setPdfId] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/list-projects/");
            const data = await res.json();
            setProjects(data.projects || []);
            if (data.projects?.length > 0) {
                setPickerProject(data.projects[0]);
            }
        } catch (err) {
            console.error("Failed to load projects:", err);
        }
    };

    const loadProjectContents = async (projectName) => {
        setPickerLoading(true);
        try {
            const res = await fetch(
                `http://127.0.0.1:8000/api/projects/${encodeURIComponent(projectName)}/contents/`
            );
            const data = await res.json();
            setPickerContents(data.contents || []);
        } catch (err) {
            console.error("Failed to load contents:", err);
        } finally {
            setPickerLoading(false);
        }
    };

    useEffect(() => {
        if (pickerProject) {
            loadProjectContents(pickerProject);
        }
    }, [pickerProject]);

    const loadPdf = async (doc) => {
        if (!doc || !doc.path) return;

        setLoading(true);
        setError(null);
        try {
            const projectName = doc.project || pickerProject;
            const res = await fetch(
                `http://127.0.0.1:8000/api/download/?project=${encodeURIComponent(projectName)}&path=${encodeURIComponent(doc.path)}`
            );
            
            if (!res.ok) {
                throw new Error("Failed to download PDF");
            }
            
            const documentId = res.headers.get("X-Document-Id");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPdfId(documentId);
        } catch (err) {
            console.error("Failed to load PDF:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const selectDoc = (doc) => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setSelectedDoc(doc);
        setPdfUrl(null);
        setPdfId(null);
        setAnalysisResults(null);
        setShowDocPicker(false);
        loadPdf(doc);
    };

    const runRiskAnalysis = async () => {
        if (!selectedDoc || !pdfId) {
            setAnalysisError("Please select a document first");
            return;
        }
        
        setAnalysisLoading(true);
        setAnalysisResults(null);
        setAnalysisError(null);
        
        try {
            const res = await fetch("http://127.0.0.1:8000/api/analyze-risk/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project: selectedDoc.project || pickerProject,
                    document_id: pdfId,
                }),
            });
            const data = await res.json();
            
            if (data.error) {
                setAnalysisError(data.error);
                return;
            }
            
            setAnalysisResults(data);
            sessionStorage.setItem("riskAnalysisResults", JSON.stringify(data));
        } catch (err) {
            console.error("Risk analysis error:", err);
            setAnalysisError("Failed to run risk analysis");
        } finally {
            setAnalysisLoading(false);
        }
    };

    const parseAnalysis = (text) => {
        if (!text) return [];
        
        const risks = [];
        const lines = text.split('\n');
        let currentRisk = null;
        
        for (const line of lines) {
            if (line.startsWith('### ')) {
                if (currentRisk) risks.push(currentRisk);
                const parts = line.replace('### ', '').split(':');
                currentRisk = {
                    category: parts[0]?.trim() || 'General',
                    description: parts.slice(1).join(':').trim() || '',
                    severity: 'Medium',
                    location: '',
                    recommendation: ''
                };
            } else if (line.startsWith('Severity:') && currentRisk) {
                currentRisk.severity = line.replace('Severity:', '').trim();
            } else if (line.startsWith('Location:') && currentRisk) {
                currentRisk.location = line.replace('Location:', '').trim();
            } else if (line.startsWith('Recommendation:') && currentRisk) {
                currentRisk.recommendation = line.replace('Recommendation:', '').trim();
            } else if (currentRisk && line.trim() && !line.startsWith('##') && !line.startsWith('=')) {
                currentRisk.description += ' ' + line.trim();
            }
        }
        
        if (currentRisk) risks.push(currentRisk);
        return risks;
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high': return 'bg-red-900/50 border-red-700';
            case 'medium': return 'bg-yellow-900/50 border-yellow-700';
            case 'low': return 'bg-green-900/50 border-green-700';
            default: return 'bg-gray-900/50 border-gray-700';
        }
    };

    const getSeverityBadge = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high': return 'bg-red-600 text-white';
            case 'medium': return 'bg-yellow-600 text-white';
            case 'low': return 'bg-green-600 text-white';
            default: return 'bg-gray-600 text-white';
        }
    };

    return (
        <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href="/tools"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-xl font-bold text-white">Contract Risk Analysis</h1>
                    
                    <div className="ml-auto flex items-center gap-4">
                        {selectedDoc && (
                            <button
                                onClick={runRiskAnalysis}
                                disabled={analysisLoading || !pdfId}
                                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {analysisLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        Analyze for Risks
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </span>
                        {selectedDoc ? (
                            <span className="text-gray-300 text-sm">{selectedDoc.name}</span>
                        ) : (
                            <span className="text-gray-500 text-sm">Select a document to analyze</span>
                        )}
                        <button
                            onClick={() => setShowDocPicker(true)}
                            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                        >
                            {selectedDoc ? "Change" : "Browse"}
                        </button>
                    </div>

                    {analysisResults && analysisResults.status === 'success' && (
                        <div className="ml-auto flex items-center gap-4">
                            <span className="text-green-400 text-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Analysis Complete
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {analysisError && (
                <div className="px-6 py-4 bg-red-900/30 border-b border-red-800 flex-shrink-0">
                    <div className="flex items-center gap-3 text-red-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{analysisError}</span>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                <div className="flex h-full">
                    <div className={`${analysisResults ? 'w-1/2' : 'w-full'} h-full flex flex-col border-r border-gray-800 transition-all`}>
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-gray-400">Loading PDF...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-red-400 mb-2">Error loading PDF</p>
                                    <p className="text-gray-500 text-sm">{error}</p>
                                </div>
                            </div>
                        ) : !pdfUrl ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                    <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-500 mb-2">Select a PDF document to analyze</p>
                                    <p className="text-gray-600 text-sm">Choose a contract from your projects for risk analysis</p>
                                    <button
                                        onClick={() => setShowDocPicker(true)}
                                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                    >
                                        Browse Documents
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 z-10">
                                    <h3 className="text-sm font-medium text-white">{selectedDoc?.name}</h3>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <PDFViewer 
                                        config={{ src: pdfUrl }} 
                                        style={{ height: "100%", width: "100%" }} 
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {analysisResults && (
                        <div className="w-1/2 h-full flex flex-col bg-gray-900 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Risk Analysis Report
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {analysisResults.analysis ? (
                                    <div className="space-y-4">
                                        {parseAnalysis(analysisResults.analysis).length > 0 ? (
                                            parseAnalysis(analysisResults.analysis).map((risk, index) => (
                                                <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(risk.severity)}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityBadge(risk.severity)}`}>
                                                            {risk.severity}
                                                        </span>
                                                        <span className="text-xs text-gray-500">{risk.category}</span>
                                                    </div>
                                                    <h4 className="text-sm font-medium text-white mb-2">
                                                        {risk.description || risk.category}
                                                    </h4>
                                                    {risk.location && (
                                                        <p className="text-xs text-gray-400 mb-2">
                                                            <span className="text-gray-500">Location:</span> {risk.location}
                                                        </p>
                                                    )}
                                                    {risk.recommendation && (
                                                        <div className="mt-2 pt-2 border-t border-gray-700">
                                                            <p className="text-xs text-gray-300">
                                                                <span className="text-indigo-400 font-medium">Recommendation:</span> {risk.recommendation}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="prose prose-invert prose-sm max-w-none">
                                                <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-800 p-4 rounded-lg border border-gray-700 overflow-x-auto">
                                                    {analysisResults.analysis}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ) : analysisResults.comparison ? (
                                    <div className="space-y-4">
                                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-red-300 mb-2">Comparative Risk Analysis</h4>
                                            <pre className="whitespace-pre-wrap text-sm text-gray-300">
                                                {analysisResults.comparison}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-center py-8">
                                        No analysis data available
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showDocPicker && (
                <FilePickerModal
                    projects={projects}
                    pickerProject={pickerProject}
                    setPickerProject={setPickerProject}
                    pickerContents={pickerContents}
                    pickerLoading={pickerLoading}
                    onSelect={selectDoc}
                    onClose={() => setShowDocPicker(false)}
                />
            )}
        </div>
    );
}

function FilePickerModal({ projects, pickerProject, setPickerProject, pickerContents, pickerLoading, onSelect, onClose }) {
    const [openFolders, setOpenFolders] = useState({});

    const toggleFolder = (path) => {
        setOpenFolders((prev) => ({
            ...prev,
            [path]: !prev[path],
        }));
    };

    const handleSelect = (item) => {
        onSelect({ id: item.id, name: item.name, project: pickerProject, path: item.path });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-700 shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <span className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded">
                            Select Document
                        </span>
                        <h2 className="text-lg font-semibold text-white">Choose a PDF for Risk Analysis</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-4 border-b border-gray-800">
                    <label className="block text-sm text-gray-400 mb-2">Select Project</label>
                    <select
                        value={pickerProject}
                        onChange={(e) => setPickerProject(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                    >
                        {projects.map((project) => (
                            <option key={project} value={project}>
                                {project}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {pickerLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {pickerContents.map((item) => (
                                <FileTreeItem
                                    key={item.path}
                                    item={item}
                                    depth={0}
                                    openFolders={openFolders}
                                    toggleFolder={toggleFolder}
                                    onSelect={handleSelect}
                                />
                            ))}
                            {pickerContents.length === 0 && (
                                <p className="text-gray-500 text-center py-8">No files in this project</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FileTreeItem({ item, depth, openFolders, toggleFolder, onSelect }) {
    if (item.type === "folder") {
        const isOpen = openFolders[item.path];
        return (
            <div>
                <button
                    onClick={() => toggleFolder(item.path)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors"
                    style={{ paddingLeft: 12 + depth * 16 }}
                >
                    <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="text-sm font-medium">{item.name}</span>
                </button>
                {isOpen && item.children && (
                    <div>
                        {item.children.map((child) => (
                            <FileTreeItem
                                key={child.path}
                                item={child}
                                depth={depth + 1}
                                openFolders={openFolders}
                                toggleFolder={toggleFolder}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors"
            style={{ paddingLeft: 12 + depth * 16 }}
        >
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">{item.name}</span>
        </button>
    );
}