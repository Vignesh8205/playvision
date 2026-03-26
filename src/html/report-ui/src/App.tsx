import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart3,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    ChevronRight,
    Bot,
    X,
    Sun,
    Moon,
    Activity,
    AlertTriangle,
    MinusCircle,
    Image as ImageIcon,
    Play,
    ExternalLink,
    FileSpreadsheet,
    FileText,
    Download,
    FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TestResult, ReportMetadata, Attachment, TestStep } from './types';

// Utility to strip ANSI escape codes
const stripAnsi = (str: string = '') => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
};

const getBase64Image = (attachment: Attachment): Promise<string> => {
    if (attachment.base64) {
        return Promise.resolve(attachment.base64);
    }

    const url = attachment.path;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
};

// Global data from the reporter
interface PlayVisionData {
    results: TestResult[];
    metadata: ReportMetadata;
}

const data: PlayVisionData = (window as any).PLAYVISION_DATA || {
    results: [],
    metadata: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        duration: 0,
        workers: 1,
        startTime: 0,
        endTime: 0
    }
};

const App: React.FC = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [exportStatus, setExportStatus] = useState<string | null>(null);

    // Initialize theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('playvision-theme') as 'dark' | 'light';
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle('light', savedTheme === 'light');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('playvision-theme', newTheme);
        document.documentElement.classList.toggle('light', newTheme === 'light');
    };

    const filteredResults = useMemo(() => {
        return data.results.filter((r) => {
            const q = search.toLowerCase();
            const matchSearch = r.title.toLowerCase().includes(q) ||
                r.suite.toLowerCase().includes(q) ||
                (r.sourceLocation?.fileName?.toLowerCase().includes(q) ?? false) ||
                (r.sourceLocation?.relativePath?.toLowerCase().includes(q) ?? false);
            const matchStatus = statusFilter === 'all' || r.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [search, statusFilter]);

    const stats = useMemo(() => {
        return {
            passed: data.results.filter(r => r.status === 'passed').length,
            failed: data.results.filter(r => r.status === 'failed' || r.status === 'timedOut').length,
            skipped: data.results.filter(r => r.status === 'skipped').length,
            flaky: data.results.filter(r => r.status === 'flaky').length,
            aiInsights: data.results.filter(r => r.error?.aiAnalysis).length
        };
    }, []);

    const selectedTest = useMemo(() =>
        data.results.find(r => r.testId === selectedTestId),
        [selectedTestId]);

    const handleExportExcel = () => {
        setExportStatus('Generating Excel...');
        const exportData = filteredResults.map(r => ({
            'Test ID': r.testId,
            'Suite': r.suite,
            'Title': r.title,
            'Status': r.status,
            'Duration (s)': (r.duration / 1000).toFixed(2),
            'Error': r.error?.message ? stripAnsi(r.error.message.split('\n')[0]) : '',
            'AI Category': r.error?.aiAnalysis?.category || '',
            'AI Root Cause': r.error?.aiAnalysis?.rootCause || '',
            'AI Suggestion': r.error?.aiAnalysis?.suggestion || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Test Results');
        
        const fileName = `PlayVision_Export_${statusFilter}_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, fileName);
        setExportStatus('Excel Exported Successfully!');
        setTimeout(() => setExportStatus(null), 3000);
    };

    const handleExportPdf = async () => {
        setExportStatus('Generating PDF with Screenshots...');
        console.log('🚀 PDF Export started');
        const doc = new jsPDF();
        
        // Add Header
        doc.setFontSize(22);
        doc.setTextColor(126, 34, 206); // bg-purple-600
        doc.text('PlayVision Executive Summary', 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Filter Applied: ${statusFilter.toUpperCase()}`, 14, 35);
        doc.text(`Total Tests Matching: ${filteredResults.length}`, 14, 40);

        // Add Table
        const tableBody = filteredResults.map(r => [
            r.suite,
            r.title,
            r.status.toUpperCase(),
            (r.duration / 1000).toFixed(1) + 's',
            r.error?.aiAnalysis?.category || (r.error ? 'Failure' : '-')
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['Suite', 'Test Title', 'Status', 'Duration', 'AI Category']],
            body: tableBody,
            headStyles: { fillColor: [126, 34, 206] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { top: 50 },
            styles: { fontSize: 8, cellPadding: 3 }
        });

        // Add Failure Evidence Section
        const failedWithScreenshots = filteredResults.filter(r => 
            (r.status === 'failed' || r.status === 'timedOut' || r.status === 'flaky') && 
            r.attachments.some(a => a.type === 'screenshot')
        );

        console.log(`🔍 Found ${failedWithScreenshots.length} failed tests with screenshots`);

        if (failedWithScreenshots.length > 0) {
            doc.addPage();
            doc.setFontSize(18);
            doc.setTextColor(126, 34, 206);
            doc.text('Failure Evidence (Screenshots)', 14, 22);

            let currentY = 35;
            for (const test of failedWithScreenshots) {
                const screenshot = test.attachments.find(a => a.type === 'screenshot');
                if (screenshot) {
                    if (currentY > 230) {
                        doc.addPage();
                        currentY = 22;
                    }

                    doc.setFontSize(10);
                    doc.setTextColor(20, 20, 20);
                    doc.text(`${test.suite} > ${test.title}`, 14, currentY);
                    
                    try {
                        const base64 = await getBase64Image(screenshot);
                        const imgWidth = 180;
                        const imgHeight = 100;
                        doc.addImage(base64, 'PNG', 14, currentY + 5, imgWidth, imgHeight);
                        console.log(`✅ Included screenshot for: ${test.title}`);
                        currentY += imgHeight + 20;
                    } catch (err) {
                        console.error('Failed to add screenshot to PDF:', err);
                        doc.setTextColor(180, 0, 0);
                        doc.text('[Error: Could not load screenshot]', 14, currentY + 10);
                        currentY += 20;
                    }
                }
            }
        }

        const fileName = `PlayVision_Summary_${statusFilter}_${new Date().getTime()}.pdf`;
        doc.save(fileName);
        setExportStatus('Summary Exported Successfully!');
        setTimeout(() => setExportStatus(null), 3000);
    };

    return (
        <div className={`min-h-screen font-sans selection:bg-purple-500/30 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f1115] text-[#e2e4e9]' : 'bg-[#f8fafc] text-[#1e293b]'
            }`}>
            {/* Header */}
            <header className={`border-b sticky top-0 z-50 backdrop-blur-xl transition-colors duration-300 ${theme === 'dark' ? 'border-white/5 bg-[#161920]/80' : 'border-slate-200 bg-white/80'
                }`}>
                <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20"
                        >
                            <Activity className="text-white w-7 h-7" />
                        </motion.div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                                PlayVision
                                <span className="bg-purple-500/10 text-purple-500 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/20 uppercase tracking-widest font-black">Pro</span>
                            </h1>
                            <p className={`text-[10px] uppercase tracking-[0.2em] font-bold opacity-40`}>
                                Intelligent Automation Intelligence
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className={`hidden md:flex items-center gap-6 px-6 py-2.5 rounded-full border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200 shadow-sm'
                            }`}>
                            <StatItem icon={<CheckCircle2 className="text-green-500 w-4 h-4" />} label="Passed" value={stats.passed} theme={theme} />
                            <StatItem icon={<XCircle className="text-red-500 w-4 h-4" />} label="Failed" value={stats.failed} theme={theme} />
                            <StatItem icon={<AlertTriangle className="text-orange-500 w-4 h-4" />} label="Flaky" value={stats.flaky} theme={theme} />
                            <StatItem icon={<Clock className="text-blue-400 w-4 h-4" />} label="Total Time" value={`${(data.metadata.duration / 1000).toFixed(1)}s`} theme={theme} />
                        </div>

                        <button
                            onClick={toggleTheme}
                            className={`p-3 rounded-2xl border transition-all hover:scale-110 active:scale-95 ${theme === 'dark' ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:border-purple-300'
                                }`}
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
                {/* Export Status Notification */}
                {exportStatus && (
                    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-purple-600 text-white rounded-full shadow-2xl font-black text-xs uppercase tracking-widest animate-bounce">
                        ✨ {exportStatus}
                    </div>
                )}
                {/* Left Content: Test List */}
                <section className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="relative w-full md:w-[450px] group">
                            <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${theme === 'dark' ? 'text-white/20 group-focus-within:text-purple-400' : 'text-slate-300 group-focus-within:text-purple-600'
                                }`} />
                            <input
                                type="text"
                                placeholder="Search test cases, suites, or error patterns..."
                                className={`w-full border rounded-3xl py-4 pl-14 pr-6 focus:outline-none focus:ring-4 transition-all text-sm font-medium ${theme === 'dark'
                                        ? 'bg-[#161920] border-white/5 focus:ring-purple-500/10 focus:border-purple-500/50 placeholder:text-white/10'
                                        : 'bg-white border-slate-200 focus:ring-purple-100 focus:border-purple-300 shadow-sm placeholder:text-slate-400'
                                    }`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className={`flex gap-1.5 p-1.5 rounded-2xl border ${theme === 'dark' ? 'bg-[#161920] border-white/5' : 'bg-slate-100 border-slate-200'
                                }`}>
                                {[
                                    { id: 'all', label: 'All', icon: <Activity className="w-3.5 h-3.5" /> },
                                    { id: 'passed', label: 'Passed', color: 'text-green-500', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                                    { id: 'failed', label: 'Failed', color: 'text-red-500', icon: <XCircle className="w-3.5 h-3.5" /> },
                                    { id: 'flaky', label: 'Flaky', color: 'text-orange-500', icon: <AlertTriangle className="w-3.5 h-3.5" /> }
                                ].map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setStatusFilter(btn.id)}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${statusFilter === btn.id
                                                ? (theme === 'dark' ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'bg-white text-slate-900 shadow-md')
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        {btn.icon}
                                        {btn.label}
                                    </button>
                                ))}
                            </div>

                            <div className={`flex gap-1.5 p-1.5 rounded-2xl border ${theme === 'dark' ? 'bg-[#161920] border-white/5' : 'bg-slate-100 border-slate-200'
                                }`}>
                                <button
                                    onClick={handleExportExcel}
                                    title="Export to Excel"
                                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${theme === 'dark' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100'
                                        }`}
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span className="hidden xl:inline">Excel</span>
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    title="Export to PDF"
                                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${theme === 'dark' ? 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                        }`}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="hidden xl:inline">Summary</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredResults.map((test, idx) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ delay: idx * 0.015, type: 'spring', stiffness: 100 }}
                                    key={test.testId}
                                    onClick={() => setSelectedTestId(test.testId)}
                                    className={`group relative overflow-hidden border-2 rounded-3xl p-6 cursor-pointer transition-all ${theme === 'dark'
                                            ? (selectedTestId === test.testId ? 'bg-[#1c212a] border-purple-500/40 shadow-xl shadow-purple-500/5' : 'bg-[#161920] border-white/5 hover:border-white/10 hover:bg-[#1c212a]')
                                            : (selectedTestId === test.testId ? 'bg-white border-purple-500/30' : 'bg-white border-slate-100 shadow-sm hover:border-purple-200 hover:shadow-md')
                                        }`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-2 transition-opacity group-hover:opacity-100 ${test.status === 'passed' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' :
                                            test.status === 'failed' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                                                test.status === 'flaky' ? 'bg-orange-500' : 'bg-slate-400'
                                        } ${selectedTestId === test.testId ? 'opacity-100' : 'opacity-40'}`}
                                    />

                                    <div className="flex items-center justify-between gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2.5">
                                                <span className={`text-[10px] uppercase tracking-[0.2em] font-black opacity-30`}>{test.suite}</span>
                                                {test.error?.aiAnalysis && (
                                                    <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] text-purple-500 font-black flex items-center gap-1.5 shadow-sm">
                                                        <Bot className="w-3.5 h-3.5" /> AI Forensics
                                                    </span>
                                                )}
                                                {test.attachments.length > 0 && (
                                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase opacity-30">
                                                        <ImageIcon className="w-3 h-3" /> {test.attachments.length} Assets
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className={`font-bold transition-colors text-lg truncate ${theme === 'dark' ? 'group-hover:text-white' : 'group-hover:text-slate-900'
                                                }`}>{test.title}</h3>

                                            {/* Source Location Row */}
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                {test.sourceLocation ? (
                                                    <>
                                                        <span
                                                            title={test.sourceLocation.file}
                                                            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white/60' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                                                        >
                                                            <FileCode className="w-3 h-3 text-purple-400 shrink-0" />
                                                            {test.sourceLocation.fileName}{test.sourceLocation.line ? `:${test.sourceLocation.line}` : ''}
                                                        </span>
                                                        <span className={`text-[10px] font-medium opacity-40 truncate max-w-[200px]`}>
                                                            📁 {test.sourceLocation.relativePath.replace(test.sourceLocation.fileName, '')}
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); window.open(`vscode://file/${test.sourceLocation!.file}:${test.sourceLocation!.line}`, '_self'); }}
                                                            title={`Open in VS Code: ${test.sourceLocation.file}:${test.sourceLocation.line}`}
                                                            className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg border opacity-0 group-hover:opacity-100 transition-all ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'}`}
                                                        >
                                                            <ExternalLink className="w-2.5 h-2.5" /> VS Code
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-medium opacity-25 italic">Unknown Source</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right flex flex-col items-end">
                                                <span className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'
                                                    }`}>{(test.duration / 1000).toFixed(2)}s</span>
                                                <span className="text-[10px] opacity-30 font-bold uppercase tracking-widest">Duration</span>
                                            </div>
                                            <div className={`p-2.5 rounded-2xl transition-all group-hover:translate-x-1 ${theme === 'dark' ? 'bg-white/5 border border-white/5' : 'bg-slate-50 border border-slate-100'
                                                }`}>
                                                <ChevronRight className={`w-5 h-5 ${selectedTestId === test.testId ? 'rotate-90 text-purple-500 scale-110' : 'opacity-20'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </section>

                {/* Right Content: Stats & AI Insights */}
                <aside className="space-y-10">
                    {/* Ring Chart / Pass Rate Card */}
                    <div className={`border rounded-[40px] p-8 relative overflow-hidden transition-all duration-500 flex flex-col min-h-[460px] ${theme === 'dark' ? 'bg-[#161920] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'
                        }`}>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 blur-[80px] -mr-20 -mt-20" />

                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xs font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Performance
                            </h2>
                            <div className={`text-[10px] font-bold px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500'
                                }`}>
                                Stable
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="relative text-center w-full">
                                <span className={`text-[72px] md:text-[80px] font-black tracking-tighter italic leading-none block w-full truncate px-2 ${theme === 'dark' ? 'text-white drop-shadow-2xl' : 'text-slate-900'
                                    }`}>
                                    {data.metadata.totalTests > 0
                                        ? Math.round((data.metadata.passed / data.metadata.totalTests) * 100)
                                        : '0'}%
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mt-2 block">Accuracy Rate</span>
                            </div>
                        </div>

                        <div className="space-y-6 mt-6">
                            <div className={`h-2.5 w-full rounded-full overflow-hidden flex gap-0.5 p-0.5 ${theme === 'dark' ? 'bg-black/20' : 'bg-slate-100'
                                }`}>
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(stats.passed / (data.results.length || 1)) * 100}%` }} />
                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(stats.failed / (data.results.length || 1)) * 100}%` }} />
                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(stats.flaky / (data.results.length || 1)) * 100}%` }} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold opacity-30 uppercase">Final Count</div>
                                    <div className="text-xl font-black">{data.results.length} Tests</div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <div className="text-[10px] font-bold opacity-30 uppercase">Failures</div>
                                    <div className="text-xl font-black text-red-500">{stats.failed} Issues</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights Sidebar */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-30 italic">Live AI Forensics</h2>
                            <div className="flex gap-1">
                                <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" />
                                <div className="w-1 h-1 bg-purple-500/50 rounded-full" />
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 border-2 rounded-[32px] relative overflow-hidden transition-all ${theme === 'dark'
                                    ? 'bg-purple-500/[0.03] border-purple-500/10'
                                    : 'bg-white border-purple-100 shadow-lg shadow-purple-500/5'
                                }`}
                        >
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-purple-500/20 rounded-2xl shadow-inner">
                                        <Bot className="text-purple-500 w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-purple-500 uppercase tracking-widest">Automation Bot</div>
                                        <h4 className="text-sm font-bold opacity-80">Root Cause Detected</h4>
                                    </div>
                                </div>
                                <p className="text-sm leading-relaxed opacity-60 font-medium">
                                    Self-healing intelligence has analyzed **{stats.aiInsights}** complex failures across your suite.
                                </p>
                                <button className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-purple-600/20">
                                    Explore Fix Guides
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </aside>
            </main>

            {/* Drawer Overlay */}
            <AnimatePresence>
                {selectedTestId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedTestId(null)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
                    />
                )}
            </AnimatePresence>

            {/* Drawer Content */}
            <AnimatePresence>
                {selectedTestId && selectedTest && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
                        className={`fixed top-0 right-0 bottom-0 w-full max-w-4xl border-l z-[70] overflow-hidden flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.5)] ${theme === 'dark' ? 'bg-[#0f1115] border-white/5' : 'bg-[#f8fafc] border-slate-200'
                            }`}
                    >
                        {/* Drawer Header */}
                        <div className={`p-8 border-b flex items-center justify-between gap-8 ${theme === 'dark' ? 'border-white/5 bg-[#161920]/50' : 'border-slate-200 bg-white'
                            }`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedTest.status === 'passed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            selectedTest.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                        }`}>
                                        {selectedTest.status}
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-30 italic truncate">{selectedTest.suite}</span>
                                </div>
                                <h2 className="text-2xl font-black leading-tight truncate drop-shadow-sm">{selectedTest.title}</h2>

                                {/* Source Location — Drawer Header */}
                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                    {selectedTest.sourceLocation ? (
                                        <>
                                            <span
                                                title={selectedTest.sourceLocation.file}
                                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white/60' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                                            >
                                                <FileCode className="w-3.5 h-3.5 text-purple-400" />
                                                📄 {selectedTest.sourceLocation.fileName}{selectedTest.sourceLocation.line ? `:${selectedTest.sourceLocation.line}` : ''}
                                            </span>
                                            <span className={`text-[11px] font-medium opacity-40`}>
                                                📁 {selectedTest.sourceLocation.relativePath.replace(selectedTest.sourceLocation.fileName, '')}
                                            </span>
                                            <button
                                                onClick={() => window.open(`vscode://file/${selectedTest.sourceLocation!.file}:${selectedTest.sourceLocation!.line}`, '_self')}
                                                title={`Open in VS Code at line ${selectedTest.sourceLocation.line}`}
                                                className={`flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'}`}
                                            >
                                                <ExternalLink className="w-3 h-3" /> Open in VS Code
                                            </button>
                                        </>
                                    ) : (
                                        <span className={`text-xs font-medium italic ${theme === 'dark' ? 'text-white/25' : 'text-slate-400'}`}>Unknown Source</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedTestId(null)}
                                    className={`p-4 rounded-[24px] transition-all hover:rotate-90 active:scale-95 ${theme === 'dark' ? 'bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400' : 'bg-slate-100 text-slate-400 hover:bg-red-50'
                                        }`}
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-12">
                            {/* Traceability Card (New) */}
                            {selectedTest.error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-8 border-2 rounded-[32px] overflow-hidden transition-all ${theme === 'dark' ? 'bg-[#161920] border-white/5' : 'bg-white border-slate-100 shadow-md'
                                        }`}
                                >
                                    <div className="flex flex-col md:flex-row gap-8 justify-between">
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">Spec File</div>
                                            <div className="text-sm font-bold flex items-center gap-2">
                                                <ExternalLink className="w-4 h-4 text-purple-500" />
                                                {selectedTest.error.specFile || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">Location</div>
                                            <div className="text-sm font-bold text-red-400">
                                                {selectedTest.error.lineNumber ? `Line ${selectedTest.error.lineNumber}:${selectedTest.error.columnNumber}` : 'Unknown Location'}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">Failed Step</div>
                                            <div className="text-sm font-bold underline decoration-red-500/50 decoration-2 underline-offset-4">
                                                {selectedTest.error.failedStepName || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* AI Forensics Card (Enhanced) */}
                            {selectedTest.error?.aiAnalysis && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`p-10 border-2 rounded-[40px] relative overflow-hidden transition-all shadow-xl ${theme === 'dark' ? 'bg-purple-500/[0.04] border-purple-500/10 text-white' : 'bg-white border-purple-100 shadow-purple-500/5 text-slate-900'
                                        }`}
                                >
                                    {/* Flakiness Badge (New) */}
                                    {selectedTest.error.aiAnalysis.flakinessAnalysis?.isLikelyFlaky && (
                                        <div className="absolute top-8 right-8 px-4 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest">
                                            <Activity className="w-3.5 h-3.5" /> Stability Risk
                                        </div>
                                    )}

                                    <div className="relative space-y-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-1 h-3 bg-purple-500 rounded-full" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-purple-500 italic">PlayVision Intelligence v2.0</span>
                                            </div>
                                            <h4 className="text-2xl font-black italic tracking-tight">AI Root Cause Analysis</h4>
                                            <p className="mt-4 text-base leading-relaxed opacity-70 font-medium">{selectedTest.error.aiAnalysis.rootCause}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-purple-500/5 border border-purple-500/10 rounded-3xl p-8 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-purple-500/20">
                                                        Fix
                                                    </div>
                                                    <h5 className="font-black uppercase tracking-widest text-xs opacity-80">Suggested Solution</h5>
                                                </div>
                                                <p className="text-sm font-medium leading-relaxed opacity-80">{selectedTest.error.aiAnalysis.suggestion}</p>
                                            </div>

                                            {selectedTest.error.aiAnalysis.flakinessAnalysis && (
                                                <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-8 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 font-black italic">
                                                            S
                                                        </div>
                                                        <h5 className="font-black uppercase tracking-widest text-xs opacity-80">Stability Analysis</h5>
                                                    </div>
                                                    <p className="text-xs font-medium leading-relaxed opacity-60 italic">{selectedTest.error.aiAnalysis.flakinessAnalysis.reason}</p>
                                                    <div className="text-[10px] bg-orange-500/10 p-2 rounded-lg text-orange-400 font-bold border border-orange-500/10">
                                                        {selectedTest.error.aiAnalysis.flakinessAnalysis.recommendation}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Script Improvement Suggestions (New) */}
                                        {selectedTest.error.aiAnalysis.scriptImprovements && (
                                            <div className="space-y-6">
                                                <h5 className="font-black uppercase tracking-widest text-[10px] opacity-30 flex items-center gap-2">
                                                    <Bot className="w-3 h-3" /> Script Improvement Opportunities
                                                </h5>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {selectedTest.error.aiAnalysis.scriptImprovements.map((improvement, i) => (
                                                        <div key={i} className={`p-6 rounded-[24px] border border-dashed ${theme === 'dark' ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <span className="px-2.5 py-1 bg-purple-500/10 text-purple-500 text-[9px] font-black uppercase rounded-lg border border-purple-500/10">{improvement.type}</span>
                                                                <span className="text-[10px] font-bold opacity-40">{improvement.reason}</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-1">
                                                                    <div className="text-[9px] uppercase font-black opacity-20">Current</div>
                                                                    <code className="text-[11px] block p-3 bg-red-500/5 rounded-xl border border-red-500/10 truncate">{improvement.current}</code>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="text-[9px] uppercase font-black opacity-20">Suggested</div>
                                                                    <code className="text-[11px] block p-3 bg-green-500/5 rounded-xl border border-green-500/10 truncate">{improvement.suggested}</code>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {selectedTest.error.aiAnalysis.fixExample && (
                                            <div className="space-y-4">
                                                <h5 className="font-black uppercase tracking-widest text-[10px] opacity-30 flex items-center gap-2">
                                                    <ChevronRight className="w-3 h-3" /> Implementation Pattern
                                                </h5>
                                                <div className={`p-8 rounded-[32px] font-mono text-xs overflow-x-auto border-2 shadow-inner leading-relaxed ${theme === 'dark' ? 'bg-[#090b0e] border-white/5 text-purple-300' : 'bg-[#f1f5f9] border-slate-200 text-purple-700'
                                                    }`}>
                                                    {selectedTest.error.aiAnalysis.fixExample}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Media Assets Section */}
                            {selectedTest.attachments.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic">Captured Evidence</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold opacity-30 uppercase">{selectedTest.attachments.length} files</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {selectedTest.attachments.map((asset, idx) => (
                                            <motion.div
                                                key={idx}
                                                whileHover={{ y: -5 }}
                                                className={`group relative rounded-[32px] overflow-hidden border-2 transition-all ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'
                                                    }`}
                                            >
                                                <div className="aspect-[16/10] bg-black/40 relative group-hover:bg-black/20 transition-all">
                                                    {asset.type === 'screenshot' ? (
                                                        <img
                                                            src={asset.path}
                                                            alt={asset.name}
                                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center relative">
                                                            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-purple-600/40 z-10">
                                                                <Play className="w-7 h-7 fill-current" />
                                                            </div>
                                                            <video
                                                                src={asset.path}
                                                                className="absolute inset-0 w-full h-full object-cover opacity-40"
                                                                muted
                                                                loop
                                                                playsInline
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                                    <a
                                                        href={asset.path}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                                <div className="p-5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                                                            {asset.type === 'screenshot' ? <ImageIcon className="w-4 h-4 text-purple-400" /> : <Play className="w-4 h-4 text-blue-400" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold leading-none mb-1">{asset.name}</div>
                                                            <div className="text-[10px] font-black uppercase opacity-20 tracking-widest">{asset.type}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Error Details */}
                            {selectedTest.error && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic">System Exception</h3>
                                        <XCircle className="w-4 h-4 text-red-500/30" />
                                    </div>
                                    <div className={`p-8 border-2 rounded-[32px] font-mono text-sm leading-relaxed overflow-x-auto transition-all ${theme === 'dark' ? 'bg-red-500/[0.03] border-red-500/10 text-red-100/70' : 'bg-red-50/50 border-red-100 text-red-700 shadow-sm'
                                        }`}>
                                        <div className="text-red-400 font-bold mb-4 border-b border-red-500/10 pb-4">
                                            {stripAnsi(selectedTest.error.message.split('\n')[0])}
                                        </div>
                                        <div className="whitespace-pre scrollbar-thin scrollbar-thumb-white/10">
                                            {stripAnsi(selectedTest.error.stack)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Steps Timeline (Enhanced Visuals) */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic">Execution Sequence</h3>
                                    <span className="text-[10px] font-bold opacity-30">{selectedTest.steps.length} Actions</span>
                                </div>

                                <div className="space-y-4">
                                    {selectedTest.steps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-start gap-6 p-6 rounded-[32px] border-2 transition-all ${step.status === 'failed' 
                                                ? (theme === 'dark' ? 'bg-red-500/5 border-red-500/30 ring-4 ring-red-500/5' : 'bg-red-50 border-red-200 ring-4 ring-red-100')
                                                : (theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-white border-slate-100 shadow-sm hover:border-purple-200')
                                            }`}
                                        >
                                            <div className={`w-12 h-12 shrink-0 rounded-[20px] flex items-center justify-center font-black mt-1 text-base ${step.status === 'passed' ? 'bg-green-500/20 text-green-500 shadow-inner' : 'bg-red-500/20 text-red-500'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="font-bold text-lg leading-none">{step.name}</div>
                                                    <div className={`text-[10px] font-black uppercase tracking-[0.1em] opacity-30 italic`}>
                                                        {step.duration}ms
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${theme === 'dark' ? 'bg-white/5 text-white/30' : 'bg-slate-100 text-slate-400'
                                                        }`}>{step.category}</span>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${step.status === 'passed' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    {step.error && (
                                                        <span className="text-[11px] text-red-400 font-bold truncate max-w-sm">
                                                            &middot; {stripAnsi(step.error)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatItem = ({ icon, label, value, theme }: { icon: React.ReactNode, label: string, value: any, theme: string }) => (
    <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'bg-white/5' : 'bg-white shadow-inner shadow-slate-100'}`}>
            {icon}
        </div>
        <div className="flex flex-col">
            <span className={`text-[9px] uppercase font-black leading-none opacity-30 italic`}>{label}</span>
            <span className="text-sm font-black leading-none mt-1.5">{value}</span>
        </div>
    </div>
);

export default App;
