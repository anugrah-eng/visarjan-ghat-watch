// Runs in <head>: the opening sequence plays whenever the site is opened (once per browser session),
// decided before first paint so the dashboard never flashes first.
(function () {
  var play = true;
  try { if (sessionStorage.getItem("vgw.intro") === "seen") play = false; } catch (e) {}
  if (play) {
    document.documentElement.setAttribute("data-intro", "1");
    // Reduced motion: show the opening frame as a still instead of the moving video.
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.setAttribute("data-intro-still", "1");
  }
})();
