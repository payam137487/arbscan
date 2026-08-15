const API_BASE = "https://api.the-odds-api.com/v4";

const SPORTS = {
  football: "soccer",
  basketball: "basketball_nba",
  ice_hockey: "icehockey_nhl",
  handball: "handball"
};

function findArb(odds) {
  if (!Array.isArray(odds) || odds.length < 2) return null;

  const valid = odds.filter((x) => Number.isFinite(Number(x)) && Number(x) > 1);
  if (valid.length !== odds.length) return null;

  const inv = valid.reduce((sum, odd) => sum + 1 / Number(odd), 0);

  if (inv >= 1) return null;

  return {
    margin: Number((1 - inv).toFixed(4)),
    profit: Number(((1 / inv - 1) * 100).toFixed(2))
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
      const sportKey = SPORTS[sport];

      if (!sportKey) {
        return json({
          ok: false,
          error: "Unsupported sport",
          supported: Object.keys(SPORTS)
        }, 400);
      }

      const apiUrl = new URL(
        `${API_BASE}/sports/${sportKey}/odds`
      );

      apiUrl.searchParams.set("apiKey", env.ODDS_API_KEY);
      apiUrl.searchParams.set("regions", "eu");
      apiUrl.searchParams.set("markets", "h2h");
      apiUrl.searchParams.set("oddsFormat", "decimal");

      const response = await fetch(apiUrl);

      if (!response.ok) {
        return json({
          ok: false,
          error: "The Odds API request failed",
          status: response.status
        }, 502);
      }

      const events = await response.json();
      const opportunities = [];

      for (const event of events) {
        const best = {};

        for (const bookmaker of event.bookmakers || []) {
          const key = String(bookmaker.key || "").toLowerCase();
          const title = String(bookmaker.title || "").toLowerCase();

          const is1xBet =
            key === "onexbet" ||
            key === "1xbet" ||
            title.includes("1xbet") ||
            title.includes("1x bet");

          const isVbet =
            key === "vbet" ||
            title.includes("vbet");

          if (!is1xBet && !isVbet) continue;

          for (const market of bookmaker.markets || []) {
            if (market.key !== "h2h") continue;

            for (const outcome of market.outcomes || []) {
              const price = Number(outcome.price);
              if (!Number.isFinite(price) || price <= 1) continue;

              const name = outcome.name;

              if (!best[name]) {
                best[name] = {
                  outcome: name
                };
              }

              if (is1xBet) {
                if (
                  !best[name].oneXBet ||
                  price > best[name].oneXBet
                ) {
                  best[name].oneXBet = price;
                }
              }

              if (isVbet) {
                if (
                  !best[name].vbet ||
                  price > best[name].vbet
                ) {
                  best[name].vbet = price;
                }
              }
            }
          }
        }

        const outcomes = Object.values(best);

        if (outcomes.length < 2) continue;

        const selected = outcomes.map((o) => {
          const prices = [
            o.oneXBet,
            o.vbet
          ].filter(
            (x) => Number.isFinite(x)
          );

          return {
            outcome: o.outcome,
            oneXBet: o.oneXBet ?? null,
            vbet: o.vbet ?? null,
            bestOdd: prices.length
              ? Math.max(...prices)
              : null
          };
        });

        const odds = selected.map((x) => x.bestOdd);

        if (odds.some((x) => x === null)) continue;

        const arbitrage = findArb(odds);

        if (!arbitrage) continue;

        opportunities.push({
          eventId: event.id,
          sport: event.sport_key,
          commenceTime: event.commence_time,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          outcomes: selected,
          arbitrage
        });
      }

      return json({
        ok: true,
        sport,
        bookmaker1: "1xBet",
        bookmaker2: "Vbet",
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
  margin:0;
  font-family:Arial,sans-serif;
  background:#0b1020;
  color:white;
}
.container {
  max-width:900px;
  margin:auto;
  padding:30px 20px;
}
.card {
  background:#141c32;
  border:1px solid #293654;
  border-radius:18px;
  padding:25px;
  margin-top:20px;
}
.green {
  color:#55e58a;
}
.muted {
  color:#9ca8c7;
}
button {
  background:#55e58a;
  color:#07120b;
  border:0;
  border-radius:10px;
  padding:12px 18px;
  font-weight:bold;
  cursor:pointer;
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
<p>Football / Basketball / Handball / Ice Hockey</p>
<p>1xBet ↔ Vbet</p>
<button onclick="testApi()">بررسی فرصت‌ها</button>
<pre id="result"></pre>
</div>
</div>

<script>
async function testApi() {
  const result = document.getElementById("result");
  result.textContent = "در حال دریافت اطلاعات...";

  try {
    const r = await fetch("/api/arbitrage?sport=football");
    const data = await r.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    result.textContent = "خطا: " + e.message;
  }
}
</script>
</body>
</html>
`, {
      headers: {
        "content-type": "text/html; charset=UTF-8"
      }
    });
  }
};
