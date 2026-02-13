import type { MediaCheckResult } from '@/services/media-service';

/**
 * Unified UI injection controller.
 *
 * Handles StatusDot mounting, state updates, click binding, and InfoCard display.
 */
class UIController {
  /**
   * Create and mount a StatusDot on the given cover element.
   */
  mountDot(
    cover: HTMLElement,
    size: 'small' | 'medium' | 'large' | 'mini' = 'medium',
    inline?: boolean,
  ): Element {
    const dot = document.createElement('us-status-dot');

    dot.setAttribute('status', 'loading');
    dot.setAttribute('size', size);

    const dotWrapper = document.createElement('div');
    if (inline) {
      dotWrapper.style.display = 'inline-block';
    } else {
      dotWrapper.style.position = 'absolute';
      dotWrapper.style.zIndex = '99';
      dotWrapper.style.left = '0';
      dotWrapper.style.top = '0';
    }

    const sizeMap = {
      mini: '12px',
      small: '20px',
      medium: '28px',
      large: '36px',
    };

    dotWrapper.style.width = sizeMap[size];
    dotWrapper.style.height = sizeMap[size];

    dotWrapper.appendChild(dot);

    cover.style.position = 'relative';
    cover.appendChild(dotWrapper);
    return dot;
  }

  /**
   * Update a mounted dot element based on a MediaCheckResult.
   */
  updateDot(dotEl: Element, result: MediaCheckResult): void {
    dotEl.setAttribute('status', result.status);
    dotEl.setAttribute('title', result.statusMessage);
  }

  /**
   * Bind click events on a dot to show the InfoCard.
   */
  bindInfoCard(dotEl: Element, result: MediaCheckResult): void {
    const handler = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showModal(result);
    };

    dotEl.addEventListener('dotClick', handler);
    dotEl.addEventListener('click', handler);
  }

  /**
   * Show the InfoCard modal with the given media check result.
   */
  showModal(result: MediaCheckResult): void {
    // Remove existing info card
    const existing = document.querySelector('us-info-card');
    if (existing) existing.remove();

    const card = document.createElement('us-info-card');
    card.setAttribute('title', result.title);
    card.setAttribute('visible', 'true');

    // Pass complex props via element properties
    const cardEl = card as any;
    cardEl.embyItem = result.embyItem;
    cardEl.embyItems = result.embyItems;
    cardEl.searchQueries = result.searchQueries;
    cardEl.tmdbInfo = result.tmdbInfo;
    cardEl.tmdbResults = result.tmdbResults;

    card.addEventListener('close', () => {
      card.remove();
    });

    document.body.appendChild(card);
  }
}

export const uiController = new UIController();
