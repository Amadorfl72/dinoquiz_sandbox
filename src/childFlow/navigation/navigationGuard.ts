export function isExternalUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  const trimmed = url.trim();

  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('sms:') ||
    lower.startsWith('intent:')
  ) {
    return true;
  }

  try {
    const currentOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmed, currentOrigin);
    return parsed.origin !== currentOrigin;
  } catch {
    return false;
  }
}

export function installExternalNavigationGuard(
  targetDocument: Document = document,
  targetWindow: Window = window
): () => void {
  const handleClick = (event: MouseEvent) => {
    const clickedNode = event.target;
    if (!(clickedNode instanceof Element)) {
      return;
    }

    const anchor = clickedNode.closest('a[href]');
    if (!anchor) {
      return;
    }

    const href = anchor.getAttribute('href') ?? '';
    const opensNewTab = anchor.getAttribute('target') === '_blank';

    if (opensNewTab || isExternalUrl(href)) {
      event.preventDefault();
      event.stopPropagation();
      console.warn(
        '[DinoQuiz] Navegacion externa bloqueada en el flujo del nino:',
        href
      );
    }
  };

  const originalOpen = targetWindow.open.bind(targetWindow);

  targetWindow.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = url ? url.toString() : '';
    if (isExternalUrl(href)) {
      console.warn(
        '[DinoQuiz] window.open externo bloqueado en el flujo del nino:',
        href
      );
      return null;
    }
    return originalOpen(url as string, target, features);
  }) as typeof targetWindow.open;

  targetDocument.addEventListener('click', handleClick, true);

  return () => {
    targetDocument.removeEventListener('click', handleClick, true);
    targetWindow.open = originalOpen;
  };
}
