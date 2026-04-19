"use client";
import Link from "next/link";

const testContent = `**Company Name:** ABC Solutions
**Address:** 123 Main Street, City, State, ZIP
**Phone:** (123) 456- 7890
**Email:** info@abcsolutions.com
**Invoice Number:** 001
**Date:** October 27, 2023
**Due Date:** November 10, 2023
**Bill To:**
John Doe
456 Elm Street
City, State, ZIP
****Description Quantity Unit Price Total****
Web Design Services 10 hours $50 $
Hosting Fee 1 month $20 $
Domain Registration 1 year $10 $
**Subtotal:** $
**Tax (10%):** $
**Total Due:** $
**Payment Terms:**
Please make the payment by the due date.
Thank you for your business!`;

export default function TestPage() {
    return (
        <div className="min-h-screen bg-gray-950">
            <div className="px-6 py-4 border-b border-gray-800">
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
                    <h1 className="text-xl font-bold text-white">Test Invoice</h1>
                </div>
            </div>

            <div className="flex h-[calc(100vh-73px)]">
                <div className="w-1/2 border-r border-gray-800 p-8 overflow-auto">
                    <h2 className="text-lg font-semibold text-white mb-4">Left Document</h2>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                        <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                            {testContent}
                        </pre>
                    </div>
                </div>

                <div className="w-1/2 p-8 overflow-auto">
                    <h2 className="text-lg font-semibold text-white mb-4">Right Document</h2>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                        <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                            {testContent}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
