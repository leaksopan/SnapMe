# Requirements Document

## Introduction

Sistem Claim Photo untuk SnapMe Studio yang memungkinkan admin mengelola foto hasil sesi pemotretan dan customer mengambil foto mereka melalui landing page. Sistem ini terintegrasi dengan transaksi kasir dan menggunakan Supabase Storage untuk penyimpanan foto.

## Glossary

- **Photo_Folder**: Entitas yang merepresentasikan folder penyimpanan foto untuk satu sesi customer
- **Photo_File**: Entitas yang merepresentasikan file foto individual dalam folder
- **Claim_System**: Sistem keseluruhan untuk upload dan pengambilan foto customer
- **Admin**: User dengan role admin yang dapat upload dan mengelola foto
- **Customer**: Pengunjung studio yang ingin mengambil foto hasil sesi
- **Signed_URL**: URL sementara dengan expiry time untuk akses foto secara aman

## Requirements

### Requirement 1: Manajemen Folder Foto oleh Admin

**User Story:** As an admin, I want to manage photo folders for each customer session, so that I can organize and track photo deliveries efficiently.

#### Acceptance Criteria

1. WHEN an admin accesses the Claim Photo page THEN the Claim_System SHALL display a list of all Photo_Folders with status filter options (pending, ready, claimed)
2. WHEN an admin searches by customer name or phone number THEN the Claim_System SHALL return matching Photo_Folders within 2 seconds
3. WHEN an admin clicks on a Photo_Folder THEN the Claim_System SHALL display folder details including customer info, package name, photo count, and upload date
4. WHEN an admin creates a new Photo_Folder manually THEN the Claim_System SHALL require customer_name and customer_phone fields
5. WHEN an admin updates folder status to 'ready' THEN the Claim_System SHALL record the timestamp and enable customer access

### Requirement 2: Upload Foto oleh Admin

**User Story:** As an admin, I want to upload photos to customer folders, so that customers can claim their session photos.

#### Acceptance Criteria

1. WHEN an admin selects files for upload THEN the Claim_System SHALL accept image files (JPEG, PNG, WEBP) with maximum size of 10MB per file
2. WHEN an admin uploads multiple photos THEN the Claim_System SHALL display individual progress bars for each file
3. WHEN a photo upload completes successfully THEN the Claim_System SHALL create a Photo_File record and update the Photo_Folder photo_count
4. WHEN an admin uploads photos via drag-and-drop THEN the Claim_System SHALL process the files identically to file picker selection
5. WHEN an admin deletes a photo THEN the Claim_System SHALL remove the file from storage and update the Photo_Folder statistics
6. IF a photo upload fails THEN the Claim_System SHALL display an error message and allow retry without affecting other uploads

### Requirement 3: Pencarian dan Claim Foto oleh Customer

**User Story:** As a customer, I want to search and claim my photos using my phone number or name, so that I can download my session photos easily.

#### Acceptance Criteria

1. WHEN a customer visits the claim photo landing page THEN the Claim_System SHALL display a search interface with phone number and name input options
2. WHEN a customer searches with valid phone number THEN the Claim_System SHALL return matching Photo_Folders with status 'ready' or 'claimed'
3. WHEN a customer searches with partial name THEN the Claim_System SHALL perform case-insensitive partial matching
4. IF no matching Photo_Folder is found THEN the Claim_System SHALL display a friendly message suggesting to check input or contact studio
5. WHEN search results are displayed THEN the Claim_System SHALL show folder info including session date, package name, and photo count

### Requirement 4: Download dan Preview Foto

**User Story:** As a customer, I want to preview and download my photos, so that I can save them to my device.

#### Acceptance Criteria

1. WHEN a customer selects a Photo_Folder THEN the Claim_System SHALL display photo thumbnails in a grid layout
2. WHEN a customer clicks on a thumbnail THEN the Claim_System SHALL open a lightbox with full-size preview
3. WHEN a customer clicks download on a single photo THEN the Claim_System SHALL generate a Signed_URL and initiate download
4. WHEN a customer clicks download all THEN the Claim_System SHALL provide option to download as ZIP archive
5. WHEN a photo is downloaded THEN the Claim_System SHALL increment the download_count for that Photo_File
6. WHEN generating Signed_URLs THEN the Claim_System SHALL set expiry time to 1 hour for security

### Requirement 5: Integrasi dengan Transaksi Kasir

**User Story:** As a kasir, I want to input customer phone number during transaction, so that photo folders can be linked to transactions.

#### Acceptance Criteria

1. WHEN a kasir creates a transaction with studio package THEN the Claim_System SHALL display an optional customer_phone input field
2. WHEN a transaction with customer_phone is completed THEN the Claim_System SHALL auto-create a Photo_Folder linked to that transaction
3. WHEN auto-creating Photo_Folder THEN the Claim_System SHALL extract package info from transaction_items with category 'studio'
4. WHEN a Photo_Folder is created from transaction THEN the Claim_System SHALL set initial status to 'pending'

### Requirement 6: Database dan Storage

**User Story:** As a system administrator, I want proper database schema and storage configuration, so that the system operates reliably and securely.

#### Acceptance Criteria

1. WHEN storing Photo_Folder data THEN the Claim_System SHALL use UUID as primary key and include customer_name, customer_phone, status, photo_count, and timestamps
2. WHEN storing Photo_File data THEN the Claim_System SHALL include folder_id reference, file_path, file_size, file_type, and download_count
3. WHEN uploading photos to storage THEN the Claim_System SHALL use a private bucket named 'photos' with folder structure: photos/{source_type}/{source_id}/{folder_name}/
4. WHEN accessing photos THEN the Claim_System SHALL use Signed_URLs instead of public URLs for security
5. WHEN a Photo_File is inserted or deleted THEN the Claim_System SHALL automatically update the parent Photo_Folder statistics via database trigger

### Requirement 7: Status Management

**User Story:** As an admin, I want to track and update photo folder status, so that I can manage the photo delivery workflow.

#### Acceptance Criteria

1. WHEN a Photo_Folder is created THEN the Claim_System SHALL set status to 'pending'
2. WHEN first photo is uploaded to a pending folder THEN the Claim_System SHALL automatically change status to 'ready'
3. WHEN an admin manually marks folder as 'claimed' THEN the Claim_System SHALL record claimed_at timestamp
4. WHEN displaying folder list THEN the Claim_System SHALL show visual status badges with distinct colors (pending: yellow, ready: green, claimed: blue)

### Requirement 8: Serialisasi dan Parsing Data Folder

**User Story:** As a developer, I want consistent data serialization for photo folder metadata, so that data integrity is maintained across the system.

#### Acceptance Criteria

1. WHEN storing folder metadata THEN the Claim_System SHALL serialize data to JSON format with defined schema
2. WHEN reading folder metadata THEN the Claim_System SHALL parse JSON and validate against expected schema
3. WHEN serializing then deserializing folder data THEN the Claim_System SHALL produce equivalent data (round-trip consistency)
