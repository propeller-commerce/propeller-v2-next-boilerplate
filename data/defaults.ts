// Default values and constants for the application
// These will be used with propeller-sdk-v2 package when available
import { Enums } from 'propeller-sdk-v2';

// Image search filters for different use cases
export const imageSearchFilters = {
  page: 1,
  offset: 20,
};

export const imageSearchFiltersGrid = {
  page: 1,
  offset: 1,
};

// Image transformation filters for different sizes
export const imageVariantFiltersSmall = {
  transformations: [
    {
      name: 'thumb',
      transformation: {
        format: Enums.Format.WEBP,
        height: 100,
        width: 100,
        fit: Enums.Fit.BOUNDS,
      },
    },
  ],
};

export const imageVariantFiltersMedium = {
  transformations: [
    {
      name: 'grid',
      transformation: {
        format: Enums.Format.WEBP,
        height: 300,
        width: 300,
        fit: Enums.Fit.BOUNDS,
      },
    },
  ],
};

export const imageVariantFiltersLarge = {
  transformations: [
    {
      name: 'large',
      transformation: {
        format: Enums.Format.WEBP,
        height: 800,
        width: 800,
        fit: Enums.Fit.BOUNDS,
      },
    },
  ],
};

// Default cart configuration
export const defaultCartConfig = {
  currency: 'EUR',
  taxRate: 0.21, // 21% VAT for Netherlands
  shippingCost: 0, // Free shipping by default
};

// Default pagination settings
export const defaultPagination = {
  page: 1,
  limit: 20,
  offset: 0,
};

// Default search settings
export const defaultSearchConfig = {
  minQueryLength: 2,
  debounceDelay: 300, // milliseconds
  maxResults: 50,
};

// Default form validation rules
export const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    required: true,
    minLength: 6,
    message: 'Password must be at least 6 characters long',
  },
  phone: {
    required: true,
    pattern: /^[+]?[1-9][\d]{0,15}$/,
    message: 'Please enter a valid phone number',
  },
  postalCode: {
    required: true,
    pattern: /^[1-9][0-9]{3} ?(?!sa|sd|ss)[a-z]{2}$/i, // Dutch postal code format
    message: 'Please enter a valid postal code',
  },
  vatNumber: {
    required: false,
    pattern: /^[A-Z]{2}[0-9A-Z]+$/,
    message: 'Please enter a valid VAT number',
  },
  cocNumber: {
    required: false,
    pattern: /^[0-9]{8}$/,
    message: 'Please enter a valid CoC number (8 digits)',
  },
};

// Default user preferences
export const defaultUserPreferences = {
  language: 'NL' as const,
  currency: 'EUR',
  itemsPerPage: 20,
  theme: 'light' as const,
};

// Default address template
export const defaultAddress = {
  street: '',
  number: '',
  apartment: '',
  postalCode: '',
  city: '',
  country: 'NL',
  isDefault: false,
};

// Default company template
export const defaultCompany = {
  name: '',
  vatNumber: '',
  cocNumber: '',
  addresses: [],
};

// Default cart item template
export const defaultCartItem = {
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
};

// API timeout settings
export const timeoutSettings = {
  default: 30000, // 30 seconds
  upload: 60000, // 1 minute for file uploads
  search: 10000, // 10 seconds for search requests
};

// Error messages
export const errorMessages = {
  network: 'Network error. Please check your connection and try again.',
  authentication: 'Authentication failed. Please log in again.',
  validation: 'Please check your input and try again.',
  generic: 'Something went wrong. Please try again.',
  sessionExpired: 'Your session has expired. Please log in again.',
  cartEmpty: 'Your cart is empty.',
  productNotFound: 'Product not found.',
  addressRequired: 'Address information is required.',
};

// Success messages
export const successMessages = {
  login: 'Successfully logged in!',
  logout: 'Successfully logged out!',
  registration: 'Account created successfully!',
  cartUpdated: 'Cart updated successfully!',
  productAdded: 'Product added to cart!',
  productRemoved: 'Product removed from cart!',
  addressSaved: 'Address saved successfully!',
  profileUpdated: 'Profile updated successfully!',
};

// Loading messages
export const loadingMessages = {
  login: 'Logging in...',
  registration: 'Creating account...',
  search: 'Searching...',
  loading: 'Loading...',
  saving: 'Saving...',
  updating: 'Updating...',
  deleting: 'Deleting...',
};

// Navigation menu items
export const navigationItems = {
  main: [
    { key: 'home', path: '/', titleKey: 'navigation.home' },
    { key: 'orderDirectly', path: '/search', titleKey: 'navigation.orderDirectly' },
    // { key: 'products', path: '/products', titleKey: 'navigation.products' },
    // { key: 'services', path: '/services', titleKey: 'navigation.services' },
    { key: 'about', path: '/about', titleKey: 'navigation.about' },
    { key: 'contact', path: '/contact', titleKey: 'navigation.contact' },
  ],
  user: [
    { key: 'profile', path: '/profile', titleKey: 'navigation.profile' },
    { key: 'addresses', path: '/addresses', titleKey: 'navigation.addresses' },
    { key: 'orders', path: '/orders', titleKey: 'navigation.orders' },
    { key: 'returns', path: '/returns', titleKey: 'navigation.returns' },
    { key: 'favorites', path: '/favorites', titleKey: 'navigation.favorites' },
    { key: 'cart', path: '/cart', titleKey: 'navigation.cart' },
  ],
};

// Social media links (placeholder)
export const socialLinks = {
  facebook: '#',
  twitter: '#',
  linkedin: '#',
  instagram: '#',
};

// Company information
export const companyInfo = {
  name: 'Elgersma',
  phone: '+31 (0)20 123 4567',
  email: 'info@elgersma.nl',
  address: {
    street: 'Example Street 123',
    city: 'Amsterdam',
    postalCode: '1234 AB',
    country: 'Netherlands',
  },
};

// Feature flags
export const featureFlags = {
  enableRegistration: true,
  enableGuestCheckout: false,
  enableWishlist: true,
  enableReviews: false,
  enableChat: false,
  enableNotifications: true,
};

// Cache settings
export const cacheSettings = {
  userDataTTL: 3600000, // 1 hour in milliseconds
  cartDataTTL: 1800000, // 30 minutes in milliseconds
  searchResultsTTL: 300000, // 5 minutes in milliseconds
  staticContentTTL: 86400000, // 24 hours in milliseconds
};

// Helper for object key cleanup — recursively strips underscore-prefixed keys
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripLeadingUnderscores = (obj: unknown): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripLeadingUnderscores);
  if (typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = key.startsWith('_') ? key.slice(1) : key;
      result[newKey] = stripLeadingUnderscores(value);
    }
    return result;
  }
  return obj;
}
