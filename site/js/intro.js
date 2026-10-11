// Plays the opening animation once per session. The page loads underneath; any failure just removes the overlay.
(function () {
  var el = document.getElementById("intro");
  if (!el) return;
  var seen = false; try { seen = sessionStorage.getItem("jd-intro") === "1"; } catch (e) {}
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (seen) { el.remove(); return; }
  try { sessionStorage.setItem("jd-intro", "1"); } catch (e) {}
  var lang = "en"; try { lang = localStorage.getItem("vgw-lang") || "en"; } catch (e) {}
  var txt = { en: ["JalDrishti", "Water quality at Bhopal's visarjan ghats", "Skip intro"], hi: ["जलदृष्टि", "भोपाल के विसर्जन घाटों की जल गुणवत्ता", "परिचय छोड़ें"] }[lang] || [];
  el.querySelector(".intro-name b").textContent = txt[0];
  el.querySelector(".intro-name span").textContent = txt[1];
  el.querySelector(".intro-skip").textContent = txt[2];
  var done = false;
  function finish(fly) {
    if (done) return; done = true;
    var drop = el.querySelector(".intro-drop"), target = document.querySelector(".l-brand .brand-logo");
    if (fly && target && !reduced) { // hand off: the drop settles into the header logo
      var a = drop.getBoundingClientRect(), b = target.getBoundingClientRect(), c = drop.cloneNode(true);
      c.className = "intro-fly"; c.style.cssText = "left:" + a.left + "px;top:" + a.top + "px;width:" + a.width + "px;height:" + a.height + "px;opacity:1";
      document.body.appendChild(c); drop.style.visibility = "hidden";
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        c.style.left = b.left + "px"; c.style.top = b.top + "px"; c.style.width = b.width + "px"; c.style.height = b.height + "px"; }); });
      setTimeout(function () { c.remove(); }, 700);
    }
    el.classList.add("out");
    setTimeout(function () { el.remove(); }, 480);
    document.removeEventListener("keydown", onKey);
  }
  function onKey() { finish(false); }
  el.addEventListener("click", function () { finish(false); });
  document.addEventListener("keydown", onKey);
  setTimeout(function () { finish(true); }, reduced ? 600 : 2600);
  setTimeout(function () { if (document.getElementById("intro")) el.remove(); }, 5000); // failsafe
})();
