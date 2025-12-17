import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    getPhotosByFolder,
    getPhotoDownloadUrl,
    deletePhoto
} from '../../utils/api/photoFiles';
import { updateFolderStatus } from '../../utils/api/photoFolders';
import { STATUS_CONFIG } from './FolderList';
import {
    Loader2,
    Trash2,
    Download,
    X,
    Calendar,
    Package,
    Phone,
    User,
    ImageIcon,
    CheckCircle,
    Clock,
    ArrowLeft
} from 'lucide-react';

const FolderDetail = ({ folder, onClose, onStatusChange, onPhotoDeleted }) => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewPhoto, setPreviewPhoto] = useState(null);

    const loadPhotos = useCallback(async () => {
        if (!folder?.id) return;
        setLoading(true);
        try {
            const { data, error } = await getPhotosByFolder(folder.id);
            if (error) {
                console.error('Error loading photos:', error);
                return;
            }
            setPhotos(data || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, [folder?.id]);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    const handleDeletePhoto = async (photoId) => {
        if (!window.confirm('Hapus foto ini?')) return;

        setDeletingId(photoId);
        try {
            const { success, error } = await deletePhoto(photoId);
            if (error) {
                alert('Gagal menghapus foto: ' + error.message);
                return;
            }
            if (success) {
                setPhotos(prev => prev.filter(p => p.id !== photoId));
                onPhotoDeleted?.();
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            const { data, error } = await updateFolderStatus(folder.id, newStatus);
            if (error) {
                alert('Gagal update status: ' + error.message);
                return;
            }
            onStatusChange?.(data);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handlePreview = async (photo) => {
        try {
            const { url, error } = await getPhotoDownloadUrl(photo.filePath);
            if (error) {
                alert('Gagal load preview');
                return;
            }
            setPreviewUrl(url);
            setPreviewPhoto(photo);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleDownload = async (photo) => {
        try {
            const { url, error } = await getPhotoDownloadUrl(photo.filePath);
            if (error) {
                alert('Gagal generate download link');
                return;
            }
            const link = document.createElement('a');
            link.href = url;
            link.download = photo.fileName;
            link.click();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatSize = (bytes) => {
        if (!bytes) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    if (!folder) return null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-3">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h2 className="text-lg font-semibold flex-1">Detail Folder</h2>
                    <Badge className={STATUS_CONFIG[folder.status]?.className}>
                        {STATUS_CONFIG[folder.status]?.label}
                    </Badge>
                </div>

                {/* Folder Info */}
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{folder.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{folder.customerPhone}</span>
                    </div>
                    {folder.packageName && (
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span>{folder.packageName}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{formatDate(folder.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        <span>{folder.photoCount} foto • {formatSize(folder.totalSize)}</span>
                    </div>
                </div>

                {/* Status Actions */}
                <div className="flex gap-2 mt-4">
                    {folder.status === 'pending' && (
                        <Button
                            size="sm"
                            onClick={() => handleStatusUpdate('ready')}
                            disabled={updatingStatus}
                        >
                            {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                            Set Ready
                        </Button>
                    )}
                    {folder.status === 'ready' && (
                        <Button
                            size="sm"
                            onClick={() => handleStatusUpdate('claimed')}
                            disabled={updatingStatus}
                        >
                            {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                            Mark Claimed
                        </Button>
                    )}
                    {folder.status === 'claimed' && folder.claimedAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Claimed: {formatDate(folder.claimedAt)}
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : photos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <p className="text-sm">Belum ada foto</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {photos.map((photo) => (
                            <PhotoThumbnail
                                key={photo.id}
                                photo={photo}
                                onPreview={() => handlePreview(photo)}
                                onDownload={() => handleDownload(photo)}
                                onDelete={() => handleDeletePhoto(photo.id)}
                                isDeleting={deletingId === photo.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox Preview */}
            {previewUrl && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => { setPreviewUrl(null); setPreviewPhoto(null); }}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                        onClick={() => { setPreviewUrl(null); setPreviewPhoto(null); }}
                    >
                        <X className="w-6 h-6" />
                    </Button>
                    <img
                        src={previewUrl}
                        alt={previewPhoto?.fileName}
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

// Sub-component for photo thumbnail
const PhotoThumbnail = ({ photo, onPreview, onDownload, onDelete, isDeleting }) => {
    const [thumbUrl, setThumbUrl] = useState(null);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const loadThumb = async () => {
            try {
                const { url } = await getPhotoDownloadUrl(photo.filePath);
                setThumbUrl(url);
            } catch {
                setLoadError(true);
            }
        };
        loadThumb();
    }, [photo.filePath]);

    return (
        <div className="relative group aspect-square bg-muted rounded-lg overflow-hidden">
            {thumbUrl && !loadError ? (
                <img
                    src={thumbUrl}
                    alt={photo.fileName}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={onPreview}
                    onError={() => setLoadError(true)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
            )}

            {/* Overlay actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" onClick={onDownload}>
                    <Download className="w-4 h-4" />
                </Button>
                <Button
                    size="icon"
                    variant="destructive"
                    onClick={onDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
};

export { FolderDetail };
