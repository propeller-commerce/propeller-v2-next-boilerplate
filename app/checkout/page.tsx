'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartSummary } from 'propeller-v2-react-ui';
import { AddressCard } from 'propeller-v2-react-ui';

import { graphqlClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { AddressType, Cart, CartAddressType, CartUpdateAddressInput, CartUpdateInput, Company, Contact, Customer, Gender, YesNo } from '@propeller-commerce/propeller-sdk-v2';
import { useCheckout } from 'propeller-v2-react-ui';
import { restoreManagerCart } from '@/utils/cartHelpers';
import { CartPaymethods } from 'propeller-v2-react-ui';
import { AddressSelector } from 'propeller-v2-react-ui';
import { CartCarriers } from 'propeller-v2-react-ui';
import { DeliveryDate } from 'propeller-v2-react-ui';
import { CartOverview } from 'propeller-v2-react-ui';
import { ItemsOverview } from 'propeller-v2-react-ui';
import { CartBonusItems } from 'propeller-v2-react-ui';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Check, Truck, CreditCard, Calendar } from 'lucide-react';
import { COUNTRIES } from 'propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';

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

// COUNTRIES imported from shared utils
function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQuoteMode = searchParams?.get('mode') === 'quote';
  const { language } = useLanguage();
  const { cart: contextCart, getCart, clearCart, saveCart } = useCart();
  const { state: authState, refreshUser } = useAuth();
  const { selectedCompany } = useCompany();
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
  // One-shot guard for the step-3 auto-advance: we only auto-skip step 3 the
  // FIRST time we enter it for a given cart. Otherwise clicking Back from step 4
  // (or expanding the step-3 header) would immediately push the user right back
  // to step 4, making step 3 unreachable in single-option carts.
  const autoAdvancedCartIdRef = useRef<string | null>(null);
  const [quoteReference, setQuoteReference] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');

  useEffect(() => {
    // Wait for auth to finish hydrating before initializing checkout.
    // `isLoading` alone is not enough: since Phase A-bis it flips to false
    // at the thin-hint paint step, while `authState.user` (the full
    // Contact, with addresses + company) is still null until getViewer()
    // resolves. Pre-populating cart addresses needs the full user, so for
    // an authenticated visitor we also wait for `authState.user`.
    if (authState.isLoading) return;
    if (authState.isAuthenticated && !authState.user) return;

    const initializeCheckout = async () => {
      let cartToUse = contextCart;
      if (!cartToUse) {
        const cartData = contextCart;
        if (cartData) cartToUse = cartData;
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
          try {            const updatedCart = await populateCartAddresses(cartToUse);
            saveCart(updatedCart);
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

  const getActiveCompany = (): Company | null => {
    const user = authState.user;
    if (!user || !isContact(user)) return null;
    const stored = selectedCompany?.companyId;
    if (stored) {
      const items = user.companies?.items;
      if (Array.isArray(items)) {
        const found = items.find((c: Company) => c.companyId === stored);
        if (found) return found;
      }
    }
    return user.company ?? null;
  };

  const addressCardLabels = useTranslations('AddressCard');
  const addressSelectorLabels = useTranslations('AddressSelector');
  const cartPaymethodsLabels = useTranslations('CartPaymethods');
  const cartCarriersLabels = useTranslations('CartCarriers');
  const deliveryDateLabels = useTranslations('DeliveryDate');
  const cartOverviewLabels = useTranslations('CartOverview');
  const itemsOverviewLabels = useTranslations('ItemsOverview');
  const cartBonusItemsLabels = useTranslations('CartBonusItems');
  const cartSummaryLabels = useTranslations('CartSummary');
  const t = useTranslations('CheckoutPage');

  const { populateCartAddresses, updateCartAddress, updateCartShipping, placeOrder } = useCheckout({
    graphqlClient,
    user: authState.user,
    companyId: getActiveCompany()?.companyId,
    language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
    configuration: { imageSearchFiltersGrid, imageVariantFiltersSmall },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddressSubmit = async (addressData: any, type: string, advance = true) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const d = addressData as Record<string, string | boolean | undefined>;
      const input: CartUpdateAddressInput = {
        type: type as CartAddressType,
        firstName: (d.firstName as string) || '',
        lastName: (d.lastName as string) || '',
        street: (d.street as string) || '',
        postalCode: (d.postalCode as string) || '',
        city: (d.city as string) || '',
        company: d.company as string | undefined,
        gender: d.gender as Gender | undefined,
        middleName: d.middleName as string | undefined,
        number: d.number as string | undefined,
        numberExtension: d.numberExtension as string | undefined,
        country: d.country as string | undefined,
        email: d.email as string | undefined,
        mobile: d.mobile as string | undefined,
        phone: d.phone as string | undefined,
        notes: d.notes as string | undefined,
        icp: d.icp as YesNo | undefined,
      };

      const updatedCart = await updateCartAddress(state.cart!.cartId, input);
      saveCart(updatedCart);

      // Anonymous user: if "same as invoice" is checked, also save as delivery address
      if (advance && type === CartAddressType.INVOICE && !authState.isAuthenticated && sameAsInvoiceRef.current) {
        const cartWithDelivery = await updateCartAddress(updatedCart.cartId, {
          ...input,
          type: CartAddressType.DELIVERY,
        });
        saveCart(cartWithDelivery);
        setState(prev => ({ ...prev, cart: cartWithDelivery, currentStep: 3, loading: false }));
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

  // First available delivery date — tomorrow, skipping weekends. Mirrors the
  // tile-0 logic inside the `DeliveryDate` component (`computeUpcomingDates(1,
  // true)` + `toApiDate`) so an auto-advance picks the same date the user would
  // have seen highlighted on the quick-pick row. ISO `YYYY-MM-DDT00:00:00Z`.
  const computeFirstDeliveryDate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00Z`;
  };

  // Auto-advance step 3 → 4 when the cart offers only ONE payment method and at
  // most ONE carrier. Preselects payment + carrier (if any) + the first
  // available delivery date, persists via `updateCartShipping`, then jumps to
  // step 4. One-shot per cart (see `autoAdvancedCartIdRef`) so Back from step 4
  // still works. If a precondition isn't met (no payments yet, multi-option,
  // quote mode) we fall through to the normal step-3 UI.
  useEffect(() => {
    if (state.currentStep !== 3) return;
    if (isQuoteMode) return;
    const cart = state.cart;
    if (!cart?.cartId) return;
    if (autoAdvancedCartIdRef.current === cart.cartId) return;
    const payMethods = cart.payMethods ?? [];
    const carriers = cart.carriers ?? [];
    if (payMethods.length !== 1) return;
    if (carriers.length > 1) return;
    const onlyPayment = payMethods[0]?.code;
    const onlyCarrier = carriers[0]?.name;
    if (!onlyPayment) return;
    // Use the cart's stored requestDate when present, else the first available;
    // matches what the `DeliveryDate` component would render as preselected.
    const requestDate =
      (cart.postageData?.requestDate as string | undefined) || computeFirstDeliveryDate();
    autoAdvancedCartIdRef.current = cart.cartId;
    (async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const input: CartUpdateInput = {
          paymentData: { method: onlyPayment },
          postageData: {
            ...(onlyCarrier && { carrier: onlyCarrier }),
            requestDate,
          },
        };
        const updatedCart = await updateCartShipping(cart.cartId, input);
        saveCart(updatedCart);
        setState((prev) => ({
          ...prev,
          cart: updatedCart,
          selectedPayment: onlyPayment,
          selectedCarrier: onlyCarrier ?? '',
          selectedDeliveryDate: requestDate,
          currentStep: 4,
          loading: false,
        }));
      } catch (error) {
        // On failure, release the one-shot guard so the user can try Continue
        // manually. The normal step-3 UI is still rendered.
        autoAdvancedCartIdRef.current = null;
        console.error(error);
        setState((prev) => ({ ...prev, error: 'Failed to update cart', loading: false }));
      }
    })();
    // updateCartShipping/saveCart are stable from their contexts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentStep, state.cart, isQuoteMode]);

  const handleStep3Continue = async () => {
    // A carrier is only required when the cart actually offers one. Some carts
    // (e.g. digital-only or business-rule configs) return no carriers; in that
    // case CartCarriers shows "No carriers available." and never fires a
    // selection, so requiring one here would dead-end the checkout.
    const hasCarriers = (state.cart?.carriers?.length ?? 0) > 0;
    if (!state.selectedPayment || (hasCarriers && !state.selectedCarrier) || !state.selectedDeliveryDate) {
      setState(prev => ({ ...prev, step3Submitted: true }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const input: CartUpdateInput = {
        paymentData: { method: state.selectedPayment },
        postageData: {
          ...(state.selectedCarrier && { carrier: state.selectedCarrier }),
          requestDate: state.selectedDeliveryDate,
        }
      };

      const updatedCart = await updateCartShipping(state.cart!.cartId, input);
      saveCart(updatedCart);
      setState(prev => ({ ...prev, cart: updatedCart, currentStep: 4, loading: false }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, error: 'Failed to update cart', loading: false }));
    }
  };

  const handlePlaceOrder = async (reference?: string, notes?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    orderPlacedRef.current = true;

    const result = await placeOrder({
      cartId: state.cart!.cartId,
      orderStatus: isQuoteMode ? 'REQUEST' : 'NEW',
      reference,
      notes,
      isQuoteMode,
    });

    if (result.ok) {
      // Restore the manager's parked cart if they were acting on a requester's
      // authorization cart; otherwise clear.
      const parked = restoreManagerCart();
      if (parked) saveCart(parked); else clearCart();
      if (getCart) await getCart();
      const thankYouUrl = isQuoteMode
        ? localizeHref(`/checkout/thank-you/${result.data.orderId}`, language) + '?mode=quote'
        : localizeHref(`/checkout/thank-you/${result.data.orderId}`, language);
      router.push(thankYouUrl);
    } else {
      orderPlacedRef.current = false;
      const fallback = isQuoteMode ? 'Failed to submit quote request' : 'Failed to place order';
      setState(prev => ({ ...prev, error: result.error || fallback, loading: false }));
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
              {[t.stepDetails, t.stepShipping, t.stepPayment, t.stepReview].map((label, i) => (
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
            <StepIndicator step={1} currentStep={state.currentStep} title={t.stepDetails} />
            <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />
            <StepIndicator step={2} currentStep={state.currentStep} title={t.stepShipping} />
            {!isQuoteMode && (
              <>
                <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />
                <StepIndicator step={3} currentStep={state.currentStep} title={t.stepPayment} />
              </>
            )}
            <div className="flex-1 border-t-2 border-dashed border-muted mx-4 mt-4" />
            <StepIndicator step={isQuoteMode ? 3 : 4} currentStep={state.currentStep} title={t.stepReview} />
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
                    <CardTitle className="text-lg flex items-center gap-2">{t.step1Title}</CardTitle>
                    {state.currentStep > 1 && state.cart?.invoiceAddress?.street && (
                      <Badge variant="outline" className="text-muted-foreground font-normal">
                        {state.cart.invoiceAddress.street} {state.cart.invoiceAddress.number} {state.cart.invoiceAddress.numberExtension}, {state.cart.invoiceAddress.city}
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
                          labels={addressCardLabels}
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
                          labels={addressCardLabels}
                        />
                        {!authState.isAuthenticated && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.sameAsInvoice}
                              onChange={(e) => { sameAsInvoiceRef.current = e.target.checked; setState(prev => ({ ...prev, sameAsInvoice: e.target.checked })); }}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            {t.deliverySameAsInvoice}
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
                    <CardTitle className="text-lg flex items-center gap-2">{t.step2Title}</CardTitle>
                    {state.currentStep > 2 && state.cart?.deliveryAddress?.street && (
                      <Badge variant="outline" className="text-muted-foreground font-normal">
                        {state.cart.deliveryAddress.street} {state.cart.deliveryAddress.number} {state.cart.deliveryAddress.numberExtension}, {state.cart.deliveryAddress.city}
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
                          labels={addressCardLabels}
                        />
                        <div className="flex items-center gap-4">
                          <Button variant="outline" onClick={() => setState(prev => ({ ...prev, currentStep: 1 }))}>Back</Button>
                          <Button onClick={() => setState(prev => ({ ...prev, currentStep: 3 }))}>Confirm Delivery Address</Button>
                          {authState.isAuthenticated && (
                            <AddressSelector
                              user={authState.user}
                              addressType={AddressType.delivery}
                              onAddressSelected={(address) => handleAddressSubmit(address, CartAddressType.DELIVERY, true)}
                              countries={COUNTRIES}
                              className="ml-auto"
                              labels={addressSelectorLabels}
                            />
                          )}
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
                        labels={addressCardLabels}
                      />
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Step 3: Payment & Delivery Method (normal mode only) */}
              {!isQuoteMode && <Card className={`${state.currentStep === 3 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                <CardHeader className="cursor-pointer" onClick={() => state.currentStep > 3 && setState(prev => ({ ...prev, currentStep: 3 }))}>
                  <CardTitle className="text-lg flex items-center gap-2">{t.step3PaymentTitle}</CardTitle>
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
                        cart={state.cart}
                        onPaymethodSelect={(method) => setState(prev => ({ ...prev, selectedPayment: method.code }))}
                        labels={cartPaymethodsLabels}
                      />
                    </div>

                    {/* Carrier */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"><Truck className="w-4 h-4" /> Carrier</h3>
                      {state.step3Submitted && (state.cart?.carriers?.length ?? 0) > 0 && !state.selectedCarrier && (
                        <p className="text-sm text-destructive">Please select a carrier</p>
                      )}
                      <CartCarriers
                        cart={state.cart}
                        showPrice={false}
                        onCarrierSelect={(carrier) => setState(prev => ({ ...prev, selectedCarrier: carrier.name }))}
                        labels={cartCarriersLabels}
                      />
                    </div>

                    {/* Delivery Date */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"><Calendar className="w-4 h-4" /> Delivery Date</h3>
                      {state.step3Submitted && !state.selectedDeliveryDate && (
                        <p className="text-sm text-destructive">Please select a delivery date</p>
                      )}
                      <DeliveryDate
                        cart={state.cart}
                        initialDate={state.cart?.postageData?.requestDate as string | undefined}
                        onDateSelect={(date) => setState(prev => ({ ...prev, selectedDeliveryDate: date }))}
                        labels={deliveryDateLabels}
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
                    <CardTitle className="text-lg flex items-center gap-2">{t.step4Title}</CardTitle>
                  </CardHeader>
                  {state.currentStep === 4 && (
                    <CardContent className="animate-in slide-in-from-top-2">
                      <CartOverview
                        cart={state.cart}
                        onTermsAndConditionsClick={() => window.open('/terms-conditions', '_blank')}
                        onPurchaseButtonClick={(_cart, reference, notes) => handlePlaceOrder(reference, notes)}
                        labels={cartOverviewLabels}
                      />
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Step 3 (quote mode): Quote Details */}
              {isQuoteMode && (
                <Card className={`${state.currentStep === 3 ? 'ring-2 ring-primary border-primary' : 'opacity-80'}`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">{t.step3QuoteTitle}</CardTitle>
                  </CardHeader>
                  {state.currentStep === 3 && (
                    <CardContent className="space-y-6 animate-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="quote-reference">Reference</label>
                        <input
                          id="quote-reference"
                          type="text"
                          value={quoteReference}
                          onChange={(e) => setQuoteReference(e.target.value.slice(0, 255))}
                          placeholder="Your reference (optional)"
                          maxLength={255}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="quote-notes">Notes</label>
                        <textarea
                          id="quote-notes"
                          value={quoteNotes}
                          onChange={(e) => setQuoteNotes(e.target.value.slice(0, 255))}
                          placeholder="Additional notes for your quote request (optional)"
                          rows={4}
                          maxLength={255}
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
                    <CardTitle className="text-lg">{t.cartItemsTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ItemsOverview
                      cart={state.cart}
                      showAvailability={false}
                      itemNameClickable={false}
                      labels={itemsOverviewLabels}
                    />
                    {/* Bonus items — free items added via incentives.
                        currency/includeTax/language resolve from PropellerProvider. */}
                    <CartBonusItems cart={state.cart} labels={cartBonusItemsLabels} />
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card className="border-none">
                  <CardContent>
                    {state.cart && (
                      <CartSummary
                        cart={state.cart}
                        title={t.orderSummaryTitle}
                        showCheckoutButton={false}
                        afterRequestAuthorization={(updatedCart) => {
                          // If a manager parked their own cart to act on this
                          // request, hand it back; otherwise clear.
                          const parked = restoreManagerCart();
                          if (parked) saveCart(parked); else clearCart();
                          router.push(localizeHref(`/authorization-request-sent/${updatedCart.cartId}`, language));
                        }}
                        onError={(err) => console.error('Authorization request failed:', err)}
                        labels={cartSummaryLabels}
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
