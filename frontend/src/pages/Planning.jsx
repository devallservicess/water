import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Sparkles } from 'lucide-react';

export default function Planning() {
    const [data, setData] = useState({ week_start: '', week_end: '', shifts: [], ass_map: {} });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

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
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la génération du planning");
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Planning</h2>
                    <p className="text-slate-500 mt-1">Semaine du {data.week_start} au {data.week_end}</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    <Sparkles size={18} className={generating ? "animate-spin" : ""} />
                    <span>{generating ? "Génération..." : "Générer Planning Auto"}</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Horaire</th>
                                <th className="px-6 py-3 font-medium">Spécialité Requis</th>
                                <th className="px-6 py-3 font-medium">Staff Min</th>
                                <th className="px-6 py-3 font-medium">Assignés</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.shifts.map((s) => {
                                const assigns = data.ass_map[s.id] || [];
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium text-slate-800">{s.date}</td>
                                        <td className="px-6 py-4">{s.start_time} - {s.end_time}</td>
                                        <td className="px-6 py-4 text-slate-500">{s.required_skill || '-'}</td>
                                        <td className="px-6 py-4 text-slate-500">{s.min_staff}</td>
                                        <td className="px-6 py-4">
                                            {assigns.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {assigns.map((a, i) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                                            {a.fullname} <span className="text-blue-400 ml-1">({a.role})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-red-500 text-xs font-medium bg-red-50 px-2 py-1 rounded">0 assigné</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {data.shifts.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        Aucun shift défini pour cette semaine.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
