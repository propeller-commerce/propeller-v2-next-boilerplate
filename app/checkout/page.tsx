'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSummary from '@/components/propeller/CartSummary';
import AddressCard from '@/components/propeller/AddressCard';

import { cartService, orderService, graphqlClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Cart, CartUpdateAddressInput, CartUpdateInput, AddressService, Contact, Customer, Company } from 'propeller-sdk-v2';
import { deserializeCart, serializeCart } from '@/utils/cartHelpers';
import CartPaymethods from '@/components/propeller/CartPaymethods';
import CartCarriers from '@/components/propeller/CartCarriers';
import DeliveryDate from '@/components/propeller/DeliveryDate';
import CartOverview from '@/components/propeller/CartOverview';
import ItemsOverview from '@/components/propeller/ItemsOverview';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import { Enums } from 'propeller-sdk-v2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Check, Truck, CreditCard, Calendar } from 'lucide-react';

const CartAddressType = {
  INVOICE: Enums.CartAddressType.INVOICE,
  DELIVERY: Enums.CartAddressType.DELIVERY
}

interface CheckoutState {
  currentStep: number;
  cart: Cart | null;
  selectedPayment: string;
  selectedCarrier: string;
  selectedDeliveryDate: string;
  loading: boolean;
  error: string | null;
  sameAsInvoice: boolean;
  step3Submitted: boolean;
}

