'use client';

export function trapFocus(container: HTMLElement): () => void {
  const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const focusableElements = container.querySelectorAll(focusableSelectors);
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (!firstElement) return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  // Focus first focusable element
  const firstFocusable = container.querySelector(focusableSelectors) as HTMLElement;
  if (firstFocusable) firstFocusable.focus();

  return () => container.removeEventListener('keydown', handleKeyDown);
}
