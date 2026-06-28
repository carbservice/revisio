// lib/moneybird.js
// Eén plek voor de Moneybird-koppeling. Voorheen had elke API-route z'n eigen
// kopie van de admin-id, het token en een mb()-fetchje, met subtiel verschillend
// gedrag. Dat is hier gebundeld zodat alle routes dezelfde, voorspelbare helper
// gebruiken. We bieden bewust twee smaken:
//   mb()    -> de "zachte" variant: JSON bij ok, {_fout,_tekst} bij een fout,
//              {_fout:0,_tekst} bij een uitzondering (zoals /api/aanvraag).
//   mbRaw() -> de rauwe Response (voor routes die zelf res.ok / res.text() /
//              res.arrayBuffer() willen, zoals /api/factuur).
// MB_ADMIN / MB_TOKEN zijn er voor routes die zelf een URL of header bouwen.

export const MB_ADMIN = process.env.MONEYBIRD_ADMIN;
export const MB_TOKEN = process.env.MONEYBIRD_TOKEN;

// Pad netjes maken: routes geven het pad meestal zónder leidende slash door
// ("estimates.json", "contacts.json?query=..."). We strippen een eventuele
// leidende slash zodat de basis-URL altijd klopt.
function bouwUrl(pad) {
  const schoon = String(pad || "").replace(/^\/+/, "");
  return `https://moneybird.com/api/v2/${MB_ADMIN}/${schoon}`;
}

// Rauwe Response terug. Bearer-auth + no-store. Content-Type alleen meesturen als
// er een body is (een losse GET hoeft 'm niet). Geen foutafhandeling: de
// aanroeper kijkt zelf naar res.ok / res.status / res.text() / res.arrayBuffer().
export function mbRaw(pad, method = "GET", body) {
  const headers = { Authorization: `Bearer ${MB_TOKEN}` };
  if (body) headers["Content-Type"] = "application/json";
  return fetch(bouwUrl(pad), {
    method,
    headers,
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Zachte variant (zelfde contract als de oude mb() in /api/aanvraag):
//   - res.ok      -> geparste JSON
//   - !res.ok     -> { _fout: res.status, _tekst: <body, max 200 tekens> }
//   - uitzondering -> { _fout: 0, _tekst: <melding, max 200 tekens> }
export async function mb(pad, method = "GET", body) {
  try {
    const res = await fetch(bouwUrl(pad), {
      method,
      headers: { Authorization: `Bearer ${MB_TOKEN}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return { _fout: res.status, _tekst: (await res.text()).slice(0, 200) };
    return res.json();
  } catch (e) {
    return { _fout: 0, _tekst: String(e).slice(0, 200) };
  }
}
