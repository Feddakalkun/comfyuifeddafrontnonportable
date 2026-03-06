import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { comfyService } from '../../services/comfyService';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { useToast } from '../ui/Toast';
import { PromptInput } from './PromptInput';
import { LoraStack } from './LoraStack';
import type { SelectedLora } from './LoraStack';
import { ImageUpload } from './ImageUpload';

interface Img2ImgTabProps {
    isGenerating: boolean;
    setIsGenerating: (v: boolean) => void;
}

export const Img2ImgTab = ({ isGenerating, setIsGenerating }: Img2ImgTabProps) => {
    const { queueWorkflow } = useComfyExecution();
    const { toast } = useToast();

    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, bad anatomy, flat lighting');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [steps, setSteps] = useState(9);
    const [cfg, setCfg] = useState(1);
    const [denoise, setDenoise] = useState(0.5);
    const [style, setStyle] = useState('No Style');
    const [selectedLoras, setSelectedLoras] = useState<SelectedLora[]>([]);
    const [availableLoras, setAvailableLoras] = useState<string[]>([]);
    const [availableStyles, setAvailableStyles] = useState<string[]>(['No Style']);

    const [inputImage, setInputImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

    const handleImageSelected = (file: File) => {
        setInputImage(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleClearImage = () => {
        setInputImage(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || !inputImage) {
            toast('Please provide both an image and a prompt', 'error');
            return;
        }
        setIsGenerating(true);
        try {
            // Upload image to ComfyUI first
            const uploaded = await comfyService.uploadImage(inputImage);

            const response = await fetch('/workflows/zimageimg2img.json');
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
                } catch { /* use raw */ }
            }

            // Node 49: KSampler
            workflow["49"].inputs.seed = activeSeed;
            workflow["49"].inputs.steps = steps;
            workflow["49"].inputs.cfg = cfg;
            workflow["49"].inputs.denoise = denoise;

            // Node 50: Positive Prompt
            workflow["50"].inputs.string = finalPrompt;

            // Node 38: Negative Prompt
            workflow["38"].inputs.string = negativePrompt;

            // Node 51: Style
            workflow["51"].inputs.styles = style;

            // Node 52: LoadImage
            workflow["52"].inputs.image = uploaded.name;

            // Node 127: Power Lora Loader
            if (selectedLoras.length > 0) {
                selectedLoras.slice(0, 5).forEach((l, index) => {
                    workflow["127"].inputs[`lora_${index + 1}`] = { on: true, lora: l.name, strength: l.strength };
                });
            }

            await queueWorkflow(workflow);
        } catch (error: any) {
            console.error('Generation failed:', error);
            toast(error?.message || 'Generation failed!', 'error');
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-[#121218] border border-white/5 rounded-2xl p-6 shadow-xl">
                <ImageUpload
                    onImageSelected={handleImageSelected}
                    previewUrl={previewUrl}
                    onClear={handleClearImage}
                    label="Input Image"
                />
            </div>

            {/* Denoise Strength */}
            <div className="bg-[#121218] border border-white/5 rounded-2xl p-6 shadow-xl">
                <label className="block text-xs text-slate-400 mb-3 uppercase tracking-wider">
                    Denoise Strength: {denoise.toFixed(2)}
                </label>
                <input type="range" min="0" max="1" step="0.01" value={denoise}
                    onChange={(e) => setDenoise(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white" />
                <p className="text-xs text-slate-600 mt-2">Lower = closer to original, Higher = more creative</p>
            </div>

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

                        <div>
                            <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Negative Prompt</label>
                            <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                                className="w-full h-24 bg-[#0a0a0f] border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none transition-all"
                                placeholder="Things to avoid..." />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Steps: {steps}</label>
                            <input type="range" min="1" max="50" value={steps} onChange={(e) => setSteps(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white" />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-2">CFG Scale: {cfg}</label>
                            <input type="range" min="1" max="20" step="0.5" value={cfg} onChange={(e) => setCfg(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white" />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Style</label>
                            <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20">
                                {availableStyles.map((s) => (<option key={s} value={s}>{s}</option>))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
