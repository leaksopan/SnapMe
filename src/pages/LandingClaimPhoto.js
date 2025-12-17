import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Sun, Moon, ArrowLeft, Camera } from 'lucide-react';
import LandingNav from '../components/landing/LandingNav';
import ClaimSearch from '../components/claimPhoto/ClaimSearch';
import PhotoGallery from '../components/claimPhoto/PhotoGallery';
import DownloadOptions from '../components/claimPhoto/DownloadOptions';
import { getPhotoFolderById } from '../utils/api/photoFolders';

const LandingClaimPhoto = () => {
    const { theme, toggleTheme } = useTheme();
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null); // Persist search results

    // Check for folder ID in URL params (for shared links)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const folderId = urlParams.get('folder');
        if (folderId) {
            loadFolderFromUrl(folderId);
        }
    }, []);

    const loadFolderFromUrl = async (folderId) => {
        setLoading(true);
        try {
            const { data, error } = await getPhotoFolderById(folderId);
            if (!error && data && ['ready', 'claimed'].includes(data.status)) {
                setSelectedFolder(data);
            }
        } catch (err) {
            console.error('Error loading folder:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFolder = (folder) => {
        setSelectedFolder(folder);
        // Update URL without reload
        window.history.pushState({}, '', `?folder=${folder.id}`);
    };

    const handleBack = () => {
        setSelectedFolder(null);
        window.history.pushState({}, '', window.location.pathname);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className={`min-h-screen bg-background ${theme}`}>
            {/* Theme Switcher */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg"
            >
                {theme === 'dark' ? (
                    <Sun className="w-4 h-4" />
                ) : (
                    <Moon className="w-4 h-4" />
                )}
            </Button>

            {/* Navbar - sama dengan Landing page */}
            <LandingNav onLoginClick={() => window.location.href = '/'} />

            {/* Back button when viewing folder */}
            {selectedFolder && (
                <div className="fixed top-24 left-4 z-40">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBack}
                        className="gap-2 bg-background/80 backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali
                    </Button>
                </div>
            )}

            {/* Main Content - add top padding for fixed navbar */}
            <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : selectedFolder ? (
                    /* Folder Detail View */
                    <div className="space-y-6">
                        {/* Folder Info */}
                        <div className="text-center pb-6 border-b">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                                <Camera className="w-8 h-8 text-primary" />
                            </div>
                            <h1 className="text-2xl font-bold mb-1">{selectedFolder.customerName}</h1>
                            {selectedFolder.packageName && (
                                <p className="text-lg text-muted-foreground">{selectedFolder.packageName}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-2">
                                Sesi foto: {formatDate(selectedFolder.createdAt)} • {selectedFolder.photoCount} foto
                            </p>
                        </div>

                        {/* Download Options */}
                        <DownloadOptions folder={selectedFolder} />

                        {/* Photo Gallery */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Galeri Foto</h3>
                            <PhotoGallery folder={selectedFolder} />
                        </div>
                    </div>
                ) : (
                    /* Search View */
                    <div className="py-12">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                                <Camera className="w-10 h-10 text-primary" />
                            </div>
                        </div>
                        <ClaimSearch
                            onSelectFolder={handleSelectFolder}
                            savedResults={searchResults}
                            onResultsChange={setSearchResults}
                        />
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t mt-auto">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                        <p>© 2025 SnapMe Studio. All rights reserved.</p>
                        <p>Butuh bantuan? Hubungi studio kami</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingClaimPhoto;
