import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, Clock, CheckCircle2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import type { DecisionNode } from '../../store/useCourtStore';
import { COURT_ROLES } from '../../constants/court';
import type { AgentId } from '../../store/useAgentStore';

interface DecisionTraceProps {
  tree: DecisionNode;
  summary?: string;
}

const ROLE_COLORS: Record<string, { border: string; glow: string; badge: string; line: string; dot: string }> = {
  minister:           { border: 'border-purple-500/60',  glow: 'shadow-[0_0_16px_rgba(168,85,247,0.3)]',  badge: 'bg-purple-900/40 text-purple-200 border-purple-600/50',  line: '#a855f7', dot: '#c084fc' },
  official_revenue:   { border: 'border-yellow-500/60',  glow: 'shadow-[0_0_16px_rgba(234,179,8,0.3)]',   badge: 'bg-yellow-900/40 text-yellow-200 border-yellow-600/50',  line: '#eab308', dot: '#facc15' },
  official_war:       { border: 'border-red-500/60',     glow: 'shadow-[0_0_16px_rgba(239,68,68,0.3)]',   badge: 'bg-red-900/40 text-red-200 border-red-600/50',           line: '#ef4444', dot: '#f87171' },
  official_works:     { border: 'border-cyan-500/60',    glow: 'shadow-[0_0_16px_rgba(6,182,212,0.3)]',   badge: 'bg-cyan-900/40 text-cyan-200 border-cyan-600/50',        line: '#06b6d4', dot: '#22d3ee' },
  official_rites:     { border: 'border-indigo-500/60',  glow: 'shadow-[0_0_16px_rgba(99,102,241,0.3)]',  badge: 'bg-indigo-900/40 text-indigo-200 border-indigo-600/50',  line: '#6366f1', dot: '#818cf8' },
  official_personnel: { border: 'border-blue-500/60',    glow: 'shadow-[0_0_16px_rgba(59,130,246,0.3)]',  badge: 'bg-blue-900/40 text-blue-200 border-blue-600/50',        line: '#3b82f6', dot: '#60a5fa' },
  official_justice:   { border: 'border-orange-500/60',  glow: 'shadow-[0_0_16px_rgba(249,115,22,0.3)]',  badge: 'bg-orange-900/40 text-orange-200 border-orange-600/50',  line: '#f97316', dot: '#fb923c' },
  historian:          { border: 'border-stone-400/60',   glow: 'shadow-[0_0_16px_rgba(168,162,158,0.3)]', badge: 'bg-stone-800/40 text-stone-200 border-stone-500/50',     line: '#a8a29e', dot: '#d6d3d1' },
};
const DEFAULT_COLOR = { border: 'border-[#d4af37]/40', glow: 'shadow-[0_0_12px_rgba(212,175,55,0.2)]', badge: 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30', line: '#d4af37', dot: '#f3e5ab' };

function getColors(agentId: string) { return ROLE_COLORS[agentId] || DEFAULT_COLOR; }
function getTitle(agentId: string) { return COURT_ROLES[agentId as AgentId]?.title || agentId; }
function getIcon(agentId: string) {
  const role = COURT_ROLES[agentId as AgentId];
  if (!role) return null;
  const Icon = role.icon;
  return <Icon size={14} />;
}

const CARD_W = 280;
const CARD_GAP = 100;
const ROW_GAP = 120;
const CARD_COLLAPSED_H = 260; // fixed collapsed height
const CARD_EXPANDED_H = 560; // estimated expanded height
const ROOT_W = 320;
const ROOT_H = 120;
const ROOT_TOP = 40;
const SUMMARY_W = 480;
const SUMMARY_GAP = 80;

// ── Markdown renderer ──────────────────────────────────────────────────────────
const MdContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    components={{
      p: ({ children }) => <p className="text-[12px] text-[#d7ccc8] leading-relaxed mb-2 last:mb-0">{children}</p>,
      h1: ({ children }) => <h1 className="text-[14px] font-bold text-[#e6d5ac] mb-2 mt-3 first:mt-0">{children}</h1>,
      h2: ({ children }) => <h2 className="text-[13px] font-bold text-[#e6d5ac] mb-1.5 mt-2.5 first:mt-0">{children}</h2>,
      h3: ({ children }) => <h3 className="text-[12px] font-semibold text-[#d4af37] mb-1 mt-2 first:mt-0">{children}</h3>,
      ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2 text-[12px] text-[#d7ccc8]">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2 text-[12px] text-[#d7ccc8]">{children}</ol>,
      li: ({ children }) => <li className="text-[12px] text-[#d7ccc8] leading-relaxed">{children}</li>,
      code: ({ children, className }) => {
        const isBlock = className?.includes('language-');
        return isBlock
          ? <code className="block bg-black/50 border border-[#3e2723]/60 rounded p-2 text-[11px] text-[#a5d6a7] font-mono whitespace-pre-wrap mb-2">{children}</code>
          : <code className="bg-black/40 border border-[#3e2723]/40 rounded px-1 text-[11px] text-[#a5d6a7] font-mono">{children}</code>;
      },
      blockquote: ({ children }) => <blockquote className="border-l-2 border-[#d4af37]/40 pl-3 italic text-[#8d6e63] text-[12px] mb-2">{children}</blockquote>,
      strong: ({ children }) => <strong className="font-bold text-[#e6d5ac]">{children}</strong>,
      em: ({ children }) => <em className="italic text-[#bcaaa4]">{children}</em>,
      hr: () => <hr className="border-[#3e2723]/50 my-3" />,
    }}
  >
    {content}
  </ReactMarkdown>
);

// ── Confidence Bar ─────────────────────────────────────────────────────────────
const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => {
  const color = value >= 70 ? 'from-[#8a7338] to-[#d4af37]' : value >= 40 ? 'from-orange-800 to-orange-400' : 'from-red-900 to-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          className={clsx('h-full rounded-full bg-gradient-to-r', color)} />
      </div>
      <span className={clsx('text-[11px] font-mono tabular-nums font-bold',
        value >= 70 ? 'text-[#d4af37]' : value >= 40 ? 'text-orange-400' : 'text-red-400')}>
        {value}%
      </span>
    </div>
  );
};

