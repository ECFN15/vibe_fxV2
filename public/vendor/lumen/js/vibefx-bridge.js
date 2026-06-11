/* Vibe_fx bridge: exports the current LUMEN shader as a high-resolution PNG background. */
(function () {
  var BRIDGE_SOURCE = "lumen-shaders";
  var capturing = false;

  function evenRound(value) { return 2 * Math.round(value / 2); }

  function post(type, payload) {
    if (!window.parent || window.parent === window) return;
    window.parent.postMessage({ source: BRIDGE_SOURCE, type: type, payload: payload || {} }, window.location.origin);
  }

  function safeDesignCode() {
    try { return typeof encodeDesign === "function" ? encodeDesign() : ""; }
    catch (error) { return ""; }
  }

  function safeStyleName() {
    try { return typeof styleName === "function" ? styleName() : "Lumen shader"; }
    catch (error) { return "Lumen shader"; }
  }

  function setButtonState(state) {
    var btn = document.getElementById("btn-vibefx-bg");
    if (!btn) return;
    btn.dataset.state = state;
    var label = btn.querySelector("span");
    if (label) label.textContent = state === "busy" ? "Rendering" : state === "done" ? "Sent" : "Vibe_fx";
  }

  function captureCurrent() {
    if (capturing) return;
    if (!window.Engine || !Engine.canvas || !window.P || !window.ASPECTS) {
      post("lumen:error", { message: "Lumen engine is not ready" });
      return;
    }

    capturing = true;
    setButtonState("busy");

    var prev = Engine.size();
    if (!prev || prev[0] < 2 || prev[1] < 2) {
      post("lumen:error", { message: "Lumen canvas is not ready" });
      capturing = false;
      setButtonState("idle");
      return;
    }
    var wasPlaying = Engine.isPlaying();
    var aspect = ASPECTS[P.aspect] || (16 / 9);
    var targetH = Math.min(1080, Math.max(720, parseInt(P.imgRes, 10) || 900));
    var targetW = evenRound(targetH * aspect);
    var phase = Engine.currentPhase();

    Engine.suspend();
    Engine.setPlaying(false);
    Engine.setSize(targetW, targetH);
    Engine.renderAt(phase);

    Engine.canvas().toBlob(function (blob) {
      Engine.setSize(prev[0], prev[1]);
      Engine.setPlaying(wasPlaying);
      Engine.resume();
      Engine.renderAt(phase);
      capturing = false;

      if (!blob) {
        setButtonState("idle");
        post("lumen:error", { message: "Unable to render PNG" });
        return;
      }

      var reader = new FileReader();
      reader.onloadend = function () {
        post("lumen:use-background", {
          dataUrl: reader.result,
          width: targetW,
          height: targetH,
          aspect: P.aspect,
          mode: MODES[P.mode] ? MODES[P.mode].key : "shader",
          styleName: safeStyleName(),
          seed: Math.round(P.seed || 0),
          designCode: safeDesignCode()
        });
        setButtonState("done");
        if (window.UI && UI.toast) UI.toast("Sent to Vibe_fx background");
        window.setTimeout(function () { setButtonState("idle"); }, 1400);
      };
      reader.readAsDataURL(blob);
    }, "image/png");
  }

  function installButton() {
    var actions = document.querySelector(".topbar-actions");
    if (!actions || document.getElementById("btn-vibefx-bg")) return;

    var divider = document.createElement("div");
    divider.className = "topbar-divider vibe-bridge-divider";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btn-vibefx-bg";
    btn.className = "btn btn-vibefx-use";
    btn.title = "Use as Vibe_fx background";
    btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 9.6 6.4 14.5 8 9.6 9.6 8 14.5 6.4 9.6 1.5 8 6.4 6.4Z" fill="none" stroke="currentColor" stroke-width="1.45"/><circle cx="8" cy="8" r="1.7" fill="currentColor"/></svg><span>Vibe_fx</span>';
    btn.addEventListener("click", captureCurrent);

    var docs = actions.querySelector('a[href="docs.html"]');
    if (docs) {
      actions.insertBefore(divider, docs);
      actions.insertBefore(btn, docs);
    } else {
      actions.appendChild(divider);
      actions.appendChild(btn);
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin) return;
    var data = event.data || {};
    if (data.source === "vibefx" && data.type === "vibefx:capture-lumen") captureCurrent();
  });

  document.addEventListener("DOMContentLoaded", installButton);
  window.LumenVibeBridge = { captureCurrent: captureCurrent };
})();
