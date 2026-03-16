import React, { useState, useEffect } from 'react';
import { X, Brain, Pin, Search, Plus, Trash2, Edit3, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useConfigStore } from '../../store/useConfigStore';

interface Memory {
  id: string;
  content: string;
  source: string;
  role: string;
  metadata: Record<string, any>;
  timestamp: number;
  // Derived fields for UI
  title?: string;
  category?: 'project' | 'preference' | 'decision' | 'other';
  pinned?: boolean;
}

interface MemoryVaultProps {
  onClose?: () => void;
  variant?: 'modal' | 'embedded';
}

const CATEGORY_LABELS: Record<string, string> = {
  project: '项目',
  preference: '偏好',
  decision: '决策',
  other: '其他',
};

const CATEGORY_COLORS: Record<string, string> = {
  project:    'bg-blue-950/40 text-blue-400 border-blue-900/50',
  preference: 'bg-purple-950/40 text-purple-400 border-purple-900/50',
  decision:   'bg-amber-950/40 text-amber-400 border-amber-900/50',
  other:      'bg-gray-900/40 text-gray-400 border-gray-800/50',
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all',        label: '全部' },
  { key: 'project',    label: '项目' },
  { key: 'preference', label: '偏好' },
  { key: 'decision',   label: '决策' },
];

// Helper: Infer category from content/role
const inferCategory = (mem: Memory): 'project' | 'preference' | 'decision' | 'other' => {
  const content = mem.content.toLowerCase();
  if (mem.role === 'user_preference' || content.includes('偏好') || content.includes('喜欢') || content.includes('不要')) {
    return 'preference';
  }
  if (content.includes('架构') || content.includes('优化') || content.includes('测试') || content.includes('修复')) {
    return 'project';
  }
  if (content.includes('评审') || content.includes('决策') || content.includes('结论')) {
    return 'decision';
  }
  return 'other';
};

// Helper: Extract title from content (first line or first 30 chars)
const extractTitle = (content: string): string => {
  const firstLine = content.split('\n')[0];
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine;
};

