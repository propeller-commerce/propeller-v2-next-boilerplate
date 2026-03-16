import { useState, useCallback, useRef } from 'react';
import {
  Modal,
  Box,
  Flex,
  Typography,
  Button,
  TextInput,
  Checkbox,
  Badge,
  Loader,
} from '@strapi/design-system';
import { Search } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import type { PickedProduct } from './ProductPickerInput';

interface SearchModalProps {
  alreadySelected: PickedProduct[];
  onConfirm: (selected: PickedProduct[]) => void;
  onClose: () => void;
}

export default function SearchModal({
  alreadySelected,
  onConfirm,
  onClose,
}: SearchModalProps) {
  const { get } = useFetchClient();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [itemsFound, setItemsFound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<PickedProduct[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const alreadyIds = new Set(
    alreadySelected.map((i) => `${i.id}-${i.isCluster}`),
  );

  const doSearch = useCallback(
    async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      try {
        const { data } = await get(
          `/propeller-product-picker/search?term=${encodeURIComponent(searchTerm)}&offset=20`,
        );
        setResults(data.items || []);
        setItemsFound(data.itemsFound || 0);
      } catch {
        setResults([]);
        setItemsFound(0);
      } finally {
        setLoading(false);
      }
    },
    [get],
  );

  const handleTermChange = useCallback(
    (value: string) => {
      setTerm(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch],
  );

  const isSelected = (item: PickedProduct) =>
    selected.some((s) => s.id === item.id && s.isCluster === item.isCluster);

  const toggleItem = (item: PickedProduct) => {
    setSelected((prev) =>
      isSelected(item)
        ? prev.filter(
            (s) => !(s.id === item.id && s.isCluster === item.isCluster),
          )
        : [...prev, item],
    );
  };

  return (
    <Modal.Root open onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Search Propeller Products</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Box paddingBottom={4}>
            <TextInput
              placeholder="Search products by name, SKU..."
              value={term}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleTermChange(e.target.value)
              }
              startAction={<Search />}
              aria-label="Search products"
            />
          </Box>

          {loading && (
            <Flex justifyContent="center" padding={6}>
              <Loader>Searching...</Loader>
            </Flex>
          )}

          {!loading && searched && results.length === 0 && (
            <Box padding={6} textAlign="center">
              <Typography variant="pi" textColor="neutral600">
                No products found for &quot;{term}&quot;
              </Typography>
            </Box>
          )}

          {!loading && results.length > 0 && (
            <>
              <Box paddingBottom={2}>
                <Typography variant="pi" textColor="neutral600">
                  {itemsFound} result{itemsFound !== 1 ? 's' : ''} found
                  {selected.length > 0 &&
                    ` \u00B7 ${selected.length} selected`}
                </Typography>
              </Box>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {results.map((item) => {
                    const key = `${item.id}-${item.isCluster}`;
                    const alreadyAdded = alreadyIds.has(key);
                    const checked = isSelected(item) || alreadyAdded;

                    return (
                      <tr
                        key={key}
                        onClick={() => !alreadyAdded && toggleItem(item)}
                        style={{
                          borderBottom: '1px solid #f0f0f0',
                          cursor: alreadyAdded ? 'default' : 'pointer',
                          background: checked ? '#f0f0ff' : 'transparent',
                          opacity: alreadyAdded ? 0.5 : 1,
                        }}
                      >
                        <td style={{ padding: '10px 8px', width: '40px' }}>
                          <Checkbox
                            checked={checked}
                            disabled={alreadyAdded}
                            aria-label={`Select ${item.name}`}
                          />
                        </td>
                        <td style={{ padding: '10px 8px', width: '52px' }}>
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
                        <td style={{ padding: '10px 8px' }}>
                          <Typography variant="omega" fontWeight="semiBold">
                            {item.name}
                          </Typography>
                          <br />
                          <Typography variant="pi" textColor="neutral600">
                            SKU: {item.sku || '—'}
                          </Typography>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <Badge active={item.isCluster}>
                            {item.isCluster ? 'Cluster' : 'Product'}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          {alreadyAdded && (
                            <Typography variant="pi" textColor="neutral600">
                              Already added
                            </Typography>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">Cancel</Button>
          </Modal.Close>
          <Button
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
          >
            Add {selected.length > 0 ? `${selected.length} ` : ''}product
            {selected.length !== 1 ? 's' : ''}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
