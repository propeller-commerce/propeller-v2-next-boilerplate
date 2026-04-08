'use client';
import * as React from 'react';

import { useState } from 'react';
import { Order, GraphQLClient } from 'propeller-sdk-v2';
import { useOrders } from '@/composables/react/useOrders';

export interface QuoteActionsProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient?: GraphQLClient;

  /** The quotation for which the actions will take place */
  quote: Order;

  /** Labels used in the quote actions component */
  labels?: Record<string, string>;

  /** Action function triggered when the "Accept quotation" button is clicked.
   *  If not provided, the base implementation calls setOrderStatus on the SDK. */
  onAccept?: (quote: Order) => void;

  /** Action function triggered after the quote is accepted. Usually for navigating towards the thank you page. */
  afterAccept?: (quote: Order) => void;

  /** Show the terms and conditions acceptance */
  showTermsAndConditions?: boolean;

  /** Action when the "Terms and conditions" link is clicked */
  onTermsAndConditionsClick?: () => void;
}

function QuoteActions(props: QuoteActionsProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setQuoteStatus } = useOrders({
    graphqlClient: props.graphqlClient!,
    user: null,
  });

  function showTermsAndConditions(): boolean {
    return props.showTermsAndConditions !== undefined ? props.showTermsAndConditions : true;
  }

  function isAcceptDisabled(): boolean {
    if (showTermsAndConditions() && !termsAccepted) return true;
    if (loading) return true;
    return false;
  }

  function getLabel(key: string, fallback: string): string {
    return props.labels?.[key] || fallback;
  }

  function handleTermsChange(checked: boolean) {
    setTermsAccepted(checked);
  }

  function handleTermsLinkClick(event: Event) {
    event.preventDefault();
    if (props.onTermsAndConditionsClick) {
      props.onTermsAndConditionsClick();
    }
  }

  async function handleAcceptClick() {
    if (isAcceptDisabled()) return;
    setLoading(true);
    try {
      if (props.onAccept) {
        props.onAccept(props.quote);
      } else if (props.graphqlClient && props.quote?.id) {
        await setQuoteStatus(props.quote.id, { isQuoteAccepted: true });
      }
      if (props.afterAccept) {
        props.afterAccept(props.quote);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="quote-actions space-y-4">
      {showTermsAndConditions() ? (
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="quote-actions-terms"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={termsAccepted}
            onChange={(event) => handleTermsChange(event.target.checked)}
          />
          <label htmlFor="quote-actions-terms" className="text-sm leading-none">
            {getLabel('termsPrefix', 'I agree to the')}
            <a
              href="#"
              className="text-primary hover:underline font-medium"
              onClick={(event) => handleTermsLinkClick(event as unknown as Event)}
            >
              {getLabel('termsLink', 'Terms and Conditions')}
            </a>
          </label>
        </div>
      ) : null}
      <button
        type="button"
        className="flex items-center justify-center gap-2 w-full bg-primary text-white text-center py-3 rounded-lg hover:bg-primary/80 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        onClick={(event) => handleAcceptClick()}
        disabled={isAcceptDisabled()}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : null}
        {loading ? <>{getLabel('processing', 'Processing...')}</> : null}
        {!loading ? <>{getLabel('acceptButton', 'Accept Quotation')}</> : null}
      </button>
    </div>
  );
}

export default QuoteActions;
