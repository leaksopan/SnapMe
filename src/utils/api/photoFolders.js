import { supabase } from '../../supabaseClient';

// ============================================
// VALIDATION
// ============================================

/**
 * Validate folder data sebelum create
 * @param {Object} data - Folder data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateFolderData = (data) => {
    const errors = [];

    if (!data.customerName || typeof data.customerName !== 'string' || data.customerName.trim() === '') {
        errors.push('customer_name is required');
    }

    if (!data.customerPhone || typeof data.customerPhone !== 'string' || data.customerPhone.trim() === '') {
        errors.push('customer_phone is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

// ============================================
// SERIALIZATION / DESERIALIZATION
// ============================================

/**
 * Serialize folder metadata to JSON string
 * @param {Object} folder - Folder object
 * @returns {string} JSON string
 */
export const serializeFolderData = (folder) => {
    const metadata = {
        folderId: folder.id,
        customerName: folder.customerName || folder.customer_name,
        customerPhone: folder.customerPhone || folder.customer_phone,
        customerEmail: folder.customerEmail || folder.customer_email || null,
        packageName: folder.packageName || folder.package_name || null,
        transactionId: folder.transactionId || folder.transaction_id || null,
        createdAt: folder.createdAt || folder.created_at || new Date().toISOString()
    };
    return JSON.stringify(metadata);
};

/**
 * Deserialize JSON string to folder metadata object
 * @param {string} json - JSON string
 * @returns {Object} Folder metadata object
 */
export const deserializeFolderData = (json) => {
    const parsed = JSON.parse(json);
    return {
        folderId: parsed.folderId,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        customerEmail: parsed.customerEmail || null,
        packageName: parsed.packageName || null,
        transactionId: parsed.transactionId || null,
        createdAt: parsed.createdAt
    };
};


// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate folder path based on source type
 * @param {string} sourceType - 'transactions' or 'manual'
 * @param {string} sourceId - transaction_id or generated id
 * @param {string} customerName - Customer name
 * @param {string} customerPhone - Customer phone
 * @returns {string} Folder path
 */
const generateFolderPath = (sourceType, sourceId, customerName, customerPhone) => {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '');
    const sanitizedPhone = customerPhone.replace(/[^0-9]/g, '');
    const folderName = `${date}_${sanitizedName}_${sanitizedPhone}`;
    return `photos/${sourceType}/${sourceId}/${folderName}`;
};

/**
 * Transform snake_case DB row to camelCase
 * @param {Object} row - DB row
 * @returns {Object} Transformed object
 */
const transformFolder = (row) => ({
    id: row.id,
    folderPath: row.folder_path,
    folderName: row.folder_name,
    transactionId: row.transaction_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    packageName: row.package_name,
    status: row.status,
    photoCount: row.photo_count,
    totalSize: row.total_size,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create new photo folder
 * @param {Object} data - Folder data
 * @returns {Promise<{ data: Object|null, error: Error|null }>}
 */
export const createPhotoFolder = async (data) => {
    // Validate
    const validation = validateFolderData(data);
    if (!validation.valid) {
        return { data: null, error: new Error(validation.errors.join(', ')) };
    }

    const sourceType = data.transactionId ? 'transactions' : 'manual';
    const sourceId = data.transactionId || crypto.randomUUID();
    const folderPath = generateFolderPath(sourceType, sourceId, data.customerName, data.customerPhone);
    const folderName = folderPath.split('/').pop();

    const insertData = {
        folder_path: folderPath,
        folder_name: folderName,
        transaction_id: data.transactionId || null,
        customer_name: data.customerName.trim(),
        customer_phone: data.customerPhone.trim(),
        customer_email: data.customerEmail?.trim() || null,
        package_name: data.packageName || null,
        status: 'pending',
        uploaded_by: data.uploadedBy || null
    };

    const { data: result, error } = await supabase
        .from('photo_folders')
        .insert(insertData)
        .select()
        .single();

    if (error) return { data: null, error };
    return { data: transformFolder(result), error: null };
};

/**
 * Get photo folders with filters
 * @param {Object} filters - { status, limit, offset }
 * @returns {Promise<{ data: Object[]|null, error: Error|null }>}
 */
export const getPhotoFolders = async (filters = {}) => {
    let query = supabase
        .from('photo_folders')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    if (filters.limit) {
        query = query.limit(filters.limit);
    }

    if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };
    return { data: data.map(transformFolder), error: null };
};

/**
 * Get single photo folder by ID
 * @param {string} id - Folder UUID
 * @returns {Promise<{ data: Object|null, error: Error|null }>}
 */
export const getPhotoFolderById = async (id) => {
    const { data, error } = await supabase
        .from('photo_folders')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return { data: null, error };
    return { data: transformFolder(data), error: null };
};


/**
 * Search photo folders by phone or name
 * For customer search: only returns 'ready' or 'claimed' folders
 * @param {string} term - Search term
 * @param {'phone'|'name'} type - Search type
 * @param {Object} options - { forCustomer: boolean }
 * @returns {Promise<{ data: Object[]|null, error: Error|null }>}
 */
export const searchPhotoFolders = async (term, type = 'phone', options = {}) => {
    if (!term || term.trim() === '') {
        return { data: [], error: null };
    }

    const searchTerm = term.trim();
    let query = supabase
        .from('photo_folders')
        .select('*')
        .order('created_at', { ascending: false });

    // Apply search filter based on type
    if (type === 'phone') {
        query = query.ilike('customer_phone', `%${searchTerm}%`);
    } else {
        // Case-insensitive partial match for name
        query = query.ilike('customer_name', `%${searchTerm}%`);
    }

    // For customer search, only show ready/claimed folders (Property 6)
    if (options.forCustomer) {
        query = query.in('status', ['ready', 'claimed']);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };
    return { data: data.map(transformFolder), error: null };
};

/**
 * Update folder status
 * @param {string} id - Folder UUID
 * @param {'pending'|'ready'|'claimed'} status - New status
 * @returns {Promise<{ data: Object|null, error: Error|null }>}
 */
export const updateFolderStatus = async (id, status) => {
    const validStatuses = ['pending', 'ready', 'claimed', 'expired'];
    if (!validStatuses.includes(status)) {
        return { data: null, error: new Error('Invalid status') };
    }

    const updateData = { status, updated_at: new Date().toISOString() };

    // Record claimed_at timestamp when marking as claimed (Property 11)
    if (status === 'claimed') {
        updateData.claimed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('photo_folders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) return { data: null, error };
    return { data: transformFolder(data), error: null };
};

/**
 * Mark folder as claimed on first download
 * Only updates if current status is 'ready'
 * @param {string} id - Folder UUID
 * @returns {Promise<{ data: Object|null, error: Error|null }>}
 */
export const markAsClaimedOnDownload = async (id) => {
    // First check current status
    const { data: folder, error: fetchError } = await supabase
        .from('photo_folders')
        .select('status')
        .eq('id', id)
        .single();

    if (fetchError) return { data: null, error: fetchError };

    // Only update if status is 'ready' (first download)
    if (folder.status !== 'ready') {
        return { data: null, error: null }; // Already claimed, no update needed
    }

    return updateFolderStatus(id, 'claimed');
};

/**
 * Delete photo folder
 * @param {string} id - Folder UUID
 * @returns {Promise<{ success: boolean, error: Error|null }>}
 */
export const deletePhotoFolder = async (id) => {
    const { error } = await supabase
        .from('photo_folders')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error };
    return { success: true, error: null };
};
