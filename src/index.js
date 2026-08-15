import { findArb } from "./lib/arbitrage.mjs";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        service: "ArbScan"
      });
    }

    if (url.pathname === "/api/arbitrage") {
      const odds = [2.10, 2.10];
      const arb = findArb(odds);

      return Response.json({
        sport: "football",
        bookmaker1: "1xBet",
        bookmaker2: "Vbet",
        odds,
        arbitrage: arb
      });
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
            <p>Test arbitrage: <strong>5%</strong></p>
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
