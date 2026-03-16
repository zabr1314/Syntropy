import React, { useState } from 'react';
import { Search, Database, ArrowRight } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import clsx from 'clsx';

interface SearchResult {
    id: string;
    content: string;
    score: number;
    role: string;
    debugInfo: {
        ftsRank: number | null;
        vectorRank: number | null;
    };
    metadata: any;
}

const MemoryDebugger: React.FC = () => {
    const { agents } = useConfigStore();
    const [selectedAgent, setSelectedAgent] = useState(agents[0]?.role || 'minister');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setError('');
        setResults([]);

        try {
            const res = await fetch(`http://localhost:3001/api/agent/${selectedAgent}/memory/debug`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit: 5 })
            });
            
            if (!res.ok) throw new Error('Search failed');
            
            const data = await res.json();
            setResults(data.results || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch results');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-[#d4af37] font-bold flex items-center gap-2 border-b border-[#d4af37]/20 pb-2">
                <Database size={18} />
                <span>记忆透视镜 (RAG Debugger)</span>
            </h3>

            <div className="flex gap-2">
                <select 
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="bg-[#0a0505] border border-[#3e2723] rounded p-2 text-[#e6d5ac] text-xs focus:border-[#d4af37] outline-none"
                >
                    {agents.map(a => (
                        <option key={a.role} value={a.role}>{a.name} ({a.role})</option>
                    ))}
                </select>
                
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="输入测试 Query..."
                        className="w-full bg-[#0a0505] border border-[#3e2723] rounded p-2 pl-3 pr-10 text-[#e6d5ac] text-xs focus:border-[#d4af37] outline-none"
                    />
                    <button 
                        onClick={handleSearch}
                        disabled={loading}
                        className="absolute right-1 top-1 p-1 text-[#d4af37] hover:bg-[#d4af37]/10 rounded disabled:opacity-50"
                    >
                        <Search size={14} />
                    </button>
                </div>
            </div>

            {error && <div className="text-red-400 text-xs">{error}</div>}

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {results.map((result) => (
                    <div key={result.id} className="bg-[#0a0505]/50 border border-[#d4af37]/10 rounded p-3 text-xs space-y-2">
                        <div className="flex justify-between items-start">
                            <span className={clsx(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                result.role === 'user' ? "bg-blue-900/30 text-blue-400" :
                                result.role === 'assistant' ? "bg-green-900/30 text-green-400" :
                                "bg-gray-800 text-gray-400"
                            )}>
                                {result.role}
                            </span>
                            <div className="flex gap-2 text-[10px] font-mono text-[#8d6e63]">
                                <span title="RRF Score">Score: {result.score.toFixed(4)}</span>
                                <span title="FTS Rank" className={result.debugInfo.ftsRank ? "text-green-500" : "text-gray-600"}>
                                    FTS: {result.debugInfo.ftsRank || '-'}
                                </span>
                                <span title="Vector Rank" className={result.debugInfo.vectorRank ? "text-blue-500" : "text-gray-600"}>
                                    VEC: {result.debugInfo.vectorRank || '-'}
                                </span>
                            </div>
                        </div>
                        <div className="text-[#d7ccc8] font-serif leading-relaxed line-clamp-3">
                            {result.content}
                        </div>
                        {result.metadata && Object.keys(result.metadata).length > 0 && (
                            <div className="text-[10px] text-[#5d4037] font-mono truncate">
                                {JSON.stringify(result.metadata)}
                            </div>
                        )}
                    </div>
                ))}
                
                {!loading && results.length === 0 && query && !error && (
                    <div className="text-center text-[#5d4037] text-xs py-4">未找到相关记忆</div>
                )}
            </div>
        </div>
    );
};

export default MemoryDebugger;