import { useState, useEffect } from 'react';
import { comfyService } from '../services/comfyService';
import { Cpu, Trash2, Activity, HardDrive, Zap } from 'lucide-react';

export const SystemMonitor = () => {
    const [stats, setStats] = useState<any>(null);
    const [gpuStats, setGpuStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const updateStats = async () => {
        const [sysData, hwData] = await Promise.all([
            comfyService.getSystemStats(),
            comfyService.getHardwareStats()
        ]);
        if (sysData) setStats(sysData);
        if (hwData) setGpuStats(hwData);
    };

    useEffect(() => {
        updateStats();
        // Poll every 2 seconds
        const interval = setInterval(updateStats, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleFreeMemory = async () => {
        setLoading(true);
        if (confirm('⚠️ Purge VRAM?\nThis will stop current generation and unload all models from GPU.')) {
            await comfyService.freeMemory();
            setTimeout(updateStats, 1000); // Update after a second
        }
        setLoading(false);
    };

    if (!stats || !stats.devices || stats.devices.length === 0) return null;

    const device = stats.devices[0]; // Assume first GPU

    // Calculate VRAM
    const vramTotal = device.vram_total;
    const vramFree = device.vram_free;
    const vramUsed = vramTotal - vramFree;
    const vramPercent = Math.round((vramUsed / vramTotal) * 100);

    // Format Bytes to GB
    const toGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

    // Color logic
    const getColor = (pct: number) => {
        if (pct < 60) return 'bg-emerald-500';
        if (pct < 85) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="bg-[#121218] border border-white/5 rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">GPU Engine</span>
                </div>

                {/* Free VRAM Button */}
                <button
                    onClick={handleFreeMemory}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/10"
                    title="Stop generation and unload models"
                >
                    <Trash2 className={`w-3 h-3 ${loading ? 'animate-bounce' : ''}`} />
                    {loading ? 'Purging...' : 'Purge VRAM'}
                </button>
            </div>

            {/* GPU Info */}
            <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {device.name.replace('NVIDIA GeForce ', '')}
                        {gpuStats?.gpu?.temperature && (
                            <span className="ml-2 text-amber-500 font-bold">{gpuStats.gpu.temperature}°C</span>
                        )}
                    </span>
                    <span className="text-slate-500">{gpuStats?.gpu?.utilization ?? vramPercent}% Load</span>
                </div>

                {/* VRAM Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 uppercase font-mono">
                        <span>VRAM</span>
                        <span>{toGB(vramUsed)} / {toGB(vramTotal)} GB</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ease-out ${getColor(vramPercent)}`}
                            style={{ width: `${vramPercent}%` }}
                        />
                    </div>
                </div>

                {/* RAM Bar (System) - If available */}
                {/* Note: ComfyUI system_stats usually doesn't give RAM usage directly in simple format, 
                     but if 'system' object has it, we could use it. Often it's just OS info. 
                     We stick to VRAM as it's the critical resource for AI. */}
            </div>
        </div>
    );
};
