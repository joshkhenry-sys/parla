(function () {
  const CANONICAL_HOST = "www.nahtive.com";
  const CANONICAL_URL = "https://" + CANONICAL_HOST;
  const host = window.location.hostname;
  const localHosts = ["localhost", "127.0.0.1", "::1"];

  window.NAHTIVE_SITE_URL = CANONICAL_URL;

  // Keep production on one canonical host. Preview/deployment hosts redirect
  // here, while local development remains usable.
  if (!localHosts.includes(host) && host !== CANONICAL_HOST) {
    const target = CANONICAL_URL + window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(target);
    return;
  }

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = CANONICAL_URL + window.location.pathname.replace(/\\/g, "");
  document.head.appendChild(canonical);
})();