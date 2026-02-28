// ComfyUI API Configuration

export const COMFY_API = {
    BASE_URL: 'http://127.0.0.1:8188',

    ENDPOINTS: {
        PROMPT: '/prompt',
        QUEUE: '/queue',
        HISTORY: '/history',
        VIEW: '/view',
        UPLOAD_IMAGE: '/upload/image',
        SYSTEM_STATS: '/system_stats',
        OBJECT_INFO: '/object_info',
    },

    WS_URL: 'ws://127.0.0.1:8188/ws',
};

// Backend API Configuration (FastAPI server)
export const BACKEND_API = {
    BASE_URL: 'http://127.0.0.1:8000',

    ENDPOINTS: {
        FILES_LIST: '/api/files/list',
        FILES_DELETE: '/api/files/delete',
        FILES_CLEANUP: '/api/files/cleanup',
        RUNPOD_ANIMATE: '/api/runpod/animate',
        RUNPOD_STATUS: '/api/runpod/status',
        RUNPOD_DOWNLOAD: '/api/runpod/download',
        LORA_DESCRIPTIONS: '/api/lora/descriptions',
        LORA_INSTALL: '/api/lora/install',
        LORA_DOWNLOAD_STATUS: '/api/lora/download-status',
        COMFY_REFRESH_MODELS: '/api/comfy/refresh-models',
        AUDIO_TRANSCRIBE: '/api/audio/transcribe',
        AUDIO_TTS: '/api/audio/tts',
        VIDEO_LIPSYNC: '/api/video/lipsync',
        HARDWARE_STATS: '/api/hardware/stats',
    },
};

export const APP_CONFIG = {
    NAME: 'FEDDA',
    VERSION: '0.1.0',
    DESCRIPTION: 'PREMIUM COMFYUI FRONTEND',
};

export const MODELS = {
    IMAGE: [
        { id: 'z-image', label: 'Z-Image', icon: 'Sparkles' },
        { id: 'flux', label: 'Flux', icon: 'Zap' },
        { id: 'qwen', label: 'Qwen', icon: 'Aperture' },
    ],
    VIDEO: [
        { id: 'wan2.1', label: 'Wan 2.1', icon: 'Video' },
        { id: 'wan2.2', label: 'Wan 2.2', icon: 'Video' },
        { id: 'ltx-2', label: 'LTX-2', icon: 'Video' },
    ],
    AUDIO: [
        { id: 'generic', label: 'Coming Soon', icon: 'Music' },
    ],
};
