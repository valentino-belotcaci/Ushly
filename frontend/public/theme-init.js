(() => {
  let theme = 'dark';
  try {
    if (localStorage.getItem('ushly.theme') === 'light') theme = 'light';
  } catch {
    // Storage can be blocked; the accessible dark default still works.
  }
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#121212' : '#f7f8fa');
  document
    .getElementById('favicon')
    ?.setAttribute('href', `/favicon-32x32-${theme}.png`);
  document
    .getElementById('apple-icon')
    ?.setAttribute('href', `/favicon-180x180-${theme}.png`);
  document
    .getElementById('app-manifest')
    ?.setAttribute('href', `/manifest-${theme}.webmanifest`);
})();
