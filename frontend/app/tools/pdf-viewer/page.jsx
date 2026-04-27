'use client';

import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function PdfViewerPage() {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const loadingTask = pdfjsLib.getDocument('/sample.pdf');
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setPageNum(1);
      } catch (err) {
        setError('Failed to load PDF. Make sure sample-contract.pdf exists in /public');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, []);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };
    
    renderPage();
  }, [pdfDoc, pageNum, scale]);

  const goToPrevPage = () => setPageNum(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNum(prev => Math.min(pdfDoc?.numPages || 1, prev + 1));
  const zoomIn = () => setScale(prev => Math.min(3, prev + 0.25));
  const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.25));

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">PDF Viewer</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={pageNum <= 1}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                Previous
              </button>
              <span className="text-gray-700">
                Page {pageNum} of {pdfDoc?.numPages || '?'}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNum >= (pdfDoc?.numPages || 1)}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                Next
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                -
              </button>
              <span className="text-gray-700 min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={zoomIn}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                +
              </button>
            </div>
          </div>
          
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading PDF...</div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">{error}</div>
            </div>
          )}
          
          {!loading && !error && (
            <div className="overflow-auto flex justify-center bg-gray-100 p-4">
              <canvas ref={canvasRef} className="shadow-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}