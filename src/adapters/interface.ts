/**
 * Page Adapter Interface
 *
 * Each adapter is responsible for:
 * 1. Matching URLs it handles
 * 2. Finding DOM elements (posters, titles) via MutationObserver or direct queries
 * 3. Creating and mounting custom elements (<us-status-dot>, <us-info-card>)
 * 4. Coordinating API calls to update component state
 */
export interface PageAdapter {
  /** Human-readable adapter name for logging */
  name: string;

  /** Return true if this adapter should handle the given URL */
  match(url: string): boolean;

  /** Initialize the adapter: set up observers, scan existing elements, mount components */
  init(): void | Promise<void>;

  /** Optional cleanup when navigating away */
  destroy?(): void;
}
