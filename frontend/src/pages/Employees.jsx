import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserPlus, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function Employees({ showToast }) {
    const [data, setData] = useState({ employees: [], skills: [], emp_skills: {} });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmp, setNewEmp] = useState({ fullname: '', role: 'Préparateur', weekly_hours: 40 });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await api.getEmployees();
            setData(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const toggleStatus = async (id) => {
        try {
            await api.toggleEmployee(id);
            fetchData();
            if (showToast) showToast('Statut mis à jour', 'success');
        } catch (e) { console.error(e); }
    };

    const addEmployee = async (e) => {
        e.preventDefault();
        try {
            await api.addEmployee(newEmp);
            setIsModalOpen(false);
            setNewEmp({ fullname: '', role: 'Préparateur', weekly_hours: 40 });
            fetchData();
            if (showToast) showToast('Employé ajouté avec succès !', 'success');
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
                    <h2 className="text-3xl font-bold text-slate-800">Employés</h2>
                    <p className="text-slate-500 mt-1">Gérez votre personnel et leurs compétences</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm"
                >
                    <UserPlus size={16} />
                    <span>Nouvel Employé</span>
                </button>
            </motion.div>

            <motion.div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-6 py-3 font-medium">Nom</th>
                                <th className="px-6 py-3 font-medium">Rôle</th>
                                <th className="px-6 py-3 font-medium">Heures/sem</th>
                                <th className="px-6 py-3 font-medium">Compétences</th>
                                <th className="px-6 py-3 font-medium text-center">Statut</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.employees.map((e) => {
                                const skillsMap = data.emp_skills[e.id] || {};
                                return (
                                    <tr key={e.id} className={`hover:bg-slate-50/50 transition-colors ${e.active === 0 ? 'opacity-40' : ''}`}>
                                        <td className="px-6 py-4 font-semibold text-slate-700">{e.fullname}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">{e.role}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{e.weekly_hours}h</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {Object.entries(skillsMap).map(([sname, lvl]) => {
                                                    const colors = ['', 'bg-red-50 text-red-600 border-red-100', 'bg-amber-50 text-amber-600 border-amber-100', 'bg-emerald-50 text-emerald-600 border-emerald-100'];
                                                    return (
                                                        <span key={sname} className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${colors[lvl] || colors[1]}`}>
                                                            <span>{sname}</span>
                                                            <span className="font-bold">·{lvl}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${e.active === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {e.active === 1 ? '● Actif' : '○ Inactif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => toggleStatus(e.id)}
                                                className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${e.active === 1 ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                            >
                                                {e.active === 1 ? 'Désactiver' : 'Activer'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <h3 className="text-xl font-bold mb-5 text-slate-800">Ajouter un employé</h3>
                            <form onSubmit={addEmployee} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                                    <input required type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={newEmp.fullname} onChange={(e) => setNewEmp({ ...newEmp, fullname: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                                    <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={newEmp.role} onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}>
                                        <option>Pharmacien</option>
                                        <option>Préparateur</option>
                                        <option>Caissier</option>
                                        <option>Rayonniste</option>
                                        <option>Manager</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Heures Hebdo</label>
                                    <input required type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={newEmp.weekly_hours} onChange={(e) => setNewEmp({ ...newEmp, weekly_hours: parseInt(e.target.value) })} />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
                                    <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm">Ajouter</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
