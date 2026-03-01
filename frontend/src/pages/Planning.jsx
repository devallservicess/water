import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Sparkles, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Planning({ showToast }) {
    const [data, setData] = useState({ week_start: '', week_end: '', shifts: [], ass_map: {} });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const tableRef = useRef(null);

    useEffect(() => {
        fetchPlanning();
    }, []);

    const fetchPlanning = async (weekStr = '') => {
        try {
            const res = await api.getPlanning(weekStr);
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await api.generatePlanning(data.week_start);
            await fetchPlanning(data.week_start);
            if (showToast) showToast('Planning généré avec succès !', 'success');
        } catch (e) {
            console.error(e);
            if (showToast) showToast('Erreur lors de la génération', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const exportPDF = async () => {
        if (!tableRef.current) return;
        try {
            const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');

            // Header
            pdf.setFillColor(37, 99, 235);
            pdf.rect(0, 0, 297, 25, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(16);
            pdf.text('Pharma RH · Planning Hebdomadaire', 15, 16);
            pdf.setFontSize(10);
            pdf.text(`Semaine ${data.week_start} → ${data.week_end}`, 220, 16);

            // Table image
            const imgW = 267;
            const imgH = (canvas.height * imgW) / canvas.width;
            pdf.addImage(imgData, 'PNG', 15, 32, imgW, imgH);

            // Footer
            pdf.setTextColor(150, 150, 150);
            pdf.setFontSize(8);
            pdf.text('Généré par Pharma RH Agent v2.0 · AI-Powered', 15, 200);

            pdf.save(`planning_${data.week_start}.pdf`);
            if (showToast) showToast('PDF exporté !', 'success');
        } catch (err) {
            console.error(err);
            if (showToast) showToast('Erreur export PDF', 'error');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <motion.div className="flex justify-between items-end" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Planning</h2>
                    <p className="text-slate-500 mt-1">Semaine du {data.week_start} au {data.week_end}</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={exportPDF}
                        className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl transition-colors shadow-sm text-sm"
                    >
                        <Download size={16} />
                        <span>Export PDF</span>
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-all shadow-sm text-sm"
                    >
                        <Sparkles size={16} className={generating ? "animate-spin" : ""} />
                        <span>{generating ? "Génération..." : "Générer Planning Auto"}</span>
                    </button>
                </div>
            </motion.div>

            <motion.div
                ref={tableRef}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Horaire</th>
                                <th className="px-6 py-3 font-medium">Spécialité</th>
                                <th className="px-6 py-3 font-medium">Staff Min</th>
                                <th className="px-6 py-3 font-medium">Assignés</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.shifts.map((s) => {
                                const assigns = data.ass_map[s.id] || [];
                                const ok = assigns.length >= s.min_staff;
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-700">{s.date}</td>
                                        <td className="px-6 py-4 text-slate-600">{s.start_time} – {s.end_time}</td>
                                        <td className="px-6 py-4 text-slate-500">{s.required_skill || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {s.min_staff}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {assigns.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {assigns.map((a, i) => (
                                                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                                            {a.fullname} <span className="text-blue-400 ml-1">({a.role})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-red-500 text-xs font-medium bg-red-50 px-2.5 py-1 rounded-lg">⚠ 0 assigné</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {data.shifts.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        Aucun shift défini. Cliquez sur "Générer Planning Auto" pour commencer.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
