import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scroll, User, Database, Brain, Sparkles, ChevronDown } from 'lucide-react';
import { useConfigStore, type AgentConfig } from '../../store/useConfigStore';
import clsx from 'clsx';

interface AppointmentModalProps {
  onClose: () => void;
}

const MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek V3' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
];

const TEMPLATES = [
  {
    name: '文官 (Civil)',
    prompt: '你是一位古代朝廷的文官。你的职责是辅佐皇帝，制定政策，管理国家事务。你需要用文言文或半文言文风格回答，语气恭敬但有主见。',
    skills: ['search_knowledge', 'draft_decree']
  },
  {
    name: '武将 (Military)',
    prompt: '你是一位古代朝廷的武将。你的性格豪爽，忠诚勇敢。你的职责是保卫国家，统领军队。你需要用豪迈的语气回答，注重战略和执行。',
    skills: ['deploy_troops', 'security_check']
  },
  {
    name: '史官 (Historian)',
    prompt: '你是一位史官。你的职责是客观记录朝廷发生的一切大事。你的语气应该冷静、客观，不带个人感情色彩。',
    skills: ['record_log', 'search_history']
  }
];

const TEXTURES = [
  { id: 'generic_official', name: '默认官员 (Default)', file: 'minister.png', scale: 1 },
  { id: 'minister_char', name: '丞相 (Minister)', file: 'minister_new.png', scale: 0.25 },
  { id: 'historian_char', name: '史官 (Historian)', file: 'historian.png', scale: 0.25 },
  { id: 'revenue_char', name: '尚书 (Minister)', file: 'revenue.png', scale: 0.25 },
  { id: 'emperor', name: '皇帝 (Emperor)', file: 'emperor_new.png', scale: 0.25 }
];

