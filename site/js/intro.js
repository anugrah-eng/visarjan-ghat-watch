// Plays the opening video once per session, then fades into the dashboard. Skip button, click or Escape ends it.
// If the video can't play (blocked autoplay, missing codec, slow network) the dashboard simply shows.
(function () {
  var root = document.documentElement, box = document.getElementById("intro");
  if (!box) return;
  if (root.getAttribute("data-intro") !== "1") { box.remove(); return; }
  var v = box.querySelector("video"), skip = box.querySelector(".intro-skip"), done = false;
  var lang = "en"; try { lang = localStorage.getItem("vgw-lang") || "en"; } catch (e) {}
  skip.textContent = lang === "hi" ? "परिचय छोड़ें" : "Skip intro";
  box.setAttribute("aria-label", lang === "hi" ? "आरंभिक दृश्य: जलदृष्टि" : "Opening sequence: JalDrishti");
  function finish() {
    if (done) return; done = true;
    try { sessionStorage.setItem("vgw.intro", "seen"); } catch (e) {}
    box.classList.add("leaving");
    setTimeout(function () {
      root.removeAttribute("data-intro"); box.remove();
      try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {}
      window.dispatchEvent(new Event("resize")); // let the map size itself now the page is visible
    }, 700);
  }
  skip.addEventListener("click", function (e) { e.stopPropagation(); finish(); });
  box.addEventListener("click", finish);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); });
  v.addEventListener("ended", finish);
  v.addEventListener("error", finish);
  var p = v.play(); if (p && p.catch) p.catch(function () { finish(); });
  setTimeout(function () { if (!done && v.currentTime === 0) finish(); }, 4500); // never stall on a blocked source
  setTimeout(finish, 14000); // hard cap
  skip.focus({ preventScroll: true });
})();
