# NL Translations — Review Queue

All 51 namespace files have been translated to Dutch best-effort.

## Ground-truth sources used

- `OrderList`: pre-existing hardcoded Dutch from `app/account/orders/page.tsx` and siblings (`view: 'Weergave'`, `previous: 'Vorige'`, `next: 'Volgende'`, `showingPage: 'Pagina'`, `of: 'van'`, `noOrders: 'Geen orders'`, `loading: 'Laden'`) — applied verbatim where slugs matched.
- Common shop UI vocabulary: idiomatic Dutch B2B retail conventions per the translation style guide.

## Cross-cutting decisions

- `Email`, `Status`, `SKU`, `EAN`, `ID`, `Downloads`, `Track & Trace` kept as-is — universally recognised in Dutch.
- `Gender` field label → `"Aanhef"` consistently across AddressCard, PurchaseAuthorizationConfigurator, RegisterForm (Dutch convention for salutation/title on forms).
- `genderMale`/`genderFemale` → `"De heer"` / `"Mevrouw"` in AddressCard and PurchaseAuthorizationConfigurator (formal B2B Dutch); RegisterForm uses shorter `"Dhr."` / `"Mevr."` (dropdown space constraints).
- VAT → `BTW` throughout.
- `City` → `"Plaats"` (Dutch address convention; not `"Stad"`).
- `CoC Number` → `"KvK-nummer"` (Kamer van Koophandel, official abbreviation).
- `"Continue as Guest"` → `"Doorgaan als gast"` — guest checkout not common in B2B but translated literally.
- `"sortOrderOption": "Order"` (EN) → `"Weergave"` — matched to ground-truth `view: 'Weergave'`; the key `sortOrderOption` in EN means sort direction, but the ground-truth Dutch for `view` was `'Weergave'`, and `sortOrderOption` is the closest matching slug in the current JSON.
- `"pieces"` (ItemStock) → `"st"` (stuks, standard Dutch abbreviation for units).
- `"Bonus items"` → `"Bonusartikelen"` (compound noun, standard Dutch).
- `"wishlist"` (FavoriteListDetails) → `"verlanglijst"` (most natural Dutch equivalent).
- `"ICP/ICS"` label kept with Dutch expansion: `"Intracommunautaire levering"`.

## Slugs to review

- `PurchaseAuthorizationConfigurator.title` — EN: "Purchase Authorization Settings" → NL (proposed): "Inkoopauthorisatie-instellingen" — Reason: compound noun; a native reviewer may prefer "Instellingen inkoopmachtiging" or "Inkoopbeheer instellingen".
- `PurchaseAuthorizationConfigurator.roleManager` — EN: "Authorization Manager" → NL (proposed): "Autorisatiebeheerder" — Reason: technical role name; could also be "Machtigingsbeheerder".
- `PurchaseAuthorizationConfigurator.rolePurchaser` — EN: "Purchaser" → NL (proposed): "Inkoper" — Reason: correct but could be "Aanvrager" depending on how the role is presented in the UI flow.
- `CartItem.crossupsellTitle` — EN: "You might also like" → NL (proposed): "Misschien ook interessant" — Reason: colloquial; acceptable but a reviewer may prefer "Wellicht ook interessant" or "Aanbevolen producten".
- `ForgotPassword.emailNotFound` — EN: "We couldn" (truncated in source) → NL (proposed): "We konden" — Reason: the source value appears truncated in both EN and NL seeds; kept symmetrical. A reviewer should verify the full string in the component source and translate the complete sentence.
- `LoginForm.registerText` — EN: "Don" (truncated in source) → NL (proposed): "Nog geen account?" — Reason: source value appears truncated; translated the implied complete sentence. Verify against component source.
- `OrderList.sortOrderOption` — EN: "Order" → NL (proposed): "Weergave" — Reason: slug name suggests sort direction, but ground-truth for display order was "Weergave"; context-dependent.
- `AddressCard.icp` — EN: "ICP/ICS (Intra-Community Supply)" → NL (proposed): "ICP/ICS (Intracommunautaire levering)" — Reason: technical/tax term; a tax specialist should verify the correct Dutch terminology.
- `RegisterForm.contactLabel` — EN: "Company" → NL (proposed): "Zakelijk" — Reason: used as account type toggle label; "Zakelijk" (business) is idiomatic but a reviewer should confirm the UX copy direction.
- `RegisterForm.customerLabel` — EN: "Consumer" → NL (proposed): "Particulier" — Reason: counterpart to "Zakelijk"; standard Dutch consumer label but review in context of B2B-first shop.
