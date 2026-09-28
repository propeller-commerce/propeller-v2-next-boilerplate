/**
 * Mail provider interface.
 *
 * Deliberately not routed through the CMS. `CMS_PROVIDER` may be `none`, and
 * Prepr and Contentful are content APIs with nowhere to host a mailer — so a
 * quote request that depended on the CMS would simply not send for most
 * configurations. The app owns delivery.
 */

export interface MailAddress {
  email: string;
  name?: string;
}

export interface MailMessage {
  to: string[];
  subject: string;
  /** Plain-text alternative. Always send one — some clients prefer it. */
  text: string;
  html: string;
  /** Where a reply goes; for a request that is the shopper. */
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface MailProvider {
  /** Sends one message. Throws on failure so the route can report it. */
  send(message: MailMessage): Promise<void>;
  /** Identifies the provider in logs and health checks. */
  readonly name: string;
}
