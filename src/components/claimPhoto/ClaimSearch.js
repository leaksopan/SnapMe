import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { searchPhotoFolders } from '../../utils/api/photoFolders';
import { Search, Phone, User, Loader2, FolderOpen, ImageIcon, Calendar } from 'lucide-react';

const ClaimSearch = ({ onSelectFolder, savedResults, onResultsChange }) => {
    const [searchTerm, setSearchTerm] = useState(savedResults?.searchTerm || '');
    const [searchType, setSearchType] = useState(savedResults?.searchType || 'phone');
    const [results, setResults] = useState(savedResults?.results || []);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!savedResults?.results);
    const [error, setError] = useState(null);

    // Save results to parent when they change
    useEffect(() => {
        if (onResultsChange && searched) {
            onResultsChange({ searchTerm, searchType, results });
        }
    }, [results, searchTerm, searchType, searched, onResultsChange]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);

        try {
            // forCustomer: true ensures only 'ready' or 'claimed' folders are returned
            const { data, error: searchError } = await searchPhotoFolders(
                searchTerm,
                searchType,
                { forCustomer: true }
            );

            if (searchError) {
                setError('Terjadi kesalahan saat mencari. Silakan coba lagi.');
                setResults([]);
                return;
            }

            setResults(data || []);
        } catch (err) {
            setError('Terjadi kesalahan. Silakan coba lagi.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
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
        <div className="w-full max-w-xl mx-auto">
            {/* Search Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Ambil Foto Anda</h2>
                <p className="text-muted-foreground">
                    Masukkan nomor HP atau nama yang terdaftar saat sesi foto
                </p>
            </div>

            {/* Search Type Toggle */}
            <div className="flex justify-center gap-2 mb-4">
                <Button
                    variant={searchType === 'phone' ? 'default' : 'outline'}
                    onClick={() => setSearchType('phone')}
                    className="gap-2"
                >
                    <Phone className="w-4 h-4" />
                    Nomor HP
                </Button>
                <Button
                    variant={searchType === 'name' ? 'default' : 'outline'}
                    onClick={() => setSearchType('name')}
                    className="gap-2"
                >
                    <User className="w-4 h-4" />
                    Nama
                </Button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder={searchType === 'phone' ? 'Contoh: 08123456789' : 'Contoh: John Doe'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="pl-11 h-12 text-lg"
                    />
                </div>
                <Button
                    onClick={handleSearch}
                    disabled={loading || !searchTerm.trim()}
                    className="h-12 px-6"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        'Cari'
                    )}
                </Button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-center p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Results */}
            {searched && !loading && (
                <div className="space-y-3">
                    {results.length === 0 ? (
                        <div className="text-center p-8 bg-muted/50 rounded-lg">
                            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                            <p className="font-medium mb-2">Foto tidak ditemukan</p>
                            <p className="text-sm text-muted-foreground">
                                Pastikan {searchType === 'phone' ? 'nomor HP' : 'nama'} yang Anda masukkan sudah benar.
                                <br />
                                Jika masih tidak ditemukan, silakan hubungi studio.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground mb-3">
                                Ditemukan {results.length} sesi foto
                            </p>
                            {results.map((folder) => (
                                <div
                                    key={folder.id}
                                    onClick={() => onSelectFolder(folder)}
                                    className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-lg">{folder.customerName}</p>
                                            {folder.packageName && (
                                                <p className="text-muted-foreground">{folder.packageName}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(folder.createdAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ImageIcon className="w-4 h-4" />
                                                    {folder.photoCount} foto
                                                </span>
                                            </div>
                                        </div>
                                        <Badge
                                            className={folder.status === 'claimed'
                                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                                : 'bg-green-500/10 text-green-600 border-green-500/20'
                                            }
                                        >
                                            {folder.status === 'claimed' ? 'Sudah Diambil' : 'Siap Diambil'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClaimSearch;
