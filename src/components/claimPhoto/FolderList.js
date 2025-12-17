import { useState, useEffect, useCallback } from 'react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { getPhotoFolders, searchPhotoFolders } from '../../utils/api/photoFolders';
import { Search, Plus, Loader2, FolderOpen, Phone, User } from 'lucide-react';

const STATUS_CONFIG = {
    pending: { label: 'Pending', variant: 'warning', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    ready: { label: 'Ready', variant: 'success', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    claimed: { label: 'Claimed', variant: 'default', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    expired: { label: 'Expired', variant: 'destructive', className: 'bg-red-500/10 text-red-600 border-red-500/20' }
};

const FolderList = ({ onSelectFolder, onCreateNew, selectedFolderId }) => {
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('phone');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadFolders = useCallback(async () => {
        setLoading(true);
        try {
            let result;
            if (searchTerm.trim()) {
                result = await searchPhotoFolders(searchTerm, searchType);
            } else {
                const filters = statusFilter !== 'all' ? { status: statusFilter } : {};
                result = await getPhotoFolders(filters);
            }

            if (result.error) {
                console.error('Error loading folders:', result.error);
                return;
            }

            // Apply status filter to search results too
            let filteredData = result.data || [];
            if (searchTerm.trim() && statusFilter !== 'all') {
                filteredData = filteredData.filter(f => f.status === statusFilter);
            }

            setFolders(filteredData);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, searchType, statusFilter]);

    // Single useEffect untuk load folders - handles initial load dan search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadFolders();
        }, searchTerm ? 300 : 0); // Debounce hanya untuk search
        return () => clearTimeout(timer);
    }, [loadFolders]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Photo Folders</h2>
                    <Button size="sm" onClick={onCreateNew}>
                        <Plus className="w-4 h-4 mr-1" />
                        New
                    </Button>
                </div>

                {/* Search */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={searchType === 'phone' ? 'Cari no. HP...' : 'Cari nama...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button
                        variant={searchType === 'phone' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setSearchType('phone')}
                        title="Search by phone"
                    >
                        <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={searchType === 'name' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setSearchType('name')}
                        title="Search by name"
                    >
                        <User className="w-4 h-4" />
                    </Button>
                </div>

                {/* Status Filter */}
                <div className="flex gap-1 flex-wrap">
                    {['all', 'pending', 'ready', 'claimed', 'expired'].map((status) => (
                        <Button
                            key={status}
                            variant={statusFilter === status ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setStatusFilter(status)}
                            className="text-xs"
                        >
                            {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Folder List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : folders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <FolderOpen className="w-8 h-8 mb-2" />
                        <p className="text-sm">No folders found</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                onClick={() => onSelectFolder(folder)}
                                className={`p-3 cursor-pointer hover:bg-accent transition-colors ${selectedFolderId === folder.id ? 'bg-accent' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{folder.customerName}</p>
                                        <p className="text-sm text-muted-foreground">{folder.customerPhone}</p>
                                        {folder.packageName && (
                                            <p className="text-xs text-muted-foreground truncate">{folder.packageName}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge className={STATUS_CONFIG[folder.status]?.className}>
                                            {STATUS_CONFIG[folder.status]?.label}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {folder.photoCount} foto
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(folder.createdAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export { FolderList, STATUS_CONFIG };
