import React, { useState } from 'react';
import { countries } from '@/data/countries';
import { Enums } from 'propeller-sdk-v2';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface AddressFormData {
    id?: string;
    type?: Enums.AddressType | Enums.CartAddressType;
    firstName?: string;
    lastName?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    company?: string;
    gender?: Enums.Gender;
    middleName?: string;
    number?: string;
    numberExtension?: string;
    email?: string;
    mobile?: string;
    phone?: string;
    notes?: string;
    isDefault?: string;
}

interface AddressModalProps {
    address?: AddressFormData;
    addressType?: Enums.AddressType | Enums.CartAddressType; // For creating new addresses
    onSave: (address: AddressFormData) => void;
    onClose: () => void;
    isInline?: boolean; // If true, renders without modal overlay (for checkout)
}

const AddressModal: React.FC<AddressModalProps> = ({
    address,
    addressType,
    onSave,
    onClose,
    isInline = false
}) => {
    const [formData, setFormData] = useState<AddressFormData>({
        firstName: '',
        lastName: '',
        street: '',
        postalCode: '',
        city: '',
        country: 'NL',
        company: '',
        gender: Enums.Gender.M,
        middleName: '',
        number: '',
        numberExtension: '',
        email: '',
        mobile: '',
        phone: '',
        notes: '',
        type: address?.type || addressType || Enums.AddressType.invoice || Enums.CartAddressType.INVOICE,
        ...address
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-4">
            {!isInline && (
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{address ? 'Edit Address' : 'New Address'}</h3>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Gender</label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                        <option value={Enums.Gender.M}>Male</option>
                        <option value={Enums.Gender.F}>Female</option>
                        <option value={Enums.Gender.U}>Unknown</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Company (Optional)</label>
                    <Input name="company" value={formData.company || ''} onChange={handleChange} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">First Name *</label>
                    <Input name="firstName" value={formData.firstName || ''} onChange={handleChange} required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Middle Name</label>
                    <Input name="middleName" value={formData.middleName || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Last Name *</label>
                    <Input name="lastName" value={formData.lastName || ''} onChange={handleChange} required />
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8">
                    <label className="block text-sm font-medium mb-1">Street *</label>
                    <Input name="street" value={formData.street || ''} onChange={handleChange} required />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Number *</label>
                    <Input name="number" value={formData.number || ''} onChange={handleChange} required />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Ext</label>
                    <Input name="numberExtension" value={formData.numberExtension || ''} onChange={handleChange} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Postal Code *</label>
                    <Input name="postalCode" value={formData.postalCode || ''} onChange={handleChange} required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">City *</label>
                    <Input name="city" value={formData.city || ''} onChange={handleChange} required />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Country *</label>
                <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    required
                >
                    {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input type="email" name="email" value={formData.email || ''} onChange={handleChange} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                {!isInline && <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>}
                <Button type="submit">Save Address</Button>
            </div>
        </form>
    );

    if (isInline) {
        return <div className="bg-white p-4 rounded-lg border">{formContent}</div>;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 shadow-xl">
                {formContent}
            </div>
        </div>
    );
};

export default AddressModal;
