// LoRA Library Configuration
// Hardcoded catalog for now — Gemini will connect backend download logic later

export interface LoraEntry {
    id: string;
    name: string;
    description: string;
    category: 'character' | 'style' | 'concept' | 'clothing';
    thumbnail?: string;
    fileSize?: string;
    filename: string;
    downloadUrl?: string;
    installed: boolean;
}

export const LORA_CATALOG: LoraEntry[] = [
    // Characters
    {
        id: 'elev',
        name: 'Elev',
        description: 'Petite female subject with light brown hair and black headband. Optimized for Z-Image Turbo at strength 1.15.',
        category: 'character',
        fileSize: '228 MB',
        filename: 'Elev.safetensors',
        installed: true,
    },
    {
        id: 'madison',
        name: 'Madison',
        description: 'Dark-haired woman with striking features. Works well with natural lighting setups.',
        category: 'character',
        fileSize: '195 MB',
        filename: 'Madison.safetensors',
        installed: false,
    },
    {
        id: 'nova',
        name: 'Nova',
        description: 'Blonde subject with blue eyes. Strong identity lock at 0.95-1.1 strength.',
        category: 'character',
        fileSize: '210 MB',
        filename: 'Nova.safetensors',
        installed: false,
    },
    {
        id: 'aria',
        name: 'Aria',
        description: 'Asian female subject with long black hair. Best with studio and urban environments.',
        category: 'character',
        fileSize: '240 MB',
        filename: 'Aria.safetensors',
        installed: false,
    },
    // Styles
    {
        id: 'cinematic-noir',
        name: 'Cinematic Noir',
        description: 'Film noir aesthetic with high contrast, deep shadows, and moody lighting.',
        category: 'style',
        fileSize: '150 MB',
        filename: 'CinematicNoir.safetensors',
        installed: false,
    },
    {
        id: 'neon-glow',
        name: 'Neon Glow',
        description: 'Vibrant neon lighting with cyberpunk-inspired color grading. Pink, blue, purple tones.',
        category: 'style',
        fileSize: '130 MB',
        filename: 'NeonGlow.safetensors',
        installed: true,
    },
    {
        id: 'golden-hour',
        name: 'Golden Hour',
        description: 'Warm sunset lighting with soft lens flare and natural skin tones.',
        category: 'style',
        fileSize: '145 MB',
        filename: 'GoldenHour.safetensors',
        installed: false,
    },
    // Concepts
    {
        id: 'detail-enhancer',
        name: 'Detail Enhancer',
        description: 'Adds fine texture details — skin pores, fabric weave, hair strands. Use at low strength (0.3-0.5).',
        category: 'concept',
        fileSize: '85 MB',
        filename: 'DetailEnhancer.safetensors',
        installed: true,
    },
    {
        id: 'depth-bokeh',
        name: 'Depth & Bokeh',
        description: 'Shallow depth of field with professional bokeh. Great for portrait photography look.',
        category: 'concept',
        fileSize: '92 MB',
        filename: 'DepthBokeh.safetensors',
        installed: false,
    },
];

export const LORA_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'character', label: 'Characters' },
    { id: 'style', label: 'Styles' },
    { id: 'concept', label: 'Concepts' },
    { id: 'clothing', label: 'Clothing' },
] as const;