const MemoryVault: React.FC<MemoryVaultProps> = ({ onClose, variant = 'modal' }) => {
  const { relayUrl } = useConfigStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const isModal = variant === 'modal';

  // Fetch memories from backend
  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const url = relayUrl || 'http://localhost:3001';
      const response = await fetch(`${url}/api/memory`);
      if (!response.ok) throw new Error('Failed to fetch memories');

      const data = await response.json();
      setMemories(data);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enrich memories with derived fields
  const enrichedMemories = memories.map(m => ({
    ...m,
    title: extractTitle(m.content),
    category: inferCategory(m),
    pinned: pinnedIds.has(m.id)
  }));

  const filtered = enrichedMemories
    .filter(m => filter === 'all' || m.category === filter)
    .filter(m =>
      !search ||
      m.content.includes(search) ||
      m.source.includes(search)
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.timestamp - a.timestamp);

  const togglePin = (id: string) =>
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const deleteMemory = async (id: string, source: string) => {
    try {
      const url = relayUrl || 'http://localhost:3001';
      const response = await fetch(`${url}/api/memory/${id}?source=${source}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete memory');

      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const startEdit = (m: Memory) => {
    setEditingId(m.id);
    setEditContent(m.content);
    setExpandedId(m.id);
  };

  const saveEdit = async (id: string, source: string) => {
    try {
      const url = relayUrl || 'http://localhost:3001';
      const response = await fetch(`${url}/api/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent, source })
      });
      if (!response.ok) throw new Error('Failed to update memory');

      setMemories(prev => prev.map(m => m.id === id ? { ...m, content: editContent } : m));
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update memory:', error);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const content = (
    <div className={clsx(
      "bg-[#1a0f0f]/95 border border-[#d4af37]/20 rounded-lg shadow-2xl flex flex-col backdrop-blur-lg overflow-hidden",
      isModal ? "w-[860px] h-[680px]" : "w-full h-full"
    )}>
      {/* Header */}
      {isModal && (
        <div className="h-14 bg-[#0f0a0a] flex items-center justify-between px-6 border-b border-[#d4af37]/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] border border-[#d4af37]/50">
              <Brain size={16} />
            </div>
            <h2 className="text-xl font-serif font-bold text-[#e6d5ac] tracking-widest">记忆库 (Memory Vault)</h2>
            <span className="text-xs text-[#8d6e63] font-mono">{memories.length} 条记忆</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#d4af37]/30 text-[#d4af37]/70 hover:text-[#d4af37] hover:border-[#d4af37]/60 text-xs transition-colors">
              <Plus size={12} />
              新增记忆
            </button>
            {onClose && (
              <button onClick={onClose} className="text-[#d4af37]/60 hover:text-[#d4af37] hover:bg-[#d4af37]/10 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="px-4 pt-3 pb-2 border-b border-[#d4af37]/10 shrink-0 space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d6e63]" />
          <input
            type="text"
            placeholder="搜索记忆..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/30 border border-[#d4af37]/15 rounded px-3 py-1.5 pl-8 text-xs text-[#e6d5ac] placeholder-[#5d4037] focus:outline-none focus:border-[#d4af37]/40 transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'px-3 py-0.5 rounded text-xs font-bold border transition-colors',
                filter === f.key
                  ? 'bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]'
                  : 'bg-transparent border-[#d4af37]/15 text-[#8d6e63] hover:text-[#d4af37]/70 hover:border-[#d4af37]/30'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
        <AnimatePresence initial={false}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#8d6e63] text-sm">
              <div className="animate-pulse">加载中...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#d4af37]/30 py-20">
              <Brain size={32} className="mb-3 opacity-30" />
              <span className="font-serif italic text-sm">暂无记忆...</span>
            </div>
          ) : (
            filtered.map(memory => {
              const isExpanded = expandedId === memory.id;
              const isEditing = editingId === memory.id;

              return (
                <motion.div
                  key={memory.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={clsx(
                    "group rounded-lg border p-3 transition-all relative overflow-hidden",
                    memory.pinned
                      ? "bg-[#d4af37]/5 border-[#d4af37]/25 hover:border-[#d4af37]/40"
                      : "bg-black/30 border-[#d4af37]/10 hover:border-[#d4af37]/25"
                  )}
                >
                  {/* Pinned indicator */}
                  {memory.pinned && (
                    <div className="absolute top-0 left-0 w-0.5 h-full bg-[#d4af37]/50 rounded-l-lg" />
                  )}

                  {/* Card Header */}
                  <div
                    className="flex items-start justify-between gap-2 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : memory.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={clsx(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0",
                        CATEGORY_COLORS[memory.category]
                      )}>
                        {CATEGORY_LABELS[memory.category]}
                      </span>
                      <span className="text-sm text-[#e6d5ac] font-serif font-bold truncate">
                        {memory.title}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); togglePin(memory.id); }}
                        className={clsx(
                          "p-1 rounded transition-colors",
                          memory.pinned ? "text-[#d4af37]" : "text-[#8d6e63] hover:text-[#d4af37]"
                        )}
                        title={memory.pinned ? "取消置顶" : "置顶"}
                      >
                        <Pin size={12} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(memory); }}
                        className="p-1 rounded text-[#8d6e63] hover:text-[#d4af37] transition-colors"
                        title="编辑"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteMemory(memory.id, memory.source); }}
                        className="p-1 rounded text-[#8d6e63] hover:text-red-400 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Preview (collapsed) */}
                  {!isExpanded && (
                    <p className="mt-1.5 text-xs text-[#8d6e63] line-clamp-2 cursor-pointer leading-relaxed"
                       onClick={() => setExpandedId(memory.id)}>
                      {memory.content}
                    </p>
                  )}

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-[#d4af37]/10">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="w-full bg-black/40 border border-[#d4af37]/30 rounded p-2 text-xs text-[#e6d5ac] resize-none focus:outline-none focus:border-[#d4af37]/60 leading-relaxed"
                            rows={4}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-[10px] text-[#8d6e63] hover:text-[#d4af37] transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => saveEdit(memory.id, memory.source)}
                              className="flex items-center gap-1 px-2 py-1 rounded border border-[#d4af37]/40 text-[#d4af37] text-[10px] hover:bg-[#d4af37]/10 transition-colors"
                            >
                              <Check size={10} />
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#d7ccc8] leading-relaxed whitespace-pre-wrap">
                          {memory.content}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-[#5d4037] font-mono">👤 {memory.source}</span>
                    <span className="text-[10px] text-[#5d4037] font-mono">📅 {formatTime(memory.timestamp)}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (!isModal) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {content}
      </motion.div>
    </div>
  );
};

export default MemoryVault;
