import { useState } from 'react';
import { Button } from '../ui/button';
import { getPhotosByFolder, getMultipleDownloadUrls, incrementDownloadCount } from '../../utils/api/photoFiles';
import { markAsClaimedOnDownload } from '../../utils/api/photoFolders';
import { Download, Archive, Share2, Loader2, Check, Copy, AlertTriangle } from 'lucide-react';

const DownloadOptions = ({ folder }) => {
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [shareLink, setShareLink] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleDownloadAll = async () => {
        if (!folder?.id) return;

        setDownloading(true);
        setDownloadProgress(0);

        try {
            // Get all photos
            const { data: photos, error } = await getPhotosByFolder(folder.id);
            if (error || !photos?.length) {
                setDownloading(false);
                return;
            }

            // Get signed URLs for all photos
            const filePaths = photos.map(p => p.filePath);
            const { urls } = await getMultipleDownloadUrls(filePaths);

            if (!urls?.length) {
                setDownloading(false);
                return;
            }

            // Dynamic import JSZip
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            // Download each file and add to zip
            for (let i = 0; i < urls.length; i++) {
                const urlData = urls[i];
                const photo = photos.find(p => p.filePath === urlData.path);

                try {
                    const response = await fetch(urlData.url);
                    const blob = await response.blob();
                    zip.file(photo?.fileName || `photo_${i + 1}.jpg`, blob);

                    // Increment download count
                    if (photo) await incrementDownloadCount(photo.id);

                    setDownloadProgress(Math.round(((i + 1) / urls.length) * 80));
                } catch (err) {
                    console.error('Error downloading file:', err);
                }
            }

            setDownloadProgress(90);

            // Generate ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // Download ZIP
            const zipUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = `${folder.customerName}_photos.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(zipUrl);

            // Auto-mark as claimed on first download
            await markAsClaimedOnDownload(folder.id);

            setDownloadProgress(100);
        } catch (err) {
            console.error('Download all error:', err);
        } finally {
            setTimeout(() => {
                setDownloading(false);
                setDownloadProgress(0);
            }, 1000);
        }
    };

    const handleShare = () => {
        // Generate shareable link (current page URL with folder context)
        const currentUrl = window.location.href;
        const shareUrl = currentUrl.includes('?')
            ? `${currentUrl}&folder=${folder.id}`
            : `${currentUrl}?folder=${folder.id}`;

        setShareLink(shareUrl);
    };

    const handleCopyLink = async () => {
        if (!shareLink) return;

        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleNativeShare = async () => {
        if (!navigator.share) {
            handleShare();
            return;
        }

        try {
            await navigator.share({
                title: `Foto ${folder.customerName}`,
                text: `Lihat foto sesi ${folder.packageName || 'studio'} Anda`,
                url: window.location.href
            });
        } catch (err) {
            // User cancelled or share failed, show link instead
            handleShare();
        }
    };

    if (!folder) return null;

    return (
        <div className="space-y-4">
            {/* Download All as ZIP */}
            <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h4 className="font-medium flex items-center gap-2">
                            <Archive className="w-5 h-5" />
                            Download Semua
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Download {folder.photoCount} foto dalam format ZIP
                        </p>
                    </div>
                    <Button
                        onClick={handleDownloadAll}
                        disabled={downloading || folder.photoCount === 0}
                        className="gap-2"
                    >
                        {downloading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {downloadProgress}%
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Download ZIP
                            </>
                        )}
                    </Button>
                </div>

                {/* Progress Bar */}
                {downloading && (
                    <div className="w-full bg-muted rounded-full h-2 mt-3">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Share Link */}
            <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-medium flex items-center gap-2">
                            <Share2 className="w-5 h-5" />
                            Bagikan Link
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Bagikan link foto ke orang lain
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleNativeShare}
                        className="gap-2"
                    >
                        <Share2 className="w-4 h-4" />
                        Bagikan
                    </Button>
                </div>

                {/* Share Link Display */}
                {shareLink && (
                    <div className="mt-3 flex gap-2">
                        <input
                            type="text"
                            value={shareLink}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border"
                        />
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={handleCopyLink}
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-500" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Warning - Garansi 3 hari */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-amber-800">Penting!</h4>
                        <p className="text-sm text-amber-700 mt-1">
                            Foto akan dihapus otomatis <strong>3 hari</strong> setelah didownload pertama kali.
                            Pastikan Anda sudah menyimpan semua foto dengan aman.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadOptions;
