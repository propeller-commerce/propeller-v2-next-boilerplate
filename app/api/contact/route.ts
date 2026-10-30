import { getMailProvider } from '@/lib/mail';
import { handleContact } from '@/lib/contact/handler';
import { formProtection } from '@/lib/form-protection';

// CMS contact-form block submission; recipient is CONTACT_TO_EMAIL only.
export async function POST(req: Request) {
  return handleContact(req, {
    send: (message) => getMailProvider().send(message),
    recipients: process.env.CONTACT_TO_EMAIL,
    protection: formProtection(),
  });
}
