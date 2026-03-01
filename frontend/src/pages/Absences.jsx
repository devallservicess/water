import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CalendarOff, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Absences({ showToast }) {
    const [data, setData] = useState({ absences: [], employees: [] });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAbs, setNewAbs] = useState({ employee_id: '', start_date: '', end_date: '', reason: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await api.getAbsences();
            setData(res.data);
            if (res.data.employees.length > 0 && !newAbs.employee_id) {
                setNewAbs(prev => ({ ...prev, employee_id: res.data.employees[0].id }));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === 'approve') await api.approveAbsence(id);
            else await api.rejectAbsence(id);
            fetchData();
            if (showToast) showToast(action === 'approve' ? 'Absence approuvée' : 'Absence refusée', action === 'approve' ? 'success' : 'info');
        } catch (e) { console.error(e); }
    };

    const requestAbsence = async (e) => {
        e.preventDefault();
        try {
            await api.requestAbsence(newAbs);
            setIsModalOpen(false);
            setNewAbs({ ...newAbs, start_date: '', end_date: '', reason: '' });
            fetchData();
            if (showToast) showToast('Absence déclarée avec succès', 'success');
        } catch (error) { console.error(error); }
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
                    <h2 className="text-3xl font-bold text-slate-800">Absences</h2>
                    <p className="text-slate-500 mt-1">Gérez les congés et absences de l'équipe</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm"
                >
                    <CalendarOff size={16} />
                    <span>Déclarer une absence</span>
                </button>
            </motion.div>

            <motion.div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-3 font-medium">Employé</th>
                                <th className="px-6 py-3 font-medium">De</th>
                                <th className="px-6 py-3 font-medium">À</th>
                                <th className="px-6 py-3 font-medium">Motif</th>
                                <th className="px-6 py-3 font-medium text-center">Statut</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.absences.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-700">{a.fullname} <span className="text-slate-400 font-normal text-xs">({a.role})</span></td>
                                    <td className="px-6 py-4 text-slate-600">{a.start_date}</td>
                                    <td className="px-6 py-4 text-slate-600">{a.end_date}</td>
                                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={a.reason}>{a.reason || '—'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold
                                            ${a.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'}`}>
                                            {a.status === 'approved' ? '✓ Approuvée' : a.status === 'rejected' ? '✕ Refusée' : '● En attente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {a.status === 'pending' && (
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={() => handleAction(a.id, 'approve')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approuver">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={() => handleAction(a.id, 'reject')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Refuser">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.absences.length === 0 && (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Aucune absence enregistrée.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <h3 className="text-xl font-bold mb-5 text-slate-800">Déclarer une absence</h3>
                            <form onSubmit={requestAbsence} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Employé</label>
                                    <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={newAbs.employee_id} onChange={(e) => setNewAbs({ ...newAbs, employee_id: e.target.value })}>
                                        {data.employees.map(e => (<option key={e.id} value={e.id}>{e.fullname}</option>))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Du</label>
                                        <input required type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={newAbs.start_date} onChange={(e) => setNewAbs({ ...newAbs, start_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Au</label>
                                        <input required type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={newAbs.end_date} onChange={(e) => setNewAbs({ ...newAbs, end_date: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
                                    <textarea className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" rows="3" value={newAbs.reason} onChange={(e) => setNewAbs({ ...newAbs, reason: e.target.value })}></textarea>
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
                                    <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm">Déclarer</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
