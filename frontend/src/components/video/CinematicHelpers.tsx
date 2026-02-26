
import { Camera, Zap, Sun } from 'lucide-react';

interface CinematicHelpersProps {
    onAddTerm: (term: string) => void;
}

export const CinematicHelpers = ({ onAddTerm }: CinematicHelpersProps) => {
    const categories = [
        {
            label: 'Camera Movement',
            icon: Camera,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 hover:bg-blue-500/20',
            terms: [
                'Slow Pan Left', 'Slow Pan Right', 'Dolly Zoom',
                'Tracking Shot', 'Low Angle', 'High Angle',
                'Static Camera', 'Handheld Shake'
            ]
        },
        {
            label: 'Lighting & Mood',
            icon: Sun,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 hover:bg-amber-500/20',
            terms: [
                'Cinematic Lighting', 'Volumetric Fog', 'Golden Hour',
                'Neon Noir', 'Soft Studio Lighting', 'Film Grain',
                'Dark Atmosphere', 'Bright & Airy'
            ]
        },
        {
            label: 'Action & Motion',
            icon: Zap,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10 hover:bg-purple-500/20',
            terms: [
                'Slow Motion', 'Explosive Action', 'Idle Movement',
                'Walking Towards Camera', 'Running', 'Wind Blowing'
            ]
        }
    ];

    return (
        <div className="space-y-4 animate-in slide-in-from-top-2">
            {categories.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        <cat.icon className={`w-3 h-3 ${cat.color}`} />
                        {cat.label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {cat.terms.map(term => (
                            <button
                                key={term}
                                onClick={() => onAddTerm(term)}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${cat.bg} ${cat.color} border border-transparent hover:border-${cat.color.split('-')[1]}-500/30`}
                            >
                                + {term}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
