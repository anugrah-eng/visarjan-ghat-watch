// Runs in <head> before the page paints, so there is no flash of the wrong theme.
// First visit follows the system setting; after that, the user's choice is remembered.
(function () {
  var saved = null;
  try { saved = localStorage.getItem("vgw-theme"); } catch (e) {}
  var dark = saved ? saved === "dark" : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try { document.documentElement.lang = localStorage.getItem("vgw-lang") || "en"; } catch (e) {}
  window.setTheme = function (t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("vgw-theme", t); } catch (e) {}
    document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  };
})();