const COUNTRIES = [
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQuoteMode = searchParams?.get('mode') === 'quote';
  const { language } = useLanguage();
  const { cart: contextCart, getCart } = useCart();
  const { state: authState, refreshUser } = useAuth();
  const [state, setState] = useState<CheckoutState>({
    currentStep: 1,
    cart: null,
    selectedPayment: '',
    selectedCarrier: '',
    selectedDeliveryDate: '',
    loading: false,
    error: null,
    sameAsInvoice: false,
    step3Submitted: false
  });
  const sameAsInvoiceRef = useRef(false);
  const orderPlacedRef = useRef(false);
  const [quoteReference, setQuoteReference] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');

  useEffect(() => {
    // Wait for auth to finish hydrating before initializing checkout
    // This prevents the flash where addresses aren't loaded yet
    if (authState.isLoading) return;

    /** Get the user's default address of a given type */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getUserDefaultAddress = (type: 'invoice' | 'delivery'): any | null => {
      const user = authState.user;
      if (!user) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let addresses: any[] = [];
      if (isContact(user)) {
        const company = getActiveCompany();
        if (company) addresses = company.addresses || [];
      } else if (isCustomer(user)) {
        addresses = user.addresses || [];
      }

      const addressType = type === 'invoice' ? Enums.AddressType.invoice : Enums.AddressType.delivery;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return addresses.find((a: any) => a.type === addressType && a.isDefault === 'Y')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        || addresses.find((a: any) => a.type === addressType)
        || null;
    };

    const initializeCheckout = async () => {
      let cartToUse = contextCart;
      if (!cartToUse) {
        const cartData = localStorage.getItem('cart');
        if (cartData) cartToUse = deserializeCart(cartData);
      }

      if (!cartToUse || !cartToUse.items || cartToUse.items.length === 0) {
        if (!orderPlacedRef.current) {
          router.replace(localizeHref('/cart', language));
        }
        return;
      }

      if (cartToUse && cartToUse.items && cartToUse.items.length > 0) {
        const hasInvoiceAddress = !!cartToUse.invoiceAddress?.street;
        const hasDeliveryAddress = !!cartToUse.deliveryAddress?.street;

        // If user is logged in and cart is missing addresses, pre-populate from user's defaults
        if (authState.isAuthenticated && (!hasInvoiceAddress || !hasDeliveryAddress)) {
          try {
            // Ensure CartService mutations are loaded before calling updateCartAddress
            await cartService.initializeService();
            let updatedCart = cartToUse;

            if (!hasInvoiceAddress) {
              const defaultInvoice = getUserDefaultAddress('invoice');
              if (defaultInvoice) {
                const input: CartUpdateAddressInput = {
                  type: Enums.CartAddressType.INVOICE,
                  firstName: defaultInvoice.firstName || '',
                  lastName: defaultInvoice.lastName || '',
                  street: defaultInvoice.street || '',
                  postalCode: defaultInvoice.postalCode || '',
                  city: defaultInvoice.city || '',
                  company: defaultInvoice.company,
                  gender: defaultInvoice.gender,
                  middleName: defaultInvoice.middleName,
                  number: defaultInvoice.number,
                  numberExtension: defaultInvoice.numberExtension,
                  country: defaultInvoice.country,
                  email: defaultInvoice.email,
                  mobile: defaultInvoice.mobile,
                  phone: defaultInvoice.phone,
                };
                updatedCart = await cartService.updateCartAddress({
                  id: updatedCart.cartId,
                  input,
                  imageVariantFilters: imageVariantFiltersSmall,
                  imageSearchFilters: imageSearchFiltersGrid,
                  language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
                });
              }
            }

            if (!hasDeliveryAddress) {
              const defaultDelivery = getUserDefaultAddress('delivery');
              if (defaultDelivery) {
                const input: CartUpdateAddressInput = {
                  type: Enums.CartAddressType.DELIVERY,
                  firstName: defaultDelivery.firstName || '',
                  lastName: defaultDelivery.lastName || '',
                  street: defaultDelivery.street || '',
                  postalCode: defaultDelivery.postalCode || '',
                  city: defaultDelivery.city || '',
                  company: defaultDelivery.company,
                  gender: defaultDelivery.gender,
                  middleName: defaultDelivery.middleName,
                  number: defaultDelivery.number,
                  numberExtension: defaultDelivery.numberExtension,
                  country: defaultDelivery.country,
                  email: defaultDelivery.email,
                  mobile: defaultDelivery.mobile,
                  phone: defaultDelivery.phone,
                };
                updatedCart = await cartService.updateCartAddress({
                  id: updatedCart.cartId,
                  input,
                  imageVariantFilters: imageVariantFiltersSmall,
                  imageSearchFilters: imageSearchFiltersGrid,
                  language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
                });
              }
            }

            localStorage.setItem('cart', serializeCart(updatedCart));
            cartToUse = updatedCart;
          } catch (error) {
            console.error('Error pre-populating cart addresses:', error);
          }
        }

        setState(prev => {
          // Skip if cart hasn't changed (prevents overriding step set by handleAddressSubmit)
          if (
            prev.cart?.cartId === cartToUse?.cartId &&
            prev.cart?.invoiceAddress?.street === cartToUse?.invoiceAddress?.street &&
            prev.cart?.deliveryAddress?.street === cartToUse?.deliveryAddress?.street
          ) return prev;
          const updatedHasInvoice = !!cartToUse?.invoiceAddress?.street;
          const updatedHasDelivery = !!cartToUse?.deliveryAddress?.street;
          if (updatedHasInvoice && updatedHasDelivery) {
            return { ...prev, cart: cartToUse, currentStep: 3 };
          } else if (updatedHasInvoice) {
            return { ...prev, cart: cartToUse, currentStep: 2 };
          } else {
            return { ...prev, cart: cartToUse, currentStep: 1 };
          }
        });
      }
    };
    initializeCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextCart, router, authState.isAuthenticated, authState.isLoading, authState.user]);

  useEffect(() => {
    if (state.currentStep) {
      setTimeout(() => {
        const activeStep = document.querySelector('.step-active');
        if (activeStep) {
          // Optional: scroll behavior
        }
      }, 100);
    }
  }, [state.currentStep]);

  const isContact = (u: Contact | Customer | null): u is Contact => u !== null && 'company' in u;
  const isCustomer = (u: Contact | Customer | null): u is Customer => u !== null && 'customerId' in u;

  const getActiveCompany = (): Company | null => {
    const user = authState.user;
    if (!user || !isContact(user)) return null;
    const stored = localStorage.getItem('selected_company_id');
    if (stored) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const companiesRaw = (user as any).companies;
      const items = (companiesRaw?.items ?? companiesRaw?._items ?? companiesRaw) as Company[] | undefined;
      if (Array.isArray(items)) {
        const found = items.find((c: Company) => c.companyId === parseInt(stored, 10));
        if (found) return found;
      }
    }
    return (user.company as Company | undefined) ?? null;
  };

  /** Update the user's account address and refresh user data from API */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateUserAddress = async (addressData: any, type: string) => {
    const user = authState.user;
    if (!user) return;

    const addressService = new AddressService(graphqlClient);
    const addressType = type === CartAddressType.INVOICE ? Enums.AddressType.invoice : Enums.AddressType.delivery;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let addresses: any[] = [];
    const company = isContact(user) ? getActiveCompany() : null;
    if (isContact(user)) {
      if (!company) return;
      addresses = company.addresses || [];
    } else if (isCustomer(user)) {
      addresses = user.addresses || [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchedAddr = addresses.find((a: any) => a.type === addressType && a.isDefault === 'Y')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      || addresses.find((a: any) => a.type === addressType);

    if (!matchedAddr?.id) return;

    try {
      const commonFields = {
        id: Number(matchedAddr.id),
        company: addressData.company,
        gender: addressData.gender,
        firstName: addressData.firstName,
        middleName: addressData.middleName,
        lastName: addressData.lastName,
        email: addressData.email,
        street: addressData.street,
        number: addressData.number,
        numberExtension: addressData.numberExtension,
        postalCode: addressData.postalCode,
        city: addressData.city,
        country: addressData.country,
        isDefault: matchedAddr.isDefault,
      };

      if (isContact(user) && company) {
        await addressService.updateCompanyAddress({
          ...commonFields,
          companyId: company.companyId,
        });
      } else if (isCustomer(user)) {
        await addressService.updateCustomerAddress({
          ...commonFields,
          customerId: user.customerId,
        });
      }

      await refreshUser();
    } catch (error) {
      console.error('Error updating user address:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddressSubmit = async (addressData: any, type: string, advance = true) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const d = addressData as Record<string, string | boolean | undefined>;
      const input: CartUpdateAddressInput = {
        type: type as Enums.CartAddressType,
        firstName: (d.firstName as string) || '',
        lastName: (d.lastName as string) || '',
        street: (d.street as string) || '',
        postalCode: (d.postalCode as string) || '',
        city: (d.city as string) || '',
        company: d.company as string | undefined,
        gender: d.gender as Enums.Gender | undefined,
        middleName: d.middleName as string | undefined,
        number: d.number as string | undefined,
        numberExtension: d.numberExtension as string | undefined,
        country: d.country as string | undefined,
        email: d.email as string | undefined,
        mobile: d.mobile as string | undefined,
        phone: d.phone as string | undefined,
        notes: d.notes as string | undefined,
        icp: d.icp as Enums.YesNo | undefined,
      };

      const variables = {
        id: state.cart!.cartId,
        input: input,
        imageVariantFilters: imageVariantFiltersSmall,
        imageSearchFilters: imageSearchFiltersGrid,
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
      };

      const updatedCart = await cartService.updateCartAddress(variables);
      localStorage.setItem('cart', serializeCart(updatedCart));

      // When editing an existing address and user is logged in, also update user's account address
      if (!advance && authState.isAuthenticated) {
        await updateUserAddress(addressData, type);
      }

      // Anonymous user: if "same as invoice" is checked, also save as delivery address
      if (advance && type === CartAddressType.INVOICE && !authState.isAuthenticated && sameAsInvoiceRef.current) {
        const deliveryInput: CartUpdateAddressInput = {
          ...input,
          type: Enums.CartAddressType.DELIVERY,
        };
        const cartWithDelivery = await cartService.updateCartAddress({
          id: updatedCart.cartId,
          input: deliveryInput,
          imageVariantFilters: imageVariantFiltersSmall,
          imageSearchFilters: imageSearchFiltersGrid,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
        });
        localStorage.setItem('cart', serializeCart(cartWithDelivery));
        setState(prev => ({
          ...prev,
          cart: cartWithDelivery,
          currentStep: 3, // Skip delivery step
          loading: false
        }));
        return;
      }

      let nextStep = (prev: CheckoutState) => prev.currentStep;
      if (advance) {
        const hasInvoice = !!updatedCart.invoiceAddress?.street;
        const hasDelivery = !!updatedCart.deliveryAddress?.street;
        if (hasInvoice && hasDelivery) {
          nextStep = () => 3;
        } else if (hasInvoice) {
          nextStep = () => 2;
        } else {
          nextStep = prev => prev.currentStep + 1;
        }
      }

      setState(prev => ({
        ...prev,
        cart: updatedCart,
        currentStep: advance ? nextStep(prev) : prev.currentStep,
        loading: false
      }));

    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, error: 'Failed to save address', loading: false }));
    }
  };

  const handleStep3Continue = async () => {
    if (!state.selectedPayment || !state.selectedCarrier || !state.selectedDeliveryDate) {
      setState(prev => ({ ...prev, step3Submitted: true }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const input: CartUpdateInput = {
        paymentData: { method: state.selectedPayment },
        postageData: { carrier: state.selectedCarrier, requestDate: state.selectedDeliveryDate }
      };

      const updatedCart = await cartService.updateCart({
        id: state.cart!.cartId,
        input: input,
        imageVariantFilters: imageVariantFiltersSmall,
        imageSearchFilters: imageSearchFiltersGrid,
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
      });

      localStorage.setItem('cart', serializeCart(updatedCart));
      setState(prev => ({ ...prev, cart: updatedCart, currentStep: 4, loading: false }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, error: 'Failed to update cart', loading: false }));
    }
  };

  const handlePlaceOrder = async (reference?: string, notes?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      orderPlacedRef.current = true;
      if (reference || notes) {
        await cartService.updateCart({
          id: state.cart!.cartId,
          input: { reference: reference || undefined, notes: notes || undefined },
          imageVariantFilters: imageVariantFiltersSmall,
          imageSearchFilters: imageSearchFiltersGrid,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
        });
      }

      const orderStatus = isQuoteMode ? 'REQUEST' : 'NEW';
      const response = await cartService.processCart({
        id: state.cart!.cartId,
        input: { orderStatus: orderStatus as string, language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL' }
      });

      if (response?.cartOrderId) {
        const orderId = response.cartOrderId;
        const orderServiceResponse = await orderService.setOrderStatus({
          orderId: orderId,
          status: orderStatus as string,
          payStatus: Enums.PaymentStatuses.OPEN,
          sendOrderConfirmationEmail: isQuoteMode ? false : true,
          addPDFAttachment: isQuoteMode ? false : true,
          triggerOrderSendConfirmEvent: isQuoteMode ? false : true,
          deleteCart: true
        });

        if (orderServiceResponse?.id === orderId) {
          if (isQuoteMode) {
            await orderService.triggerQuoteSendRequest({
              orderId: orderId,
              language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
            });
          }

          localStorage.removeItem('cart');
          const managerCart = localStorage.getItem('manager_cart');
          if (managerCart) {
            localStorage.setItem('cart', managerCart);
            localStorage.removeItem('manager_cart');
          }
          if (getCart) await getCart();
        }
        const thankYouUrl = isQuoteMode
          ? localizeHref(`/checkout/thank-you/${orderId}`, language) + '?mode=quote'
          : localizeHref(`/checkout/thank-you/${orderId}`, language);
        router.push(thankYouUrl);
      } else {
        throw new Error("No Order ID returned");
      }

    } catch (error) {
      console.error(error);
      orderPlacedRef.current = false;
      setState(prev => ({ ...prev, error: isQuoteMode ? 'Failed to submit quote request' : 'Failed to place order', loading: false }));
    }
  };

  if (!state.cart) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Header />
        <main className="flex-1 py-8">
          <div className="container-width max-w-7xl">
            <h1 className="text-3xl font-bold mb-8">Checkout</h1>

            {/* Skeleton step indicator */}
            <div className="flex justify-between max-w-2xl mb-8 px-2">
              {['Details', 'Shipping', 'Payment', 'Review'].map((label, i) => (
                <React.Fragment key={label}>
                  {i > 0 && <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />}
                  <div className="flex items-center gap-2 text-muted-foreground/50">
                    <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center text-sm">{i + 1}</div>
                    <span className="hidden md:inline">{label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left column skeleton */}
              <div className="lg:w-2/3 space-y-6">
                {[1, 2, 3].map((n) => (
                  <Card key={n} className="opacity-60">
                    <CardHeader>
                      <div className="h-5 w-48 bg-muted rounded animate-pulse" />
                    </CardHeader>
                    {n === 1 && (
                      <CardContent className="space-y-3">
                        <div className="h-4 w-full bg-muted rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Right column skeleton */}
              <div className="lg:w-1/3">
                <div className="sticky top-24 space-y-6">
                  <Card className="border-none opacity-60">
                    <CardHeader className="p-0 px-6 pt-6">
                      <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      {[1, 2].map((n) => (
                        <div key={n} className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-muted rounded animate-pulse shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="border-none opacity-60">
                    <CardContent className="space-y-3 pt-6">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      <div className="space-y-2">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="flex justify-between">
                            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  interface StepIndicatorProps {
    step: number;
    currentStep: number;
    title: string;
  }

  const StepIndicator = ({ step, currentStep, title }: StepIndicatorProps) => {
    const isActive = currentStep === step;
    const isCompleted = currentStep > step;
    return (
      <div className={`flex items-center gap-2 ${isActive ? 'text-primary font-bold' : isCompleted ? 'text-secondary' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? 'border-primary bg-primary text-primary-foreground' : isCompleted ? 'border-secondary bg-secondary/10 text-secondary' : 'border-muted-foreground/30'}`}>
          {isCompleted ? <Check className="w-4 h-4" /> : step}
        </div>
        <span className="hidden md:inline">{title}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width max-w-7xl">
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          {/* Progress Stages (Simplified) */}
          <div className="flex justify-between max-w-2xl mb-8 px-2">
            <StepIndicator step={1} currentStep={state.currentStep} title="Details" />
            <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />
            <StepIndicator step={2} currentStep={state.currentStep} title="Shipping" />
            {!isQuoteMode && (
              <>
                <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />
                <StepIndicator step={3} currentStep={state.currentStep} title="Payment" />
              </>
            )}
            <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />
            <StepIndicator step={isQuoteMode ? 3 : 4} currentStep={state.currentStep} title="Review" />
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3 space-y-6">
              {state.error && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md text-destructive text-sm font-medium">
                  {state.error}
                </div>
              )}

              {/* Step 1: Invoice Address */}
              <Card className={`${state.currentStep === 1 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                <CardHeader className="cursor-pointer" onClick={() => state.currentStep > 1 && setState(prev => ({ ...prev, currentStep: 1 }))}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">1. Invoice Address</CardTitle>
                    {state.currentStep > 1 && state.cart?.invoiceAddress?.street && (
                      <Badge variant="outline" className="text-muted-foreground font-normal">
                        {state.cart.invoiceAddress.street} {state.cart.invoiceAddress.number}, {state.cart.invoiceAddress.city}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {state.currentStep === 1 && (
                  <CardContent className="animate-in slide-in-from-top-2">
                    {state.cart.invoiceAddress?.street ? (
                      <div className="space-y-4">
                        <AddressCard
                          address={state.cart.invoiceAddress}
                          showEmail
                          enableDelete={false}
                          enableSetDefault={false}
                          onEdit={(addr) => handleAddressSubmit(addr, CartAddressType.INVOICE, false)}
                          countries={COUNTRIES}
                        />
                        <Button onClick={() => setState(prev => ({ ...prev, currentStep: 2 }))}>
                          Confirm Invoice Address
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AddressCard
                          address={null}
                          inline
                          isNew
                          addressType={CartAddressType.INVOICE}
                          showIcp={false}
                          beforeSave={() => setState(prev => ({ ...prev, loading: true, error: null }))}
                          onEdit={(addr) => handleAddressSubmit(addr, CartAddressType.INVOICE)}
                          countries={COUNTRIES}
                        />
                        {!authState.isAuthenticated && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.sameAsInvoice}
                              onChange={(e) => { sameAsInvoiceRef.current = e.target.checked; setState(prev => ({ ...prev, sameAsInvoice: e.target.checked })); }}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            Delivery address same as invoice address
                          </label>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Step 2: Delivery Address */}
              <Card className={`${state.currentStep === 2 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                <CardHeader className="cursor-pointer" onClick={() => state.currentStep > 2 && setState(prev => ({ ...prev, currentStep: 2 }))}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">2. Shipping Address</CardTitle>
                    {state.currentStep > 2 && state.cart?.deliveryAddress?.street && (
                      <Badge variant="outline" className="text-muted-foreground font-normal">
                        {state.cart.deliveryAddress.street} {state.cart.deliveryAddress.number}, {state.cart.deliveryAddress.city}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {state.currentStep === 2 && (
                  <CardContent className="animate-in slide-in-from-top-2">
                    {state.cart.deliveryAddress?.street ? (
                      <div className="space-y-4">
                        <AddressCard
                          address={state.cart.deliveryAddress}
                          showEmail
                          enableDelete={false}
                          enableSetDefault={false}
                          onEdit={(addr) => handleAddressSubmit(addr, CartAddressType.DELIVERY, false)}
                          countries={COUNTRIES}
                        />
                        <div className="flex gap-4">
                          <Button variant="outline" onClick={() => setState(prev => ({ ...prev, currentStep: 1 }))}>Back</Button>
                          <Button onClick={() => setState(prev => ({ ...prev, currentStep: 3 }))}>Confirm Delivery Address</Button>
                        </div>
                      </div>
                    ) : (
                      <AddressCard
                        address={null}
                        inline
                        isNew
                        addressType={CartAddressType.DELIVERY}
                        showIcp={false}
                        beforeSave={() => setState(prev => ({ ...prev, loading: true, error: null }))}
                        onEdit={(addr) => handleAddressSubmit(addr, CartAddressType.DELIVERY)}
                        countries={COUNTRIES}
                      />
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Step 3: Payment & Delivery Method (normal mode only) */}
              {!isQuoteMode && <Card className={`${state.currentStep === 3 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                <CardHeader className="cursor-pointer" onClick={() => state.currentStep > 3 && setState(prev => ({ ...prev, currentStep: 3 }))}>
                  <CardTitle className="text-lg flex items-center gap-2">3. Payment & Delivery</CardTitle>
                </CardHeader>
                {state.currentStep === 3 && (
                  <CardContent className="space-y-8 animate-in slide-in-from-top-2">
                    {/* Payment */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Method</h3>
                      {state.step3Submitted && !state.selectedPayment && (
                        <p className="text-sm text-destructive">Please select a payment method</p>
                      )}
                      <CartPaymethods
                        user={authState.user}
                        cart={state.cart}
                        onPaymethodSelect={(method) => setState(prev => ({ ...prev, selectedPayment: method.code }))}
                      />
                    </div>

                    {/* Carrier */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"><Truck className="w-4 h-4" /> Carrier</h3>
                      {state.step3Submitted && !state.selectedCarrier && (
                        <p className="text-sm text-destructive">Please select a carrier</p>
                      )}
                      <CartCarriers
                        cart={state.cart}
                        showPrice={false}
                        onCarrierSelect={(carrier) => setState(prev => ({ ...prev, selectedCarrier: carrier.name }))}
                      />
                    </div>

                    {/* Delivery Date */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"><Calendar className="w-4 h-4" /> Delivery Date</h3>
                      {state.step3Submitted && !state.selectedDeliveryDate && (
                        <p className="text-sm text-destructive">Please select a delivery date</p>
                      )}
                      <DeliveryDate
                        onDateSelect={(date) => setState(prev => ({ ...prev, selectedDeliveryDate: date }))}
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button variant="outline" onClick={() => setState(prev => ({ ...prev, currentStep: 2 }))}>Back</Button>
                      <Button onClick={handleStep3Continue} isLoading={state.loading}>Continue to Review</Button>
                    </div>
                  </CardContent>
                )}
              </Card>}

              {/* Step 4 (normal): Review & Place Order */}
              {!isQuoteMode && (
                <Card className={`${state.currentStep === 4 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">4. Review & Place Order</CardTitle>
                  </CardHeader>
                  {state.currentStep === 4 && (
                    <CardContent className="animate-in slide-in-from-top-2">
                      <CartOverview
                        graphqlClient={graphqlClient}
                        cart={state.cart}
                        onTermsAndConditionsClick={() => window.open('/terms-conditions', '_blank')}
                        onPurchaseButtonClick={(_cart, reference, notes) => handlePlaceOrder(reference, notes)}
                      />
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Step 3 (quote mode): Quote Details */}
              {isQuoteMode && (
                <Card className={`${state.currentStep === 3 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">3. Quote Details</CardTitle>
                  </CardHeader>
                  {state.currentStep === 3 && (
                    <CardContent className="space-y-6 animate-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="quote-reference">Reference</label>
                        <input
                          id="quote-reference"
                          type="text"
                          value={quoteReference}
                          onChange={(e) => setQuoteReference(e.target.value)}
                          placeholder="Your reference (optional)"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="quote-notes">Notes</label>
                        <textarea
                          id="quote-notes"
                          value={quoteNotes}
                          onChange={(e) => setQuoteNotes(e.target.value)}
                          placeholder="Additional notes for your quote request (optional)"
                          rows={4}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                        />
                      </div>
                      <div className="flex gap-4 pt-2">
                        <Button variant="outline" onClick={() => setState(prev => ({ ...prev, currentStep: 2 }))}>Back</Button>
                        <Button onClick={() => handlePlaceOrder(quoteReference || undefined, quoteNotes || undefined)} isLoading={state.loading}>
                          Place Quote Request
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>

            <div className="lg:w-1/3">
              <div className="sticky top-24 space-y-6">
                {/* Cart Items */}
                <Card className="border-none">
                  <CardHeader className='p-0 px-6 pt-6'>
                    <CardTitle className="text-lg">Cart Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ItemsOverview
                      cart={state.cart}
                      showAvailability={false}
                      itemNameClickable={false}
                    />
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card className="border-none">
                  <CardContent>
                    {state.cart && (
                      <CartSummary
                        cart={state.cart}
                        title="Order Summary"
                        showCheckoutButton={false}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPageInner />
    </Suspense>
  );
}
