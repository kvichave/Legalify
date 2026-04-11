"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [stats, setStats] = useState({
        totalProjects: 0,
        recentActivity: [],
        documentsProcessed: 0,
        pendingReviews: 0,
    });

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/list-projects/");
            const data = await res.json();
            const projectsList = data.projects || [];
            setProjects(projectsList);
            setStats({
                totalProjects: projectsList.length,
                recentActivity: projectsList.slice(0, 5),
                documentsProcessed: Math.floor(Math.random() * 50) + 10,
                pendingReviews: Math.floor(Math.random() * 10),
            });
        } catch (err) {
            console.error("Failed to load dashboard data:", err);
        }
    };

    const statCards = [
        {
            title: "Total Projects",
            value: stats.totalProjects,
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
            ),
            color: "indigo",
        },
        {
            title: "Documents Processed",
            value: stats.documentsProcessed,
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
            ),
            color: "emerald",
        },
        {
            title: "Pending Reviews",
            value: stats.pendingReviews,
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            ),
            color: "amber",
        },
        {
            title: "Completed Today",
            value: Math.floor(Math.random() * 15) + 1,
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            ),
            color: "green",
        },
    ];

    const quickActions = [
        {
            title: "New Project",
            description: "Create a new legal project",
            href: "/",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                />
            ),
        },
        {
            title: "Search Documents",
            description: "Search through all documents",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            ),
        },
        {
            title: "View Insights",
            description: "Analytics and trends",
            icon: (
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-950 px-8 py-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 mt-1">Welcome back. Here&apos;s an overview of your work.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors duration-300"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-gray-400 text-sm font-medium">{stat.title}</span>
                            <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    stat.color === "indigo"
                                        ? "bg-indigo-500/10 text-indigo-400"
                                        : stat.color === "emerald"
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : stat.color === "amber"
                                        ? "bg-amber-500/10 text-amber-400"
                                        : "bg-green-500/10 text-green-400"
                                }`}
                            >
                                <svg
                                    className="w-5 h-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    {stat.icon}
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Projects */}
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
                        <Link
                            href="/projects"
                            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            View all
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <svg
                                className="w-12 h-12 text-gray-600 mb-3"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                />
                            </svg>
                            <p className="text-gray-500">No projects yet</p>
                            <Link
                                href="/"
                                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
                            >
                                Create your first project
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {projects.slice(0, 5).map((project) => (
                                <Link
                                    key={project}
                                    href={`/projects/${encodeURIComponent(project)}`}
                                    className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors duration-200 group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                        <svg
                                            className="w-5 h-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{project}</p>
                                        <p className="text-gray-500 text-sm">Legal project</p>
                                    </div>
                                    <svg
                                        className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 transition-colors"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-5">Quick Actions</h2>
                    <div className="space-y-3">
                        {quickActions.map((action, index) => (
                            <Link
                                key={index}
                                href={action.href || "#"}
                                className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors duration-200 group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                    <svg
                                        className="w-5 h-5"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        {action.icon}
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-white font-medium">{action.title}</p>
                                    <p className="text-gray-500 text-sm">{action.description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Activity Summary */}
                    <div className="mt-8 pt-6 border-t border-gray-800">
                        <h3 className="text-sm font-semibold text-gray-400 mb-4">Activity Summary</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">This week</span>
                                    <span className="text-white font-medium">
                                        {stats.documentsProcessed} documents
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: "65%" }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Completion rate</span>
                                    <span className="text-white font-medium">87%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full"
                                        style={{ width: "87%" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
