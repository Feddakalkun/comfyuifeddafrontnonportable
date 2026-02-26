// ComfyUI API Service
import { COMFY_API } from '../config/api';
import type { ComfyPrompt, ComfyQueueItem, ComfyHistoryItem } from '../types/comfy';

class ComfyUIService {
    private clientId: string;
    private ws: WebSocket | null = null;

    constructor() {
        this.clientId = this.generateClientId();
    }

    private generateClientId(): string {
        return `comfyfront_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if ComfyUI is running
     */
    async isAlive(): Promise<boolean> {
        try {
            const response = await fetch(`${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.SYSTEM_STATS}`, {
                method: 'GET',
            });
            return response.ok;
        } catch (error) {
            console.error('ComfyUI connection failed:', error);
            return false;
        }
    }

    /**
     * Get system statistics (CPU, RAM, VRAM)
     */
    async getSystemStats(): Promise<any> {
        const response = await fetch(`${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.SYSTEM_STATS}`);
        if (!response.ok) {
            throw new Error('Failed to fetch system stats');
        }
        return await response.json();
    }

    /**
     * Queue a prompt for generation
     */
    async queuePrompt(workflow: any): Promise<{ prompt_id: string }> {
        const payload: ComfyPrompt = {
            prompt: workflow,
            client_id: this.clientId,
        };

        const response = await fetch(`${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.PROMPT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to queue prompt: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Get current queue status
     */
    async getQueue(): Promise<{ queue_running: ComfyQueueItem[]; queue_pending: ComfyQueueItem[] }> {
        const response = await fetch(`${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.QUEUE}`);

        if (!response.ok) {
            throw new Error('Failed to fetch queue');
        }

        return await response.json();
    }

    /**
     * Get history of generated images
     */
    async getHistory(promptId?: string): Promise<Record<string, ComfyHistoryItem>> {
        const url = promptId
            ? `${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.HISTORY}/${promptId}`
            : `${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.HISTORY}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch history');
        }

        return await response.json();
    }

    /**
     * Get URL for viewing an image
     */
    getImageUrl(filename: string, subfolder: string = '', type: string = 'output'): string {
        const params = new URLSearchParams({
            filename,
            subfolder,
            type,
        });

        return `${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.VIEW}?${params}`;
    }

    /**
     * Upload an image to ComfyUI
     */
    async uploadImage(file: File): Promise<{ name: string; subfolder: string }> {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.UPLOAD_IMAGE}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload image');
        }

        return await response.json();
    }

    /**
     * Get available LoRAs from ComfyUI
     * Checks multiple common node types to ensure we find the file list
     */
    async getLoras(): Promise<string[]> {
        const nodeTypes = ['LoraLoader', 'LoraLoaderModelOnly', 'Power Lora Loader (rgthree)', 'CR Load LoRA'];

        for (const type of nodeTypes) {
            try {
                const response = await fetch(`${COMFY_API.BASE_URL}/object_info/${type}`);
                if (!response.ok) continue;

                const data = await response.json();
                const nodeData = data[type];

                // Common paths for the lora list in ComfyUI object info
                const loraList =
                    nodeData?.input?.required?.lora_name?.[0] ||
                    nodeData?.input?.required?.lora?.[0] ||
                    [];

                if (loraList.length > 0) {
                    console.log(`✅ Loaded ${loraList.length} LoRAs from ${type}`);
                    return loraList;
                }
            } catch (err) {
                // Silently try next one
            }
        }

        console.warn('⚠️ Could not find LoRA list from common nodes.');
        return [];
    }

    /**
     * Get available styles from 'Load Styles CSV' node
     */
    async getStyles(): Promise<string[]> {
        try {
            const response = await fetch(`${COMFY_API.BASE_URL}/object_info/Load Styles CSV`);
            if (!response.ok) throw new Error('Failed to fetch styles');

            const data = await response.json();
            // Load Styles CSV node structure: input -> required -> styles -> [0]
            const styleList = data['Load Styles CSV']?.input?.required?.styles?.[0] || [];
            return styleList;
        } catch (error) {
            console.error('Failed to load styles:', error);
            // Return defaults if failed
            return ['No Style', 'Photographic', 'Cinematic', 'Anime', 'Digital Art'];
        }
    }
    async getCheckpoints(): Promise<string[]> {
        try {
            const response = await fetch(`${COMFY_API.BASE_URL}/object_info/CheckpointLoaderSimple`);
            if (!response.ok) throw new Error('Failed to fetch checkpoints');

            const data = await response.json();
            return data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
        } catch (error) {
            console.error('Failed to load checkpoints:', error);
            return [];
        }
    }

    /**
     * Connect to WebSocket for real-time updates and return a listener cleanup function
     */
    connectWebSocket(callbacks: {
        onStatus?: (data: any) => void;
        onProgress?: (node: string, value: number, max: number) => void;
        onExecuting?: (nodeId: string | null) => void;
        onCompleted?: (promptId: string) => void;
    }): () => void {
        this.ws = new WebSocket(`${COMFY_API.WS_URL}?clientId=${this.clientId}`);

        this.ws.onopen = () => console.log('✅ WebSocket connected to ComfyUI');

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'status':
                        callbacks.onStatus?.(data.data);
                        break;
                    case 'progress':
                        callbacks.onProgress?.(data.data.node, data.data.value, data.data.max);
                        break;
                    case 'executing':
                        callbacks.onExecuting?.(data.data.node);
                        break;
                    case 'executed':
                        if (data.data.prompt_id) {
                            callbacks.onCompleted?.(data.data.prompt_id);
                        }
                        break;
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => console.error('WebSocket error:', error);

        return () => {
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
        };
    }
    /**
     * Upload an audio file to ComfyUI
     */
    async uploadAudio(file: File): Promise<{ name: string; subfolder: string }> {
        const formData = new FormData();
        formData.append('image', file); // ComfyUI uses 'image' field even for audio in the upload endpoint usually, or check API. 
        // Standard ComfyUI /upload/image endpoint accepts audio files too.

        // Let's verify if we need a specific audio endpoint. 
        // Usually /upload/image with overwrite=true works for all inputs.
        const response = await fetch(`${COMFY_API.BASE_URL}${COMFY_API.ENDPOINTS.UPLOAD_IMAGE}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to upload audio');
        }

        return await response.json();
    }

    // --- LTX-2 Helpers ---

    /**
     * Snap dimensions to multiples of 32 (Requirement for LTX-2)
     */
    getLTXResolution(width: number, height: number): { width: number, height: number } {
        return {
            width: Math.round(width / 32) * 32,
            height: Math.round(height / 32) * 32
        };
    }

    /**
     * Calculate valid frame count for LTX-2 (Must be 8n + 1)
     */
    getLTXFrameCount(seconds: number, fps: number): number {
        const rawFrames = seconds * fps;
        // Find nearest 8n + 1
        const n = Math.round((rawFrames - 1) / 8);
        const validFrames = (n * 8) + 1;
        return Math.max(9, validFrames); // Minimum 9 frames
    }

    async freeMemory(unloadModels: boolean = true, freeCache: boolean = true): Promise<void> {
        try {
            await fetch(`${COMFY_API.BASE_URL}/free`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    unload_models: unloadModels,
                    free_memory: freeCache
                })
            });
            console.log('✅ ComfyUI Memory Freed');
        } catch (error) {
            console.error('Failed to free ComfyUI memory:', error);
        }
    }
}

export const comfyService = new ComfyUIService();
