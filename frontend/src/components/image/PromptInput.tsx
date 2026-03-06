import { useState } from 'react';
import { Sparkles, Eye, Upload, X, Loader2, BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { ollamaService } from '../../services/ollamaService';
import { assistantService } from '../../services/assistantService';
import { useToast } from '../ui/Toast';
import { PromptLibrary } from '../PromptLibrary';

interface PromptInputProps {
    prompt: string;
    setPrompt: (p: string) => void;
    negativePrompt: string;
    setNegativePrompt: (p: string) => void;
    isGenerating: boolean;
    onGenerate: () => void;
    showNegative?: boolean;
}

export const PromptInput = ({ prompt, setPrompt, negativePrompt, setNegativePrompt, isGenerating, onGenerate, showNegative = true }: PromptInputProps) => {
    const { toast } = useToast();
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isDescribing, setIsDescribing] = useState(false);
    const [showPromptLibrary, setShowPromptLibrary] = useState(false);

    const enhancePrompt = async () => {
        if (!prompt.trim() || isEnhancing) return;
        setIsEnhancing(true);
        try {
            const models = await ollamaService.getModels();
            const model = models.find(m => m.name.includes('qwen') || m.name.includes('goonsai'))?.name || models[0]?.name;
            if (!model) { toast('No Ollama model available for prompt enhancement', 'error'); return; }
            const enhanced = await assistantService.enhancePrompt(model, prompt);
            if (enhanced) setPrompt(enhanced);
            await ollamaService.unloadModel(model);
        } catch (err) {
            console.error('Prompt enhancement failed:', err);
            toast('Failed to enhance prompt', 'error');
        } finally {
            setIsEnhancing(false);
        }
    };

    const processImage = async (file: File) => {
        setIsDescribing(true);
        try {
            const models = await ollamaService.getModels();
            const visionModel = models.find(m =>
                m.name.toLowerCase().includes('vision') || m.name.toLowerCase().includes('llava') || m.name.toLowerCase().includes('joycaption')
            );
            if (!visionModel) { toast('No Ollama VISION model found! Download one in Settings.', 'error'); setIsDescribing(false); return; }
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                if (!base64) return;
                try {
                    const description = await assistantService.describeImage(visionModel.name, base64);
                    setPrompt(description);
                } catch { toast('Failed to get description from Ollama.', 'error'); }
                finally { setIsDescribing(false); }
            };
            reader.readAsDataURL(file);
        } catch { setIsDescribing(false); }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) await processImage(file);
    };

    return (
        <>
            <div
                className={`bg-[#121218] border transition-all duration-300 rounded-2xl p-6 shadow-xl relative overflow-hidden group/prompt ${isDragging ? 'border-white/50 bg-white/5' : 'border-white/5'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                <div className={`absolute inset-0 z-50 flex items-center justify-center bg-[#121218]/90 backdrop-blur-sm transition-opacity duration-300 pointer-events-none ${isDragging ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="text-white font-bold text-lg animate-bounce flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8" />
                        Drop Image to Analyze
                    </div>
                </div>

                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Prompt</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onGenerate(); } }}
                    className="w-full h-40 bg-[#0a0a0f] border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none transition-all"
                    placeholder="Describe what you want to create... (Ctrl + Enter to generate)&#10;Or Drag & Drop an Image here to Capture"
                />

                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                        <Eye className="w-3 h-3" />
                        <span>Tip: Drag an image to auto-generate a prompt</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowPromptLibrary(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/15 transition-all">
                            <BookOpen className="w-3 h-3" /> Library
                        </button>
                        <button onClick={enhancePrompt} disabled={isEnhancing || !prompt.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white text-black hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            {isEnhancing ? (<><Loader2 className="w-3 h-3 animate-spin" /> Enhancing...</>) : (<><Sparkles className="w-3 h-3" /> Enhance Prompt</>)}
                        </button>
                    </div>
                </div>

                {showNegative && (
                    <div className="mt-4">
                        <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Negative Prompt</label>
                        <textarea
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            className="w-full h-20 bg-[#0a0a0f] border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none transition-all"
                            placeholder="Things to avoid... (e.g. blurry, low quality)"
                        />
                    </div>
                )}

                <div className="mt-4">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full bg-white hover:bg-slate-200 text-black border-none shadow-lg transition-all duration-300 rounded-xl font-bold tracking-wide"
                        isLoading={isGenerating}
                        onClick={onGenerate}
                        disabled={!prompt.trim()}
                    >
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </Button>
                </div>
            </div>

            <PromptLibrary
                isOpen={showPromptLibrary}
                onClose={() => setShowPromptLibrary(false)}
                onSelect={(positive, negative) => { setPrompt(positive); if (negative) setNegativePrompt(negative); }}
            />
        </>
    );
};
