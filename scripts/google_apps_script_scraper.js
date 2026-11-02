/**
 * Google Apps Script - Teer Live Scraper & 0-Second Edge Proxy (v2.0 Bulletproof)
 * Deploy as Web App -> Execute as: Me | Who has access: Anyone
 */

function doGet(e) {
  try {
    var data = getCachedOrScrapedData();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 1-Minute Scheduled Trigger Function (Draw Hours: 1:30 PM - 5:30 PM & 10:15 PM - 11:45 PM IST)
function autoPollerTrigger() {
  try {
    var now = new Date();
    var istTimeStr = Utilities.formatDate(now, "Asia/Kolkata", "HH:mm");
    var parts = istTimeStr.split(":");
    var hour = parseInt(parts[0], 10);
    var min = parseInt(parts[1], 10);
    
    // Check day of week in IST (0 = Sun, 1 = Mon, ..., 6 = Sat)
    var dayOfWeek = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getDay();
    if (dayOfWeek === 0) {
      // Sunday off - Meghalaya archery grounds closed under KHASA rules. Exit in 1ms!
      return;
    }

    // Only run during actual draw windows:
    // Afternoon: 1:30 PM (13:30) to 5:30 PM (17:30)
    // Night: 10:15 PM (22:15) to 11:45 PM (23:45)
    var totalMin = hour * 60 + min;
    var isDayDraw = (totalMin >= 13 * 60 + 30 && totalMin <= 17 * 60 + 30);
    var isNightDraw = (totalMin >= 22 * 60 + 15 && totalMin <= 23 * 60 + 45);

    if (!isDayDraw && !isNightDraw) {
      // Outside draw hours: zero network calls, exit immediately!
      return;
    }

    var freshData = scrapeAllSources();
    if (freshData) {
      saveData(freshData);
    }
  } catch (e) {
    Logger.log("Trigger error: " + e.toString());
  }
}

function getCachedOrScrapedData() {
  try {
    var props = PropertiesService.getScriptProperties();
    var cached = props.getProperty("TEER_LIVE_CACHE");
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.games) return parsed;
    }
  } catch (err) {}
  return scrapeAllSources();
}

function saveData(data) {
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty("TEER_LIVE_CACHE", JSON.stringify(data));
  } catch (e) {
    Logger.log("Save error: " + e.toString());
  }
}

function cleanNum(val) {
  if (!val || val === "—" || val === "-" || val === "xx" || val === "??") return "xx";
  var m = String(val).match(/\b(\d{1,2})\b/);
  return m ? (m[1].length === 1 ? "0" + m[1] : m[1]) : "xx";
}

function scrapeAllSources() {
  var todayIST = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  
  var result = {
    date: todayIST,
    updated_at: new Date().toISOString(),
    games: {
      shillong: { fr: "xx", sr: "xx", status: "UPCOMING" },
      khanapara: { fr: "xx", sr: "xx", status: "UPCOMING" },
      juwai: { fr: "xx", sr: "xx", status: "UPCOMING" },
      night: { fr: "xx", sr: "xx", status: "UPCOMING" }
    }
  };

  // 1. Scrape Shillong CDN directly through Google Datacenter IPs
  try {
    var cdnRes = UrlFetchApp.fetch("https://cdn.shillongteerground.com/teer/api/results/latest/index.json", {
      headers: {
        "Referer": "https://shillongteerground.com/",
        "Origin": "https://shillongteerground.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      muteHttpExceptions: true
    });

    if (cdnRes.getResponseCode() === 200) {
      var cdnJson = JSON.parse(cdnRes.getContentText());
      var fr = cleanNum(cdnJson.first_round);
      var sr = cleanNum(cdnJson.second_round);
      if (fr !== "xx") result.games.shillong.fr = fr;
      if (sr !== "xx") result.games.shillong.sr = sr;
    }
  } catch (err) {
    Logger.log("CDN fetch error: " + err);
  }

  // 2. Scrape Multi-game Aggregator (Bypasses Cloudflare Anti-Bot using Google IPs)
  try {
    var aggRes = UrlFetchApp.fetch("https://teerresult.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      muteHttpExceptions: true
    });

    if (aggRes.getResponseCode() === 200) {
      var html = aggRes.getContentText();
      var games = ["shillong", "khanapara", "juwai", "night"];

      for (var i = 0; i < games.length; i++) {
        var g = games[i];
        var reg = new RegExp('\\\\"id\\\\":\\\\"' + g + '\\\\"[\\s\\S]*?\\\\"today\\\\":(null|\\{[^\\}]+\\})');
        var match = html.match(reg);
        if (match && match[1] !== "null") {
          var todayObj = JSON.parse(match[1].replace(/\\"/g, '"'));
          var gfr = cleanNum(todayObj.first_round);
          var gsr = cleanNum(todayObj.second_round);
          if (gfr !== "xx") result.games[g].fr = gfr;
          if (gsr !== "xx") result.games[g].sr = gsr;
        }
      }
    }
  } catch (err) {
    Logger.log("Aggregator fetch error: " + err);
  }

  // 3. Scrape Dedicated Night Teer Feed
  try {
    var nightRes = UrlFetchApp.fetch("https://nightteer.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      muteHttpExceptions: true
    });
    if (nightRes.getResponseCode() === 200) {
      var nightHtml = nightRes.getContentText();
      var rowMatch = nightHtml.match(/<tr style="[^"]*background-color:\s*cream[^"]*">\s*<td align="center">\s*(\d{1,2}|xx|\?\?)\s*<\/td>\s*<td align="center">\s*(\d{1,2}|xx|\?\?)\s*<\/td>/i);
      if (rowMatch) {
        var nfr = cleanNum(rowMatch[1]);
        var nsr = cleanNum(rowMatch[2]);
        if (nfr !== "xx") result.games.night.fr = nfr;
        if (nsr !== "xx") result.games.night.sr = nsr;
      }
    }
  } catch (err) {
    Logger.log("Night fetch error: " + err);
  }

  // Calculate Statuses
  for (var k in result.games) {
    var item = result.games[k];
    if (item.fr !== "xx" && item.sr !== "xx") {
      item.status = "DECLARED";
    } else if (item.fr !== "xx") {
      item.status = "FR DECLARED";
    }
  }

  return result;
}