// ── Official Node Card ─────────────────────────────────────────────────────────
const OfficialCard: React.FC<{
  node: DecisionNode;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}> = ({ node, index, expanded, onToggle }) => {
  const colors = getColors(node.agentId);
  const outputText = node.output || node.outputSummary || '';
  const hasOutput = outputText.length > 0;
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // Check if content overflows the collapsed height
    setIsTruncated(el.scrollHeight > CARD_COLLAPSED_H);
  }, [outputText]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 + index * 0.08 }}
      className={clsx('rounded-xl border bg-[#0e0808]/95', colors.border, colors.glow)}
      style={{ width: CARD_W }}
    >
      {/* Collapsible content area */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height: expanded ? 'auto' : CARD_COLLAPSED_H }}
      >
        <div ref={contentRef} className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold', colors.badge)}>
              {getIcon(node.agentId)}
              {getTitle(node.agentId)}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {node.durationMs && (
                <span className="flex items-center gap-1 text-[10px] text-[#5d4037] font-mono">
                  <Clock size={9} />{(node.durationMs / 1000).toFixed(1)}s
                </span>
              )}
              {node.confidence !== undefined && (
                <span className={clsx('text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border', colors.badge)}>
                  {node.confidence}%
                </span>
              )}
            </div>
          </div>

          {/* Reasoning */}
          <div className="space-y-1">
            <div className="text-[9px] text-[#5d4037] font-mono uppercase tracking-widest">决策理由</div>
            <div className="text-[12px] text-[#e6d5ac] leading-relaxed">{node.reasoning}</div>
          </div>

          {/* Confidence bar */}
          {node.confidence !== undefined && <ConfidenceBar value={node.confidence} />}

          {/* Alternatives */}
          {node.alternatives && node.alternatives.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-[#2a1a1a]">
              <div className="text-[9px] text-[#5d4037] font-mono uppercase tracking-widest">排除选项</div>
              <div className="flex flex-wrap gap-1">
                {node.alternatives.map(alt => (
                  <span key={alt} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/30 text-[#5d4037] border border-[#3e2723]/50">
                    {getTitle(alt)}
                  </span>
                ))}
              </div>
              {node.whyNot && <div className="text-[10px] text-[#8d6e63] italic">{node.whyNot}</div>}
            </div>
          )}

          {/* Output */}
          {hasOutput && (
            <div className="space-y-1.5 pt-2 border-t border-[#2a1a1a]">
              <div className="text-[9px] text-[#5d4037] font-mono uppercase tracking-widest">回禀内容</div>
              <div className="bg-black/30 rounded-lg p-2.5 border border-[#2a1a1a]">
                <MdContent content={outputText} />
              </div>
            </div>
          )}

          {!hasOutput && (
            <div className="text-[10px] text-[#3e2723]/80 italic font-mono pt-1 border-t border-[#2a1a1a]">
              等待回禀...
            </div>
          )}
        </div>
      </div>

      {/* Toggle button — always visible outside overflow area */}
      {isTruncated && (
        <button
          onClick={onToggle}
          className={clsx(
            'w-full flex items-center justify-center gap-1 py-2 text-[10px] font-mono transition-colors border-t border-[#2a1a1a]',
            'text-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[#d4af37]/5 rounded-b-xl'
          )}
        >
          {expanded ? <><ChevronDown size={10} />收起</> : <><ChevronRight size={10} />展开全文</>}
        </button>
      )}
    </motion.div>
  );
};

