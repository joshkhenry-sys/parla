(function () {
  // Nahtive's production domain is https://www.nahtive.com.
  // Do not force a host redirect here: authentication must be allowed to
  // complete on the currently deployed Vercel host until the custom domain
  // and Supabase redirect configuration are fully live.
  window.NAHTIVE_SITE_URL = "https://www.nahtive.com";

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = window.location.origin + window.location.pathname;
  document.head.appendChild(canonical);
})();