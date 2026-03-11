'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { GraphQLClient, CartService, Cart } from 'propeller-sdk-v2';

export interface ActionCodeProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** The shopping cart used to populate the cart summary data */
  cart: Cart;

  /** Action code block title */
  title?: string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /** Display the option to remove the action code of the shopping cart. Defaults to true. */
  showRemoveCode?: boolean;

  /** Action handler when action code is added to the cart */
  onActionCodeApply?: (code: string, cart: Cart) => void;

  /** Action handler when action code is removed from the cart */
  onActionCodeRemove?: (code: string, cart: Cart) => void;

  /** Action callback method after action code is applied */
  afterActionCodeApply?: (cart: Cart) => void;

  /** Action callback method after action code is removed */
  afterActionCodeRemove?: (cart: Cart) => void;

  /** Configuration object for image filters */
  configuration?: any;

  /** Language code for CartService operations. Defaults to 'NL'. */
  language?: string;
}

function ActionCode(props: ActionCodeProps) {
  const [_code, set_code] = useState(() => '');
  const [_loading, set_loading] = useState(() => false);
  const [_error, set_error] = useState(() => '');
  const [_isMounted, set_isMounted] = useState(() => false);

  function getLabel(key: string, fallback: string) {
    return (props.labels as any)?.[key] || fallback;
  }

  function title() {
    return props.title || 'Action code';
  }

  function showRemoveCode() {
    return props.showRemoveCode !== undefined ? props.showRemoveCode : true;
  }

  function appliedCode() {
    return (props.cart as any)?.actionCode || '';
  }

  function hasAppliedCode() {
    return !!(props.cart as any)?.actionCode;
  }

  function handleApply() {
    if (!_code.trim() || _loading) return;
    set_loading(true);
    set_error('');
    if (props.onActionCodeApply) {
      props.onActionCodeApply(_code.trim(), props.cart);
      set_loading(false);
      return;
    }
    const cartService = new CartService(props.graphqlClient);
    cartService
      .addActionCodeToCart({
        id: (props.cart as any).cartId,
        input: { actionCode: _code.trim() },
        language: props.language || 'NL',
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
        imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
      })
      .then((updatedCart: Cart) => {
        set_loading(false);
        set_code('');
        if (props.afterActionCodeApply) {
          props.afterActionCodeApply(updatedCart);
        }
      })
      .catch((error: any) => {
        set_loading(false);
        set_error(
          getLabel(
            'errorApply',
            'Failed to apply action code. Please try again.'
          )
        );
        console.error('Failed to apply action code:', error);
      });
  }

  function handleRemove() {
    if (_loading || !hasAppliedCode()) return;
    set_loading(true);
    set_error('');
    const code = appliedCode();
    if (props.onActionCodeRemove) {
      props.onActionCodeRemove(code, props.cart);
      set_loading(false);
      return;
    }
    const cartService = new CartService(props.graphqlClient);
    cartService
      .removeActionCodeFromCart({
        id: (props.cart as any).cartId,
        input: { actionCode: code },
        language: props.language || 'NL',
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
        imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
      })
      .then((updatedCart: Cart) => {
        set_loading(false);
        if (props.afterActionCodeRemove) {
          props.afterActionCodeRemove(updatedCart);
        }
      })
      .catch((error: any) => {
        set_loading(false);
        set_error(
          getLabel(
            'errorRemove',
            'Failed to remove action code. Please try again.'
          )
        );
        console.error('Failed to remove action code:', error);
      });
  }

  function handleKeyDown(e: any) {
    if (e.key === 'Enter') {
      handleApply();
    }
  }

  useEffect(() => {
    set_isMounted(true);
  }, []);

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow space-y-3">
      <h2 className="text-lg font-bold">{title()}</h2>
      {_isMounted ? (
        <>
          {hasAppliedCode() ? (
            <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-4 h-4 text-violet-600"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-violet-700">
                  {appliedCode()}
                </span>
              </div>
              {showRemoveCode() ? (
                <button
                  type="button"
                  className="text-violet-600 hover:text-violet-800 text-sm font-medium transition-colors disabled:opacity-50"
                  onClick={() => handleRemove()}
                  disabled={_loading}
                >
                  {getLabel('remove', 'Remove')}
                </button>
              ) : null}
            </div>
          ) : null}
          {!hasAppliedCode() ? (
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                value={_code}
                onChange={(e) => {
                  set_code(e.target.value);
                }}
                onKeyDown={(e) => handleKeyDown(e)}
                placeholder={getLabel('placeholder', 'Enter action code')}
                disabled={_loading}
              />
              <button
                type="button"
                className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                onClick={() => handleApply()}
                disabled={_loading || !_code.trim()}
              >
                {_loading
                  ? getLabel('applying', 'Applying...')
                  : getLabel('apply', 'Apply')}
              </button>
            </div>
          ) : null}
          {!!_error ? <p className="text-sm text-red-600">{_error}</p> : null}
        </>
      ) : null}
    </div>
  );
}

export default ActionCode;
