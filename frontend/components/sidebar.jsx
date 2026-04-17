"use client";
import React, { useState } from "react";
import Link from "next/link";

function Sidebar() {
    const [expanded, setExpanded] = useState(false);
    const [dark, setDark] = useState(true);

    // Theme-based classes
    const theme = dark
        ? {
            bg: "bg-gray-900",
            text: "text-gray-400",
            activeText: "text-gray-200",
            border: "border-gray-700",
            activeBg: "bg-gray-700",
            hoverBg: "hover:bg-gray-700 hover:text-gray-300",
            bottomBg: "bg-gray-800",
            bottomHover: "hover:bg-gray-700 hover:text-gray-300",
        }
        : {
            bg: "bg-gray-100",
            text: "text-gray-700",
            activeText: "text-gray-700",
            border: "border-gray-300",
            activeBg: "bg-gray-300",
            hoverBg: "hover:bg-gray-300",
            bottomBg: "bg-gray-200",
            bottomHover: "hover:bg-gray-300",
        };

    return (
        <div
            className={`flex flex-col items-center h-screen overflow-hidden ${theme.text} ${theme.bg} transition-all duration-300 ease-in-out ${expanded ? "w-48" : "w-16"
                }`}
            style={{ position: "fixed", top: 0, left: 0, zIndex: 50 }}
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
        >
            {/* Logo */}
            <a className="flex items-center w-full px-3 mt-3 justify-center" href="#">
                <svg
                    className="w-8 h-8 fill-current flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                </svg>
                <span
                    className={`ml-2 text-sm font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                        }`}
                >
                    Legalify
                </span>
            </a>

            {/* Nav Section 1 */}
            <div className="w-full px-2">
                <div className={`flex flex-col items-center w-full mt-3 border-t ${theme.border}`}>
                    <SidebarItem expanded={expanded} label="Dashboard" theme={theme} href="/"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
                    />
                    <SidebarItem expanded={expanded} label="Search" theme={theme}
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />}
                    />
                    <SidebarItem expanded={expanded} label="Chat" theme={theme} href="/chat"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />}
                    />
                    <SidebarItem expanded={expanded} label="Insights" theme={theme}
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                    />
                    <SidebarItem expanded={expanded} label="Docs" theme={theme}
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />}
                    />
                    <SidebarItem expanded={expanded} label="Projects" theme={theme} href="/projects"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />}
                    />
                    <SidebarItem expanded={expanded} label="New Project" theme={theme} href="/projects/new"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
                    />
                    <SidebarItem expanded={expanded} label="Tools" theme={theme} href="/tools"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />}
                    />
                    <SidebarItem expanded={expanded} label="Compare Contracts" theme={theme} href="/contracts/compare"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />}
                    />
                </div>

                {/* Nav Section 2 */}
                <div className={`flex flex-col items-center w-full mt-2 border-t ${theme.border}`}>
                    <SidebarItem expanded={expanded} label="Products" theme={theme}
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />}
                    />
                    <SidebarItem expanded={expanded} label="Settings" theme={theme}
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />}
                    />
                    <SidebarItem expanded={expanded} label="Messages" theme={theme} badge
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />}
                    />
                </div>
            </div>

            {/* Theme Toggle Button */}
            <button
                onClick={() => setDark(!dark)}
                className={`flex items-center justify-center w-12 h-12 mt-auto rounded-full transition-colors duration-200 ${theme.hoverBg} cursor-pointer`}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
                {dark ? (
                    <svg className="w-5 h-5 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                )}
            </button>

            {/* Account at bottom */}
            <a
                className={`flex items-center justify-center w-full h-16 ${theme.bottomBg} ${theme.bottomHover} transition-colors duration-200`}
                href="#"
            >
                <svg className="w-6 h-6 stroke-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span
                    className={`ml-2 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                        }`}
                >
                    Account
                </span>
            </a>
        </div>
    );
}

function SidebarItem({ expanded, label, icon, theme, active = false, badge = false, href = "#" }) {
    const Tag = href !== "#" ? Link : "a";
    return (
        <Tag
            className={`relative flex items-center w-full h-12 px-3 mt-2 rounded transition-colors duration-200 ${active ? `${theme.activeBg} ${theme.activeText}` : theme.hoverBg
                }`}
            href={href}
        >
            <svg className="w-6 h-6 stroke-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {icon}
            </svg>
            <span
                className={`ml-2 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${expanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                    }`}
            >
                {label}
            </span>
            {badge && (
                <span className="absolute top-0 left-0 w-2 h-2 mt-2 ml-2 bg-indigo-500 rounded-full" />
            )}
        </Tag>
    );
}

export default Sidebar;