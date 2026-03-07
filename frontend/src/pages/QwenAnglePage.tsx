import { useState } from 'react';
import { Camera } from 'lucide-react';
import { ModelDownloader } from '../components/ModelDownloader';
import { ImageGallery } from '../components/image/ImageGallery';
import { ImageUpload } from '../components/image/ImageUpload';
import { AngleCompass } from '../components/image/AngleCompass';
import { comfyService } from '../services/comfyService';
import { useComfyExecution } from '../contexts/ComfyExecutionContext';
import { useToast } from '../components/ui/Toast';

interface AngleConfig {
    horizontal: number;
    vertical: number;
    zoom: number;
    label: string;
}

// Node IDs per pipeline in the workflow
const PIPELINES = [
    { camera: '93', sampler: '197:108' },
    { camera: '218', sampler: '213:108' },
    { camera: '226', sampler: '221:108' },
    { camera: '234', sampler: '229:108' },
    { camera: '242', sampler: '237:108' },
    { camera: '250', sampler: '245:108' },
];

const PRESETS: Record<string, AngleConfig[]> = {
    'Character Sheet': [
        { horizontal: 0, vertical: 0, zoom: 5, label: 'Front' },
        { horizontal: 90, vertical: 0, zoom: 5, label: 'Right' },
        { horizontal: 180, vertical: 0, zoom: 5, label: 'Back' },
        { horizontal: 270, vertical: 0, zoom: 5, label: 'Left' },
        { horizontal: 45, vertical: 0, zoom: 5, label: '¾ Right' },
        { horizontal: 0, vertical: 30, zoom: 1, label: 'Close-up' },
    ],
    'Product Spin': [
        { horizontal: 0, vertical: 15, zoom: 5, label: '0°' },
        { horizontal: 60, vertical: 15, zoom: 5, label: '60°' },
        { horizontal: 120, vertical: 15, zoom: 5, label: '120°' },
        { horizontal: 180, vertical: 15, zoom: 5, label: '180°' },
        { horizontal: 240, vertical: 15, zoom: 5, label: '240°' },
        { horizontal: 300, vertical: 15, zoom: 5, label: '300°' },
    ],
    'Dynamic Angles': [
        { horizontal: 90, vertical: 0, zoom: 5, label: 'Right' },
        { horizontal: 0, vertical: -30, zoom: 5, label: 'Low Front' },
        { horizontal: 0, vertical: 30, zoom: 5, label: 'High Front' },
        { horizontal: 135, vertical: 60, zoom: 5, label: 'Bird\'s Eye' },
        { horizontal: 225, vertical: 0, zoom: 8, label: 'Wide B-L' },
        { horizontal: 0, vertical: 30, zoom: 1, label: 'Close High' },
    ],
};

const QUICK_PICKS = [
    { label: 'Front', h: 0, v: 0 },
    { label: '¾ R', h: 45, v: 0 },
    { label: 'Right', h: 90, v: 0 },
    { label: 'Back', h: 180, v: 0 },
    { label: '¾ L', h: 315, v: 0 },
    { label: 'Left', h: 270, v: 0 },
    { label: 'Top', h: 0, v: 60 },
    { label: 'Low', h: 0, v: -30 },
];

function getAngleLabel(h: number, v: number, z: number): string {
    const dirs = ['Front', '¾ R', 'Right', 'B-R', 'Back', 'B-L', 'Left', '¾ L'];
    const idx = Math.round(((h % 360) / 360) * 8) % 8;
    let label = dirs[idx];
    if (v > 20) label += ' Hi';
    else if (v < -10) label += ' Lo';
    if (z <= 2) label = 'Close ' + label;
    else if (z >= 8) label = 'Wide ' + label;
    return label;
}

interface QwenAnglePageProps {
    modelId: string;
    modelLabel: string;
}

