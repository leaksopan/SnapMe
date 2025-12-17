import { supabase } from '../../supabaseClient';

// ============================================
// CONSTANTS
// ============================================

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

// ============================================
// VALIDATION
// ============================================

/**
 * Validate file before upload
 * @param {File} file - File object
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateFile = (file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WEBP`
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 10MB`
        };
    }

    return { valid: true, error: null };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate storage path for photo
 * @param {string} sourceType - 'transactions' or 'manual'
 * @param {string} sourceId - transaction_id or folder_id
 * @param {string} folderName - folder name
 * @param {string} fileName - original file name
 * @returns {string} Storage path
 */
export const generateStoragePath = (sourceType, sourceId, folderName, fileName) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const ext = fileName.split('.').pop() || 'jpg';
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `photos/${sourceType}/${sourceId}/${folderName}/${timestamp}-${random}.${ext}`;
};

/**
 * Transform snake_case DB row to camelCase
 * @param {Object} row - DB row
 * @returns {Object} Transformed object
 */
const transformFile = (row) => ({
    id: row.id,
    folderId: row.folder_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    fileType: row.file_type,
    width: row.width,
    height: row.height,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    downloadCount: row.download_count,
    lastDownloadedAt: row.last_downloaded_at,
    isActive: row.is_active,
    createdAt: row.created_at
});


// ============================================
// UPLOAD OPERATIONS
// ============================================

/**
 * Upload single photo to folder
 * @param {string} folderId - Folder UUID
 * @param {File} file - File object
 * @param {Object} folderInfo - { folderPath, folderName, transactionId }
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<{ data: Object|null, error: Error|null }>}
 */
export const uploadPhoto = async (folderId, file, folderInfo, onProgress = () => { }) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        return { data: null, error: new Error(validation.error) };
    }

    try {
        // Determine source type from folder info
        const sourceType = folderInfo.transactionId ? 'transactions' : 'manual';
        const sourceId = folderInfo.transactionId || folderId;

        // Generate storage path
        const filePath = generateStoragePath(sourceType, sourceId, folderInfo.folderName, file.name);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('photos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            return { data: null, error: uploadError };
        }

        onProgress(50);

        // Create photo_files record
        const { data: fileRecord, error: dbError } = await supabase
            .from('photo_files')
            .insert({
                folder_id: folderId,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                file_type: file.type
            })
            .select()
            .single();

        if (dbError) {
            // Rollback: delete uploaded file
            await supabase.storage.from('photos').remove([filePath]);
            return { data: null, error: dbError };
        }

        onProgress(100);
        return { data: transformFile(fileRecord), error: null };

    } catch (error) {
        return { data: null, error };
    }
};

/**
 * Upload multiple photos to folder
 * @param {string} folderId - Folder UUID
 * @param {File[]} files - Array of File objects
 * @param {Object} folderInfo - { folderPath, folderName, transactionId }
 * @param {Function} onFileProgress - Progress callback per file (fileIndex, progress)
 * @returns {Promise<{ successful: Object[], failed: { file: File, error: Error }[] }>}
 */
export const uploadMultiplePhotos = async (folderId, files, folderInfo, onFileProgress = () => { }) => {
    const results = {
        successful: [],
        failed: []
    };

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const { data, error } = await uploadPhoto(
            folderId,
            file,
            folderInfo,
            (progress) => onFileProgress(i, progress)
        );

        if (error) {
            results.failed.push({ file, error });
        } else {
            results.successful.push(data);
        }
    }

    return results;
};


// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all photos in a folder
 * @param {string} folderId - Folder UUID
 * @returns {Promise<{ data: Object[]|null, error: Error|null }>}
 */
export const getPhotosByFolder = async (folderId) => {
    const { data, error } = await supabase
        .from('photo_files')
        .select('*')
        .eq('folder_id', folderId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

    if (error) return { data: null, error };
    return { data: data.map(transformFile), error: null };
};

/**
 * Get signed URL for photo download
 * @param {string} filePath - Storage file path
 * @param {number} expiresIn - Expiry time in seconds (default: 3600)
 * @returns {Promise<{ url: string|null, expiresIn: number, error: Error|null }>}
 */
export const getPhotoDownloadUrl = async (filePath, expiresIn = SIGNED_URL_EXPIRY) => {
    const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(filePath, expiresIn);

    if (error) return { url: null, expiresIn: 0, error };
    return { url: data.signedUrl, expiresIn, error: null };
};

/**
 * Get multiple signed URLs for batch download
 * @param {string[]} filePaths - Array of storage file paths
 * @param {number} expiresIn - Expiry time in seconds
 * @returns {Promise<{ urls: { path: string, url: string }[], error: Error|null }>}
 */
export const getMultipleDownloadUrls = async (filePaths, expiresIn = SIGNED_URL_EXPIRY) => {
    const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrls(filePaths, expiresIn);

    if (error) return { urls: [], error };

    const urls = data.map(item => ({
        path: item.path,
        url: item.signedUrl
    }));

    return { urls, error: null };
};

// ============================================
// UPDATE OPERATIONS
// ============================================

/**
 * Increment download count for a photo
 * @param {string} fileId - Photo file UUID
 * @returns {Promise<{ data: Object|null, error: Error|null }>}
 */
export const incrementDownloadCount = async (fileId) => {
    // Get current count
    const { data: current, error: fetchError } = await supabase
        .from('photo_files')
        .select('download_count')
        .eq('id', fileId)
        .single();

    if (fetchError) return { data: null, error: fetchError };

    // Increment
    const { data, error } = await supabase
        .from('photo_files')
        .update({
            download_count: (current.download_count || 0) + 1,
            last_downloaded_at: new Date().toISOString()
        })
        .eq('id', fileId)
        .select()
        .single();

    if (error) return { data: null, error };
    return { data: transformFile(data), error: null };
};

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete a photo (soft delete by default, hard delete from storage)
 * @param {string} fileId - Photo file UUID
 * @param {boolean} hardDelete - Also remove from storage
 * @returns {Promise<{ success: boolean, error: Error|null }>}
 */
export const deletePhoto = async (fileId, hardDelete = true) => {
    // Get file info first
    const { data: file, error: fetchError } = await supabase
        .from('photo_files')
        .select('file_path')
        .eq('id', fileId)
        .single();

    if (fetchError) return { success: false, error: fetchError };

    // Delete from storage if hard delete
    if (hardDelete && file.file_path) {
        const { error: storageError } = await supabase.storage
            .from('photos')
            .remove([file.file_path]);

        if (storageError) {
            console.warn('Storage delete failed:', storageError);
            // Continue with DB delete anyway
        }
    }

    // Delete from database
    const { error: dbError } = await supabase
        .from('photo_files')
        .delete()
        .eq('id', fileId);

    if (dbError) return { success: false, error: dbError };
    return { success: true, error: null };
};
