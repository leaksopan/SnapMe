# Implementation Plan

- [x] 1. Setup Database Schema





  - [x] 1.1 Create photo_folders table with indexes


    - Create table dengan semua kolom sesuai design
    - Add indexes untuk customer_phone, customer_name, status, transaction_id
    - _Requirements: 6.1_


  - [x] 1.2 Create photo_files table with indexes

    - Create table dengan foreign key ke photo_folders

    - Add index untuk folder_id
    - _Requirements: 6.2_
  - [x] 1.3 Add customer_phone column to transactions table

    - ALTER TABLE untuk tambah kolom customer_phone
    - _Requirements: 5.1_

  - [x] 1.4 Create trigger for auto-update folder stats

    - Trigger AFTER INSERT/DELETE on photo_files
    - Update photo_count dan total_size di parent folder
    - Auto-change status pending → ready on first upload
    - _Requirements: 2.3, 2.5, 7.2_
  - [x] 1.5 
    - **Property 2: Photo Count Consistency on Upload**
    - **Property 3: Photo Count Consistency on Delete**
    - **Validates: Requirements 2.3, 2.5**

- [x] 2. Setup Supabase Storage





  - [x] 2.1 Create 'photos' bucket (private)


    - Via Supabase MCP atau SQL
    - Set file_size_limit 10MB
    - _Requirements: 6.3_
  - [x] 2.2 Create storage policies


    - Admin can upload/read/delete
    - Public can read via signed URL
    - _Requirements: 6.4_

- [x] 3. Create API Functions
  - [x] 3.1 Create src/utils/api/photoFolders.js
    - createPhotoFolder dengan validation
    - getPhotoFolders dengan filters
    - getPhotoFolderById
    - searchPhotoFolders (phone/name)
    - updateFolderStatus
    - deletePhotoFolder
    - serializeFolderData / deserializeFolderData
    - _Requirements: 1.2, 1.4, 3.2, 3.3, 7.3, 8.1, 8.2, 8.3_
  - [x] 3.5 Create src/utils/api/photoFiles.js

    - uploadPhoto dengan validation
    - uploadMultiplePhotos
    - getPhotosByFolder
    - getPhotoDownloadUrl (signed URL)
    - deletePhoto
    - incrementDownloadCount
    - _Requirements: 2.1, 2.3, 2.5, 4.3, 4.5, 4.6_ 

- [x] 4. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise. SKIP ALL TEST

- [x] 5. Create Admin Components SKIP ALL TEST





  - [x] 5.1 Create FolderList component


    - List folders dengan status filter (pending/ready/claimed)
    - Search by customer name/phone
    - Status badges dengan warna berbeda
    - Click to open detail
    - _Requirements: 1.1, 1.2, 7.4_

  - [x] 5.2 Create FolderDetail component

    - Display folder info (customer, package, date, photo count)
    - Photo grid dengan thumbnails
    - Delete photo option
    - Status update buttons
    - _Requirements: 1.3, 1.5, 7.3_

  - [x] 5.3 Create PhotoUpload component

    - Drag-drop zone
    - File picker fallback
    - Multiple file support
    - Progress bar per file
    - File type/size validation
    - _Requirements: 2.1, 2.2, 2.4, 2.6_
  - [x] 5.4 Create CreateFolderModal component


    - Form dengan customer_name, customer_phone (required)
    - Optional: customer_email, package_name
    - Validation sebelum submit
    - _Requirements: 1.4_
  - [x] 5.5 Update ClaimPhoto.js page


    - Integrate FolderList, FolderDetail, PhotoUpload, CreateFolderModal
    - State management untuk selected folder
    - Refresh list setelah upload/delete
    - _Requirements: 1.1, 1.3_

- [x] 6. Create Customer Components
  - [x] 6.1 Create ClaimSearch component
    - Input field untuk phone/name
    - Search type toggle (phone/name)
    - Search button
    - Display results list
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 6.2 Create PhotoGallery component
    - Photo grid dengan thumbnails
    - Lightbox untuk preview
    - Download single photo button
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 6.3 Create DownloadOptions component
    - Download single photo
    - Download all as ZIP
    - Share link option
    - _Requirements: 4.3, 4.4_
  - [x] 6.4 Create LandingClaimPhoto.js page
    - Integrate ClaimSearch, PhotoGallery, DownloadOptions
    - State management untuk selected folder
    - Public accessible (no auth required)
    - _Requirements: 3.1, 4.1_

- [x] 7. Integrate with Kasir






  - [x] 7.1 Update Kasir.js to include customer_phone input


    - Add optional phone input field
    - Show only when cart has studio item
    - Save phone to transaction
    - _Requirements: 5.1_
  - [x] 7.2 Create trigger for auto-create folder on transaction


    - Trigger AFTER INSERT on transactions
    - Check if customer_phone exists AND has studio item
    - Create photo_folder with status 'pending'
    - Extract package_name from transaction_items
    - Auto-call RPC function after transaction complete
    - _Requirements: 5.2, 5.3, 5.4_  

- [ ] 8. Checkpoint - Ensure all tests pass skip this




  - Ensure all tests pass, ask the user if questions arise.
-


- [x] 9. Add Navigation & Permissions




  - [x] 9.1 Add ClaimPhoto to admin navigation

    - Add menu item untuk admin
    - Check user_permissions untuk claim_photo module
    - _Requirements: 1.1_

  - [x] 9.2 Add LandingClaimPhoto route

    - Public route tanpa auth
    - Add to App.js routing
    - _Requirements: 3.1_

- [ ] 10. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
