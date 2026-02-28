
import { useState, useEffect } from 'react';
import { X, Search, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/Button';

interface GalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string, filename: string) => void;
}

interface MediaFile {
    filename: string;
    subfolder: string;
    type: string;
    url: string;
    dateFolder: string;
    model: string;
    timestamp: number;
}

export const GalleryModal = ({ isOpen, onClose, onSelect }: GalleryModalProps) => {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadGallery();
        }
    }, [isOpen]);

    const loadGallery = async () => {
        setIsLoading(true);
        try {
            const { BACKEND_API } = await import('../config/api');
            const response = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.FILES_LIST}`);
            if (!response.ok) throw new Error('Failed to load gallery');
            const data = await response.json();

            // Map and sort by newest first
            const mappedFiles = data.files.map((f: any) => ({
                ...f,
                timestamp: f.modified * 1000
            })).sort((a: any, b: any) => b.timestamp - a.timestamp);

            setFiles(mappedFiles);
        } catch (error) {
            console.error('Gallery load error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedFile) {
            onSelect(selectedFile.url, selectedFile.filename);
            onClose();
        }
    };

    const filteredFiles = files.filter(f =>
        f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#121218] border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-emerald-400" />
                            Select Source Image
                        </h2>
                        <p className="text-sm text-slate-400">Choose an image for video generation</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5 bg-black/20">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by filename or model..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            Loading gallery...
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredFiles.map((file) => (
                                <div
                                    key={file.filename}
                                    onClick={() => setSelectedFile(file)}
                                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${selectedFile?.filename === file.filename
                                            ? 'border-emerald-500 ring-4 ring-emerald-500/20'
                                            : 'border-transparent hover:border-white/50'
                                        }`}
                                >
                                    <img
                                        src={file.url}
                                        alt={file.filename}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    {selectedFile?.filename === file.filename && (
                                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                            <div className="bg-emerald-500 rounded-full p-2 shadow-lg">
                                                <Check className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white truncate">{file.filename}</p>
                                        <p className="text-[10px] text-slate-300">{file.dateFolder}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleConfirm}
                        disabled={!selectedFile}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                        Use Selected Image
                    </Button>
                </div>
            </div>
        </div>
    );
};
