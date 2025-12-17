import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { getPhotosByFolder, getPhotoDownloadUrl, incrementDownloadCount } from '../../utils/api/photoFiles';
import {
    Loader2,
    ImageIcon,
    Download,
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn
} from 'lucide-react';

const PhotoGallery = ({ folder, onDownloadSingle }) => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [thumbnailUrls, setThumbnailUrls] = useState({});
    const [lightbox, setLightbox] = useState({ open: false, index: 0, url: null, loading: false });

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

            // Load thumbnail URLs in batch (single API call)
            if (data?.length > 0) {
                const filePaths = data.map(p => p.filePath);
                const { urls: batchUrls } = await import('../../utils/api/photoFiles')
                    .then(m => m.getMultipleDownloadUrls(filePaths));

                const urls = {};
                batchUrls?.forEach(item => {
                    const photo = data.find(p => p.filePath === item.path);
                    if (photo) urls[photo.id] = item.url;
                });
                setThumbnailUrls(urls);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, [folder?.id]);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    const openLightbox = async (index) => {
        const photo = photos[index];
        setLightbox({ open: true, index, url: null, loading: true });

        const { url } = await getPhotoDownloadUrl(photo.filePath);
        setLightbox(prev => ({ ...prev, url, loading: false }));
    };

    const closeLightbox = () => {
        setLightbox({ open: false, index: 0, url: null, loading: false });
    };

    const navigateLightbox = async (direction) => {
        const newIndex = lightbox.index + direction;
        if (newIndex < 0 || newIndex >= photos.length) return;

        const photo = photos[newIndex];
        setLightbox(prev => ({ ...prev, index: newIndex, url: null, loading: true }));

        const { url } = await getPhotoDownloadUrl(photo.filePath);
        setLightbox(prev => ({ ...prev, url, loading: false }));
    };

    const handleDownload = async (photo) => {
        try {
            const { url } = await getPhotoDownloadUrl(photo.filePath);
            if (!url) return;

            // Increment download count
            await incrementDownloadCount(photo.id);

            // Trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = photo.fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (onDownloadSingle) onDownloadSingle(photo);
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    // Keyboard navigation for lightbox
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!lightbox.open) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigateLightbox(-1);
            if (e.key === 'ArrowRight') navigateLightbox(1);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightbox.open, lightbox.index]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (photos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mb-3" />
                <p>Belum ada foto</p>
            </div>
        );
    }

    return (
        <>
            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo, index) => (
                    <div
                        key={photo.id}
                        className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => openLightbox(index)}
                    >
                        {thumbnailUrls[photo.id] ? (
                            <img
                                src={thumbnailUrls[photo.id]}
                                alt={photo.fileName}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-9 w-9"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openLightbox(index);
                                }}
                            >
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-9 w-9"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(photo);
                                }}
                            >
                                <Download className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox */}
            {lightbox.open && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    {/* Close Button */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                        onClick={closeLightbox}
                    >
                        <X className="w-6 h-6" />
                    </Button>

                    {/* Navigation - Previous */}
                    {lightbox.index > 0 && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute left-4 text-white hover:bg-white/20 h-12 w-12"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigateLightbox(-1);
                            }}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </Button>
                    )}

                    {/* Navigation - Next */}
                    {lightbox.index < photos.length - 1 && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-4 text-white hover:bg-white/20 h-12 w-12"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigateLightbox(1);
                            }}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </Button>
                    )}

                    {/* Image */}
                    <div
                        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {lightbox.loading ? (
                            <Loader2 className="w-12 h-12 animate-spin text-white" />
                        ) : lightbox.url ? (
                            <img
                                src={lightbox.url}
                                alt={photos[lightbox.index]?.fileName}
                                className="max-w-full max-h-[85vh] object-contain"
                            />
                        ) : null}
                    </div>

                    {/* Bottom Bar */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 px-4 py-2 rounded-full">
                        <span className="text-white text-sm">
                            {lightbox.index + 1} / {photos.length}
                        </span>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="gap-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(photos[lightbox.index]);
                            }}
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
};

export default PhotoGallery;
