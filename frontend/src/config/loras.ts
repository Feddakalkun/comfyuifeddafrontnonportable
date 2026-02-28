// LoRA Library Configuration
// Premium LoRAs hosted on Google Drive, downloaded via backend

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
    isPremium?: boolean;
}

// Google Drive folder containing all premium LoRAs
export const PREMIUM_DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1jdliAnhXJG2TdqU6tNi5tbpoAOPuJalv';

export const LORA_CATALOG: LoraEntry[] = [
    // Premium Characters
    {
        id: 'elev',
        name: 'Elev',
        description: 'Petite female subject with light brown hair and black headband. The Classic. Optimized for Z-Image Turbo at 4:5 portrait.',
        category: 'character',
        fileSize: '228 MB',
        filename: 'elev-zimage.safetensors',
        isPremium: true,
        installed: false,
    },
    {
        id: 'froy',
        name: 'Froy',
        description: 'Athletic build with sharp, angular features. Clean lines and defined musculature. Best with dramatic lighting.',
        category: 'character',
        fileSize: '195 MB',
        filename: 'Froy_zimage.safetensors',
        isPremium: true,
        installed: false,
    },
    {
        id: 'sara',
        name: 'Sara',
        description: 'Curvy figure with soft features. Excels in warm, soft lighting conditions. Natural skin textures.',
        category: 'character',
        fileSize: '210 MB',
        filename: 'Sara_zimage.safetensors',
        isPremium: true,
        installed: false,
    },
    {
        id: 'lila',
        name: 'Lila',
        description: 'The Secret Account. Versatile identity with strong likeness lock. Works across many styles.',
        category: 'character',
        fileSize: '240 MB',
        filename: 'Lila-zimage.safetensors',
        isPremium: true,
        installed: false,
    },
    {
        id: 'iris',
        name: 'Iris',
        description: 'Massive detail capture. Ultra-high fidelity facial features. Best for close-up portrait work.',
        category: 'character',
        fileSize: '250 MB',
        filename: 'Iris.safetensors',
        isPremium: true,
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
        installed: false,
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
        installed: false,
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
