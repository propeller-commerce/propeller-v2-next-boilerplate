'use client';

import Link from 'next/link';
import { useGlobal } from '@/context/GlobalContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useTranslations } from '@/lib/i18n/client';

export default function Footer() {
  const globalData = useGlobal();
  const { language } = useLanguage();
  const t = useTranslations('Footer');

  // Fallback data when CMS is not available
  const description = globalData?.footerDescription || t.description;
  const email = globalData?.footerEmail || 'info@propeller.com';
  const phone = globalData?.footerPhone || '+1 234 567 890';
  const copyright = globalData?.copyrightText ||
    `\u00A9 ${new Date().getFullYear()} Propeller E-commerce. All rights reserved.`;

  const hasColumns = globalData?.footerColumns && globalData.footerColumns.length > 0;

  return (
    <footer className="bg-[#242526] text-slate-100 mt-auto border-t border-slate-800">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight text-white">
              {globalData?.siteName || 'Propeller'}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              {description}
            </p>
          </div>

          {hasColumns ? (
            globalData!.footerColumns.map((column, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">
                  {column.title}
                </h4>
                <ul className="space-y-3 text-sm text-slate-400">
                  {column.links.map((link, j) => (
                    <li key={j}>
                      <Link href={localizeHref(link.url, language)} className="hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">{t.shopTitle}</h4>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li><Link href={localizeHref("/", language)} className="hover:text-white transition-colors">{t.allProducts}</Link></li>
                  <li><Link href={localizeHref("/", language)} className="hover:text-white transition-colors">{t.featured}</Link></li>
                  <li><Link href={localizeHref("/", language)} className="hover:text-white transition-colors">{t.newArrivals}</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">{t.supportTitle}</h4>
                <ul className="space-y-3 text-sm text-slate-400">
                  <li><Link href={localizeHref("/account", language)} className="hover:text-white transition-colors">{t.myAccount}</Link></li>
                  <li><Link href={localizeHref("/terms-conditions", language)} className="hover:text-white transition-colors">{t.termsConditions}</Link></li>
                  <li><Link href={localizeHref("/privacy", language)} className="hover:text-white transition-colors">{t.privacyPolicy}</Link></li>
                  <li><Link href={localizeHref("/returns", language)} className="hover:text-white transition-colors">{t.returns}</Link></li>
                </ul>
              </div>
            </>
          )}

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">{t.contactTitle}</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span>{email}</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <span>{phone}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">{copyright}</p>
          <div className="flex gap-4">
            {/* Social icons could go here */}
          </div>
        </div>
      </div>
    </footer>
  );
}
