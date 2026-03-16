import React, { useState } from 'react';
import { getCountryName } from '@/data/countries';
import AddressModal, { AddressFormData } from './AddressModal';
import { Enums } from 'propeller-sdk-v2';

interface AddressCardProps {
    address: any; // Use any to handle different address structures
    onEdit?: (address: any) => void;
    onDelete?: (addressId: string) => void;
    onSetDefault?: (addressId: string, type: Enums.AddressType) => void;
    showActions?: boolean;
}

const AddressCard: React.FC<AddressCardProps> = ({
    address,
    onEdit,
    onDelete,
    onSetDefault,
    showActions = true
}) => {
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const getGenderSalutation = (gender?: Enums.Gender) => {
        switch (gender) {
            case Enums.Gender.M: return 'Mr.';
            case Enums.Gender.F: return 'Mrs.';
            default: return '';
        }
    };

    const getFullName = () => {
        const parts = [
            getGenderSalutation(address.gender),
            address.firstName,
            address.middleName,
            address.lastName
        ].filter(Boolean);
        return parts.join(' ');
    };

    const getAddressLine1 = () => {
        const parts = [address.street, address.number, address.numberExtension].filter(Boolean);
        return parts.join(' ');
    };

    const getAddressLine2 = () => {
        const parts = [address.postalCode, address.city].filter(Boolean);
        return parts.join(' ');
    };

    const handleEdit = () => {
        setShowEditModal(true);
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (address.id && onDelete) {
            onDelete(String(address.id));
        }
        setShowDeleteModal(false);
    };

    const handleSetDefault = () => {
        if (address.id && address.type && onSetDefault) {
            onSetDefault(String(address.id), address.type);
        }
    };

    const handleSaveAddress = (updatedAddress: AddressFormData) => {
        if (onEdit) {
            onEdit(updatedAddress);
        }
        setShowEditModal(false);
    };

    return (
        <>
            <div className="address-card bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
                <div className="address-info flex-grow">
                    {address.company && (
                        <div className="address-company font-bold text-lg mb-1">{address.company}</div>
                    )}
                    <div className="address-name font-medium mb-1">{getFullName()}</div>
                    <div className="address-street text-gray-600">{getAddressLine1()}</div>
                    <div className="address-city text-gray-600">{getAddressLine2()}</div>
                    <div className="address-country text-gray-600">{getCountryName(address.country || '')}</div>

                    {address.isDefault === Enums.YesNo.Y && (
                        <div className="mt-2">
                            <span className="bg-violet-100 text-violet-800 text-xs px-2 py-1 rounded-full">
                                Default {address.type} Address
                            </span>
                        </div>
                    )}
                </div>

                {showActions && (
                    <div className="address-actions mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                        <button
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                            onClick={handleEdit}
                            title="Edit Address"
                        >
                            ✏️ Edit
                        </button>
                        <button
                            className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                            onClick={handleDelete}
                            title="Delete Address"
                        >
                            🗑️ Delete
                        </button>
                        {address.isDefault !== Enums.YesNo.Y && (
                            <button
                                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center gap-1 ml-auto"
                                onClick={handleSetDefault}
                                title={`Set as default ${address.type} address`}
                            >
                                ⭐ Set Default
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showEditModal && (
                <AddressModal
                    address={address}
                    onSave={handleSaveAddress}
                    onClose={() => setShowEditModal(false)}
                />
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
                        <p className="mb-6 text-gray-600">Are you sure you want to delete this address?</p>
                        <div className="flex justify-end gap-4">
                            <button
                                className="px-4 py-2 border rounded hover:bg-gray-100"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                onClick={confirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddressCard;
