'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartTotals from '@/components/common/CartTotals';
import PropellerAddressCard from '@/components/propeller/AddressCard';

import { cartService, orderService, graphqlClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Cart, CartCarrier, CartMainItem, CartPaymethod, CartUpdateAddressInput, CartUpdateInput, AddressService, UserService, Contact, Customer, Company } from 'propeller-sdk-v2';
import { deserializeCart, serializeCart } from '@/utils/cartHelpers';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import Link from 'next/link';
import { Enums } from 'propeller-sdk-v2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  reference: string;
  comment: string;
  termsAccepted: boolean;
  loading: boolean;
  error: string | null;
}

/** Recursively strips underscore-prefixed keys from SDK class instances */
function deepPlain(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepPlain);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const cleanKey = key.startsWith('_') ? key.slice(1) : key;
      result[cleanKey] = deepPlain(value);
    }
    return result;
  }
  return obj;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart: contextCart, getCart } = useCart();
  const { state: authState } = useAuth();
  const [state, setState] = useState<CheckoutState>({
    currentStep: 1,
    cart: null,
    selectedPayment: '',
    selectedCarrier: '',
    selectedDeliveryDate: '',
    reference: '',
    comment: '',
    termsAccepted: false,
    loading: false,
    error: null
  });

  useEffect(() => {
    const initializeCheckout = async () => {
      let cartToUse = contextCart;
      if (!cartToUse) {
        const cartData = localStorage.getItem('cart');
        if (cartData) cartToUse = deserializeCart(cartData);
      }

      if (!cartToUse || !cartToUse.items || cartToUse.items.length === 0) {
        if (state.loading) return;
        return;
      }

      if (cartToUse && cartToUse.items && cartToUse.items.length > 0) {
        setState(prev => {
          if (prev.cart?.cartId === cartToUse?.cartId) return prev;
          const hasInvoiceAddress = cartToUse.invoiceAddress?.street;
          const hasDeliveryAddress = cartToUse.deliveryAddress?.street;
          if (hasInvoiceAddress && hasDeliveryAddress) {
            return { ...prev, cart: cartToUse, currentStep: 3 };
          } else if (hasInvoiceAddress) {
            return { ...prev, cart: cartToUse, currentStep: 2 };
          } else {
            return { ...prev, cart: cartToUse, currentStep: 1 };
          }
        });
      }
    };
    initializeCheckout();
  }, [contextCart, router, state.loading]);

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
    if (isContact(user)) {
      const company = getActiveCompany();
      if (!company) return;
      addresses = company?.addresses || [];
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

      if (isContact(user) && getActiveCompany()) {
        await addressService.updateCompanyAddress({
          ...commonFields,
          companyId: getActiveCompany()!.companyId,
        });
      } else if (isCustomer(user)) {
        await addressService.updateCustomerAddress({
          ...commonFields,
          customerId: user.customerId,
        });
      }

      // Refresh user data from API (same pattern as addresses page)
      const userService = new UserService(graphqlClient);
      const viewerData = await userService.getViewer({});
      if (viewerData) {
        const plainUser = deepPlain(viewerData);
        localStorage.setItem('user', JSON.stringify(plainUser));
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      }
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

      setState(prev => ({
        ...prev,
        cart: updatedCart,
        currentStep: advance ? prev.currentStep + 1 : prev.currentStep,
        loading: false
      }));

    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, error: 'Failed to save address', loading: false }));
    }
  };

  const handleStep3Continue = async () => {
    if (!state.selectedPayment || !state.selectedCarrier || !state.selectedDeliveryDate) {
      setState(prev => ({ ...prev, error: 'Please select payment method, carrier, and delivery date' }));
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

  const handlePlaceOrder = async () => {
    if (!state.termsAccepted) {
      setState(prev => ({ ...prev, error: 'Please accept the Terms and Conditions' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      if (state.reference || state.comment) {
        await cartService.updateCart({
          id: state.cart!.cartId,
          input: { reference: state.reference || undefined, notes: state.comment || undefined },
          imageVariantFilters: imageVariantFiltersSmall,
          imageSearchFilters: imageSearchFiltersGrid,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
        });
      }

      const response = await cartService.processCart({
        id: state.cart!.cartId,
        input: { orderStatus: 'NEW' as string, language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL' }
      });

      if (response?.cartOrderId) {
        const orderId = response.cartOrderId;
        const orderServiceResponse = await orderService.setOrderStatus({
          orderId: orderId,
          status: 'NEW' as string,
          payStatus: Enums.PaymentStatuses.OPEN,
          sendOrderConfirmationEmail: true,
          addPDFAttachment: true,
          triggerOrderSendConfirmEvent: true,
          deleteCart: true
        });

        if (orderServiceResponse?.id === orderId) {
          localStorage.removeItem('cart');
          if (getCart) await getCart();
        }
        router.push(`/checkout/thank-you/${orderId}`);
      } else {
        throw new Error("No Order ID returned");
      }

    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, error: 'Failed to place order', loading: false }));
    }
  };

  const getWorkingDays = () => {
    const days = [];
    const today = new Date();
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1);
    while (days.length < 3) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  };

  const formatDateForAPI = (date: Date) => date.toISOString().split('T')[0] + 'T00:00:00Z';
  const formatDateForDisplay = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  if (!state.cart) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Header />
        <main className="flex-1 py-8">
          <div className="container-width max-w-7xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading checkout...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const cartPayMethods = (state.cart as Cart).payMethods || [];
  const cartCarriers = state.cart.carriers || [];

  interface StepIndicatorProps {
    step: number;
    currentStep: number;
    title: string;
  }

  const StepIndicator = ({ step, currentStep, title }: StepIndicatorProps) => {
    const isActive = currentStep === step;
    const isCompleted = currentStep > step;
    return (
      <div className={`flex items-center gap-2 ${isActive ? 'text-primary font-bold' : isCompleted ? 'text-violet-500' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? 'border-primary bg-primary text-primary-foreground' : isCompleted ? 'border-violet-500 bg-violet-100 text-violet-600' : 'border-muted-foreground/30'}`}>
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
            <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />
            <StepIndicator step={3} currentStep={state.currentStep} title="Payment" />
            <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />
            <StepIndicator step={4} currentStep={state.currentStep} title="Review" />
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
                        <PropellerAddressCard
                          address={state.cart.invoiceAddress}
                          showEmail
                          enableDelete={false}
                          enableSetDefault={false}
                          onEdit={(addr) => handleAddressSubmit(addr, CartAddressType.INVOICE, false)}
                        />
                        <Button onClick={() => setState(prev => ({ ...prev, currentStep: 2 }))}>
                          Confirm Invoice Address
                        </Button>
                      </div>
                    ) : (
                      <PropellerAddressCard
                        address={null}
                        inline
                        isNew
                        addressType={CartAddressType.INVOICE}
                        showIcp
                        beforeSave={() => setState(prev => ({ ...prev, loading: true, error: null }))}
                        onEdit={(addr) => handleAddressSubmit(addr, CartAddressType.INVOICE)}
                      />
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
                        <PropellerAddressCard
                          address={state.cart.deliveryAddress}
                          showEmail
                          enableDelete={false}
                          enableSetDefault={false}
                          onEdit={(addr) => handleAddressSubmit(addr, CartAddressType.DELIVERY, false)}
                        />
                        <div className="flex gap-4">
                          <Button variant="outline" onClick={() => setState(prev => ({ ...prev, currentStep: 1 }))}>Back</Button>
                          <Button onClick={() => setState(prev => ({ ...prev, currentStep: 3 }))}>Confirm Delivery Address</Button>
                        </div>
                      </div>
                    ) : (
                      <PropellerAddressCard
                        address={null}
                        inline
                        isNew
                        addressType={CartAddressType.DELIVERY}
                        showIcp
                        beforeSave={() => setState(prev => ({ ...prev, loading: true, error: null }))}
                        onEdit={(addr) => handleAddressSubmit(addr, CartAddressType.DELIVERY)}
                      />
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Step 3: Payment & Delivery Method */}
              <Card className={`${state.currentStep === 3 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                <CardHeader className="cursor-pointer" onClick={() => state.currentStep > 3 && setState(prev => ({ ...prev, currentStep: 3 }))}>
                  <CardTitle className="text-lg flex items-center gap-2">3. Payment & Delivery</CardTitle>
                </CardHeader>
                {state.currentStep === 3 && (
                  <CardContent className="space-y-8 animate-in slide-in-from-top-2">
                    {/* Payment */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Method</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cartPayMethods.filter((method: CartPaymethod) => method?.code).map((method: CartPaymethod) => (
                          <div
                            key={method.code}
                            onClick={() => setState(prev => ({ ...prev, selectedPayment: method.code }))}
                            className={`cursor-pointer border border-border/60 rounded-lg p-4 flex flex-col gap-2 transition-all ${state.selectedPayment === method.code ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'}`}
                          >
                            <div className="flex justify-between font-medium items-center">
                              <span>{method.name || method.code}</span>
                              {method.price > 0 && <Badge variant="secondary">€{Number(method.price).toFixed(2)}</Badge>}
                            </div>
                          </div>
                        ))}
                        {cartPayMethods.length === 0 && <p className="text-muted-foreground italic col-span-full">No payment methods available.</p>}
                      </div>
                    </div>

                    {/* Carrier */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"><Truck className="w-4 h-4" /> Carrier</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cartCarriers.map((carrier: CartCarrier, index: number) => (
                          <div
                            key={`${carrier.name}-${index}`}
                            onClick={() => setState(prev => ({ ...prev, selectedCarrier: carrier.name }))}
                            className={`cursor-pointer border border-border/60 rounded-lg p-4 flex flex-col gap-2 transition-all ${state.selectedCarrier === carrier.name ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'}`}
                          >
                            <div className="flex justify-between font-medium items-center">
                              <span>{carrier.name}</span>
                              <Badge variant="secondary">€{carrier.price?.toFixed(2)}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Date */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"><Calendar className="w-4 h-4" /> Delivery Date</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {getWorkingDays().map((date, index) => (
                          <div
                            key={index}
                            onClick={() => setState(prev => ({ ...prev, selectedDeliveryDate: formatDateForAPI(date) }))}
                            className={`cursor-pointer border border-border/60 rounded-lg p-3 text-center transition-all ${state.selectedDeliveryDate === formatDateForAPI(date) ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                          >
                            <div className="font-semibold">{formatDateForDisplay(date)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button variant="outline" onClick={() => setState(prev => ({ ...prev, currentStep: 2 }))}>Back</Button>
                      <Button onClick={handleStep3Continue} isLoading={state.loading}>Continue to Review</Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Step 4: Review */}
              <Card className={`${state.currentStep === 4 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">4. Review & Place Order</CardTitle>
                </CardHeader>
                {state.currentStep === 4 && (
                  <CardContent className="space-y-8 animate-in slide-in-from-top-2">
                    <div className="grid md:grid-cols-2 gap-6 pb-5">
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invoice Address</h3>
                        <PropellerAddressCard address={state.cart.invoiceAddress} showEmail enableActions={false} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Delivery Address</h3>
                        <PropellerAddressCard address={state.cart.deliveryAddress} showEmail enableActions={false} />
                      </div>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-md border space-y-2 text-sm">
                      <div className="flex justify-between"><span className="font-medium">Payment:</span> <span>{state.selectedPayment}</span></div>
                      <div className="flex justify-between"><span className="font-medium">Carrier:</span> <span>{state.selectedCarrier}</span></div>
                      <div className="flex justify-between"><span className="font-medium">Delivery Date:</span> <span>{new Date(state.selectedDeliveryDate).toLocaleDateString()}</span></div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Reference (Optional)</label>
                        <Input
                          value={state.reference}
                          onChange={(e) => setState(prev => ({ ...prev, reference: e.target.value }))}
                          placeholder="Your reference number"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Order Notes (Optional)</label>
                        <textarea
                          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                          value={state.comment}
                          onChange={(e) => setState(prev => ({ ...prev, comment: e.target.value }))}
                          placeholder="Special instructions or comments"
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={state.termsAccepted}
                          onChange={(e) => setState(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="terms" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          I agree to the <Link href="/terms-conditions" className="text-primary hover:underline font-medium">Terms and Conditions</Link>
                        </label>
                      </div>

                      <Button
                        className="w-full text-lg h-12"
                        size="lg"
                        onClick={handlePlaceOrder}
                        disabled={state.loading || !state.termsAccepted}
                        isLoading={state.loading}
                      >
                        Place Order
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            <div className="lg:w-1/3">
              <div className="sticky top-24 space-y-6">
                {/* Cart Items */}
                <Card className="border-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Cart Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {state.cart?.items?.map((item: CartMainItem) => {
                      const rawUrl = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
                      const imageUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : '';
                      const name = item.product?.names?.[0]?.value || 'Product';

                      return (
                        <div key={item.itemId} className="flex items-center gap-3 pb-3 border-b border-border/60 last:border-b-0 last:pb-0">
                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={name}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  img.style.display = 'none';
                                  const parent = img.parentElement;
                                  if (parent && !parent.querySelector('svg')) {
                                    parent.innerHTML = '<svg class="w-6 h-6 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>';
                                  }
                                }}
                              />
                            ) : (
                              <svg className="w-6 h-6 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{name}</p>
                            <p className="text-xs text-muted-foreground">{item.product?.sku}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-sm font-medium">
                            €{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card className="border-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {state.cart && <CartTotals cart={state.cart} showCalculations={true} />}
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
