'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useGlobal } from '@/context/GlobalContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CartSidebar from './CartSidebar';
import SearchBar from '@/components/common/SearchBar';
import UserMenu from '@/components/common/UserMenu';
import PropellerMenu from '@/components/propeller/Menu';
import { graphqlClient } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { User, ShoppingBag, Menu as MenuIcon } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const { getTotalItems, openCart } = useCart();
  const { state, login } = useAuth();
  const globalData = useGlobal();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const [showVatInclusive, setShowVatInclusive] = useState(true);
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferred_language') || process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';
    }
    return process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (mainMenuRef.current && !mainMenuRef.current.contains(event.target as Node)) {
        setShowMainMenu(false);
      }
    };

    if (showUserMenu || showMainMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showMainMenu]);

  // Scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 40);
    };

    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      setShowUserMenu(false);
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  // Logo: CMS image or fallback
  const logoSrc = globalData?.logo?.url || '/propeller_logo.webp';
  const logoAlt = globalData?.logoAlt || globalData?.siteName || 'Logo';

  return (
    <>
      <div style={{ height: isSticky ? headerHeight : 0 }} className="transition-all duration-0" />
      <header
        ref={headerRef}
        className={cn(
          "w-full z-50 bg-background transition-all duration-300 border-b",
          isSticky ? "fixed top-0 left-0 shadow-md animate-in slide-in-from-top-4 duration-300" : "relative"
        )}
      >
        {/* Top Info Bar */}
        {topBarEnabled && (
          <div className={cn(
            "transition-all duration-200 overflow-hidden",
            isSticky ? 'h-0 opacity-5 -translate-y-2' : 'h-10 opacity-100 translate-y-0'
          )} style={{ background: 'linear-gradient(to bottom, #433183ff, #180147)' }}>
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

                {/* Right: VAT Switcher & Language Switcher */}
                <div className="flex items-center gap-4">
                  {showVatToggle && (
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline">Prices:</span>
                      <button
                        onClick={() => setShowVatInclusive(!showVatInclusive)}
                        className="hover:text-white/80 transition-colors"
                      >
                        {showVatInclusive ? 'Incl. VAT' : 'Excl. VAT'}
                      </button>
                    </div>
                  )}

                  {showLanguageSwitcher && availableLanguages.length > 1 && (
                    <div className="flex items-center gap-1.5 hover:text-white/80 transition-colors cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      <select
                        value={language}
                        onChange={(e) => {
                          const lang = e.target.value;
                          setLanguage(lang);
                          localStorage.setItem('preferred_language', lang);
                        }}
                        className="bg-transparent border-none focus:ring-0 p-0 text-xs font-medium cursor-pointer"
                      >
                        {availableLanguages.map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Middle Section */}
        <div style={{ backgroundColor: '#180147' }}>
          <div className="container-width">
            <div className="flex items-center justify-between h-16 sm:h-20 gap-4 sm:gap-8">
              {/* Logo — CMS or fallback */}
              <Link href="/" className="flex-shrink-0 relative h-10 sm:h-12 w-auto">
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
                  <SearchBar />
                </div>
              )}

              {/* Right Section */}
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                {/* User Menu */}
                {showAccount && (
                  <div className="relative" ref={userMenuRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="gap-2 text-white hover:text-white hover:bg-white/10"
                    >
                      <User className="w-5 h-5" />
                      {state.isAuthenticated && state.user?.firstName ? (
                        <span className="hidden md:block font-normal">Hi, {state.user.firstName}</span>
                      ) : (
                        <span className="hidden md:block font-normal">Account</span>
                      )}
                    </Button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-80 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border py-4 px-5 z-50 animate-in fade-in zoom-in-95 duration-200">
                        {state.isAuthenticated ? (
                          <UserMenu onItemClick={() => setShowUserMenu(false)} />
                        ) : (
                          <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div className="text-center mb-2">
                              <h4 className="text-lg font-semibold">Welcome Back</h4>
                              <p className="text-sm text-muted-foreground">Login to access your account</p>
                            </div>

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label htmlFor="email" className="text-xs font-medium">Email</label>
                                <Input
                                  type="email"
                                  id="email"
                                  value={loginForm.email}
                                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                  required
                                  placeholder="name@example.com"
                                />
                              </div>

                              <div className="space-y-1">
                                <label htmlFor="password" className="text-xs font-medium">Password</label>
                                <Input
                                  type="password"
                                  id="password"
                                  value={loginForm.password}
                                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                  required
                                  placeholder="••••••••"
                                />
                              </div>
                            </div>

                            <Button type="submit" className="w-full" isLoading={loginLoading}>
                              Log In
                            </Button>

                            <div className="flex flex-col gap-2 text-sm pt-2 text-center">
                              <Link
                                href="/forgot-password"
                                className="text-primary hover:underline text-xs"
                                onClick={() => setShowUserMenu(false)}
                              >
                                Forgot Password?
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                Don't have an account?{' '}
                                <Link
                                  href="/register"
                                  className="text-primary hover:underline font-medium"
                                  onClick={() => setShowUserMenu(false)}
                                >
                                  Register
                                </Link>
                              </div>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Cart */}
                {showCart && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openCart}
                    className="relative text-white hover:text-white hover:bg-white/10"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {isMounted && getTotalItems() > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                        {getTotalItems()}
                      </Badge>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Menu */}
        <div className={cn(
          "border-t border-border bg-background transition-all duration-200",
          isSticky ? 'h-10' : 'h-12'
        )}>
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
                    showMainMenu ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
                  )}>
                    <PropellerMenu
                      graphqlClient={graphqlClient}
                      categoryId={parseInt(process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '17', 10)}
                      language={language}
                      menuStyle="dropdown-vertical"
                      cacheEnabled={!state.isAuthenticated}
                      onMenuItemClick={(category) => {
                        setShowMainMenu(false);
                        const slug = category.slug?.[0]?.value || '';
                        router.push(`/category/${category.categoryId}/${slug}`);
                      }}
                    />
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
                      href={link.url}
                      className={cn(
                        "hover:text-primary transition-colors",
                        link.highlight && "text-destructive"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))
                ) : (
                  <>
                    <Link href="/new-arrivals" className="hover:text-primary transition-colors">New Arrivals</Link>
                    <Link href="/best-sellers" className="hover:text-primary transition-colors">Best Sellers</Link>
                    <Link href="/sale" className="hover:text-primary transition-colors text-destructive">Sale</Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>
      <CartSidebar />
    </>
  );
}
