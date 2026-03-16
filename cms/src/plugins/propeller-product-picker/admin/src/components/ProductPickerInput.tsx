import { useState, useCallback } from 'react';
import {
  Field,
  Box,
  Flex,
  Typography,
  Button,
  IconButton,
  Badge,
} from '@strapi/design-system';
import { Trash, Plus, ArrowUp, ArrowDown } from '@strapi/icons';
import SearchModal from './SearchModal';

export interface PickedProduct {
  id: number;
  name: string;
  sku: string;
  imageUrl: string;
  isCluster: boolean;
}

interface ProductPickerInputProps {
  name: string;
  value: string | PickedProduct[] | null;
  onChange: (event: { target: { name: string; value: string; type: string } }) => void;
  attribute: { type: string };
  disabled?: boolean;
  error?: string;
  required?: boolean;
  label?: string;
  hint?: string;
}

function parseValue(value: string | PickedProduct[] | null): PickedProduct[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ProductPickerInput({
  name,
  value,
  onChange,
  attribute,
  disabled = false,
  error,
  required = false,
  label,
  hint,
}: ProductPickerInputProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const items = parseValue(value);

  const emitChange = useCallback(
    (next: PickedProduct[]) => {
      onChange({
        target: {
          name,
          value: JSON.stringify(next),
          type: attribute.type,
        },
      });
    },
    [name, attribute.type, onChange],
  );

  const handleAdd = useCallback(
    (selected: PickedProduct[]) => {
      const existing = new Set(items.map((i) => `${i.id}-${i.isCluster}`));
      const merged = [
        ...items,
        ...selected.filter((s) => !existing.has(`${s.id}-${s.isCluster}`)),
      ];
      emitChange(merged);
      setModalOpen(false);
    },
    [items, emitChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const next = items.filter((_, i) => i !== index);
      emitChange(next);
    },
    [items, emitChange],
  );

  const handleMove = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      emitChange(next);
    },
    [items, emitChange],
  );

  return (
    <Field.Root name={name} error={error} required={required} hint={hint}>
      {label && <Field.Label>{label}</Field.Label>}

      <Box
        padding={4}
        hasRadius
        background="neutral0"
        borderColor="neutral200"
        borderStyle="solid"
        borderWidth="1px"
      >
        {items.length === 0 && (
          <Box paddingBottom={4}>
            <Typography variant="pi" textColor="neutral600">
              No products selected. Click &quot;Add products&quot; to search and select.
            </Typography>
          </Box>
        )}

        {items.length > 0 && (
          <Box paddingBottom={4}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #dcdce4' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600 }}></th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: 600 }}>Order</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.id}-${item.isCluster}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px', width: '48px' }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: 'contain',
                            borderRadius: 4,
                            background: '#f6f6f9',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 4,
                            background: '#f6f6f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: '#999',
                          }}
                        >
                          N/A
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Typography variant="omega" fontWeight="semiBold">
                        {item.name}
                      </Typography>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Typography variant="pi" textColor="neutral600">
                        {item.sku}
                      </Typography>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Badge active={item.isCluster}>
                        {item.isCluster ? 'Cluster' : 'Product'}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <Flex justifyContent="center" gap={1}>
                        <IconButton
                          label="Move up"
                          onClick={() => handleMove(index, -1)}
                          disabled={disabled || index === 0}
                          variant="ghost"
                          size="S"
                        >
                          <ArrowUp />
                        </IconButton>
                        <IconButton
                          label="Move down"
                          onClick={() => handleMove(index, 1)}
                          disabled={disabled || index === items.length - 1}
                          variant="ghost"
                          size="S"
                        >
                          <ArrowDown />
                        </IconButton>
                      </Flex>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <IconButton
                        label="Remove"
                        onClick={() => handleRemove(index)}
                        disabled={disabled}
                        variant="ghost"
                        size="S"
                      >
                        <Trash />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}

        <Button
          startIcon={<Plus />}
          variant="secondary"
          onClick={() => setModalOpen(true)}
          disabled={disabled}
          size="S"
        >
          Add products
        </Button>
      </Box>

      <Field.Error />
      <Field.Hint />

      {modalOpen && (
        <SearchModal
          alreadySelected={items}
          onConfirm={handleAdd}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Field.Root>
  );
}
