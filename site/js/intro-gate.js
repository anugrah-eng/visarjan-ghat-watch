// Runs in <head>: decides before first paint whether the opening sequence plays, so the dashboard never flashes first.
(function () {
  var h = location.hash.replace("#", ""), play = h === "" || h === "overview" || h === "home" || h === "dashboard";
  try { if (sessionStorage.getItem("vgw.intro") === "seen") play = false; } catch (e) {}
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) play = false;
  if (navigator.connection && navigator.connection.saveData) play = false;
  if (play) document.documentElement.setAttribute("data-intro", "1");
})();
