import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { Send, Bot, User } from 'lucide-react';

export default function Chat() {
    const [messages, setMessages] = useState([
        { role: 'agent', text: 'Bonjour ! Je suis l\'assistant RH. Je peux vous aider à gérer le planning, voir les disponibilités, ou déclarer des absences.\n\nExemples de commandes :\n- `génère planning`\n- `qui est dispo le 2026-03-05`\n- `ajoute absence <id> <debut> <fin>`\n- `remplacement <absence_id>`' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.chatMsg(userMsg);
            setMessages(prev => [...prev, { role: 'agent', text: res.data.answer }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'agent', text: "❌ Une erreur s'est produite lors de la connexion au backend." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
                <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                    <Bot size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Assistant RH Intelligent</h2>
                    <p className="text-sm text-slate-500">Posez vos questions en langage naturel</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                {messages.map((m, i) => (
                    <div key={i} className={`flex max-w-[80%] ${m.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}>
                        <div className={`flex space-x-3 items-end ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`px-4 py-3 rounded-2xl whitespace-pre-wrap ${m.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
                                }`}>
                                {m.text}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex max-w-[80%] mr-auto justify-start">
                        <div className="flex space-x-3 items-end">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Bot size={16} />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} className="h-1" />
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={sendMessage} className="flex space-x-2">
                    <input
                        type="text"
                        className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-3 transition-colors outline-none"
                        placeholder="Écrivez votre message ici..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-5 py-3 transition-colors shadow-sm flex items-center justify-center"
                    >
                        <Send size={20} className={loading && !input.trim() ? 'opacity-50' : ''} />
                    </button>
                </form>
            </div>
        </div>
    );
}