// ── Main DecisionTrace ─────────────────────────────────────────────────────────
const DecisionTrace: React.FC<DecisionTraceProps> = ({ tree, summary }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const children = tree.children || [];
  const childCount = children.length;
  const rootColors = getColors(tree.agentId);

  // Layout
  const childRowWidth = childCount * CARD_W + Math.max(0, childCount - 1) * CARD_GAP;
  const canvasW = Math.max(childRowWidth, ROOT_W, SUMMARY_W) + 400;
  const cx = canvasW / 2;

  const childXs = children.map((_, i) =>
    cx - childRowWidth / 2 + i * (CARD_W + CARD_GAP) + CARD_W / 2
  );

  // Dynamic child row height: tallest card wins
  const maxChildH = children.reduce((max, child) => {
    const h = expandedCards[child.id] ? CARD_EXPANDED_H : CARD_COLLAPSED_H;
    return Math.max(max, h);
  }, CARD_COLLAPSED_H);

  const childTop = ROOT_TOP + ROOT_H + ROW_GAP;
  const summaryTop = childTop + maxChildH + SUMMARY_GAP;
  const svgH = summary ? summaryTop + 300 : childTop + maxChildH + 60;

  // Zoom via wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(2.5, Math.max(0.25, s - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan via mouse drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const resetView = () => { setScale(0.85); setOffset({ x: 0, y: 0 }); };

  const toggleCard = (id: string) =>
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{ cursor: isPanning.current ? 'grabbing' : 'grab', background: 'radial-gradient(ellipse at center, #1a0a0a 0%, #0a0505 100%)' }}
    >
      {/* Grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d4af37" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/70 border border-[#d4af37]/20 rounded-lg p-1 backdrop-blur-sm">
        <button onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
          className="p-1.5 text-[#d4af37]/60 hover:text-[#d4af37] transition-colors rounded">
          <ZoomIn size={14} />
        </button>
        <span className="text-[11px] font-mono text-[#8d6e63] w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.max(0.25, s - 0.15))}
          className="p-1.5 text-[#d4af37]/60 hover:text-[#d4af37] transition-colors rounded">
          <ZoomOut size={14} />
        </button>
        <div className="w-px h-4 bg-[#d4af37]/20 mx-0.5" />
        <button onClick={resetView}
          className="p-1.5 text-[#d4af37]/60 hover:text-[#d4af37] transition-colors rounded">
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-3 z-10 text-[10px] text-[#5d4037] font-mono pointer-events-none">
        滚轮缩放 · 拖拽移动视角
      </div>

      {/* Canvas */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 60,
          width: canvasW,
          transform: `translateX(calc(-50% + ${offset.x}px)) translateY(${offset.y}px) scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* SVG lines */}
        <svg
          width={canvasW}
          height={svgH}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          {childCount > 0 && (
            <>
              {/* Stem down from root */}
              <motion.line
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                x1={cx} y1={ROOT_TOP + ROOT_H}
                x2={cx} y2={ROOT_TOP + ROOT_H + ROW_GAP / 2}
                stroke="#d4af37" strokeWidth="2" strokeOpacity="0.6"
              />
              {/* Horizontal bar */}
              {childCount > 1 && (
                <motion.line
                  initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  style={{ transformOrigin: `${cx}px ${ROOT_TOP + ROOT_H + ROW_GAP / 2}px` }}
                  x1={childXs[0]} y1={ROOT_TOP + ROOT_H + ROW_GAP / 2}
                  x2={childXs[childCount - 1]} y2={ROOT_TOP + ROOT_H + ROW_GAP / 2}
                  stroke="#d4af37" strokeWidth="2" strokeOpacity="0.4"
                />
              )}
              {/* Drops to each child */}
              {children.map((child, i) => {
                const c = getColors(child.agentId);
                return (
                  <g key={child.id}>
                    <motion.line
                      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.25 + i * 0.06 }}
                      x1={childXs[i]} y1={ROOT_TOP + ROOT_H + ROW_GAP / 2}
                      x2={childXs[i]} y2={childTop}
                      stroke={c.line} strokeWidth="2" strokeOpacity="0.6"
                    />
                    <motion.circle
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      cx={childXs[i]} cy={childTop - 5} r={4}
                      fill={c.dot} opacity="0.85"
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* Children → summary */}
          {summary && childCount > 0 && (
            <>
              {children.map((child, i) => {
                const c = getColors(child.agentId);
                const cardH = expandedCards[child.id] ? CARD_EXPANDED_H : CARD_COLLAPSED_H;
                return (
                  <line key={child.id}
                    x1={childXs[i]} y1={childTop + cardH}
                    x2={childXs[i]} y2={summaryTop - ROW_GAP / 2}
                    stroke={c.line} strokeWidth="2" strokeOpacity="0.35"
                  />
                );
              })}
              {childCount > 1 && (
                <line
                  x1={childXs[0]} y1={summaryTop - ROW_GAP / 2}
                  x2={childXs[childCount - 1]} y2={summaryTop - ROW_GAP / 2}
                  stroke="#d4af37" strokeWidth="2" strokeOpacity="0.3"
                />
              )}
              <line
                x1={cx} y1={summaryTop - ROW_GAP / 2}
                x2={cx} y2={summaryTop}
                stroke="#d4af37" strokeWidth="2" strokeOpacity="0.55"
              />
              <circle cx={cx} cy={summaryTop - 5} r={4} fill="#d4af37" opacity="0.8" />
            </>
          )}
        </svg>

        {/* Root card */}
        <div style={{ position: 'absolute', top: ROOT_TOP, left: cx - ROOT_W / 2 }}>
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            className={clsx('rounded-xl border bg-[#0e0808]/95 p-5 space-y-3', rootColors.border, rootColors.glow)}
            style={{ width: ROOT_W }}
          >
            <div className={clsx('flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border text-sm font-mono font-bold', rootColors.badge)}>
              {getIcon(tree.agentId)}
              {getTitle(tree.agentId)}
            </div>
            <div className="text-[13px] text-[#e6d5ac] leading-relaxed text-center">{tree.reasoning}</div>
            {childCount > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8d6e63] font-mono pt-1 border-t border-[#2a1a1a]">
                <CheckCircle2 size={11} className="text-[#d4af37]" />
                调度 {childCount} 位官员并行处理
              </div>
            )}
          </motion.div>
        </div>

        {/* Child cards */}
        {children.map((child, i) => (
          <div key={child.id} style={{ position: 'absolute', top: childTop, left: childXs[i] - CARD_W / 2 }}>
            <OfficialCard
              node={child}
              index={i}
              expanded={!!expandedCards[child.id]}
              onToggle={() => toggleCard(child.id)}
            />
          </div>
        ))}

        {/* Summary card */}
        {summary && (
          <div style={{ position: 'absolute', top: summaryTop, left: cx - SUMMARY_W / 2 }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rounded-xl border border-[#d4af37]/50 bg-[#1a0f0a]/95 p-6 space-y-3 shadow-[0_0_24px_rgba(212,175,55,0.2)]"
              style={{ width: SUMMARY_W }}
            >
              <div className="flex items-center gap-2 pb-3 border-b border-[#d4af37]/20">
                <div className="w-7 h-7 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center">
                  {getIcon(tree.agentId)}
                </div>
                <span className="text-sm font-mono font-bold text-[#d4af37] tracking-widest uppercase">丞相总结</span>
              </div>
              <MdContent content={summary} />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DecisionTrace;
