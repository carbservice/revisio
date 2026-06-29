/* Bezoekers-spoor voor Carburateur Service Nederland.
   Draait op ELKE pagina (1 include in de <head>). Houdt in de browser
   (localStorage) bij: de BRON (Ads/Facebook/zoekmachine/referrer + landings-
   pagina) en het KLIK-SPOOR (welke pagina's, in welke volgorde, met tijd).
   Wordt bij een aanvraag meegestuurd met de lead, zodat je in het dashboard
   ziet waar de klant vandaan komt en wat hij heeft bekeken. */
(function () {
  try {
    var KEY = 'cb_journey', now = Date.now();
    var d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!d || typeof d !== 'object') d = { first: now, source: null, trail: [] };
    if (!Array.isArray(d.trail)) d.trail = [];

    var p = new URLSearchParams(location.search);
    var keys = ['gclid', 'gad_source', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    if (!d.source) {
      var s = {};
      keys.forEach(function (k) { var v = p.get(k); if (v) s[k] = v; });
      s.referrer = document.referrer || '';
      s.landing = location.pathname;
      s.eerste = new Date(now).toISOString();
      d.source = s;
    } else {
      // latere bezoeken: vul ontbrekende bron-velden aan, overschrijf niets.
      keys.forEach(function (k) { var v = p.get(k); if (v && !d.source[k]) d.source[k] = v; });
    }

    var last = d.trail[d.trail.length - 1];
    if (!last || last.p !== location.pathname) {
      d.trail.push({ p: location.pathname, t: now });
      if (d.trail.length > 40) d.trail = d.trail.slice(-40);
    }
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {}
})();
function cbJourney() { try { return JSON.parse(localStorage.getItem('cb_journey') || 'null'); } catch (e) { return null; } }
