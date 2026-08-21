/**
 * Styling override probe page — used by
 * `e2e/tests/anonymous/styling-overrides.spec.ts` to verify the three
 * override surfaces a consumer of propeller-v2-react-ui has.
 *
 * NOT linked from anywhere in the live navigation.
 */
import { Breadcrumbs } from '@propeller-commerce/propeller-v2-react-ui';

export default function StylingTestPage() {
  return (
    <main className="p-8 space-y-8">
      {/* Inline <style> demonstrates a consumer's two stylesheet-side override
          paths. Lives on the page rather than in globals.css to keep the test
          self-contained and avoid polluting the rest of the app. */}
      <style>{`
        .styling-test {
          /* (1) Token override: redefine the CSS variable bg-card resolves to.
             The package's CSS declared --card on :root with low specificity,
             so a redeclaration here wins for any element inside .styling-test. */
          --card: rgb(0, 200, 100);
          --color-card: var(--card);
        }
        /* (2) BEM hook override: rules outside @layer beat @layer utilities.
           Even though Tailwind utilities live in @layer utilities, this
           plain rule cascades over them on the .propeller-breadcrumbs
           element inside [data-bem-probe-host]. */
        [data-bem-probe-host] .propeller-breadcrumbs {
          outline: 4px solid rgb(255, 0, 0);
        }
      `}</style>

      <div className="styling-test space-y-4">
        <h1 className="text-xl font-bold">Override probes</h1>

        {/* (1) Token probe — bg-card on a plain div inside .styling-test.
            The redeclared --card should show through. */}
        <div
          data-testid="token-probe"
          className="bg-card p-4 rounded-container"
        >
          Token override probe (bg-card → re-declared --card)
        </div>

        {/* (2) BEM probe — Breadcrumbs root is .propeller-breadcrumbs.
            The CSS rule above adds a red outline that should win. We attach
            data-bem-probe via wrapper because Breadcrumbs doesn't forward
            attributes other than className. */}
        <div data-bem-probe-host>
          <Breadcrumbs
            categoryPath={[]}
            currentLabel="BEM probe"
            // No className override here — we're testing that the BEM rule
            // cascades over the package's built-in Tailwind classes on the
            // .propeller-breadcrumbs root.
          />
        </div>

        {/* (3) Per-instance className probe — Breadcrumbs appends
            props.className on its <nav> root. We pass bg-blue-500 and
            expect rgb(59, 130, 246). */}
        <Breadcrumbs
          categoryPath={[]}
          currentLabel="Per-instance probe"
          className="bg-blue-500"
        />
      </div>
    </main>
  );
}
