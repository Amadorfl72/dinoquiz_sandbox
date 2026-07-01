document.addEventListener('DOMContentLoaded', () => {
  // Preload critical resources
  const preloadLinks = [
    { href: '/styles/main.css', as: 'style' },
    { href: '/scripts/main.js', as: 'script' },
    { href: '/images/dino-mascot.png', as: 'image' },
    { href: '/fonts/cartoon-font.woff2', as: 'font' }
  ];

  preloadLinks.forEach((link) => {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.href = link.href;
    preloadLink.as = link.as;
    document.head.appendChild(preloadLink);
  });

  // Lazy load non-critical resources
  if ('IntersectionObserver' in window) {
    const lazyImages = document.querySelectorAll('img.lazy');
    const lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.classList.remove('lazy');
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    lazyImages.forEach((lazyImage) => {
      lazyImageObserver.observe(lazyImage);
    });
  }
});