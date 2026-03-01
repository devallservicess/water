import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Users, UserCheck, CalendarOff, AlertCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => (
    <motion.div
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4"
        variants={fadeUp}
        whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.06)' }}
        transition={{ duration: 0.2 }}
    >
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon size={22} />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </motion.div>
);

export default function Dashboard({ showToast }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.getDashboard();
            setData(res.data);
        } catch (error) {
            console.error("Error fetching dashboard data", error);
            if (showToast) showToast('Erreur de connexion au serveur', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );
    if (!data) return <div className="text-red-500 border p-4 rounded-xl bg-red-50">Erreur de chargement. Vérifiez que le backend est lancé.</div>;

    // Chart data
    const coverageChartData = (data.week_coverage || []).map(w => ({
        date: w.date?.substring(5) || '',
        Requis: w.total_required || 0,
        Assigné: w.total_assigned || 0,
    }));

    const roleData = (data.role_distribution || []).map((r, i) => ({
        name: r.role,
        value: r.count,
        fill: COLORS[i % COLORS.length]
    }));

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
                    <p className="text-slate-500 mt-1">Semaine du {data.week_start} au {data.week_end}</p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <TrendingUp size={14} />
                    <span>Mise à jour en temps réel</span>
                </div>
            </motion.div>

            {/* KPI Stats */}
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5" variants={container} initial="hidden" animate="show">
                <StatCard icon={Users} label="Employés Actifs" value={data.total_employees} color="bg-blue-100 text-blue-600" />
                <StatCard icon={UserCheck} label="Absences Approuvées" value={data.approved_absences} color="bg-emerald-100 text-emerald-600" />
                <StatCard icon={CalendarOff} label="Absences en Attente" value={data.pending_absences} color="bg-amber-100 text-amber-600" />
            </motion.div>

            {/* Alerts */}
            {data.alerts && data.alerts.length > 0 && (
                <motion.div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-start">
                        <AlertCircle className="text-red-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
                        <div>
                            <h3 className="text-red-800 font-semibold">Alertes de surcharge</h3>
                            <ul className="mt-1.5 space-y-1 text-red-700 text-sm">
                                {data.alerts.map((a, i) => (
                                    <li key={i}><span className="font-medium">{a.hour}h00</span> : {a.message} (Moy: {a.avg}, Actuel: {a.today})</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Weekly Coverage Bar Chart */}
                <motion.div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.2 }}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">📊 Couverture hebdomadaire</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={coverageChartData}>
                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                            <Bar dataKey="Requis" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Assigné" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Role Distribution Pie */}
                <motion.div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.3 }}>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">👥 Répartition par rôle</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                                {roleData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* Coverage Table */}
            <motion.div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.4 }}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">🕐 Shifts aujourd'hui — {data.today}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-3 font-medium">Horaire</th>
                                <th className="px-6 py-3 font-medium text-right">Requis</th>
                                <th className="px-6 py-3 font-medium text-right">Assigné</th>
                                <th className="px-6 py-3 font-medium text-center">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.coverage.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">Aucun shift aujourd'hui.</td></tr>
                            ) : data.coverage.map((c) => {
                                const ok = c.assigned >= c.min_staff;
                                return (
                                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-700">{c.start_time} – {c.end_time}</td>
                                        <td className="px-6 py-4 text-right text-slate-500">{c.min_staff}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-slate-800">{c.assigned}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {ok ? '✓ Couvert' : '⚠ Sous-effectif'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
