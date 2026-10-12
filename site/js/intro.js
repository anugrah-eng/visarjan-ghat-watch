// Plays the opening video through to the end (it cannot be skipped), then fades into the dashboard.
// It never traps anyone: if the video can't play, the opening frame shows briefly and the dashboard follows.
(function () {
  var root = document.documentElement, box = document.getElementById("intro");
  if (!box) return;
  if (root.getAttribute("data-intro") !== "1") { box.remove(); return; }
  var v = box.querySelector("video"), done = false;
  var lang = "en"; try { lang = localStorage.getItem("vgw-lang") || "en"; } catch (e) {}
  box.setAttribute("aria-label", lang === "hi" ? "आरंभिक दृश्य: जलदृष्टि" : "Opening sequence: JalDrishti");
  function finish() {
    if (done) return; done = true;
    try { sessionStorage.setItem("vgw.intro", "seen"); } catch (e) {}
    root.classList.add("intro-out"); // the dashboard fades up while the video fades away
    box.classList.add("leaving");
    setTimeout(function () {
      root.removeAttribute("data-intro"); root.removeAttribute("data-intro-still"); root.classList.remove("intro-out"); box.remove();
      try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {}
      window.dispatchEvent(new Event("resize")); // let the map size itself now the page is visible
    }, 700);
  }
  var fallback = function () { setTimeout(finish, 2500); }; // show the poster frame, then the dashboard
  if (root.getAttribute("data-intro-still") === "1") { fallback(); return; }
  v.addEventListener("ended", finish);
  v.addEventListener("error", fallback);
  var p = v.play(); if (p && p.catch) p.catch(fallback);
  setTimeout(function () { if (!done && v.currentTime === 0) finish(); }, 6000); // video never started: don't wait longer
  setTimeout(finish, 12000); // hard cap (the video is about 8.7 s)
})();
