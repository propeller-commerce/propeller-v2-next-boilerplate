'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { usePrice } from '@/context/PriceContext';
import { useLanguage } from '@/context/LanguageContext';
import { useGlobal } from '@/context/GlobalContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SearchBar from '@/components/propeller/SearchBar';
import PropellerMenu from '@/components/propeller/Menu';
import PriceToggle from '@/components/propeller/PriceToggle';
import { graphqlClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Menu as MenuIcon, ChevronDown, Check, Globe } from 'lucide-react';
import { config, localizeHref, stripLanguagePrefix } from '@/data/config';
import CartIconAndSidebar from '@/components/propeller/CartIconAndSidebar';
import AccountIconAndMenu from '@/components/propeller/AccountIconAndMenu';
import CompanySwitcher from '@/components/propeller/CompanySwitcher';
import { useCompany } from '@/context/CompanyContext';
import { Cart, CartService, Company, Contact, Customer } from 'propeller-sdk-v2';
import { stripLeadingUnderscores } from '@/data/defaults';
import { fetchActiveCart as fetchActiveCartShared } from '@/composables/shared/utils/fetchActiveCart';
import { mergeAnonymousCart } from '@/composables/shared/utils/mergeAnonymousCart';
import { initCart } from '@/composables/shared/utils/cartInit';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { cart, saveCart, clearCart } = useCart();
  const { state, logout, updateUser, isAuthManagerForCompany } = useAuth();
  const { selectedCompany, setSelectedCompany } = useCompany();
  const { includeTax, setIncludeTax } = usePrice();
  const { language, setLanguage } = useLanguage();
  const globalData = useGlobal();
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Bumped on every route change away from the search results page so the
  // SearchBar(s) reset their input. This is what gives users an empty search
  // box when they navigate via product clicks, the homepage logo, the menu, etc.
  const [searchClearSignal, setSearchClearSignal] = useState(0);
  const lastPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    if (pathname === null) return;
    if (lastPathnameRef.current === pathname) return;
    const previous = lastPathnameRef.current;
    lastPathnameRef.current = pathname;
    if (previous === null) return; // first render — no navigation happened
    const onSearchRoute = stripLanguagePrefix(pathname).startsWith('/search');
    if (!onSearchRoute) setSearchClearSignal((s) => s + 1);
  }, [pathname]);

  // Fetch the user's active cart from the server for a given user/company,
  // saving it to the cart context. Returns the cart for further work (merge, etc).
  const fetchActiveCart = async (
    user: Contact | Customer,
    companyId?: number,
  ): Promise<Cart | null> => {
    const activeCart = await fetchActiveCartShared({
      graphqlClient,
      user,
      companyId,
      language,
      imageSearchFilters: config.imageSearchFiltersGrid,
      imageVariantFilters: config.imageVariantFiltersSmall,
    });
    if (activeCart) {
      saveCart(activeCart);
      return activeCart;
    }
    clearCart();
    return null;
  };

  // CMS settings with defaults
  const topBarEnabled = globalData?.topBarEnabled ?? true;
  const showVatToggle = globalData?.showVatToggle ?? true;
  const showLanguageSwitcher = globalData?.showLanguageSwitcher ?? true;
  const availableLanguages = globalData?.availableLanguages ?? ['EN', 'NL'];
  const showSearch = globalData?.showSearch ?? true;
  const showAccount = globalData?.showAccount ?? true;
  const showCart = globalData?.showCart ?? true;
  const showCategoriesMenu = globalData?.showCategoriesMenu ?? true;
  const categoriesMenuLabel = globalData?.categoriesMenuLabel || 'Browse Categories';
  const topBarAnnouncementEnabled = globalData?.topBarAnnouncementEnabled ?? false;


  // Close main menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mainMenuRef.current && !mainMenuRef.current.contains(event.target as Node)) {
        setShowMainMenu(false);
      }
    };

    if (showMainMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    setIncludeTax(config.includeVAT);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMainMenu]);

  // Close language dropdown on outside click or Escape
  useEffect(() => {
    if (!showLangMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLangMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showLangMenu]);

  // Logo: CMS image or fallback
  const logoSrc = globalData?.logo?.url || '/propeller_logo.webp';
  const logoAlt = globalData?.logoAlt || globalData?.siteName || 'Logo';

  return (
    <>
      {/* Top Info Bar — outside sticky header, scrolls away naturally */}
      {topBarEnabled && (
        <div
          data-topbar
          className="relative h-10"
          style={{ background: '#242526' }}
        >
          <div className="container-width h-full">
            <div className="flex items-center justify-between h-full text-xs font-medium text-white">
              {/* Left: Phone + Announcement */}
              <div className="flex items-center gap-4">
                {globalData?.topBarPhone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{globalData.topBarPhone}</span>
                  </div>
                )}
                {topBarAnnouncementEnabled && globalData?.topBarAnnouncement && (
                  <span className="hidden sm:inline text-white/80">
                    {globalData.topBarAnnouncement}
                  </span>
                )}
              </div>

              {/* Right: Company Switcher, VAT Switcher & Language Switcher */}
              <div className="flex items-center gap-4">
                {/* Company Switcher — Contact users only */}
                {state.isAuthenticated && state.user && 'contactId' in state.user && (state.user as Contact).companies && ((state.user as Contact).companies!.items?.length || 0) > 1 && (
                  <CompanySwitcher
                    user={state.user as Contact}
                    selectedCompanyId={selectedCompany?.companyId}
                    onCompanyChange={(company) => {
                      setSelectedCompany(company);
                      if (state.user) {
                        fetchActiveCart(state.user as Contact | Customer, company?.companyId);
                      }
                    }}
                  />
                )}
                {showVatToggle && (
                  <PriceToggle
                    inclExclVatSwitched={setIncludeTax}
                    initialState={config.includeVAT}
                  />
                )}

                {showLanguageSwitcher && availableLanguages.length > 1 && (
                  <div ref={langMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLangMenu((s) => !s)}
                      aria-haspopup="listbox"
                      aria-expanded={showLangMenu}
                      aria-label="Select language"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-control text-xs font-medium hover:bg-white/10 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{(language || '').toUpperCase()}</span>
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 transition-transform',
                          showLangMenu && 'rotate-180',
                        )}
                      />
                    </button>
                    {showLangMenu && (
                      <div
                        role="listbox"
                        className="absolute right-0 top-full mt-2 z-[60] min-w-[10rem] rounded-container border border-border bg-card text-foreground shadow-lg overflow-hidden"
                      >
                        {availableLanguages.map((lang) => {
                          const code = lang.toUpperCase();
                          const isActive = (language || '').toUpperCase() === code;
                          return (
                            <button
                              key={code}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              onClick={() => {
                                setLanguage(code);
                                setShowLangMenu(false);
                              }}
                              className={cn(
                                'w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-left transition-colors',
                                isActive ? 'bg-primary/5 text-primary' : 'hover:bg-surface-hover',
                              )}
                            >
                              <span>{code}</span>
                              {isActive && <Check className="w-4 h-4 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <header
        ref={headerRef}
        className="w-full z-50 bg-background shadow-sm sticky top-0"
      >
        {/* Middle Section */}
        <div style={{ backgroundColor: '#242526' }}>
          <div className="container-width">
            <div className="flex items-center justify-between h-16 sm:h-20 gap-4 sm:gap-8">
              {/* Mobile hamburger */}
              <button
                type="button"
                className="md:hidden text-white p-2 -ml-2"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                ) : (
                  <MenuIcon className="w-6 h-6" />
                )}
              </button>

              {/* Logo — CMS or fallback */}
              <Link href={localizeHref('/', language)} className="flex-shrink-0 relative h-10 sm:h-12 w-auto">
                <Image
                  src={logoSrc}
                  alt={logoAlt}
                  width={150}
                  height={48}
                  className="h-full w-auto object-contain"
                  priority
                />
              </Link>

              {/* Search Bar */}
              {showSearch && (
                <div className="hidden lg:block flex-1 max-w-2xl">
                  <SearchBar
                    graphqlClient={graphqlClient}
                    user={state.isAuthenticated ? (state.user as Contact | Customer) : null}
                    companyId={selectedCompany?.companyId}
                    configuration={config}
                    language={language}
                    clearSignal={searchClearSignal}
                    onSubmit={(term) => router.push(localizeHref(term ? `/search/${encodeURIComponent(term)}` : '/search/', language))}
                    onResultClick={(result) => {
                      if (result.url) router.push(result.url);
                    }}
                    onViewAllClick={(term) => router.push(localizeHref(`/search/${encodeURIComponent(term)}`, language))}
                  />
                </div>
              )}

              {/* Right Section */}
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                {/* User Menu */}
                {showAccount && (
                  <AccountIconAndMenu
                    user={state.isAuthenticated ? (state.user as Contact | Customer) : null}
                    graphqlClient={graphqlClient}
                    cart={cart as Cart | null}
                    afterLogin={async (user, accessToken, refreshToken, expiresAt, anonymousCart) => {
                      const loggedInUser = stripLeadingUnderscores(user);
                      localStorage.setItem('user', JSON.stringify(loggedInUser));
                      updateUser(loggedInUser);

                      if ((loggedInUser as Contact).company) {
                        setSelectedCompany((loggedInUser as Contact).company as Company);
                      }

                      if (accessToken && refreshToken && expiresAt) {
                        localStorage.setItem('accessToken', accessToken);
                        localStorage.setItem('refreshToken', refreshToken);
                        localStorage.setItem('expiresAt', expiresAt);
                      }

                      // Dispatch event for AuthContext
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('userLoggedIn'));
                      }

                      // Switch to user's preferred language if available
                      const userLang = (loggedInUser as Contact | Customer).primaryLanguage;
                      if (userLang && userLang !== language) {
                        setLanguage(userLang);
                      }

                      const company = (loggedInUser as Contact).company;
                      let targetCart = await fetchActiveCart(loggedInUser as Contact | Customer, company?.companyId);

                      if (anonymousCart?.items?.length) {
                        if (!targetCart) {
                          targetCart = await initCart({
                            graphqlClient,
                            user: loggedInUser as Contact | Customer,
                            companyId: company?.companyId,
                            language,
                            imageSearchFilters: config.imageSearchFiltersGrid,
                            imageVariantFilters: config.imageVariantFiltersSmall,
                          });
                        }
                        const merged = await mergeAnonymousCart({
                          graphqlClient,
                          targetCartId: targetCart.cartId,
                          anonymousCart,
                          language,
                          imageSearchFilters: config.imageSearchFiltersGrid,
                          imageVariantFilters: config.imageVariantFiltersSmall,
                        });
                        if (merged) targetCart = merged;

                        if (anonymousCart.cartId && anonymousCart.cartId !== targetCart.cartId) {
                          try {
                            await new CartService(graphqlClient).deleteCart({ id: anonymousCart.cartId });
                          } catch (e) {
                            console.error('[auth] Failed to delete anonymous cart', e);
                          }
                        }

                        saveCart(targetCart);
                      }

                      router.push(localizeHref('/account', userLang || language));
                    }}
                    onMenuItemClick={(href) => router.push(href)}
                    onLogoutClick={async () => {
                      try { await logout(); } catch (e) { console.error('Logout failed:', e); }
                    }}
                    onForgotPasswordClick={() => router.push(localizeHref('/forgot-password', language))}
                    onRegisterClick={() => router.push(localizeHref('/register', language))}
                    accountHeaderLoginForm={true}
                    menuLinks={[
                      { label: 'Dashboard', href: localizeHref('/account', language) },
                      { label: 'Addresses', href: localizeHref('/account/addresses', language) },
                      { label: 'Orders', href: localizeHref('/account/orders', language) },
                      { label: 'Quotes', href: localizeHref('/account/quotes', language) },
                      { label: 'Quote requests', href: localizeHref('/account/quote-requests', language) },
                      { label: 'Favorites', href: localizeHref('/account/favorites', language) },
                      ...(isAuthManagerForCompany(state.user, selectedCompany?.companyId) ? [
                        { label: 'Authorization settings', href: localizeHref('/account/authorization-settings', language) },
                        { label: 'Authorization requests', href: localizeHref('/account/authorization-requests', language) },
                      ] : []),
                    ]}
                  />
                )}

                {/* Cart */}
                {showCart && (
                  <CartIconAndSidebar
                    cart={cart as Cart}
                    user={state.isAuthenticated ? (state.user as Contact | Customer) : undefined}
                    companyId={selectedCompany?.companyId}
                    graphqlClient={graphqlClient}
                    onCheckoutButtonClick={(cart) => router.push(localizeHref('/checkout', language))}
                    onCartPageButtonClick={(cart) => router.push(localizeHref('/cart', language))}
                    showTotals={true}
                    configuration={config}
                    language={language}
                    iconClassName="text-white hover:text-white hover:bg-white/10"
                    onRequestQuoteClick={(cart) => router.push(localizeHref('/checkout?mode=quote', language))}
                    afterRequestAuthorization={(updatedCart) => {
                      clearCart();
                      router.push(localizeHref(`/authorization-request-sent/${updatedCart.cartId}`, language));
                    }}
                    onError={(err) => console.error('Authorization request failed:', err)}
                  />
                  // <Button
                  //   variant="ghost"
                  //   size="icon"
                  //   onClick={openCart}
                  //   className="relative text-white hover:text-white hover:bg-white/10"
                  // >
                  //   <ShoppingBag className="w-5 h-5" />
                  //   {isMounted && getTotalItems() > 0 && (
                  //     <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                  //       {getTotalItems()}
                  //     </Badge>
                  //   )}
                  // </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Menu — desktop only */}
        <div className="hidden md:block border-t border-border bg-background h-12">
          <div className="container-width h-full">
            <nav className="flex items-center h-full">
              {/* Categories Dropdown Trigger */}
              {showCategoriesMenu && (
                <div
                  className="relative h-full"
                  ref={mainMenuRef}
                  onMouseLeave={() => setShowMainMenu(false)}
                >
                  <button
                    className="h-full flex items-center gap-2 px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors border-l border-r border-transparent hover:border-border"
                    onMouseEnter={() => setShowMainMenu(true)}
                  >
                    <MenuIcon className="w-5 h-5" />
                    <span>{categoriesMenuLabel}</span>
                  </button>

                  <div className={cn(
                    "absolute left-0 top-full z-50",
                    showMainMenu ? "visible opacity-100" : "invisible opacity-0 pointer-events-none h-0 overflow-hidden"
                  )}>
                    {!state.isLoading && (
                      <PropellerMenu
                        graphqlClient={graphqlClient}
                        categoryId={parseInt(process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '17', 10)}
                        language={language}
                        menuStyle="dropdown-vertical"
                        user={state.user}
                        configuration={config}
                        onMenuItemClick={(category) => {
                          setShowMainMenu(false);
                          router.push(config.urls.getCategoryUrl(category, language));
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Horizontal simple links — CMS-driven */}
              <div className={cn(
                "flex items-center gap-6 text-sm font-medium text-muted-foreground",
                showCategoriesMenu ? "ml-6" : "ml-0"
              )}>
                {globalData?.navLinks && globalData.navLinks.length > 0 ? (
                  globalData.navLinks.map((link, i) => (
                    <Link
                      key={i}
                      href={localizeHref(link.url, language)}
                      className={cn(
                        "hover:text-foreground transition-colors",
                        link.highlight && "text-destructive"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))
                ) : (
                  <>
                    <Link href={localizeHref('/new-arrivals', language)} className="hover:text-foreground transition-colors">New Arrivals</Link>
                    <Link href={localizeHref('/best-sellers', language)} className="hover:text-foreground transition-colors">Best Sellers</Link>
                    <Link href={localizeHref('/sale', language)} className="hover:text-foreground transition-colors text-destructive">Sale</Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
        {/* Mobile slide-down menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-background border-t border-border overflow-y-auto max-h-[calc(100vh-64px)]">
            {/* Mobile search */}
            {showSearch && (
              <div className="p-4 border-b border-border">
                <SearchBar
                  graphqlClient={graphqlClient}
                  language={language}
                  clearSignal={searchClearSignal}
                  onSubmit={(term) => {
                    setShowMobileMenu(false);
                    router.push(localizeHref(term ? `/search/${encodeURIComponent(term)}` : '/search/', language));
                  }}
                  onResultClick={(result) => {
                    setShowMobileMenu(false);
                    if (result.url) router.push(result.url);
                  }}
                  onViewAllClick={(term) => {
                    setShowMobileMenu(false);
                    router.push(localizeHref(`/search/${encodeURIComponent(term)}`, language));
                  }}
                />
              </div>
            )}

            {/* Mobile categories */}
            {showCategoriesMenu && !state.isLoading && (
              <PropellerMenu
                graphqlClient={graphqlClient}
                categoryId={parseInt(process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '17', 10)}
                language={language}
                menuStyle="dropdown-vertical"
                user={state.user}
                configuration={config}
                onMenuItemClick={(category) => {
                  setShowMobileMenu(false);
                  router.push(config.urls.getCategoryUrl(category, language));
                }}
              />
            )}

            {/* Mobile nav links */}
            <div className="border-t border-border divide-y divide-border">
              {globalData?.navLinks && globalData.navLinks.length > 0 ? (
                globalData.navLinks.map((link, i) => (
                  <Link
                    key={i}
                    href={localizeHref(link.url, language)}
                    className={cn(
                      "block px-4 py-3 text-sm font-medium text-foreground",
                      link.highlight && "text-destructive"
                    )}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    {link.label}
                  </Link>
                ))
              ) : (
                <>
                  <Link href={localizeHref('/new-arrivals', language)} className="block px-4 py-3 text-sm font-medium text-foreground" onClick={() => setShowMobileMenu(false)}>New Arrivals</Link>
                  <Link href={localizeHref('/best-sellers', language)} className="block px-4 py-3 text-sm font-medium text-foreground" onClick={() => setShowMobileMenu(false)}>Best Sellers</Link>
                  <Link href={localizeHref('/sale', language)} className="block px-4 py-3 text-sm font-medium text-destructive" onClick={() => setShowMobileMenu(false)}>Sale</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
