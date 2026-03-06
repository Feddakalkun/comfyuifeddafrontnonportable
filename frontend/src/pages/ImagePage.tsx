// Image Generation Page — Tab Container
import { useState } from 'react';
import { Sparkles, Image, Paintbrush, Layers } from 'lucide-react';
import { ModelDownloader } from '../components/ModelDownloader';
import { ImageGallery } from '../components/image/ImageGallery';
import { GenerateTab } from '../components/image/GenerateTab';
import { HQPortraitTab } from '../components/image/HQPortraitTab';
import { Img2ImgTab } from '../components/image/Img2ImgTab';
import { InpaintTab } from '../components/image/InpaintTab';

type ImageMode = 'generate' | 'hq' | 'img2img' | 'inpaint';

const TABS: { id: ImageMode; label: string; icon: React.ElementType }[] = [
    { id: 'generate', label: 'GENERATE', icon: Sparkles },
    { id: 'hq', label: 'HQ PORTRAIT', icon: Layers },
    { id: 'img2img', label: 'IMG2IMG', icon: Image },
    { id: 'inpaint', label: 'INPAINT', icon: Paintbrush },
];

interface ImagePageProps {
    modelId: string;
    modelLabel: string;
}

export const ImagePage = ({ modelId }: ImagePageProps) => {
    const [activeMode, setActiveMode] = useState<ImageMode>('generate');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>(() => {
        const saved = localStorage.getItem(`gallery_${modelId}`);
        return saved ? JSON.parse(saved) : [];
    });

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Model Downloader (fixed at top) */}
            <ModelDownloader modelGroup="z-image" />

            {/* Tab Bar */}
            <div className="px-8 pt-4 pb-0 flex gap-2">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveMode(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border border-b-0 ${
                            activeMode === id
                                ? 'bg-[#121218] text-white border-white/10'
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="p-8 pt-0 grid grid-cols-1 lg:grid-cols-3 gap-8 h-full overflow-y-auto custom-scrollbar">
                {/* Left: Tab Controls */}
                <div className="lg:col-span-1">
                    {activeMode === 'generate' && <GenerateTab isGenerating={isGenerating} setIsGenerating={setIsGenerating} />}
                    {activeMode === 'hq' && <HQPortraitTab isGenerating={isGenerating} setIsGenerating={setIsGenerating} />}
                    {activeMode === 'img2img' && <Img2ImgTab isGenerating={isGenerating} setIsGenerating={setIsGenerating} />}
                    {activeMode === 'inpaint' && <InpaintTab isGenerating={isGenerating} setIsGenerating={setIsGenerating} />}
                </div>

                {/* Right: Shared Gallery */}
                <ImageGallery
                    generatedImages={generatedImages}
                    setGeneratedImages={setGeneratedImages}
                    isGenerating={isGenerating}
                    setIsGenerating={setIsGenerating}
                    galleryKey={modelId}
                />
            </div>
        </div>
    );
};
