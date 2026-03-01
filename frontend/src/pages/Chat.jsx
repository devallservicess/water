import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_QUESTIONS = [
    "Génère le planning de la semaine",
    "Qui est dispo demain ?",
    "Combien d'employés sont actifs ?",
    "Quels conseils pour optimiser les shifts ?",
];

export default function Chat() {
    const [messages, setMessages] = useState([
        {
            role: 'agent',
            text: "👋 Bonjour ! Je suis l'assistant RH intelligent \n\nJe comprends le langage naturel et je peux vous aider avec :\n- 📅 **Planification** : `génère planning`\n- 👥 **Disponibilités** : `qui est dispo le 2026-03-05`\n- 📝 **Absences** : `absence <id> <début> <fin>`\n- 🔁 **Remplacements** : `remplacement <absence_id>`\n- 💬 Ou posez-moi n'importe quelle question RH !"
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (text) => {
        const userMsg = (text || input).trim();
        if (!userMsg) return;

        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.chatMsg(userMsg);
            setMessages(prev => [...prev, { role: 'agent', text: res.data.answer }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'agent', text: "❌ Erreur de connexion au backend." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage();
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-2.5 rounded-xl shadow-md">
                    <Bot size={22} />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-800">Assistant RH Intelligent</h2>
                    <div className="flex items-center space-x-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <p className="text-xs text-slate-500">Groq Llama 3.3 70B · En ligne</p>
                    </div>
                </div>
                <div className="flex items-center space-x-1 px-3 py-1 bg-white/70 rounded-lg border border-slate-200">
                    <Sparkles size={12} className="text-amber-500" />
                    <span className="text-[10px] font-semibold text-slate-500">AI-POWERED</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30">
                <AnimatePresence>
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            className={`flex max-w-[82%] ${m.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className={`flex space-x-3 items-end ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>
                                <div className={`px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed ${m.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-md shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
                                    }`}>
                                    {m.text}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {loading && (
                    <motion.div className="flex max-w-[82%] mr-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="flex space-x-3 items-end">
                            <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Bot size={14} />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center space-x-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-blue-200 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={bottomRef} className="h-1" />
            </div>

            {/* Quick Questions */}
            <div className="px-4 pt-3 flex flex-wrap gap-2 border-t border-slate-100 bg-white">
                {QUICK_QUESTIONS.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        disabled={loading}
                        className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-50"
                    >
                        {q}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSubmit} className="flex space-x-2">
                    <input
                        type="text"
                        className="flex-1 bg-slate-100 border border-transparent focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 transition-all outline-none text-sm"
                        placeholder="Posez votre question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl px-5 py-3 transition-all shadow-sm flex items-center justify-center"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
