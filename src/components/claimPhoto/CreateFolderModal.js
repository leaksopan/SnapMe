import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { createPhotoFolder, validateFolderData } from '../../utils/api/photoFolders';
import { Loader2 } from 'lucide-react';

const CreateFolderModal = ({ open, onOpenChange, onCreated }) => {
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        packageName: ''
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        // Clear error on change
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const validation = validateFolderData(formData);
        if (!validation.valid) {
            const newErrors = {};
            validation.errors.forEach(err => {
                if (err.includes('customer_name')) newErrors.customerName = 'Nama wajib diisi';
                if (err.includes('customer_phone')) newErrors.customerPhone = 'No. HP wajib diisi';
            });
            setErrors(newErrors);
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setSubmitting(true);
        try {
            const { data, error } = await createPhotoFolder({
                customerName: formData.customerName.trim(),
                customerPhone: formData.customerPhone.trim(),
                customerEmail: formData.customerEmail.trim() || null,
                packageName: formData.packageName.trim() || null
            });

            if (error) {
                alert('Gagal membuat folder: ' + error.message);
                return;
            }

            // Reset form
            setFormData({
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                packageName: ''
            });
            setErrors({});

            onCreated?.(data);
            onOpenChange(false);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setFormData({
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                packageName: ''
            });
            setErrors({});
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Buat Folder Baru</DialogTitle>
                    <DialogDescription>
                        Buat folder foto untuk customer baru
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Customer Name - Required */}
                    <div className="space-y-2">
                        <Label htmlFor="customerName">
                            Nama Customer <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="customerName"
                            value={formData.customerName}
                            onChange={handleChange('customerName')}
                            placeholder="Masukkan nama customer"
                            className={errors.customerName ? 'border-red-500' : ''}
                        />
                        {errors.customerName && (
                            <p className="text-xs text-red-500">{errors.customerName}</p>
                        )}
                    </div>

                    {/* Customer Phone - Required */}
                    <div className="space-y-2">
                        <Label htmlFor="customerPhone">
                            No. HP <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="customerPhone"
                            value={formData.customerPhone}
                            onChange={handleChange('customerPhone')}
                            placeholder="OPSIONAL"
                            className={errors.customerPhone ? 'border-red-500' : ''}
                        />
                        {errors.customerPhone && (
                            <p className="text-xs text-red-500">{errors.customerPhone}</p>
                        )}
                    </div>

                    {/* Customer Email - Optional */}
                    <div className="space-y-2">
                        <Label htmlFor="customerEmail">Email (opsional)</Label>
                        <Input
                            id="customerEmail"
                            type="email"
                            value={formData.customerEmail}
                            onChange={handleChange('customerEmail')}
                            placeholder="email@example.com"
                        />
                    </div>

                    {/* Package Name - Optional */}
                    <div className="space-y-2">
                        <Label htmlFor="packageName">Paket (opsional)</Label>
                        <Input
                            id="packageName"
                            value={formData.packageName}
                            onChange={handleChange('packageName')}
                            placeholder="Nama paket foto"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Buat Folder'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { CreateFolderModal };
