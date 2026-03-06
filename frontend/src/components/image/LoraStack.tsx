import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface SelectedLora {
    name: string;
    strength: number;
}

interface LoraStackProps {
    selectedLoras: SelectedLora[];
    setSelectedLoras: React.Dispatch<React.SetStateAction<SelectedLora[]>>;
    availableLoras: string[];
}

export const LoraStack = ({ selectedLoras, setSelectedLoras, availableLoras }: LoraStackProps) => {
    const [currentLora, setCurrentLora] = useState('');
    const [currentLoraStrength, setCurrentLoraStrength] = useState(1.0);
    const [showLoraList, setShowLoraList] = useState(false);

    const filteredLoras = availableLoras.filter(l => l.toLowerCase().includes(currentLora.toLowerCase()));

    const addLora = () => {
        if (!currentLora) return;
        if (selectedLoras.some(l => l.name === currentLora)) return;
        setSelectedLoras([...selectedLoras, { name: currentLora, strength: currentLoraStrength }]);
        setCurrentLora('');
        setCurrentLoraStrength(1.0);
        setShowLoraList(false);
    };

    const removeLora = (index: number) => {
        setSelectedLoras(selectedLoras.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4 border-b border-white/5 pb-4">
            <label className="block text-xs text-slate-400 uppercase tracking-wider">LoRA Stack</label>
            <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="relative">
                    <input
                        type="text"
                        value={currentLora}
                        onChange={(e) => { setCurrentLora(e.target.value); setShowLoraList(true); }}
                        onFocus={() => setShowLoraList(true)}
                        onBlur={() => setTimeout(() => setShowLoraList(false), 200)}
                        placeholder="Select LoRA..."
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    {showLoraList && filteredLoras.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-y-auto custom-scrollbar">
                            {filteredLoras.map((l, idx) => (
                                <button key={idx} onClick={() => { setCurrentLora(l); setShowLoraList(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">{l}</button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <input type="range" min="0" max="2" step="0.1" value={currentLoraStrength}
                        onChange={(e) => setCurrentLoraStrength(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white" />
                    <span className="text-xs text-slate-400 w-8 text-right">{currentLoraStrength}</span>
                    <Button size="sm" variant="secondary" onClick={addLora} disabled={!currentLora} className="h-7 text-xs">Add</Button>
                </div>
            </div>

            {selectedLoras.length > 0 && (
                <div className="space-y-2">
                    {selectedLoras.map((l, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg text-sm border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-slate-200 truncate max-w-[150px]" title={l.name}>{l.name}</span>
                                <span className="text-xs text-slate-500">Str: {l.strength}</span>
                            </div>
                            <button onClick={() => removeLora(idx)} className="text-slate-500 hover:text-red-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
