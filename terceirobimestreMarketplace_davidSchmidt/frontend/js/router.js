// routeTo: navigate to a path relative to the frontend root in a way that
// works whether the site is served from / or from a subpath (Live Server).
// Usage: routeTo('index.html') or routeTo('pages/login.html')
(function(window){
  function getPrefix() {
    // If current path contains /pages/ we're inside a pages folder => go up one level
    const p = window.location.pathname;
    if (p.includes('/pages/')) return '../';
    // If current path looks like it's inside /frontend/ keep root relative
    if (p.includes('/frontend/')) return '';
    // If it's served from a project subfolder (e.g. /gamemarket-completo/index.html),
    // assume target is relative to that folder (no prefix)
    return '';
  }

  function routeTo(target) {
    if (!target) return;
    const prefix = getPrefix();
    // if target already looks relative-upwards, use as-is
    if (target.startsWith('../') || target.startsWith('./') || target.startsWith('/')) {
      window.location.href = target;
      return;
    }
    window.location.href = prefix + target;
  }

  window.routeTo = routeTo;
})(window);
