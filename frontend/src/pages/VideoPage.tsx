// Ultimate LTX-2 Interface: Director's Dashboard
import { useState, useEffect } from 'react';
import { ChevronRight, Film, X, Layers, Settings, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { comfyService } from '../services/comfyService';
import { ollamaService } from '../services/ollamaService';
import { assistantService } from '../services/assistantService';
import { CinematicHelpers } from '../components/video/CinematicHelpers';
import { GalleryModal } from '../components/GalleryModal';

interface VideoPageProps {
    modelId: string;
    modelLabel: string;
}

// LTX-2 Presets
const RESOLUTION_PRESETS = [
    { label: 'Mobile (Draft)', width: 480, height: 864, note: 'Fastest' },
    { label: 'HD Portrait', width: 704, height: 1280, note: 'Social Media' },
    { label: 'Cinematic Landscape', width: 1280, height: 704, note: 'Pro Standard' },
    { label: 'Square (Safe)', width: 768, height: 768, note: 'Balanced' },
];

const FRAMERATE_OPTIONS = [24, 25, 30];

export const VideoPage = ({ }: VideoPageProps) => {
    // Mode Logic
    const [activeTab, setActiveTab] = useState<'cinematic' | 'lipsync'>('cinematic'); // 'cinematic' = LTX-2, 'lipsync' = Legacy/Wan

    // Core Engine State (LTX-2)
    const [promptSubject, setPromptSubject] = useState('');
    const [promptAction, setPromptAction] = useState('');
    const [promptCamera, setPromptCamera] = useState('');
    const [promptAtmosphere, setPromptAtmosphere] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, bad anatomy, shaky camera, watermark, text, error, jpeg artifacts');

    // Inputs (I2V / Audio)
    const [activeInputImage, setActiveInputImage] = useState<string | null>(null);
    const [activeInputImageName, setActiveInputImageName] = useState<string | null>(null);

    // Config State
    const [resolution, setResolution] = useState(RESOLUTION_PRESETS[1]); // Default to HD Portrait
    const [fps, setFps] = useState(24);
    const [durationSec, setDurationSec] = useState(4); // Default 4s
    const [steps, setSteps] = useState(20); // LTX-2 "Fast" default
    const [cfg, setCfg] = useState(3.5); // Sweet spot for LTX-2
    const [seed, setSeed] = useState(-1);

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [executionStatus, setExecutionStatus] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [useAI, setUseAI] = useState(false);
    const [showGalleryModal, setShowGalleryModal] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [ollamaModels, setOllamaModels] = useState<any[]>([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState('');

    useEffect(() => {
        const loadModels = async () => {
            try {
                const models = await ollamaService.getModels();
                setOllamaModels(models);
                if (models.length > 0) {
                    // Prefer an unfiltered model if available, otherwise just use the first one
                    const preferred = models.find(m => m.name.toLowerCase().includes('nsfw') || m.name.toLowerCase().includes('unfiltered'));
                    setSelectedOllamaModel(preferred ? preferred.name : models[0].name);
                }
            } catch (err) {
                console.error("Failed to load Ollama models", err);
            }
        };
        loadModels();
    }, []);

    const handleAIOptimize = async () => {
        if (!selectedOllamaModel) {
            alert("No Ollama model selected or available.");
            return;
        }

        const inputIdea = [promptSubject, promptAction, promptCamera, promptAtmosphere].filter(Boolean).join('. ');
        if (!inputIdea.trim()) {
            alert("Please enter a basic idea first!");
            return;
        }

        setIsOptimizing(true);

        // 🧹 Ensure VRAM is clear before letting Ollama work
        try {
            await comfyService.freeMemory(false, true); // Just free cache, keep models if they match
        } catch (e) { }

        try {
            const spec = await assistantService.generateWan2Spec(selectedOllamaModel, inputIdea);

            console.log("🎬 AI DIRECTOR SPEC:", spec);

            // Apply to state
            setPromptSubject(spec.prompt);
            setPromptAction(''); // AI output is already cohesive
            setPromptCamera('');
            setPromptAtmosphere('');
            setNegativePrompt(spec.negative_prompt);

            // Apply technicals
            if (spec.resolution) {
                // Find closest preset or set custom (for now just matching width/height if possible)
                const closest = RESOLUTION_PRESETS.find(h => h.width === spec.resolution.width && h.height === spec.resolution.height);
                if (closest) setResolution(closest);
            }

            setFps(spec.fps);
            // Calculate duration in seconds from frames count
            setDurationSec(Math.round(spec.num_frames / spec.fps));
            setSteps(spec.steps);
            setCfg(spec.cfg_scale);

            // Notify user
            setExecutionStatus(`✨ Directed by ${selectedOllamaModel}: "${spec.description_summary}"`);
            setTimeout(() => setExecutionStatus(''), 5000);

        } catch (err) {
            console.error("AI Optimization failed", err);
            alert("AI Director failed to respond. Is Ollama running?");
        } finally {
            setIsOptimizing(false);
        }
    };

    // Handover Protocol: Check for active input image from ImagePage
    useEffect(() => {
        const handoverImage = localStorage.getItem('active_input_image');
        if (handoverImage) {
            console.log("🎨 Handover Image Found:", handoverImage);
            setActiveInputImage(handoverImage);
            setActiveInputImageName("Handover Image");
            // Optional: clear it to avoid re-loading on refresh? 
            // localStorage.removeItem('active_input_image'); 
            // Better to keep it until user clears it or generates something new?
        }
    }, []);

    // Websocket Connection
    useEffect(() => {
        const disconnect = comfyService.connectWebSocket({
            onExecuting: (nodeId) => {
                if (nodeId === '9999') {
                    setExecutionStatus('⚠️ DOWNLOADING LTX MODEL (~40GB)... THIS WILL TAKE A WHILE');
                    return;
                }
                if (nodeId) setExecutionStatus(`Processing Node: ${nodeId}`);
            },
            onProgress: (node, value, max) => {
                const percent = Math.round((value / max) * 100);
                setProgress(percent);
                // Keep download warning persistent if 9999 was last or check node
                if (node === '9999') {
                    setExecutionStatus(`Downloading LTX Model... ${percent}%`);
                } else {
                    setExecutionStatus(`Rendering... ${percent}%`);
                }
            },
            onCompleted: (promptId) => {
                console.log('✅ Generation Completed:', promptId);
                fetchResults(promptId);
                setIsGenerating(false);
                setExecutionStatus('Finalizing Video...');
                setProgress(100);
            }
        });

        const fetchResults = async (promptId: string) => {
            try {
                const history = await comfyService.getHistory(promptId);
                const results = history[promptId];
                if (results?.outputs) {
                    const videos: string[] = [];
                    Object.values(results.outputs).forEach((nodeOutputAny: any) => {
                        if (nodeOutputAny.gifs) {
                            nodeOutputAny.gifs.forEach((v: any) => videos.push(comfyService.getImageUrl(v.filename, v.subfolder, v.type)));
                        }
                        if (nodeOutputAny.videos) {
                            nodeOutputAny.videos.forEach((v: any) => videos.push(comfyService.getImageUrl(v.filename, v.subfolder, v.type)));
                        }
                    });
                    if (videos.length > 0) setGeneratedVideos(videos);
                }
            } catch (err) {
                console.error("Failed to fetch results:", err);
            } finally {
                setTimeout(() => {
                    setExecutionStatus('');
                    setProgress(0);
                }, 2000);
            }
        };
        return () => disconnect();
    }, []);

    const generateSeed = () => Math.floor(Math.random() * 1000000000000000);

    const constructFinalPrompt = () => {
        const parts = [
            promptAtmosphere && `Style: ${promptAtmosphere}`,
            promptSubject,
            promptAction,
            promptCamera
        ].filter(Boolean);
        return parts.join('. ');
    };

    const handleGenerateLTX = async () => {
        const fullPrompt = constructFinalPrompt();
        if (!fullPrompt.trim()) {
            alert("Please provide at least a subject for the prompt!");
            return;
        }

        setIsGenerating(true);
        setGeneratedVideos([]);

        // 🧹 Proactively clear ComfyUI cache to make room for the new video model
        try {
            console.log("🧹 Sweeping VRAM...");
            await comfyService.freeMemory(true, true);
        } catch (e) {
            console.warn("VRAM sweep failed (non-critical)", e);
        }

        setExecutionStatus('Initializing LTX-2 Engine...');
        setProgress(0);

        try {
            // 1. Load Unified Workflow with Cache Busting
            const response = await fetch(`/workflows/ltx-universal-api.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load LTX Workflow');
            const workflow = await response.json();

            const activeSeed = seed === -1 ? generateSeed() : seed;
            const validFrameCount = comfyService.getLTXFrameCount(durationSec, fps);

            console.log('🎬 Starting LTX Render:', {
                prompt: fullPrompt,
                resolution,
                frames: validFrameCount,
                fps,
                activeInputImage
            });

            // --- Node Injection Logic ---

            // 1. Prompt (Node 5175)
            if (workflow["5175"]) workflow["5175"].inputs.value = fullPrompt;

            // AI Enhancer Logic
            if (workflow["5192"]) {
                if (!useAI) {
                    delete workflow["5192"];
                    if (workflow["5174"]) workflow["5174"].inputs.text = ["5175", 0];
                } else {
                    workflow["5192"].inputs.bypass_i2v = false;
                }
            }

            // 2. Negative Prompt (Node 5173 receives inputs positive/negative)
            // But usually Neg Prompt text is in a separate node if it's "LTXVConditioning"
            // In LTX-2_I2V...: Node 5174 is Positive Encode. Node 5173 takes both?
            // Wait, looking at JSON: 5173 inputs: positive: [5174,0], negative: [5174,0]?
            // Ah, both point to 5174? That seems like a mistake in the exported workflow or it reuses the same encoder but with different text??
            // Actually, usually one node is Pos and another is Neg.
            // Let's assume for now 5174 is the main text encoder. 
            // If the workflow is complex, we might need to rely on defaults or find the Neg text node.
            // For LTX-2 Distilled, often negative is empty or minimal.

            // 3. Frame Rate (Node 5184)
            if (workflow["5184"]) workflow["5184"].inputs.value = fps;

            // 4. Frame Count / Length (Node 5186)
            if (workflow["5186"]) workflow["5186"].inputs.value = validFrameCount;

            // 5. Seed (Node 5189:5097 - RandomNoise)
            if (workflow["5189:5097"]) workflow["5189:5097"].inputs.noise_seed = activeSeed;

            // 6. Resolution (Node 5185 - EmptyImage, used for I2V resize target)
            // AND/OR (Node 5138 - EmptyLTXVLatentVideo for T2V)
            if (workflow["5185"]) {
                workflow["5185"].inputs.width = resolution.width;
                workflow["5185"].inputs.height = resolution.height;
            }
            if (workflow["5189:5138"]) {
                // Often linked to GetImageSize if I2V, but if T2V we set it manually.
                // In I2V mode, resolution follows input image or target.
            }

            // 7. Input Image Logic
            if (activeInputImage) {
                // I2V Mode: Inject Image
                // We need to ensure the image is uploaded to 'input' folder if it's from gallery (output)
                // ComfyUI LoadImage usually looks in Input. 
                // Workflow Node: 5180 (Load Image) input: "image" (filename)

                let filenameToUse = activeInputImageName || "image.png";

                // If it's a URL (from Gallery) or a local Blob (Drag & Drop), we need to upload it
                if (activeInputImage.startsWith('http') || activeInputImage.startsWith('blob:')) {
                    setExecutionStatus('Uploading Source Image...');
                    try {
                        const imgRes = await fetch(activeInputImage);
                        const blob = await imgRes.blob();
                        const file = new File([blob], filenameToUse, { type: blob.type });
                        const uploadRes = await comfyService.uploadImage(file);
                        filenameToUse = uploadRes.name;
                    } catch (e) {
                        console.error("Failed to upload active image", e);
                        setExecutionStatus('Error uploading image: ' + e);
                        setIsGenerating(false);
                        return;
                    }
                }

                if (workflow["5180"]) workflow["5180"].inputs.image = filenameToUse;

            } else {
                // T2V Mode: Bypass Image Nodes
                // This workflow (I2V_Distilled) might FAIL if no image is provided.
                // We might need to switch to T2V workflow if activeInputImage is null.
                if (!activeInputImage) {
                    console.log("⚠️ No Input Image - Switching to T2V Workflow logic");
                    const responseT2V = await fetch(`/workflows/ltx-2.json?v=${Date.now()}`);
                    const workflowT2V = await responseT2V.json();
                    // Use T2V workflow instead
                    // Inject params into T2V ids (10, 30, etc - from step 20)
                    if (workflowT2V["2"]) workflowT2V["2"].inputs.string = fullPrompt;
                    if (workflowT2V["30"]) {
                        workflowT2V["30"].inputs.width = resolution.width;
                        workflowT2V["30"].inputs.height = resolution.height;
                        workflowT2V["30"].inputs.length = validFrameCount;
                    }
                    if (workflowT2V["10"]) {
                        workflowT2V["10"].inputs.seed = activeSeed;
                        workflowT2V["10"].inputs.steps = steps;
                        workflowT2V["10"].inputs.cfg = cfg;
                    }
                    // Queue T2V
                    await comfyService.queuePrompt(workflowT2V);
                    return;
                }
            }

            // Queue Workflow (I2V)
            setExecutionStatus('Queuing in ComfyUI...');
            await comfyService.queuePrompt(workflow);

        } catch (error) {
            console.error('Generation Error:', error);
            setIsGenerating(false);
            setExecutionStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    // Handler for Gallery Selection
    const handleGallerySelect = (url: string, filename: string) => {
        setActiveInputImage(url);
        setActiveInputImageName(filename);
        // Auto-switch to I2V feel?
    };

    // Handler for Cinematic Helpers
    const handleAddCinematic = (term: string) => {
        // Appending to Camera or Atmosphere mainly
        if (term.includes('Pan') || term.includes('Zoom') || term.includes('Angle')) {
            setPromptCamera(prev => prev ? `${prev}, ${term}` : term);
        } else if (term.includes('Light') || term.includes('Fog') || term.includes('Dark')) {
            setPromptAtmosphere(prev => prev ? `${prev}, ${term}` : term);
        } else {
            setPromptAction(prev => prev ? `${prev}, ${term}` : term);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#09090b] text-slate-200">
            <GalleryModal
                isOpen={showGalleryModal}
                onClose={() => setShowGalleryModal(false)}
                onSelect={handleGallerySelect}
            />

            {/* LEFT COLUMN: DIRECTOR'S DECK */}
            <div className="w-[450px] flex flex-col border-r border-white/5 bg-[#121218] overflow-y-auto custom-scrollbar">

                <div className="p-6 space-y-8">
                    {/* Header Dial */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Film className="w-5 h-5 text-white" />
                                Director's Deck
                            </h1>
                            <p className="text-xs text-slate-500 font-mono mt-1">LTX-2 ENGINE: READY</p>
                        </div>
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                            <button
                                onClick={() => setActiveTab('cinematic')}
                                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${activeTab === 'cinematic' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
                            >
                                CINEMATIC
                            </button>
                            <button
                                onClick={() => setActiveTab('lipsync')}
                                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${activeTab === 'lipsync' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
                            >
                                LIPSYNC
                            </button>
                        </div>
                    </div>

                    {/* ACTIVE INPUT IMAGE SLOT */}
                    {activeTab === 'cinematic' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400 font-medium">
                                <span>Input Signal <span className="text-white/30 text-[10px] ml-1">(Optional for I2V)</span></span>
                                {activeInputImage && (
                                    <button onClick={() => { setActiveInputImage(null); setActiveInputImageName(null); localStorage.removeItem('active_input_image'); }} className="text-red-400 hover:text-red-300 flex items-center gap-1">
                                        <X className="w-3 h-3" /> Clear
                                    </button>
                                )}
                            </div>

                            <div className={`relative group border-2 border-dashed rounded-xl h-64 transition-all overflow-hidden ${activeInputImage ? 'border-white/20 bg-black' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                                {activeInputImage ? (
                                    <>
                                        <img src={activeInputImage} alt="Input" className="w-full h-full object-contain opacity-80 group-hover:opacity-60 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" onClick={() => setShowGalleryModal(true)} className="bg-black/60 backdrop-blur-md border border-white/10 text-white">Replace Input</Button>
                                        </div>
                                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white border border-white/20 shadow-xl backdrop-blur-md">
                                            ACTIVE SIGNAL
                                        </div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                                        <div className="p-3 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-500">
                                            <ImageIcon className="w-6 h-6 text-white/50" />
                                        </div>
                                        <div className="text-center">
                                            <h2 className="text-2xl font-light tracking-[0.2em] text-white uppercase">LTX-2 Engine</h2>
                                            <p className="text-[10px] font-mono text-slate-500 mt-2 uppercase tracking-widest">Digital Director Awaiting Command...</p>
                                            <Button size="sm" variant="ghost" onClick={() => setShowGalleryModal(true)} className="text-white/70 hover:text-white hover:bg-white/10">
                                                Browse Gallery
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const url = URL.createObjectURL(file);
                                            setActiveInputImage(url);
                                            setActiveInputImageName(file.name);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* PROMPT ENGINE */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <Layers className="w-3 h-3" /> Prompt Engine
                            </div>

                            {ollamaModels.length > 0 && (
                                <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                                    <select
                                        value={selectedOllamaModel}
                                        onChange={(e) => setSelectedOllamaModel(e.target.value)}
                                        className="bg-transparent text-[10px] text-slate-300 focus:outline-none border-none cursor-pointer"
                                    >
                                        {ollamaModels.map(m => (
                                            <option key={m.name} value={m.name} className="bg-[#121218]">{m.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAIOptimize}
                                        disabled={isOptimizing}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all ${isOptimizing ? 'bg-blue-500/20 text-blue-300 animate-pulse' : 'bg-white text-black hover:bg-blue-500 hover:text-white'}`}
                                        title="AI Director: Optimize with Ollama"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">{isOptimizing ? 'DIRECTING...' : 'AI DIRECTOR'}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-[10px] text-slate-500 font-bold uppercase">Subject</span>
                                <textarea
                                    value={promptSubject}
                                    onChange={(e) => setPromptSubject(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg pt-8 pb-3 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 min-h-[80px]"
                                    placeholder="A cyberpunk detective in a raincoat..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-[10px] text-slate-500 font-bold uppercase">Action</span>
                                    <input
                                        value={promptAction}
                                        onChange={(e) => setPromptAction(e.target.value)}
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg pt-6 pb-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                                        placeholder="walking slowly, holding a cigarette..."
                                    />
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-[10px] text-slate-500 font-bold uppercase">Camera</span>
                                    <input
                                        value={promptCamera}
                                        onChange={(e) => setPromptCamera(e.target.value)}
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg pt-6 pb-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                                        placeholder="low angle, dolly zoom..."
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-2 text-[10px] text-slate-500 font-bold uppercase">Atmosphere / Style</span>
                                <input
                                    value={promptAtmosphere}
                                    onChange={(e) => setPromptAtmosphere(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg pt-6 pb-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                                    placeholder="volumetric fog, neon noir, film grain..."
                                />
                            </div>
                        </div>

                        {/* Cinematic Helpers */}
                        <div className="pt-2 border-t border-white/5">
                            <CinematicHelpers onAddTerm={handleAddCinematic} />
                        </div>
                    </div>


                    {/* CONFIG DECK */}
                    <div className="space-y-6">
                        {/* Quality Presets */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Quality & Format</label>
                            <div className="grid grid-cols-2 gap-2">
                                {RESOLUTION_PRESETS.map(preset => (
                                    <button
                                        key={preset.label}
                                        onClick={() => setResolution(preset)}
                                        className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${resolution.label === preset.label
                                            ? 'bg-white text-black border-white'
                                            : 'bg-[#0a0a0f] border-white/10 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-xs font-bold">{preset.label}</span>
                                        <span className={`text-[10px] ${resolution.label === preset.label ? 'text-black/60' : 'text-slate-500'}`}>{preset.width}x{preset.height} • {preset.note}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Timing */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Timing</label>
                            <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Duration</span>
                                        <span className="text-white font-mono">{durationSec}s ({comfyService.getLTXFrameCount(durationSec, fps)} frames)</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="8" step="0.5"
                                        value={durationSec}
                                        onChange={(e) => setDurationSec(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-600 px-1">
                                        <span>1s</span>
                                        <span>4s</span>
                                        <span>8s</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Framerate</span>
                                    <div className="flex bg-black/40 rounded p-1 gap-1 border border-white/5">
                                        {FRAMERATE_OPTIONS.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setFps(opt)}
                                                className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${fps === opt ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Accordion */}
                        <div className="border border-white/5 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between p-3 bg-black/20 hover:bg-black/40 transition-colors text-xs font-medium text-slate-400 hover:text-white"
                            >
                                <span className="flex items-center gap-2"><Settings className="w-3 h-3" /> Advanced Parameters</span>
                                <ChevronRight className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                            </button>

                            {showAdvanced && (
                                <div className="p-4 bg-[#0a0a0f] space-y-4 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Prompt Enhancer</span>
                                            <span className="text-[9px] text-slate-500">Expands prompt for cinematic results</span>
                                        </div>
                                        <button
                                            onClick={() => setUseAI(!useAI)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${useAI ? 'bg-blue-600' : 'bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useAI ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>Guidance Scale (CFG)</span>
                                            <span className="text-white font-mono">{cfg}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="8" step="0.1"
                                            value={cfg}
                                            onChange={(e) => setCfg(parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>Steps</span>
                                            <span className="text-white font-mono">{steps}</span>
                                        </div>
                                        <input
                                            type="range" min="10" max="50" step="1"
                                            value={steps}
                                            onChange={(e) => setSteps(parseInt(e.target.value))}
                                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-bold">Negative Prompt</label>
                                        <textarea
                                            value={negativePrompt}
                                            onChange={(e) => setNegativePrompt(e.target.value)}
                                            className="w-full h-16 bg-black border border-white/5 rounded p-2 text-[10px] text-slate-400 focus:outline-none focus:border-white/20 mt-1"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold">Seed</label>
                                        <input
                                            type="number"
                                            value={seed}
                                            onChange={(e) => setSeed(parseInt(e.target.value))}
                                            className="w-24 bg-black border border-white/5 rounded p-1 text-xs text-right font-mono text-slate-400"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* GENERATE BUTTON */}
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full h-14 text-lg font-bold shadow-2xl bg-white hover:bg-slate-200 text-black border-none rounded-xl"
                            onClick={handleGenerateLTX}
                            isLoading={isGenerating}
                            disabled={isGenerating}
                        >
                            {isGenerating ? 'RENDER IN PROGRESS...' : 'START ACTION'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* CENTER: THE THEATER (PREVIEW) */}
            <div className="flex-1 flex flex-col relative bg-[#000] border-r border-white/5">
                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

                <div className="flex-1 flex items-center justify-center p-8 relative">
                    {generatedVideos.length > 0 ? (
                        <div className="relative group max-w-full max-h-full aspect-video shadow-2xl">
                            <video
                                src={generatedVideos[0]}
                                className="w-full h-full object-contain rounded-sm shadow-[0_0_100px_rgba(255,255,255,0.1)]"
                                controls
                                loop
                                autoPlay
                            />
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative w-24 h-24">
                                        <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                                        <div className="absolute inset-0 border-t-4 border-white rounded-full animate-spin"></div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-lg font-medium text-white tracking-widest uppercase animate-pulse">{executionStatus || "INITIALIZING..."}</p>
                                        <p className="text-xs text-slate-400 font-mono">Unified LTX-2 Pipeline</p>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-4">
                                        <div
                                            className="h-full bg-white transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="opacity-30 flex flex-col items-center gap-4">
                                    <Film className="w-16 h-16" />
                                    <p className="tracking-[0.2em] font-light">CINEMATIC PREVIEW OFF</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Status Bar */}
                <div className="h-8 border-t border-white/10 bg-[#0a0a0f] flex items-center justify-between px-4 text-[10px] text-slate-500 font-mono">
                    <div className="flex gap-4">
                        <span>RES: {resolution.width}x{resolution.height}</span>
                        <span>FPS: {fps}</span>
                        <span>FRAMES: {comfyService.getLTXFrameCount(durationSec, fps)}</span>
                    </div>
                    <div>
                        <span>VRAM: OPTIMIZED</span>
                    </div>
                </div>
            </div>

            {/* RIGHT (Optional History or just keep it minimal) */}
            {/* For now, just keeping it 2-column + GalleryModal to maximize screen real estate for the "Theater" */}
        </div>
    );
};
