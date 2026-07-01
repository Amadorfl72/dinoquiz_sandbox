document.addEventListener('DOMContentLoaded', () => {
  // Preload critical resources
  const preloadLinks = [
    { href: '/styles/main.css', as: 'style' },
    { href: '/assets/images/dino-mascot.png', as: 'image' },
    { href: '/assets/sounds/positive-feedback.mp3', as: 'audio' },
    { href: '/assets/sounds/neutral-feedback.mp3', as: 'audio' }
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
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    lazyImages.forEach((img) => imageObserver.observe(img));
  }
});