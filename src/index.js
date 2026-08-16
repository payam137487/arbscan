const API_BASE = "https://api.odds-api.io/v3";

const BOOKMAKERS = "1xBet,Vbet";

function findArb(odds) {
  if (!Array.isArray(odds) || odds.length < 2) return null;

  const valid = odds.filter(
    (x) => Number.isFinite(Number(x)) && Number(x) > 1
  );

  if (valid.length !== odds.length) return null;

  const inverseSum = valid.reduce(
    (sum, odd) => sum + 1 / Number(odd),
    0
  );

  if (inverseSum >= 1) return null;

  return {
    margin: Number(((1 - inverseSum) * 100).toFixed(2)),
    profit: Number(((1 / inverseSum - 1) * 100).toFixed(2))
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  });
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

      const sport = url.searchParams.get("sport") || "football";

      const eventsUrl = new URL(`${API_BASE}/events`);

      eventsUrl.searchParams.set(
        "apiKey",
        env.ODDS_API_KEY
      );

      eventsUrl.searchParams.set(
        "sport",
        sport
      );

      const eventsResponse = await fetch(eventsUrl);

      if (!eventsResponse.ok) {
        return json({
          ok: false,
          error: "Failed to fetch events",
          status: eventsResponse.status
        }, 502);
      }

      const eventsData = await eventsResponse.json();

      const events = Array.isArray(eventsData)
        ? eventsData
        : Array.isArray(eventsData.data)
          ? eventsData.data
          : [];

      const opportunities = [];
      const receivedBookmakers = new Set();

      for (const event of events) {
        const eventId = event.id;

        if (!eventId) continue;

        const oddsUrl = new URL(`${API_BASE}/odds`);

        oddsUrl.searchParams.set(
          "apiKey",
          env.ODDS_API_KEY
        );

        oddsUrl.searchParams.set(
          "eventId",
          String(eventId)
        );

        oddsUrl.searchParams.set(
          "bookmakers",
          BOOKMAKERS
        );

        const oddsResponse = await fetch(oddsUrl);

        if (!oddsResponse.ok) {
          continue;
        }

        const oddsData = await oddsResponse.json();

        const oddsObject =
          oddsData?.data ||
          oddsData;

        const bookmakers =
          oddsObject?.bookmakers || {};

        for (const bookmakerName of Object.keys(bookmakers)) {
          receivedBookmakers.add(bookmakerName);
        }

        /*
         * Odds-API.io football ML format:
         *
         * bookmakers: {
         *   "1xBet": [
         *     {
         *       name: "ML",
         *       odds: [
         *         {
         *           home: "2.10",
         *           draw: "3.40",
         *           away: "3.20"
         *         }
         *       ]
         *     }
         *   ],
         *   "Vbet": [...]
         * }
         */

        const best = {
          home: null,
          draw: null,
          away: null
        };

        for (const [bookmakerName, markets] of Object.entries(
          bookmakers
        )) {
          const lower = bookmakerName.toLowerCase();

          const is1xBet =
            lower.includes("1xbet") ||
            lower.includes("onexbet");

          const isVbet =
            lower === "vbet" ||
            lower.includes("vbet");

          if (!is1xBet && !isVbet) continue;

          if (!Array.isArray(markets)) continue;

          for (const market of markets) {
            if (market.name !== "ML") continue;

            const marketOdds = Array.isArray(market.odds)
              ? market.odds
              : [];

            for (const odd of marketOdds) {
              const home = Number(odd.home);
              const draw = Number(odd.draw);
              const away = Number(odd.away);

              if (
                Number.isFinite(home) &&
                home > 1
              ) {
                if (
                  !best.home ||
                  home > best.home.price
                ) {
                  best.home = {
                    price: home,
                    bookmaker: bookmakerName
                  };
                }
              }

              if (
                Number.isFinite(draw) &&
                draw > 1
              ) {
                if (
                  !best.draw ||
                  draw > best.draw.price
                ) {
                  best.draw = {
                    price: draw,
                    bookmaker: bookmakerName
                  };
                }
              }

              if (
                Number.isFinite(away) &&
                away > 1
              ) {
                if (
                  !best.away ||
                  away > best.away.price
                ) {
                  best.away = {
                    price: away,
                    bookmaker: bookmakerName
                  };
                }
              }
            }
          }
        }

        const selected = [
          {
            outcome: "home",
            ...(
              best.home || {
                price: null,
                bookmaker: null
              }
            )
          },
          {
            outcome: "draw",
            ...(
              best.draw || {
                price: null,
                bookmaker: null
              }
            )
          },
          {
            outcome: "away",
            ...(
              best.away || {
                price: null,
                bookmaker: null
              }
            )
          }
        ];

        const available = selected.filter(
          (x) => Number.isFinite(x.price)
        );

        if (available.length < 3) {
          continue;
        }

        const arb = findArb(
          available.map((x) => x.price)
        );

        if (!arb) continue;

        opportunities.push({
          eventId: event.id,
          home: event.home,
          away: event.away,
          date: event.date,
          sport: event.sport,
          league: event.league,
          outcomes: selected,
          arbitrage: arb
        });
      }

      return json({
        ok: true,
        sport,
        bookmaker1: "1xBet",
        bookmaker2: "Vbet",
        receivedBookmakers: [
          ...receivedBookmakers
        ],
        eventsChecked: events.length,
        count: opportunities.length,
        opportunities
      });
    }

    return new Response(`
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">
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
.green {
  color: #55e58a;
}
.muted {
  color: #9ca8c7;
}
a {
  color: #55e58a;
}
</style>
</head>
<body>
<div class="container">
<h1>ArbScan</h1>
<p class="muted">
سیستم بررسی فرصت‌های آربیتراژ ورزشی
</p>

<div class="card">
<h2 class="green">● سیستم آنلاین</h2>
<p>Football</p>
<p>1xBet ↔ Vbet</p>
<p>
<a href="/api/arbitrage?sport=football">
تست API فوتبال
</a>
</p>
</div>

</div>
</body>
</html>
`, {
      headers: {
        "content-type":
          "text/html; charset=UTF-8"
      }
    });
  }
};
D
