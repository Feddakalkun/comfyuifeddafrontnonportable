// Sidebar Navigation Component
import {
    Image as ImageIcon,
    Video,
    Music,
    Settings,
    Terminal,
    ChevronRight,
    MessageSquare,
    Images,
    Film,
    Package,
} from 'lucide-react';
import { SystemMonitor } from '../SystemMonitor';
import { StatusIndicator } from '../ui/StatusIndicator';
import { APP_CONFIG, MODELS } from '../../config/api';

interface SidebarProps {
    activeTab: string;
    activeSubTab: string | null;
    onTabChange: (tab: string, subTab?: string) => void;
}

export const Sidebar = ({ activeTab, activeSubTab, onTabChange }: SidebarProps) => {
    const navigation = [
        {
            id: 'chat',
            label: 'Agent Chat',
            icon: MessageSquare,
        },
        {
            id: 'image',
            label: 'Image Generation',
            icon: ImageIcon,
            models: MODELS.IMAGE,
        },
        {
            id: 'video',
            label: 'Video/VFX',
            icon: Video,
            models: MODELS.VIDEO,
        },
        {
            id: 'audio',
            label: 'Audio/SFX',
            icon: Music,
            models: MODELS.AUDIO,
        },
        { id: 'logs', label: 'Console Logs', icon: Terminal },
        { id: 'gallery', label: 'Gallery', icon: Images },
        { id: 'videos', label: 'Videos', icon: Film },
        { id: 'library', label: 'LoRA Library', icon: Package },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <aside className="w-72 bg-[#0a0a0f] border-r border-white/5 flex flex-col shadow-2xl z-10">
            {/* Header / Logo */}
            <div className="p-8 pb-10">
                <h1 className="text-3xl font-bold bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tighter">
                    {APP_CONFIG.NAME}<span className="text-white">.</span>
                </h1>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1 uppercase">
                    {APP_CONFIG.DESCRIPTION}
                </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => (
                    <div key={item.id}>
                        <button
                            onClick={() => {
                                const firstModel = item.models?.[0]?.id;
                                onTabChange(item.id, firstModel);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id
                                ? 'bg-white text-black shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon
                                    className={`w-5 h-5 ${activeTab === item.id
                                        ? 'text-black'
                                        : 'text-slate-500 group-hover:text-slate-300'
                                        } transition-colors`}
                                />
                                <span className="font-medium text-sm tracking-tight">{item.label}</span>
                            </div>
                            {item.models && (
                                <ChevronRight
                                    className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${activeTab === item.id ? 'rotate-90 text-black' : ''
                                        }`}
                                />
                            )}
                        </button>

                        {/* Sub-menu */}
                        {activeTab === item.id && item.models && (
                            <div className="pl-12 pr-2 py-2 space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                {item.models.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTabChange(item.id, model.id);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeSubTab === model.id
                                            ? 'bg-white/10 text-white'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className={`text-[8px] ${activeSubTab === model.id ? 'text-white' : 'text-slate-600'}`}>●</span>
                                        <span className="font-medium">{model.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* Status Footer */}
            <div className="p-4 border-t border-white/5 space-y-4">
                <SystemMonitor />
                <StatusIndicator />
            </div>
        </aside>
    );
};
