import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Users, UserCheck, CalendarOff, AlertCircle } from 'lucide-react';

export default function Dashboard() {
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
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-slate-500">Chargement du dashboard...</div>;
    if (!data) return <div className="text-red-500 border p-4 rounded bg-red-50">Erreur de chargement. Veuillez vérifier que le serveur backend est lancé.</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
                    <p className="text-slate-500 mt-1">Aperçu général de la pharmacie - Semaine du {data.week_start}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Employés Actifs</p>
                        <p className="text-2xl font-bold text-slate-800">{data.total_employees}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Absences Approuvées</p>
                        <p className="text-2xl font-bold text-slate-800">{data.approved_absences}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                        <CalendarOff size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Absences en Attente</p>
                        <p className="text-2xl font-bold text-slate-800">{data.pending_absences}</p>
                    </div>
                </div>
            </div>

            {data.alerts && data.alerts.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <div className="flex items-start">
                        <AlertCircle className="text-red-500 mt-0.5 mr-3" size={20} />
                        <div>
                            <h3 className="text-red-800 font-medium">Alertes de demande (Aujourd'hui)</h3>
                            <ul className="mt-2 space-y-1 text-red-700 text-sm">
                                {data.alerts.map((a, i) => (
                                    <li key={i}>
                                        <span className="font-semibold">{a.hour}h00</span> : {a.message} (Prévu: {a.avg}, Actuel: {a.today})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800">Couverture des shifts - {data.today}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-3 font-medium">Horaire</th>
                                <th className="px-6 py-3 font-medium text-right">Staff Requis</th>
                                <th className="px-6 py-3 font-medium text-right">Staff Assainé</th>
                                <th className="px-6 py-3 font-medium text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.coverage.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-4 text-center text-slate-500">Aucun shift aujourd'hui.</td></tr>
                            ) : data.coverage.map((c) => {
                                const ok = c.assigned >= c.min_staff;
                                return (
                                    <tr key={c.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium">{c.start_time} - {c.end_time}</td>
                                        <td className="px-6 py-4 text-right">{c.min_staff}</td>
                                        <td className="px-6 py-4 text-right font-medium">{c.assigned}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {ok ? 'Couvert' : 'Sous-effectif'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