const AppointmentModal: React.FC<AppointmentModalProps> = ({ onClose }) => {
  const { addAgent, skills: availableSkills, fetchSkills } = useConfigStore();
  
  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const [formData, setFormData] = useState<Partial<AgentConfig>>({
    name: '',
    role: '',
    description: '',
    systemPrompt: '',
    model: 'deepseek-chat',
    skills: [],
    port: '3001', // Default backend port
    texture: 'generic_official' // Default texture
  });

  const [activeTab, setActiveTab] = useState<'basics' | 'appearance' | 'personality' | 'powers'>('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.role) return;
    
    setIsSubmitting(true);
    try {
      await addAgent(formData as AgentConfig);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      systemPrompt: template.prompt,
      skills: Array.from(new Set([...(prev.skills || []), ...template.skills]))
    }));
  };

  const toggleSkill = (skillName: string) => {
    setFormData(prev => {
      const current = prev.skills || [];
      const next = current.includes(skillName)
        ? current.filter(s => s !== skillName)
        : [...current, skillName];
      return { ...prev, skills: next };
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl h-[80vh] bg-[#1a0f0f] border-2 border-[#d4af37] rounded-lg shadow-[0_0_50px_rgba(212,175,55,0.2)] flex flex-col overflow-hidden"
      >
        {/* Header: Edict Style */}
        <div className="h-20 bg-[#2c0b0e] border-b border-[#d4af37] flex items-center justify-between px-8 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
          
          <div className="flex items-center gap-4 z-10">
            <div className="w-12 h-12 rounded-full bg-[#d4af37] flex items-center justify-center text-[#2c0b0e] shadow-lg border-2 border-[#fffdf5]">
              <Scroll size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#e6d5ac] tracking-[0.2em]">册封大典</h2>
              <p className="text-xs text-[#d4af37]/60 font-mono uppercase tracking-widest">Imperial Appointment Ceremony</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="z-10 w-8 h-8 rounded-full border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] hover:bg-[#d4af37] hover:text-[#2c0b0e] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar Navigation */}
          <div className="w-48 bg-[#120808] border-r border-[#3e2723] flex flex-col py-6 gap-2 shrink-0">
            {[
              { id: 'basics', label: '基本信息', icon: User },
              { id: 'appearance', label: '容貌衣冠', icon: User },
              { id: 'personality', label: '人设圣谕', icon: Brain },
              { id: 'powers', label: '职权授予', icon: Sparkles },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={clsx(
                  "flex items-center gap-3 px-6 py-3 text-sm font-bold transition-all relative",
                  activeTab === item.id 
                    ? "text-[#e6d5ac] bg-[#d4af37]/10" 
                    : "text-[#5d4037] hover:text-[#8d6e63] hover:bg-[#1a0f0f]"
                )}
              >
                {activeTab === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d4af37] shadow-[0_0_10px_#d4af37]" />
                )}
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Form Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1a0f0f] p-8 relative">
            <div className="max-w-2xl mx-auto space-y-8">
              
              {/* Tab: Basics */}
              {activeTab === 'basics' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs text-[#d4af37]/70 uppercase tracking-wider font-bold">官名 (Name)</label>
                      <input 
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="例如：诸葛亮"
                        className="w-full bg-[#0a0505] border border-[#3e2723] rounded p-3 text-[#e6d5ac] focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[#d4af37]/70 uppercase tracking-wider font-bold">官职代码 (Role ID)</label>
                      <input 
                        type="text"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                        placeholder="例如：prime_minister"
                        className="w-full bg-[#0a0505] border border-[#3e2723] rounded p-3 text-[#e6d5ac] font-mono focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-[#d4af37]/70 uppercase tracking-wider font-bold">职责描述 (Description)</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="简述该官员的主要职责..."
                      className="w-full bg-[#0a0505] border border-[#3e2723] rounded p-3 text-[#e6d5ac] h-24 resize-none focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-[#d4af37]/70 uppercase tracking-wider font-bold">模型 (Model)</label>
                    <div className="relative">
                      <select 
                        value={typeof formData.model === 'string' ? formData.model : 'custom'}
                        onChange={e => setFormData({...formData, model: e.target.value})}
                        className="w-full bg-[#0a0505] border border-[#3e2723] rounded p-3 text-[#e6d5ac] appearance-none focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                      >
                        {MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d4037] pointer-events-none" size={16} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab: Appearance */}
              {activeTab === 'appearance' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Left: Preview */}
                    <div className="flex flex-col items-center gap-4 p-6 bg-[#0a0505] border border-[#3e2723] rounded-lg">
                        <div className="text-xs text-[#d4af37]/70 uppercase tracking-wider font-bold mb-2">预览 (Preview)</div>
                        <div className="w-48 h-48 flex items-center justify-center border-2 border-[#d4af37]/30 rounded-full bg-[#1a0f0f] relative overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                              <div 
                                 style={{
                                     backgroundImage: `url(/assets/${TEXTURES.find(t => t.id === formData.texture)?.file || 'minister.png'})`,
                                     backgroundPosition: '0 0',
                                     backgroundRepeat: 'no-repeat',
                                     backgroundSize: '400%', // Assumes 4 frames per row (standard 4x4 grid)
                                     width: '100%',
                                     height: '100%',
                                     imageRendering: 'pixelated'
                                 }}
                              />
                         </div>
                        <div className="text-[#e6d5ac] font-bold text-lg mt-2">{formData.name || '未命名'}</div>
                        <div className="text-[#8d6e63] text-sm font-mono">{formData.role || 'unknown_role'}</div>
                    </div>

                    {/* Right: Selection */}
                    <div className="space-y-4">
                        <label className="text-xs text-[#d4af37]/70 uppercase tracking-wider font-bold">选择外观 (Select Texture)</label>
                        <div className="grid grid-cols-1 gap-3">
                            {TEXTURES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setFormData({...formData, texture: t.id})}
                                    className={clsx(
                                        "flex items-center gap-4 p-3 rounded border text-left transition-all",
                                        formData.texture === t.id 
                                            ? "bg-[#d4af37]/20 border-[#d4af37] text-[#e6d5ac]" 
                                            : "bg-[#0a0505] border-[#3e2723] text-[#8d6e63] hover:border-[#d4af37]/50"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded border border-[#5d4037] bg-black overflow-hidden relative shrink-0">
                                         <div 
                                            className="absolute top-0 left-0 w-full h-full"
                                            style={{
                                                backgroundImage: `url(/assets/${t.file})`,
                                                backgroundPosition: '0 0',
                                                backgroundSize: '400%',
                                                imageRendering: 'pixelated'
                                            }}
                                         />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{t.name}</div>
                                        <div className="text-xs opacity-60 font-mono">{t.id}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab: Personality */}
              {activeTab === 'personality' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="flex gap-2 mb-4">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        onClick={() => applyTemplate(t)}
                        className="px-3 py-1 text-xs border border-[#3e2723] rounded text-[#8d6e63] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                      >
                        使用{t.name}模板
                      </button>
                    ))}
                  </div>
                  
                  <div className="space-y-2 h-full">
                    <label className="text-xs text-[#d4af37]/70 uppercase tracking-wider font-bold flex items-center gap-2">
                      <Scroll size={12} />
                      圣谕 (System Prompt)
                    </label>
                    <textarea 
                      value={formData.systemPrompt}
                      onChange={e => setFormData({...formData, systemPrompt: e.target.value})}
                      placeholder="在此输入该官员的性格、语气、行为准则..."
                      className="w-full bg-[#0a0505] border border-[#3e2723] rounded p-4 text-[#e6d5ac] font-mono text-sm leading-relaxed h-[400px] resize-none focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>
                </motion.div>
              )}

              {/* Tab: Powers */}
              {activeTab === 'powers' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                   <div className="grid grid-cols-2 gap-3">
                     {availableSkills.map(skill => (
                       <div 
                         key={skill.name}
                         onClick={() => toggleSkill(skill.name)}
                         className={clsx(
                           "p-3 rounded border cursor-pointer transition-all flex items-start gap-3",
                           (formData.skills || []).includes(skill.name)
                             ? "bg-[#d4af37]/10 border-[#d4af37] shadow-[inset_0_0_10px_rgba(212,175,55,0.1)]"
                             : "bg-[#0a0505] border-[#3e2723] hover:border-[#5d4037]"
                         )}
                       >
                         <div className={clsx(
                           "w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0",
                           (formData.skills || []).includes(skill.name)
                             ? "bg-[#d4af37] border-[#d4af37]"
                             : "border-[#5d4037]"
                         )}>
                           {(formData.skills || []).includes(skill.name) && (
                             <Sparkles size={10} className="text-[#2c0b0e]" />
                           )}
                         </div>
                         <div>
                           <div className={clsx(
                             "text-sm font-bold",
                             (formData.skills || []).includes(skill.name) ? "text-[#e6d5ac]" : "text-[#8d6e63]"
                           )}>
                             {skill.name}
                           </div>
                           <div className="text-xs text-[#5d4037] mt-1 line-clamp-2">
                             {skill.description}
                           </div>
                           <div className={clsx(
                             "text-[9px] uppercase tracking-wider mt-2 inline-block px-1.5 py-0.5 rounded",
                             skill.riskLevel === 'high' ? "bg-red-900/30 text-red-500 border border-red-900/50" :
                             skill.riskLevel === 'medium' ? "bg-orange-900/30 text-orange-500 border border-orange-900/50" :
                             "bg-green-900/30 text-green-500 border border-green-900/50"
                           )}>
                             Risk: {skill.riskLevel}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </motion.div>
              )}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 bg-[#120808] border-t border-[#3e2723] flex items-center justify-end px-8 gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded border border-[#3e2723] text-[#8d6e63] hover:text-[#e6d5ac] hover:border-[#d4af37] transition-colors"
          >
            退朝 (Cancel)
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.role || isSubmitting}
            className="px-8 py-2 rounded bg-[#d4af37] text-[#2c0b0e] font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:bg-[#c5a028] hover:shadow-[0_0_25px_rgba(212,175,55,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">册封中...</span>
            ) : (
              <>
                <Scroll size={16} />
                册封 (Appoint)
              </>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
};

export default AppointmentModal;
