'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useGlobal } from '@/context/GlobalContext';
import { useState, useEffect, useRef } from 'react';
import CartSidebar from './CartSidebar';
import SearchBar from '@/components/common/SearchBar';
import UserMenu from '@/components/common/UserMenu';
import { menuService } from '@/lib/services/MenuService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { User, ShoppingBag, Menu, Search, ChevronDown } from 'lucide-react';

interface CategoryName {
  value: string;
  language: string;
}

interface CategorySlug {
  value: string;
}

interface MenuCategory {
  categoryId: number;
  name: CategoryName[];
  slug: CategorySlug[];
  categories?: MenuCategory[];
}

interface MenuData {
  category: MenuCategory;
}

export default function Header() {
  const { getTotalItems, openCart } = useCart();
  const { state, login } = useAuth();
  const globalData = useGlobal();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<number | null>(null);
  const [hoveredSubCategoryId, setHoveredSubCategoryId] = useState<number | null>(null);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const [showVatInclusive, setShowVatInclusive] = useState(true);
  const [language, setLanguage] = useState('EN');
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
        setHoveredCategoryId(null);
        setHoveredSubCategoryId(null);
      }
    };

    if (showUserMenu || showMainMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showMainMenu]);

  useEffect(() => {
    if (!showCategoriesMenu) return;
    const loadMenu = async () => {
      try {
        const data = await menuService.getMenu();
        if (data) {
          if (data.category) {
            setMenuData(data as MenuData);
          } else if (data.categories || data.categoryId) {
            setMenuData({ category: data as MenuCategory } as MenuData);
          } else if (typeof window !== 'undefined') {
            try {
              const cached = localStorage.getItem('menuData');
              if (cached) {
                const parsed = JSON.parse(cached);
                const menuDataFromCache = parsed.data || parsed;
                if (menuDataFromCache?.category) {
                  setMenuData(menuDataFromCache as MenuData);
                }
              }
            } catch (e) {
              console.error('Failed to read menu from localStorage:', e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load menu:', error);
      }
    };
    loadMenu();
  }, [showCategoriesMenu]);

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

  const getCategoryName = (category: MenuCategory) => {
    const name = category.name?.find(n => n.language === 'NL') || category.name?.[0];
    return name?.value || '';
  };

  const getCategorySlug = (category: MenuCategory) => {
    return category.slug?.[0]?.value || '';
  };

  const isValidCategory = (category: MenuCategory) => {
    return getCategoryName(category) && getCategorySlug(category);
  };

  const getValidCategories = (categories?: MenuCategory[]) => {
    return categories?.filter(isValidCategory) || [];
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
                        onChange={(e) => setLanguage(e.target.value)}
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
                  onMouseLeave={() => {
                    setShowMainMenu(false);
                    setHoveredCategoryId(null);
                    setHoveredSubCategoryId(null);
                  }}
                >
                  <button
                    className="h-full flex items-center gap-2 px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors border-l border-r border-transparent hover:border-border"
                    onMouseEnter={() => {
                      if (menuData?.category?.categories && getValidCategories(menuData.category.categories).length > 0) {
                        setShowMainMenu(true);
                      }
                    }}
                  >
                    <Menu className="w-5 h-5" />
                    <span>{categoriesMenuLabel}</span>
                  </button>

                  {/* Main Dropdown */}
                  {showMainMenu && menuData?.category?.categories && getValidCategories(menuData.category.categories).length > 0 && (
                    <div
                      className="absolute left-0 top-full pt-1 bg-popover border border-border shadow-lg w-64 z-50 animate-in fade-in zoom-in-95 duration-200"
                      onMouseEnter={() => setShowMainMenu(true)}
                      onMouseLeave={() => {
                        setShowMainMenu(false);
                        setHoveredCategoryId(null);
                        setHoveredSubCategoryId(null);
                      }}
                    >
                      <div className="py-1">
                        {getValidCategories(menuData.category.categories).map((category) => {
                          const validSubCategories = getValidCategories(category.categories);
                          const isHovered = hoveredCategoryId === category.categoryId;
                          return (
                            <div
                              key={category.categoryId}
                              className="relative"
                              onMouseEnter={() => setHoveredCategoryId(category.categoryId)}
                              onMouseLeave={() => setHoveredCategoryId(null)}
                            >
                              <Link
                                href={`/category/${category.categoryId}/${getCategorySlug(category)}`}
                                className="flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                              >
                                <span className="font-medium truncate">{getCategoryName(category)}</span>
                                {validSubCategories.length > 0 && (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
                                )}
                              </Link>

                              {/* Level 2 */}
                              {validSubCategories.length > 0 && isHovered && (
                                <div className="absolute left-full top-0 -ml-1 pl-1 bg-popover border border-border shadow-md w-64 z-50 animate-in fade-in zoom-in-95 duration-200">
                                  <div className="py-1">
                                    {validSubCategories.map((subCategory) => {
                                      const validSubSubCategories = getValidCategories(subCategory.categories);
                                      const isSubHovered = hoveredSubCategoryId === subCategory.categoryId;
                                      return (
                                        <div
                                          key={subCategory.categoryId}
                                          className="relative"
                                          onMouseEnter={() => setHoveredSubCategoryId(subCategory.categoryId)}
                                          onMouseLeave={() => setHoveredSubCategoryId(null)}
                                        >
                                          <Link
                                            href={`/category/${subCategory.categoryId}/${getCategorySlug(subCategory)}`}
                                            className="flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                          >
                                            <span className="truncate">{getCategoryName(subCategory)}</span>
                                            {validSubSubCategories.length > 0 && (
                                              <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
                                            )}
                                          </Link>

                                          {/* Level 3 */}
                                          {validSubSubCategories.length > 0 && isSubHovered && (
                                            <div className="absolute left-full top-0 -ml-1 pl-1 bg-popover border border-border shadow-md w-64 z-50 animate-in fade-in zoom-in-95 duration-200">
                                              <div className="py-1">
                                                {validSubSubCategories.map((subSubCategory) => (
                                                  <Link
                                                    key={subSubCategory.categoryId}
                                                    href={`/category/${subSubCategory.categoryId}/${getCategorySlug(subSubCategory)}`}
                                                    className="block px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                                  >
                                                    {getCategoryName(subSubCategory)}
                                                  </Link>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
