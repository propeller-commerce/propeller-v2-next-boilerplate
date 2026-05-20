/**
 * Back-compat shim re-exporting the SDK seam from `propeller-v2-react-ui`.
 *
 * Phase E extracted the package; the boilerplate now consumes everything
 * from the published module. The few call sites that still do
 * `import { graphqlClient, getServices, toPlain } from '@/lib/api'`
 * keep working through this file. Prefer importing from the package
 * directly in new code.
 */
export {
  graphqlClient,
  graphqlConfig,
  getServices,
  toPlain,
  type Services,
} from 'propeller-v2-react-ui';
