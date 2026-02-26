// Advanced Gallery Manager
import { useState, useEffect } from 'react';
import { Images, Trash2, Search, CheckSquare, Square, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface MediaFile {
    filename: string;
    subfolder: string;
    type: 'output' | 'input' | 'temp';
    url: string;
    dateFolder: string;
    model: string;
    timestamp: number;
    selected: boolean;
}

export const GalleryPage = () => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterModel, setFilterModel] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'model' | 'name'>('date');

    useEffect(() => {
        loadGallery();
    }, []);

    const loadGallery = async () => {
        setIsLoading(true);
        try {
            // Load files directly from filesystem via backend
            const response = await fetch('http://127.0.0.1:8000/api/files/list');
            if (!response.ok) throw new Error('Failed to load gallery');

            const data = await response.json();

            // Map to MediaFile format
            const files: MediaFile[] = data.files.map((file: any) => ({
                filename: file.filename,
                subfolder: file.subfolder,
                type: file.type,
                url: file.url,
                dateFolder: file.dateFolder,
                model: file.model,
                timestamp: file.modified * 1000, // Convert to milliseconds
                selected: false
            }));

            setMediaFiles(files);
            console.log(`✅ Loaded ${files.length} files from output directory`);
        } catch (error) {
            console.error('Gallery load error:', error);
            alert('Failed to load gallery. Is backend server running?');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (file: MediaFile) => {
        if (!confirm(`Delete ${file.filename} permanently from disk?`)) return;

        try {
            const response = await fetch('http://127.0.0.1:8000/api/files/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.filename,
                    subfolder: file.subfolder,
                    type: file.type
                })
            });

            if (!response.ok) throw new Error('Delete failed');

            setMediaFiles(prev => prev.filter(f => f.filename !== file.filename));
            console.log('✅ Deleted from disk:', file.filename);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete file. Is backend server running?');
        }
    };

    const handleDeleteSelected = async () => {
        const selected = mediaFiles.filter(f => f.selected);
        if (selected.length === 0) return;

        if (!confirm(`Delete ${selected.length} selected files permanently from disk?`)) return;

        let successCount = 0;
        for (const file of selected) {
            try {
                await fetch('http://127.0.0.1:8000/api/files/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: file.filename,
                        subfolder: file.subfolder,
                        type: file.type
                    })
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to delete ${file.filename}`, error);
            }
        }

        setMediaFiles(prev => prev.filter(f => !f.selected));
        alert(`Deleted ${successCount} of ${selected.length} files from disk`);
    };

    const handleCleanupOrphans = async () => {
        if (!confirm('Delete all orphaned files (files not in ComfyUI history)?')) return;

        try {
            const response = await fetch('http://127.0.0.1:8000/api/files/cleanup', {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Cleanup failed');

            const result = await response.json();
            alert(`Cleanup complete! Deleted ${result.deleted_count} orphaned files`);

            // Reload gallery
            loadGallery();
        } catch (error) {
            console.error('Cleanup error:', error);
            alert('Failed to cleanup. Is backend server running?');
        }
    };

    const toggleSelect = (filename: string) => {
        setMediaFiles(prev => prev.map(f =>
            f.filename === filename ? { ...f, selected: !f.selected } : f
        ));
    };

    const toggleSelectAll = () => {
        const allSelected = filteredFiles.every(f => f.selected);
        setMediaFiles(prev => prev.map(f =>
            filteredFiles.includes(f) ? { ...f, selected: !allSelected } : f
        ));
    };

    // Filtering and sorting
    const filteredFiles = mediaFiles
        .filter(f => filterModel === 'all' || f.model === filterModel)
        .filter(f => filterDate === 'all' || f.dateFolder === filterDate)
        .filter(f => f.filename.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'date') return b.timestamp - a.timestamp;
            if (sortBy === 'model') return a.model.localeCompare(b.model);
            return a.filename.localeCompare(b.filename);
        });

    const uniqueModels = Array.from(new Set(mediaFiles.map(f => f.model)));
    const uniqueDates = Array.from(new Set(mediaFiles.map(f => f.dateFolder))).sort().reverse();
    const selectedCount = mediaFiles.filter(f => f.selected).length;

    return (
        <div className="p-8 max-w-[1920px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Images className="w-8 h-8 text-white" />
                    <div>
                        <h1 className="text-3xl font-bold text-white">Gallery Manager</h1>
                        <p className="text-slate-400">{filteredFiles.length} files • {selectedCount} selected</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="ghost" onClick={loadGallery}>
                        <Download className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="ghost" onClick={handleCleanupOrphans} className="text-orange-400 hover:text-orange-300">
                        🗑️ Cleanup Orphans
                    </Button>
                    {selectedCount > 0 && (
                        <Button variant="ghost" onClick={handleDeleteSelected} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete {selectedCount} Selected
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#121218] border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                    </div>

                    {/* Model Filter */}
                    <select
                        value={filterModel}
                        onChange={(e) => setFilterModel(e.target.value)}
                        className="px-4 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        <option value="all">All Models</option>
                        {uniqueModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>

                    {/* Date Filter */}
                    <select
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-4 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        <option value="all">All Dates</option>
                        {uniqueDates.map(date => (
                            <option key={date} value={date}>{date}</option>
                        ))}
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                        <option value="date">Sort by Date</option>
                        <option value="model">Sort by Model</option>
                        <option value="name">Sort by Name</option>
                    </select>
                </div>

                {/* Select All */}
                <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    {filteredFiles.every(f => f.selected) ? (
                        <CheckSquare className="w-4 h-4" />
                    ) : (
                        <Square className="w-4 h-4" />
                    )}
                    Select All ({filteredFiles.length})
                </button>
            </div>

            {/* Gallery Grid */}
            {isLoading ? (
                <div className="text-center text-slate-500 py-20">Loading gallery...</div>
            ) : filteredFiles.length === 0 ? (
                <div className="text-center text-slate-500 py-20">No files found</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {filteredFiles.map((file) => (
                        <div
                            key={file.filename}
                            className={`group relative aspect-square bg-black/20 rounded-xl overflow-hidden border transition-all ${file.selected
                                ? 'border-white ring-2 ring-white'
                                : 'border-white/10 hover:border-white/50'
                                }`}
                        >
                            <img
                                src={file.url}
                                alt={file.filename}
                                className="w-full h-full object-cover"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 flex flex-col justify-between p-3">
                                {/* Top: Checkbox */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => toggleSelect(file.filename)}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm"
                                    >
                                        {file.selected ? (
                                            <CheckSquare className="w-4 h-4 text-white" />
                                        ) : (
                                            <Square className="w-4 h-4 text-white" />
                                        )}
                                    </button>
                                </div>

                                {/* Bottom: Info + Delete */}
                                <div className="space-y-2">
                                    <div className="text-xs text-white backdrop-blur-sm bg-black/40 rounded px-2 py-1">
                                        <div className="font-bold truncate">{file.model}</div>
                                        <div className="text-slate-300">{file.dateFolder}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(file)}
                                        className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg backdrop-blur-sm flex items-center justify-center gap-2 text-red-400 text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
