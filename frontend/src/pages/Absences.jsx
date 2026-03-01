import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CalendarOff, Check, X } from 'lucide-react';

export default function Absences() {
    const [data, setData] = useState({ absences: [], employees: [] });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAbs, setNewAbs] = useState({ employee_id: '', start_date: '', end_date: '', reason: '' });

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.getAbsences();
            setData(res.data);
            if (res.data.employees.length > 0 && !newAbs.employee_id) {
                setNewAbs(prev => ({ ...prev, employee_id: res.data.employees[0].id }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === 'approve') await api.approveAbsence(id);
            else await api.rejectAbsence(id);
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const requestAbsence = async (e) => {
        e.preventDefault();
        try {
            await api.requestAbsence(newAbs);
            setIsModalOpen(false);
            setNewAbs({ ...newAbs, start_date: '', end_date: '', reason: '' });
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
                    <h2 className="text-3xl font-bold text-slate-800">Absences</h2>
                    <p className="text-slate-500 mt-1">Gérez les congés et absences de l'équipe</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    <CalendarOff size={18} />
                    <span>Déclarer une absence</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-3 font-medium">Employé</th>
                                <th className="px-6 py-3 font-medium">De</th>
                                <th className="px-6 py-3 font-medium">À</th>
                                <th className="px-6 py-3 font-medium">Motif</th>
                                <th className="px-6 py-3 font-medium text-center">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.absences.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-medium">{a.fullname} <span className="text-slate-400 font-normal">({a.role})</span></td>
                                    <td className="px-6 py-4">{a.start_date}</td>
                                    <td className="px-6 py-4">{a.end_date}</td>
                                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={a.reason}>{a.reason || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${a.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                a.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-orange-100 text-orange-800'}`}>
                                            {a.status === 'approved' ? 'Approuvée' : a.status === 'rejected' ? 'Refusée' : 'En attente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {a.status === 'pending' && (
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={() => handleAction(a.id, 'approve')} className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-green-50/50 transition-colors" title="Approuver">
                                                    <Check size={18} />
                                                </button>
                                                <button onClick={() => handleAction(a.id, 'reject')} className="p-1.5 text-red-600 hover:bg-red-50 rounded bg-red-50/50 transition-colors" title="Refuser">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.absences.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        Aucune absence enregistrée.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Déclarer une absence</h3>
                        <form onSubmit={requestAbsence} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Employé</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={newAbs.employee_id}
                                    onChange={(e) => setNewAbs({ ...newAbs, employee_id: e.target.value })}
                                >
                                    {data.employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.fullname}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Du</label>
                                    <input required type="date" className="w-full border rounded-lg px-3 py-2" value={newAbs.start_date} onChange={(e) => setNewAbs({ ...newAbs, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Au</label>
                                    <input required type="date" className="w-full border rounded-lg px-3 py-2" value={newAbs.end_date} onChange={(e) => setNewAbs({ ...newAbs, end_date: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
                                <textarea className="w-full border rounded-lg px-3 py-2" rows="3" value={newAbs.reason} onChange={(e) => setNewAbs({ ...newAbs, reason: e.target.value })}></textarea>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm">Déclarer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
