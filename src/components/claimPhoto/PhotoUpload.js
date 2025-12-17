import { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { validateFile, uploadMultiplePhotos } from '../../utils/api/photoFiles';
import { Upload, X, FileImage, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

const PhotoUpload = ({ folder, onUploadComplete }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [uploadResults, setUploadResults] = useState({ successful: [], failed: [] });
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const processFiles = useCallback((fileList) => {
        const newFiles = Array.from(fileList).map(file => {
            const validation = validateFile(file);
            return {
                id: `${file.name}-${Date.now()}-${Math.random()}`,
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                valid: validation.valid,
                error: validation.error,
                status: validation.valid ? 'pending' : 'invalid'
            };
        });
        setFiles(prev => [...prev, ...newFiles]);
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files?.length) {
            processFiles(e.target.files);
        }
        e.target.value = '';
    };

    const removeFile = (fileId) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const clearAll = () => {
        setFiles([]);
        setUploadProgress({});
        setUploadResults({ successful: [], failed: [] });
    };

    const handleUpload = async () => {
        const validFiles = files.filter(f => f.valid && f.status === 'pending');
        if (validFiles.length === 0) return;

        setUploading(true);
        setUploadProgress({});

        const folderInfo = {
            folderPath: folder.folderPath,
            folderName: folder.folderName,
            transactionId: folder.transactionId
        };

        try {
            const results = await uploadMultiplePhotos(
                folder.id,
                validFiles.map(f => f.file),
                folderInfo,
                (fileIndex, progress) => {
                    const fileId = validFiles[fileIndex].id;
                    setUploadProgress(prev => ({ ...prev, [fileId]: progress }));

                    // Update file status
                    if (progress === 100) {
                        setFiles(prev => prev.map(f =>
                            f.id === fileId ? { ...f, status: 'uploaded' } : f
                        ));
                    }
                }
            );

            // Mark failed files
            results.failed.forEach(({ file }) => {
                const failedFile = validFiles.find(f => f.file === file);
                if (failedFile) {
                    setFiles(prev => prev.map(f =>
                        f.id === failedFile.id ? { ...f, status: 'failed', error: 'Upload gagal' } : f
                    ));
                }
            });

            setUploadResults(results);

            if (results.successful.length > 0) {
                onUploadComplete?.(results.successful.length);
            }
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const validCount = files.filter(f => f.valid && f.status === 'pending').length;
    const uploadedCount = files.filter(f => f.status === 'uploaded').length;

    return (
        <div className="p-4 space-y-4">
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
            >
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Drag & drop foto di sini</p>
                <p className="text-sm text-muted-foreground mt-1">
                    atau klik untuk pilih file
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                    JPEG, PNG, WEBP • Max {MAX_SIZE_MB}MB per file
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALLOWED_TYPES.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                            {files.length} file • {validCount} valid
                            {uploadedCount > 0 && ` • ${uploadedCount} uploaded`}
                        </span>
                        <Button variant="ghost" size="sm" onClick={clearAll}>
                            Clear All
                        </Button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {files.map((file) => (
                            <FileItem
                                key={file.id}
                                file={file}
                                progress={uploadProgress[file.id]}
                                onRemove={() => removeFile(file.id)}
                                formatSize={formatSize}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            {validCount > 0 && (
                <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload {validCount} foto
                        </>
                    )}
                </Button>
            )}

            {/* Results Summary */}
            {uploadResults.successful.length > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{uploadResults.successful.length} foto berhasil diupload</span>
                    </div>
                </div>
            )}

            {uploadResults.failed.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>{uploadResults.failed.length} foto gagal diupload</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-component for file item
const FileItem = ({ file, progress, onRemove, formatSize }) => {
    const getStatusIcon = () => {
        switch (file.status) {
            case 'uploaded':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed':
            case 'invalid':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            default:
                if (progress !== undefined && progress < 100) {
                    return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
                }
                return <FileImage className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <div className={`
      flex items-center gap-3 p-2 rounded-lg border
      ${!file.valid ? 'bg-red-500/5 border-red-500/20' : 'bg-muted/50'}
    `}>
            {getStatusIcon()}

            <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                    {file.error && <span className="text-red-500 ml-2">{file.error}</span>}
                </p>

                {/* Progress bar */}
                {progress !== undefined && progress < 100 && (
                    <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {file.status === 'pending' && (
                <Button variant="ghost" size="icon" onClick={onRemove}>
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
};

export { PhotoUpload };
