import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { comfyService } from '../../services/comfyService';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { useToast } from '../ui/Toast';
import { PromptInput } from './PromptInput';
import { LoraStack } from './LoraStack';
import type { SelectedLora } from './LoraStack';

interface GenerateTabProps {
    isGenerating: boolean;
    setIsGenerating: (v: boolean) => void;
}

export const GenerateTab = ({ isGenerating, setIsGenerating }: GenerateTabProps) => {
    const { queueWorkflow } = useComfyExecution();
    const { toast } = useToast();

    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, bad anatomy, flat lighting');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [steps, setSteps] = useState(9);
    const [cfg, setCfg] = useState(1);
    const [dimensions, setDimensions] = useState('1024x1536');
    const [style, setStyle] = useState('No Style');
    const [seed, setSeed] = useState(-1);
    const [selectedLoras, setSelectedLoras] = useState<SelectedLora[]>([]);
    const [availableLoras, setAvailableLoras] = useState<string[]>([]);
    const [availableStyles, setAvailableStyles] = useState<string[]>(['No Style']);

    useEffect(() => {
        const load = async () => {
            try {
                const [loras, styles] = await Promise.all([comfyService.getLoras(), comfyService.getStyles()]);
                setAvailableLoras(loras);
                if (styles.length > 0) setAvailableStyles(styles);
            } catch (err) { console.error("Failed to load data", err); }
        };
        load();
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const response = await fetch('/workflows/z-image-master.json');
            if (!response.ok) throw new Error('Failed to load workflow');
            const workflow = await response.json();

            const activeSeed = Math.floor(Math.random() * 1000000000000000);

            // Expand wildcards
            let finalPrompt = prompt;
            if (prompt.includes('__')) {
                try {
                    const expandResp = await fetch(`http://localhost:8000/api/wildcards/expand?text=${encodeURIComponent(prompt)}`);
                    const expandData = await expandResp.json();
                    if (expandData.success) finalPrompt = expandData.expanded;
                } catch { /* use raw prompt */ }
            }

            // Node 3: KSampler
            workflow["3"].inputs.seed = activeSeed;
            workflow["3"].inputs.steps = steps;
            workflow["3"].inputs.cfg = cfg;

            // Node 33: Positive Prompt
            workflow["33"].inputs.string = finalPrompt;

            // Node 34: Negative Prompt
            workflow["34"].inputs.string = negativePrompt;

            // Node 30: Dimensions
            const [w, h] = dimensions.split('x').map(Number);
            workflow["30"].inputs.width = w;
            workflow["30"].inputs.height = h;

            // Node 31: Style
            workflow["31"].inputs.styles = style;

            // Node 126: Power Lora Loader
            if (selectedLoras.length > 0) {
                selectedLoras.slice(0, 5).forEach((l, index) => {
                    workflow["126"].inputs[`lora_${index + 1}`] = { on: true, lora: l.name, strength: l.strength };
                });
            }

            // Node 181: FaceDetailer resolution
            const maxDim = Math.max(w, h);
            workflow["181"].inputs.guide_size = maxDim;
            workflow["181"].inputs.max_size = maxDim;

            await queueWorkflow(workflow);
        } catch (error: any) {
            console.error('Generation failed:', error);
            toast(error?.message || 'Generation failed!', 'error');
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <PromptInput
                prompt={prompt} setPrompt={setPrompt}
                negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
                isGenerating={isGenerating} onGenerate={handleGenerate}
                showNegative={false}
            />

            {/* Advanced Settings */}
            <div className="bg-[#121218] border border-white/5 rounded-2xl p-6 shadow-xl">
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    <span>Advanced Settings</span>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>

                {showAdvanced && (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <LoraStack selectedLoras={selectedLoras} setSelectedLoras={setSelectedLoras} availableLoras={availableLoras} />

                        {/* Negative Prompt */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Negative Prompt</label>
                            <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                                className="w-full h-24 bg-[#0a0a0f] border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none transition-all"
                                placeholder="Things to avoid..." />
                        </div>

                        {/* Steps */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Steps: {steps}</label>
                            <input type="range" min="1" max="50" value={steps} onChange={(e) => setSteps(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white" />
                        </div>

                        {/* CFG */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-2">CFG Scale: {cfg}</label>
                            <input type="range" min="1" max="20" step="0.5" value={cfg} onChange={(e) => setCfg(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white" />
                        </div>

                        {/* Dimensions */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Dimensions</label>
                            <select value={dimensions} onChange={(e) => setDimensions(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20">
                                <option value="1024x1536">1024x1536 (2:3 Portrait)</option>
                                <option value="1536x1024">1536x1024 (3:2 Landscape)</option>
                                <option value="1024x1024">1024x1024 (1:1 Square)</option>
                                <option value="1504x1504">1504x1504 (1:1 Large)</option>
                                <option value="1920x1080">1920x1080 (16:9)</option>
                                <option value="1080x1920">1080x1920 (9:16)</option>
                            </select>
                        </div>

                        {/* Style */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Style</label>
                            <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20">
                                {availableStyles.map((s) => (<option key={s} value={s}>{s}</option>))}
                            </select>
                        </div>

                        {/* Seed */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Seed (-1 for random)</label>
                            <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value))} className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
