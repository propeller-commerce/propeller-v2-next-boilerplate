'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { GraphQLClient, Cart } from 'propeller-sdk-v2';
import { useCart } from '@/composables/react/useCart';
import { getLabel } from '@/lib/helpers/labelHelpers';

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
  // --- composable ---
  const { addActionCode, removeActionCode, loading } = useCart({
    graphqlClient: props.graphqlClient,
    user: null,
    cartId: props.cart?.cartId,
    configuration: props.configuration,
  });

  // --- local UI state ---
  const [code, setCode] = useState<string>(() => '');
  const [error, setError] = useState<string>(() => '');
  const [isMounted, setIsMounted] = useState<boolean>(() => false);

  // --- display helpers ---
  
  function title(): string {
    return props.title || 'Action code';
  }
  function showRemoveCode(): boolean {
    return props.showRemoveCode !== undefined ? props.showRemoveCode : true;
  }
  function appliedCode(): string {
    return props.cart?.actionCode || '';
  }
  function hasAppliedCode(): boolean {
    return !!props.cart?.actionCode;
  }

  // --- actions via composable ---
  async function handleApply(): Promise<void> {
    if (!code.trim() || loading) return;
    setError('');
    if (props.onActionCodeApply) {
      props.onActionCodeApply(code.trim(), props.cart);
      setCode('');
      return;
    }
    try {
      const updatedCart = await addActionCode(code.trim());
      setCode('');
      if (updatedCart && props.afterActionCodeApply) props.afterActionCodeApply(updatedCart);
    } catch (err: any) {
      setError(getLabel(props.labels, 'errorApply', 'Failed to apply action code. Please try again.'));
      console.error('Failed to apply action code:', err);
    }
  }

  async function handleRemove(): Promise<void> {
    if (loading || !hasAppliedCode()) return;
    setError('');
    const currentCode = appliedCode();
    if (props.onActionCodeRemove) {
      props.onActionCodeRemove(currentCode, props.cart);
      return;
    }
    try {
      const updatedCart = await removeActionCode(currentCode);
      if (updatedCart && props.afterActionCodeRemove) props.afterActionCodeRemove(updatedCart);
    } catch (err: any) {
      setError(getLabel(props.labels, 'errorRemove', 'Failed to remove action code. Please try again.'));
      console.error('Failed to remove action code:', err);
    }
  }

  function handleKeyDown(e: any): void {
    if (e.key === 'Enter') {
      handleApply();
    }
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="propeller-action-code w-full bg-card p-6 rounded-container shadow space-y-3">
      <h2 className="text-lg font-bold">{title()}</h2>
      {isMounted ? (
        <>
          {hasAppliedCode() ? (
            <div className="flex items-center justify-between bg-secondary/5 border border-secondary/20 rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-4 h-4 text-secondary"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-secondary">{appliedCode()}</span>
              </div>
              {showRemoveCode() ? (
                <button
                  type="button"
                  className="text-secondary hover:text-secondary text-sm font-medium transition-colors disabled:opacity-50"
                  onClick={(event) => handleRemove()}
                  disabled={loading}
                >
                  {getLabel(props.labels, 'remove', 'Remove')}
                </button>
              ) : null}
            </div>
          ) : null}
          {!hasAppliedCode() ? (
            <div className="flex gap-2">
              <input
                type="text"
                className="propeller-action-code__input flex-1 text-sm border border-input rounded-control px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-transparent disabled:opacity-50"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                }}
                onKeyDown={(e) => handleKeyDown(e)}
                placeholder={getLabel(props.labels, 'placeholder', 'Enter action code')}
                disabled={loading}
              />
              <button
                type="button"
                className="propeller-action-code__submit bg-secondary text-secondary-foreground text-sm font-medium px-4 py-2 rounded-control hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                onClick={(event) => handleApply()}
                disabled={loading || !code.trim()}
              >
                {loading ? <>{getLabel(props.labels, 'applying', 'Applying...')}</> : null}
                {!loading ? <>{getLabel(props.labels, 'apply', 'Apply')}</> : null}
              </button>
            </div>
          ) : null}
          {!!error ? <p className="propeller-action-code__error text-sm text-destructive">{error}</p> : null}
        </>
      ) : null}
    </div>
  );
}

export default ActionCode;
