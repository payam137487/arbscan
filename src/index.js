import { findArb } from "./lib/arbitrage.js";

const API_BASE = "https://api.odds-api.io/v3";

function json(data, status = 200) {
  return Response.json(data, { status });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "ArbScan"
      });
    }

    if (url.pathname === "/api/arbitrage") {
      if (!env.ODDS_API_KEY) {
        return json({
          ok: false,
          error: "ODDS_API_KEY is not configured"
        }, 500);
      }

      try {
        const eventsUrl = new URL(`${API_BASE}/events`);
        eventsUrl.searchParams.set("apiKey", env.ODDS_API_KEY);
        eventsUrl.searchParams.set("sport", "football");
        eventsUrl.searchParams.set("status", "pending");
        eventsUrl.searchParams.set("limit", "10");

        const eventsRes = await fetch(eventsUrl);

        if (!eventsRes.ok) {
          return json({
            ok: false,
            error: "Failed to fetch events",
            status: eventsRes.status
          }, 502);
        }

        const events = await eventsRes.json();

        const results = [];

        for (const event of events) {
          const oddsUrl = new URL(`${API_BASE}/odds`);
          oddsUrl.searchParams.set("apiKey", env.ODDS_API_KEY);
          oddsUrl.searchParams.set("eventId", event.id);
          oddsUrl.searchParams.set("bookmakers", "1xbet,Vbet");

          const oddsRes = await fetch(oddsUrl);

          if (!oddsRes.ok) continue;

          const data = await oddsRes.json();
          const bookmakers = data.bookmakers || {};

          const oneXbet =
            bookmakers["1xbet"] ||
            bookmakers["1xBet"] ||
            bookmakers["1Xbet"];

          const vbet =
            bookmakers["Vbet"] ||
            bookmakers["vbet"];

          if (!oneXbet || !vbet) continue;

          const oneXbetML = oneXbet.find(
            market => market.name === "ML" || market.name === "Moneyline"
          );

          const vbetML = vbet.find(
            market => market.name === "ML" || market.name === "Moneyline"
          );

          if (!oneXbetML?.odds?.[0] || !vbetML?.odds?.[0]) continue;

          const a = oneXbetML.odds[0];
          const b = vbetML.odds[0];

          const homeOdds = Math.max(
            Number(a.home) || 0,
            Number(b.home) || 0
          );

          const awayOdds = Math.max(
            Number(a.away) || 0,
            Number(b.away) || 0
          );

          if (homeOdds <= 1 || awayOdds <= 1) continue;

          const arb = findArb([homeOdds, awayOdds]);

          if (arb) {
            results.push({
              eventId: event.id,
              sport: event.sport?.name || "Football",
              league: event.league?.name || null,
              home: event.home,
              away: event.away,
              date: event.date,
              odds: [homeOdds, awayOdds],
              arbitrage: arb
            });
          }
        }

        return json({
          ok: true,
          count: results.length,
          results
        });

      } catch (error) {
        return json({
          ok: false,
          error: error.message
        }, 500);
      }
    }

    return new Response(`
      <!doctype html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>ArbScan</title>
        <style>
          body {
            margin: 0;
            font-family: Arial,sans-serif;
            background: #0b1020;
            color: white;
          }
          .container {
            max-width: 900px;
            margin: auto;
            padding: 30px 20px;
          }
          .card {
            background: #141c32;
            border: 1px solid #293654;
            border-radius: 18px;
            padding: 25px;
            margin-top: 20px;
          }
          .green { color: #55e58a; }
          .muted { color: #9ca8c7; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>ArbScan</h1>
          <p class="muted">سیستم بررسی فرصت‌های آربیتراژ ورزشی</p>

          <div class="card">
            <h2 class="green">● سیستم آنلاین</h2>
            <p>Football</p>
            <p>1xBet ↔ Vbet</p>
            <p>Live API: Connected</p>
          </div>
        </div>
      </body>
      </html>
    `, {
      headers: {
        "content-type": "text/html; charset=UTF-8"
      }
    });
  }
};
