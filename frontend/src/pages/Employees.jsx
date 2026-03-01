import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserPlus, Star } from 'lucide-react';

export default function Employees() {
    const [data, setData] = useState({ employees: [], skills: [], emp_skills: {} });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmp, setNewEmp] = useState({ fullname: '', role: 'Préparateur', weekly_hours: 40 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.getEmployees();
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id) => {
        try {
            await api.toggleEmployee(id);
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const addEmployee = async (e) => {
        e.preventDefault();
        try {
            await api.addEmployee(newEmp);
            setIsModalOpen(false);
            setNewEmp({ fullname: '', role: 'Préparateur', weekly_hours: 40 });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Employés</h2>
                    <p className="text-slate-500 mt-1">Gérez votre personnel et leurs compétences</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <UserPlus size={18} />
                    <span>Nouvel Employé</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-3 font-medium">Nom</th>
                                <th className="px-6 py-3 font-medium">Rôle</th>
                                <th className="px-6 py-3 font-medium">Heures/semaine</th>
                                <th className="px-6 py-3 font-medium">Compétences (Niveau)</th>
                                <th className="px-6 py-3 font-medium text-center">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.employees.map((e) => {
                                const skillsMap = data.emp_skills[e.id] || {};
                                return (
                                    <tr key={e.id} className={`hover:bg-slate-50/50 ${e.active === 0 ? 'opacity-50' : ''}`}>
                                        <td className="px-6 py-4 font-medium">{e.fullname}</td>
                                        <td className="px-6 py-4">{e.role}</td>
                                        <td className="px-6 py-4">{e.weekly_hours}h</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(skillsMap).map(([sname, lvl]) => (
                                                    <span key={sname} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                                                        <span>{sname}</span>
                                                        <span className="text-blue-600 font-semibold">({lvl})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${e.active === 1 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                                {e.active === 1 ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => toggleStatus(e.id)}
                                                className={`text-xs px-3 py-1.5 rounded transition-colors ${e.active === 1 ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
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
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4">Ajouter un employé</h3>
                        <form onSubmit={addEmployee} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                                <input required type="text" className="w-full border rounded-lg px-3 py-2" value={newEmp.fullname} onChange={(e) => setNewEmp({ ...newEmp, fullname: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                                <select className="w-full border rounded-lg px-3 py-2" value={newEmp.role} onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}>
                                    <option>Pharmacien</option>
                                    <option>Préparateur</option>
                                    <option>Caissier</option>
                                    <option>Rayonniste</option>
                                    <option>Manager</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Heures Hebdo</label>
                                <input required type="number" className="w-full border rounded-lg px-3 py-2" value={newEmp.weekly_hours} onChange={(e) => setNewEmp({ ...newEmp, weekly_hours: parseInt(e.target.value) })} />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Ajouter</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
