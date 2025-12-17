import { useState, useCallback } from 'react';
import { FolderList } from '../components/claimPhoto/FolderList';
import { FolderDetail } from '../components/claimPhoto/FolderDetail';
import { PhotoUpload } from '../components/claimPhoto/PhotoUpload';
import { CreateFolderModal } from '../components/claimPhoto/CreateFolderModal';
import { getPhotoFolderById } from '../utils/api/photoFolders';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FolderOpen, Upload } from 'lucide-react';

const ClaimPhoto = () => {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('detail');

  const refreshList = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleSelectFolder = async (folder) => {
    // Fetch fresh data
    const { data } = await getPhotoFolderById(folder.id);
    setSelectedFolder(data || folder);
    setActiveTab('detail');
  };

  const handleCloseDetail = () => {
    setSelectedFolder(null);
  };

  const handleStatusChange = (updatedFolder) => {
    setSelectedFolder(updatedFolder);
    refreshList();
  };

  const handlePhotoDeleted = async () => {
    // Refresh folder data
    if (selectedFolder) {
      const { data } = await getPhotoFolderById(selectedFolder.id);
      setSelectedFolder(data);
    }
    refreshList();
  };

  const handleUploadComplete = async (count) => {
    // Refresh folder data after upload
    if (selectedFolder) {
      const { data } = await getPhotoFolderById(selectedFolder.id);
      setSelectedFolder(data);
    }
    refreshList();
  };

  const handleFolderCreated = (newFolder) => {
    setSelectedFolder(newFolder);
    refreshList();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      {/* Left Panel - Folder List */}
      <Card className="w-80 flex-shrink-0 overflow-hidden">
        <FolderList
          key={refreshKey}
          onSelectFolder={handleSelectFolder}
          onCreateNew={() => setShowCreateModal(true)}
          selectedFolderId={selectedFolder?.id}
        />
      </Card>

      {/* Right Panel - Detail & Upload */}
      <Card className="flex-1 overflow-hidden">
        {selectedFolder ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4 w-fit">
              <TabsTrigger value="detail" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Detail
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="flex-1 overflow-hidden m-0">
              <FolderDetail
                folder={selectedFolder}
                onClose={handleCloseDetail}
                onStatusChange={handleStatusChange}
                onPhotoDeleted={handlePhotoDeleted}
              />
            </TabsContent>

            <TabsContent value="upload" className="flex-1 overflow-auto m-0">
              <PhotoUpload
                folder={selectedFolder}
                onUploadComplete={handleUploadComplete}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <FolderOpen className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Pilih folder untuk melihat detail</p>
            <p className="text-sm">atau buat folder baru</p>
          </div>
        )}
      </Card>

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={handleFolderCreated}
      />
    </div>
  );
};

export default ClaimPhoto;