export const QwenAnglePage = ({ modelId }: QwenAnglePageProps) => {
    const { queueWorkflow } = useComfyExecution();
    const { toast } = useToast();

    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedAngle, setSelectedAngle] = useState(0);
    const [inputImage, setInputImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [angles, setAngles] = useState<AngleConfig[]>(PRESETS['Character Sheet']);
    const [generatedImages, setGeneratedImages] = useState<string[]>(() => {
        const saved = localStorage.getItem(`gallery_${modelId}`);
        return saved ? JSON.parse(saved) : [];
    });

    const handleImageSelected = (file: File) => {
        setInputImage(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleClearImage = () => {
        setInputImage(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const updateAngle = (index: number, patch: Partial<AngleConfig>) => {
        setAngles(prev => prev.map((a, i) => i === index ? { ...a, ...patch, label: getAngleLabel(patch.horizontal ?? a.horizontal, patch.vertical ?? a.vertical, patch.zoom ?? a.zoom) } : a));
    };

    const applyPreset = (name: string) => {
        setAngles(PRESETS[name]);
        setSelectedAngle(0);
    };

    const handleGenerate = async () => {
        if (!inputImage) {
            toast('Upload a reference image first', 'error');
            return;
        }
        setIsGenerating(true);
        try {
            const uploaded = await comfyService.uploadImage(inputImage);
            const resp = await fetch('/workflows/qwen-multiangle.json');
            if (!resp.ok) throw new Error('Failed to load workflow');
            const workflow = await resp.json();

            // Set input image
            workflow['41'].inputs.image = uploaded.name;

            // Set each pipeline's camera angles + random seed
            PIPELINES.forEach((pipe, i) => {
                const angle = angles[i];
                workflow[pipe.camera].inputs.horizontal_angle = angle.horizontal;
                workflow[pipe.camera].inputs.vertical_angle = angle.vertical;
                workflow[pipe.camera].inputs.zoom = angle.zoom;
                workflow[pipe.sampler].inputs.seed = Math.floor(Math.random() * 1000000000000000);
            });

            await queueWorkflow(workflow);
            toast('Generating 6 camera angles!', 'success');
        } catch (err: any) {
            console.error('Generation failed:', err);
            toast(err.message || 'Generation failed', 'error');
            setIsGenerating(false);
        }
    };

    const sel = angles[selectedAngle];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <ModelDownloader modelGroup="qwen-angle" />

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 h-full overflow-y-auto custom-scrollbar">
                {/* Left: Controls */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Image Upload */}
                    <div className="bg-[#121218] border border-white/5 rounded-2xl p-6 shadow-xl">
                        <ImageUpload
                            onImageSelected={handleImageSelected}
                            previewUrl={previewUrl}
                            onClear={handleClearImage}
                            label="Reference Image"
                        />
                    </div>

                    {/* Presets */}
                    <div className="flex gap-2">
                        {Object.keys(PRESETS).map(name => (
                            <button
                                key={name}
                                onClick={() => applyPreset(name)}
                                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                {name}
                            </button>
                        ))}
                    </div>

                    {/* 6 Angle Cards Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {angles.map((angle, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedAngle(i)}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                                    selectedAngle === i
                                        ? 'bg-white/10 border-white/30'
                                        : 'bg-[#121218] border-white/5 hover:border-white/15'
                                }`}
                            >
                                <AngleCompass
                                    horizontal={angle.horizontal}
                                    vertical={angle.vertical}
                                    zoom={angle.zoom}
                                    size={40}
                                />
                                <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center">{angle.label}</span>
                                <span className="text-[8px] text-slate-600">{angle.horizontal}°</span>
                            </button>
                        ))}
                    </div>

                    {/* Expanded Editor for Selected Angle */}
                    <div className="bg-[#121218] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                                Angle {selectedAngle + 1}: {sel.label}
                            </h3>
                            <Camera className="w-3.5 h-3.5 text-slate-500" />
                        </div>

                        {/* Large Compass */}
                        <div className="flex justify-center">
                            <AngleCompass
                                horizontal={sel.horizontal}
                                vertical={sel.vertical}
                                zoom={sel.zoom}
                                size={120}
                                onClick={(h) => updateAngle(selectedAngle, { horizontal: h })}
                            />
                        </div>

                        {/* Quick Picks */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {QUICK_PICKS.map(qp => (
                                <button
                                    key={qp.label}
                                    onClick={() => updateAngle(selectedAngle, { horizontal: qp.h, vertical: qp.v })}
                                    className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                                        sel.horizontal === qp.h && sel.vertical === qp.v
                                            ? 'bg-white text-black'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                                    }`}
                                >
                                    {qp.label}
                                </button>
                            ))}
                        </div>

                        {/* Sliders */}
                        <div className="space-y-3">
                            <div>
                                <label className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                    <span>Horizontal</span><span>{sel.horizontal}°</span>
                                </label>
                                <input type="range" min="0" max="359" value={sel.horizontal}
                                    onChange={e => updateAngle(selectedAngle, { horizontal: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                            </div>
                            <div>
                                <label className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                    <span>Vertical</span><span>{sel.vertical}°</span>
                                </label>
                                <input type="range" min="-30" max="60" value={sel.vertical}
                                    onChange={e => updateAngle(selectedAngle, { vertical: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400" />
                            </div>
                            <div>
                                <label className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                    <span>Zoom</span><span>{sel.zoom}</span>
                                </label>
                                <input type="range" min="0" max="10" value={sel.zoom}
                                    onChange={e => updateAngle(selectedAngle, { zoom: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400" />
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !inputImage}
                        className="w-full py-3.5 bg-white text-black font-bold text-sm rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        <Camera className="w-4 h-4" />
                        {isGenerating ? 'Generating 6 Angles...' : 'Generate All 6 Angles'}
                    </button>
                </div>

                {/* Right: Gallery */}
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
