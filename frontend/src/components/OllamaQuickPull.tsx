// Compact Ollama model manager for the header area
import { useState, useEffect } from 'react';
import { Download, BrainCircuit, Eye, Loader2, X, ChevronDown } from 'lucide-react';
import { ollamaService } from '../services/ollamaService';
import { useToast } from './ui/Toast';
import type { OllamaModel, OllamaProgress } from '../services/ollamaService';

const QUICK_MODELS = {
    text: [
        { id: 'goonsai/qwen2.5-3B-goonsai-nsfw-100k', label: 'Qwen 2.5 3B NSFW' },
        { id: 'zarigata/unfiltered-llama3', label: 'Unfiltered Llama 3' },
        { id: 'cognitivecomputations/dolphin-2.9.3-mistral-nemo-12b', label: 'Dolphin Nemo 12B' },
    ],
    vision: [
        { id: 'llama3.2-vision', label: 'Llama 3.2 Vision' },
        { id: 'llama3.2-vision:11b', label: 'Llama 3.2 Vision 11B' },
        { id: 'llava', label: 'LLaVA' },
    ],
};

export const OllamaQuickPull = () => {
    const { toast } = useToast();
    const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
    const [isPulling, setIsPulling] = useState(false);
    const [pullProgress, setPullProgress] = useState<OllamaProgress | null>(null);
    const [pullingModel, setPullingModel] = useState('');
    const [showDropdown, setShowDropdown] = useState<'text' | 'vision' | null>(null);

    useEffect(() => {
        refreshModels();
    }, []);

    const refreshModels = async () => {
        try {
            const models = await ollamaService.getModels();
            setInstalledModels(models);
        } catch { /* Ollama might be offline */ }
    };

    const isInstalled = (modelId: string) => {
        return installedModels.some(m => m.name === modelId || m.name.startsWith(modelId.split(':')[0]));
    };

    const handlePull = async (modelId: string, label: string) => {
        setShowDropdown(null);
        if (isInstalled(modelId)) {
            toast(`${label} is already installed`, 'info');
            return;
        }

        setIsPulling(true);
        setPullingModel(label);
        setPullProgress({ status: 'Starting...' });

        try {
            await ollamaService.pullModel(modelId, (progress) => {
                setPullProgress(progress);
                if (progress.status === 'success') {
                    toast(`${label} installed!`, 'success');
                    setTimeout(refreshModels, 1000);
                }
            });
        } catch {
            toast(`Failed to download ${label}`, 'error');
        } finally {
            setIsPulling(false);
            setPullProgress(null);
            setPullingModel('');
        }
    };

    const progressPercent = pullProgress?.total && pullProgress?.completed
        ? Math.round((pullProgress.completed / pullProgress.total) * 100)
        : null;

    return (
        <div className="flex items-center gap-3">
            {/* Download Progress (when active) */}
            {isPulling && (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 min-w-[200px]">
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-blue-300 truncate">{pullingModel}</span>
                            {progressPercent !== null && <span className="text-white ml-2">{progressPercent}%</span>}
                        </div>
                        {progressPercent !== null && (
                            <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Text Model Button */}
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(showDropdown === 'text' ? null : 'text')}
                    disabled={isPulling}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121218] border border-white/10 rounded-lg text-xs text-slate-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
                >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>Chat Model</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showDropdown === 'text' && (
                    <div className="absolute top-full right-0 mt-1 w-64 bg-[#121218] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                        {QUICK_MODELS.text.map(m => (
                            <button
                                key={m.id}
                                onClick={() => handlePull(m.id, m.label)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                            >
                                <span className="text-xs text-slate-200">{m.label}</span>
                                {isInstalled(m.id) ? (
                                    <span className="text-[10px] text-emerald-400 font-medium">Installed</span>
                                ) : (
                                    <Download className="w-3.5 h-3.5 text-slate-500" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Vision Model Button */}
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(showDropdown === 'vision' ? null : 'vision')}
                    disabled={isPulling}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121218] border border-white/10 rounded-lg text-xs text-slate-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
                >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Caption Model</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showDropdown === 'vision' && (
                    <div className="absolute top-full right-0 mt-1 w-64 bg-[#121218] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                        {QUICK_MODELS.vision.map(m => (
                            <button
                                key={m.id}
                                onClick={() => handlePull(m.id, m.label)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                            >
                                <span className="text-xs text-slate-200">{m.label}</span>
                                {isInstalled(m.id) ? (
                                    <span className="text-[10px] text-emerald-400 font-medium">Installed</span>
                                ) : (
                                    <Download className="w-3.5 h-3.5 text-slate-500" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
