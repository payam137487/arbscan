export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        service: "ArbScan"
      });
    }

    return new Response(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ArbScan</title>
<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #0b1020;
  color: white;
}
.container {
  max-width: 1000px;
  margin: auto;
  padding: 40px 20px;
}
h1 {
  font-size: 42px;
}
.subtitle {
  color: #9ca8c7;
}
.card {
  background: #141c32;
  border: 1px solid #293654;
  border-radius: 18px;
  padding: 25px;
  margin-top: 25px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(200px,1fr));
  gap: 15px;
}
.box {
  background: #0e1629;
  padding: 20px;
  border-radius: 14px;
}
.green {
  color: #55e58a;
}
.small {
  color: #8f9bb7;
  font-size: 13px;
}
</style>
</head>
<body>

<div class="container">

<h1>ArbScan</h1>

<p class="subtitle">
سیستم بررسی فرصت‌های آربیتراژ ورزشی
</p>

<div class="card">
<div class="grid">

<div class="box">
<div class="small">وضعیت سیستم</div>
<h2 class="green">● آنلاین</h2>
</div>

<div class="box">
<div class="small">ورزش</div>
<h2>⚽ فوتبال</h2>
</div>

<div class="box">
<div class="small">ورزش</div>
<h2>🏀 بسکتبال</h2>
</div>

<div class="box">
<div class="small">ورزش</div>
<h2>🏒 هاکی</h2>
</div>

</div>
</div>

<div class="card">
<h2>داشبورد آربیتراژ</h2>
<p class="small">
فرصت‌های آربیتراژ در این بخش نمایش داده خواهند شد.
</p>
</div>

</div>

</body>
</html>`, {
      headers: {
        "content-type": "text/html; charset=UTF-8"
      }
    });
  }
};
wc -c src/index.js
//rm -rf ~/arbscan
ls ~
cd ~
rm -rf ~/arbscan
ls -ld ~/arbscan
/ls ~
ls ~
mkdir -p ~/arbscan
cd ~/arbscan
/cd ~/arbscan
cd ~/arbscan
