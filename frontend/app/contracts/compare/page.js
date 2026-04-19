"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("@embedpdf/react-pdf-viewer").then(mod => mod.PDFViewer), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
});

export default function ContractComparePage() {
    const router = useRouter();
    const [leftDoc, setLeftDoc] = useState(null);
    const [rightDoc, setRightDoc] = useState(null);
    const [showLeftPicker, setShowLeftPicker] = useState(false);
    const [showRightPicker, setShowRightPicker] = useState(false);
    const [leftPdfUrl, setLeftPdfUrl] = useState(null);
    const [rightPdfUrl, setRightPdfUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [pickerProject, setPickerProject] = useState("");
    const [pickerContents, setPickerContents] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [error, setError] = useState(null);
    const [leftPDFid, setLeftPDFid] = useState(null);
    const [rightPDFid, setRightPDFid] = useState(null); 

    const [highlightLine, setHighlightLine] = useState(3);
    const [leftHighlights, setLeftHighlights] = useState([]);
    const [rightHighlights, setRightHighlights] = useState([]);
    const [leftPageInfo, setLeftPageInfo] = useState({ height: 0, width: 0 });
    const [rightPageInfo, setRightPageInfo] = useState({ height: 0, width: 0 });
    const [showHighlightPanel, setShowHighlightPanel] = useState(false);
    const [compareLoading, setCompareLoading] = useState(false);
    const [compareResults, setCompareResults] = useState(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const clearComparison = () => {
        setCompareResults(null);
    };

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

const loadPdf = async (doc, setPdfUrl, setDoc, setPdfId) => {
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
            console.log("Download response headers:", doc.path);
            const documentId = res.headers.get("X-Document-Id");
            console.log("Download response - header documentId:", documentId);
            
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            
            if (setPdfId && documentId) {
                setPdfId(documentId);
            }
        } catch (err) {
            console.error("Failed to load PDF:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchHighlights = async (doc, setHighlights, setPageInfo) => {
        if (!doc || !doc.path) return;

        try {
            const projectName = doc.project || pickerProject;
            const res = await fetch(
                `http://127.0.0.1:8000/api/pdf/text-lines/?project=${encodeURIComponent(projectName)}&path=${encodeURIComponent(doc.path)}`
            );
            
            if (res.ok) {
                const data = await res.json();
                setPageInfo({ 
                    height: data.page_height || 800, 
                    width: data.page_width || 600 
                });
                
                const lineHighlight = data.lines?.find(l => l.line_number === highlightLine);
                if (lineHighlight) {
                    setHighlights([{
                        ...lineHighlight,
                        page: 1
                    }]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch highlights:", err);
        }
    };

    const selectLeftDoc = (doc) => {
        if (leftPdfUrl) URL.revokeObjectURL(leftPdfUrl);
        setLeftDoc(doc);
        setLeftPdfUrl(null);
        setLeftHighlights([]);
        setLeftPDFid(null);
        setShowLeftPicker(false);
        loadPdf(doc, setLeftPdfUrl, setLeftDoc, setLeftPDFid);
        fetchHighlights(doc, setLeftHighlights, setLeftPageInfo);
    };

    const selectRightDoc = (doc) => {
        if (rightPdfUrl) URL.revokeObjectURL(rightPdfUrl);
        setRightDoc(doc);
        setRightPdfUrl(null);
        setRightHighlights([]);
        setRightPDFid(null);
        setShowRightPicker(false);
        loadPdf(doc, setRightPdfUrl, setRightDoc, setRightPDFid);
        fetchHighlights(doc, setRightHighlights, setRightPageInfo);
    };

    useEffect(() => {
        if (leftDoc) {
            fetchHighlights(leftDoc, setLeftHighlights, setLeftPageInfo);
        }
    }, [highlightLine, leftDoc]);

    useEffect(() => {
        if (rightDoc) {
            fetchHighlights(rightDoc, setRightHighlights, setRightPageInfo);
        }
    }, [highlightLine, rightDoc]);

    const hasBothPdfs = leftDoc && rightDoc && leftPdfUrl && rightPdfUrl;
    const isLoading = loading && (leftDoc || rightDoc);

    const runComparison = async () => {
        console.log("Running comparison with:", { leftPDFid, rightPDFid });
        
        if (!leftPDFid || !rightPDFid) {
            console.error("Missing document IDs:", { leftPDFid, rightPDFid });
            return;
        }
        
        setCompareLoading(true);
        setCompareResults(null);
        try {
            const res = await fetch("http://127.0.0.1:8000/api/compare/embeddings/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    document_a_id: leftPDFid,
                    document_b_id: rightPDFid,
                    document_a: leftDoc,
                    document_b: rightDoc,
                    project_name: leftDoc?.project || pickerProject,
                }),
            });
            const data = await res.json();
            
            if (data.error) {
                console.error("Comparison error:", data.error);
                setCompareResults(data);
                return;
            }
            
            console.log("Comparison response:", data);
            setCompareResults(data);
            
            sessionStorage.setItem("compareResults", JSON.stringify(data));
            router.push("/contracts/compare/results");
        } catch (err) {
            console.error("Comparison error:", err);
        } finally {
            setCompareLoading(false);
        }
    };

    return (
        <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href="/projects"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-xl font-bold text-white">Contract Comparison</h1>
                    
                    <div className="ml-auto flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-400">Highlight Line:</label>
                            <input
                                type="number"
                                min="1"
                                value={highlightLine}
                                onChange={(e) => setHighlightLine(parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowHighlightPanel(!showHighlightPanel)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                showHighlightPanel 
                                    ? "bg-indigo-600 text-white" 
                                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            }`}
                        >
                            Highlight Controls
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded">A</span>
                        {leftDoc ? (
                            <span className="text-gray-300 text-sm">{leftDoc.name}</span>
                        ) : (
                            <span className="text-gray-500 text-sm"> Select document A</span>
                        )}
                        <button
                            onClick={() => setShowLeftPicker(true)}
                            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                        >
                            {leftDoc ? "Change" : "Browse"}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded">B</span>
                        {rightDoc ? (
                            <span className="text-gray-300 text-sm">{rightDoc.name}</span>
                        ) : (
                            <span className="text-gray-500 text-sm"> Select document B</span>
                        )}
                        <button
                            onClick={() => setShowRightPicker(true)}
                            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                        >
                            {rightDoc ? "Change" : "Browse"}
                        </button>
                    </div>

                    {hasBothPdfs && (
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={runComparison}
                                disabled={compareLoading}
                                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {compareLoading ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Comparing...
                                    </>
                                ) : (
                                    "AI Compare"
                                )}
                            </button>
                        </div>
)}
                </div>
            </div>

            <div className="px-6 py-3 bg-gray-900/50 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-6 text-sm">
                    <span className="text-gray-400">Current Highlight:</span>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                        Line {highlightLine}
                    </span>
                    {leftHighlights.length > 0 && (
                        <span className="text-gray-500">
                            "{leftHighlights[0].text.substring(0, 40)}..."
                        </span>
                    )}
                </div>
            </div>

            {compareResults && (
                <div className="px-6 py-4 bg-gray-900 border-b border-gray-800 max-h-64 overflow-y-auto flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white">AI Comparison Results</h3>
                        <button
                            onClick={() => setCompareResults(null)}
                            className="text-gray-400 hover:text-white"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {compareResults.error ? (
                        <div className="text-red-400 text-sm">{compareResults.error}</div>
                    ) : (
                        <div className="space-y-4">
                            {compareResults.summary && (
                                <div className="text-gray-300 text-sm">{compareResults.summary}</div>
                            )}
                            {compareResults.differences?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-medium text-red-400 mb-2">Differences</h4>
                                    <div className="space-y-2">
                                        {compareResults.differences.map((diff, i) => (
                                            <div key={i} className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                                                <div className="text-sm font-medium text-red-300">{diff.clause}</div>
                                                <div className="mt-2 text-xs text-gray-400">
                                                    <div className="mb-1"><span className="text-blue-400">A:</span> {diff.text_a?.substring(0, 200)}...</div>
                                                    <div><span className="text-green-400">B:</span> {diff.text_b?.substring(0, 200)}...</div>
                                                </div>
                                                {diff.impact && (
                                                    <div className="mt-2 text-xs text-yellow-400">{diff.impact}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {compareResults.similarities?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-medium text-green-400 mb-2">Similar Clauses</h4>
                                    <div className="space-y-2">
                                        {compareResults.similarities.map((sim, i) => (
                                            <div key={i} className="bg-green-900/20 border border-green-800 rounded-lg p-3">
                                                <div className="text-sm font-medium text-green-300">{sim.clause}</div>
                                                <div className="mt-1 text-xs text-gray-400">{sim.text?.substring(0, 200)}...</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
                ) : !hasBothPdfs ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 mb-2">Select two PDF documents to compare</p>
                            <p className="text-gray-600 text-sm">Choose document A and document B from your projects</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex w-full h-full">
                        <div className="w-1/2 h-full flex flex-col border-r border-gray-800 relative">
                            <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 z-10">
                                <h3 className="text-sm font-medium text-white truncate">{leftDoc?.name}</h3>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <PDFViewer 
                                    config={{ src: leftPdfUrl }} 
                                    style={{ height: "100%", width: "100%" }} 
                                />
                                <HighlightOverlay 
                                    highlights={leftHighlights} 
                                    pageHeight={leftPageInfo.height}
                                    pageWidth={leftPageInfo.width}
                                />
                            </div>
                        </div>
                        <div className="w-1/2 h-full flex flex-col relative">
                            <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 z-10">
                                <h3 className="text-sm font-medium text-white truncate">{rightDoc?.name}</h3>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <PDFViewer 
                                    config={{ src: rightPdfUrl }} 
                                    style={{ height: "100%", width: "100%" }} 
                                />
                                <HighlightOverlay 
                                    highlights={rightHighlights} 
                                    pageHeight={rightPageInfo.height}
                                    pageWidth={rightPageInfo.width}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showLeftPicker && (
                <FilePickerModal
                    projects={projects}
                    pickerProject={pickerProject}
                    setPickerProject={setPickerProject}
                    pickerContents={pickerContents}
                    pickerLoading={pickerLoading}
                    onSelect={selectLeftDoc}
                    onClose={() => setShowLeftPicker(false)}
                    sideLabel="Document A"
                />
            )}

            {showRightPicker && (
                <FilePickerModal
                    projects={projects}
                    pickerProject={pickerProject}
                    setPickerProject={setPickerProject}
                    pickerContents={pickerContents}
                    pickerLoading={pickerLoading}
                    onSelect={selectRightDoc}
                    onClose={() => setShowRightPicker(false)}
                    sideLabel="Document B"
                />
            )}
        </div>
    );
}

function HighlightOverlay({ highlights, pageHeight, pageWidth }) {
    if (!highlights || highlights.length === 0 || !pageHeight) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-20">
            {highlights.map((h, i) => (
                <div
                    key={i}
                    className="absolute bg-yellow-400/30 border border-yellow-400"
                    style={{
                        top: `${h.normalized_y0 * 100}%`,
                        left: '5%',
                        width: '90%',
                        height: `${(h.normalized_y1 - h.normalized_y0) * 100}%`,
                    }}
                />
            ))}
        </div>
    );
}

function FilePickerModal({ projects, pickerProject, setPickerProject, pickerContents, pickerLoading, onSelect, onClose, sideLabel }) {
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
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                            sideLabel === "Document A" ? "bg-blue-600 text-white" : "bg-green-600 text-white"
                        }`}>
                            {sideLabel}
                        </span>
                        <h2 className="text-lg font-semibold text-white"> Select a PDF File</h2>
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
                    <label className="block text-sm text-gray-400 mb-2"> Select Project</label>
                    <select
                        value={pickerProject}
                        onChange={(e) => setPickerProject(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
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
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
