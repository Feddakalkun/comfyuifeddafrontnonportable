import { useState, useEffect } from 'react';
import { Sparkles, Maximize2, X, Loader2, Trash2, Video } from 'lucide-react';
import { comfyService } from '../../services/comfyService';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { useToast } from '../ui/Toast';

interface ImageGalleryProps {
    generatedImages: string[];
    setGeneratedImages: React.Dispatch<React.SetStateAction<string[]>>;
    isGenerating: boolean;
    setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
    galleryKey: string;
}

export const ImageGallery = ({ generatedImages, setGeneratedImages, isGenerating, setIsGenerating, galleryKey }: ImageGalleryProps) => {
    const { state: execState, progress: execProgress, currentNodeName, lastCompletedPromptId } = useComfyExecution();
    const { toast } = useToast();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Validate images on mount
    useEffect(() => {
        const validateImages = async () => {
            if (generatedImages.length === 0) return;
            const validImages: string[] = [];
            for (const imageUrl of generatedImages) {
                try {
                    const response = await fetch(imageUrl, { method: 'HEAD' });
                    if (response.ok) validImages.push(imageUrl);
                } catch { /* skip dead images */ }
            }
            if (validImages.length !== generatedImages.length) {
                setGeneratedImages(validImages);
                localStorage.setItem(`gallery_${galleryKey}`, JSON.stringify(validImages));
            }
        };
        validateImages();
    }, []);

    // Save to localStorage when images change
    useEffect(() => {
        if (generatedImages.length > 0) {
            localStorage.setItem(`gallery_${galleryKey}`, JSON.stringify(generatedImages));
        }
    }, [generatedImages, galleryKey]);

    // Fetch results when execution completes
    useEffect(() => {
        if (!lastCompletedPromptId) return;
        const fetchResults = async () => {
            try {
                await new Promise(r => setTimeout(r, 800));
                const history = await comfyService.getHistory(lastCompletedPromptId);
                const results = history[lastCompletedPromptId];
                if (results?.outputs) {
                    const images: string[] = [];
                    Object.values(results.outputs).forEach((nodeOutputAny: any) => {
                        if (nodeOutputAny.images) {
                            nodeOutputAny.images.forEach((img: any) => {
                                const url = comfyService.getImageUrl(img.filename, img.subfolder, img.type);
                                images.push(`${url}&t=${Date.now()}`);
                            });
                        }
                    });
                    if (images.length > 0) {
                        setGeneratedImages(prev => [...images, ...prev]);
                    }
                }
            } catch (err) {
                console.error("Results fetch error:", err);
            } finally {
                setIsGenerating(false);
            }
        };
        fetchResults();
    }, [lastCompletedPromptId]);

    const handleDeleteImage = async (imageUrl: string, index: number) => {
        try {
            const urlParams = new URLSearchParams(imageUrl.split('?')[1]);
            const filename = urlParams.get('filename');
            const subfolder = urlParams.get('subfolder') || '';
            if (!filename) return;

            const { BACKEND_API } = await import('../../config/api');
            const response = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.FILES_DELETE}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, subfolder, type: 'output' })
            });
            if (!response.ok) throw new Error('Failed to delete image from disk');
            setGeneratedImages(prev => prev.filter((_, i) => i !== index));
        } catch (error) {
            console.error('Delete failed:', error);
            toast('Failed to delete image. Is backend server running?', 'error');
        }
    };

    return (
        <>
            <div className="lg:col-span-2 bg-[#121218] border border-white/5 rounded-2xl p-1 flex flex-col items-center justify-center relative overflow-hidden group min-h-[600px] animate-in slide-in-from-right-4 duration-500">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                {isGenerating || execState === 'executing' ? (
                    <div className="z-10 w-full max-w-md p-8 text-center space-y-6">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 border-t-4 border-white rounded-full animate-spin"></div>
                            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-white animate-bounce" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-white font-medium text-lg tracking-tight">{currentNodeName || 'Initializing...'}</p>
                            {execProgress > 0 && <p className="text-white font-bold text-2xl">{execProgress}%</p>}
                        </div>
                        {execProgress > 0 && (
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-white transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.3)]" style={{ width: `${execProgress}%` }}></div>
                            </div>
                        )}
                        <p className="text-slate-500 text-sm animate-pulse">Processing your vision...</p>
                    </div>
                ) : generatedImages.length === 0 ? (
                    <div className="text-center">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                            <Sparkles className="w-10 h-10 text-slate-600" />
                        </div>
                        <p className="text-slate-500 font-medium">Ready for input</p>
                        <p className="text-xs text-slate-600 mt-1">Generate a masterpiece</p>
                    </div>
                ) : (
                    <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {generatedImages.map((img, idx) => (
                                <div key={idx} className="group relative aspect-square bg-black/20 rounded-xl overflow-hidden border border-white/10 hover:border-white/50 transition-all duration-300">
                                    <img src={img} alt={`Generated ${idx}`} className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-110" onClick={() => setSelectedImage(img)} />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedImage(img); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all">
                                            <Maximize2 className="w-5 h-5 text-white" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); localStorage.setItem('active_input_image', img); toast('Image selected for Video generation! Go to Video tab.', 'success'); }} className="p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-full backdrop-blur-sm transition-all" title="Use as input for Video">
                                            <Video className="w-5 h-5 text-blue-400" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this image permanently?')) handleDeleteImage(img, idx); }} className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-full backdrop-blur-sm transition-all">
                                            <Trash2 className="w-5 h-5 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
                    <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <img src={selectedImage} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </>
    );
};
