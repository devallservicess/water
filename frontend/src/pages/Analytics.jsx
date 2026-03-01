import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BarChart3, AlertTriangle, UserCheck } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

export default function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await api.getAnalytics();
            setData(res.data);
        } catch (error) {
            console.error("Error fetching analytics", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );
    if (!data) return <div className="text-red-500 border p-4 rounded-xl bg-red-50">Erreur de chargement.</div>;

    // Workload chart data
    const workloadData = (data.workload || []).map(w => ({
        name: w.fullname.split(' ')[0],
        Assigné: Math.round(w.assigned_hours * 10) / 10,
        Max: w.max_hours,
    }));

    // Overtime alerts
    const overtimeAlerts = (data.workload || []).filter(w => w.assigned_hours > w.max_hours * 0.8);

    // Skill radar data (first employee as example, or aggregate)
    const allSkills = data.all_skills || [];
    const skillMatrix = data.skill_matrix || {};

    // Absence frequency chart
    const absenceData = (data.absence_frequency || []).map(a => ({
        name: a.fullname.split(' ')[0],
        Absences: a.total_absences,
    }));

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-3xl font-bold text-slate-800">Analytics</h2>
                <p className="text-slate-500 mt-1">Semaine du {data.week_start} au {data.week_end}</p>
            </motion.div>

            {/* Overtime Alerts */}
            {overtimeAlerts.length > 0 && (
                <motion.div className="bg-amber-50 border border-amber-200 rounded-xl p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle size={18} className="text-amber-600" />
                        <h3 className="font-semibold text-amber-800 text-sm">Alertes de surcharge</h3>
                    </div>
                    <div className="space-y-1">
                        {overtimeAlerts.map((w, i) => (
                            <p key={i} className="text-sm text-amber-700">
                                <span className="font-medium">{w.fullname}</span> : {Math.round(w.assigned_hours)}h / {w.max_hours}h max
                                ({Math.round(w.assigned_hours / w.max_hours * 100)}%)
                            </p>
                        ))}
                    </div>
                </motion.div>
            )}

            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-5" variants={container} initial="hidden" animate="show">
                {/* Workload Bar Chart */}
                <motion.div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6" variants={fadeUp}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center space-x-2">
                        <BarChart3 size={16} className="text-blue-500" />
                        <span>Charge de travail (heures/semaine)</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={workloadData} layout="vertical">
                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" tick={{ fill: '#334155', fontSize: 11 }} width={80} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                            <Bar dataKey="Assigné" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                            <Bar dataKey="Max" fill="#e2e8f0" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Absence Frequency */}
                <motion.div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6" variants={fadeUp}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center space-x-2">
                        <UserCheck size={16} className="text-emerald-500" />
                        <span>Fréquence d'absences</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={absenceData}>
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                            <Bar dataKey="Absences" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
            </motion.div>

            {/* Skill Matrix Table */}
            <motion.div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.3 }}>
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700">🎯 Matrice de compétences</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium">Employé</th>
                                {allSkills.map(s => <th key={s} className="px-4 py-3 text-center font-medium">{s}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {Object.values(skillMatrix).map((emp, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-700">{emp.name}</td>
                                    {allSkills.map(s => {
                                        const level = emp.skills[s];
                                        const colors = ['', 'bg-red-100 text-red-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700'];
                                        return (
                                            <td key={s} className="px-4 py-3 text-center">
                                                {level ? (
                                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${colors[level] || colors[1]}`}>
                                                        {level}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
