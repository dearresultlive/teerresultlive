import type { APIRoute } from 'astro';
import liveData from '../data/teer_live_results.json';

export const GET: APIRoute = async () => {
  const host = 'https://teerresultlive.in';
  const pubDate = new Date(liveData.updated_at || Date.now()).toUTCString();
  const todayFormatted = liveData.date.split('-').reverse().join('/');

  const games = [
    {
      key: 'shillong',
      title: `Shillong Teer Result Today (${todayFormatted}) • 1st & 2nd Round Numbers`,
      link: `${host}/shillong-teer`,
      data: liveData.games.shillong,
      schedule: '1st Round: 3:45 PM | 2nd Round: 4:45 PM',
      venue: 'Polo Ground, Shillong (KHASA)'
    },
    {
      key: 'khanapara',
      title: `Khanapara Teer Result Today (${todayFormatted}) • Assam Border Hit Numbers`,
      link: `${host}/khanapara-teer`,
      data: liveData.games.khanapara,
      schedule: '1st Round: 4:00 PM | 2nd Round: 4:30 PM',
      venue: 'Khanapara (Assam-Meghalaya Border)'
    },
    {
      key: 'juwai',
      title: `Juwai Teer Result Today (${todayFormatted}) • West Jaintia Archery Hits`,
      link: `${host}/juwai-teer`,
      data: liveData.games.juwai,
      schedule: '1st Round: 1:45 PM | 2nd Round: 2:30 PM',
      venue: 'Juwai Traditional Ground, Meghalaya'
    },
    {
      key: 'night',
      title: `Shillong Night Teer Result Today (${todayFormatted}) • Night Archery Hits`,
      link: `${host}/`,
      data: liveData.games.night,
      schedule: '1st Round: 10:30 PM | 2nd Round: 11:30 PM',
      venue: 'Shillong Club Night Archery Ground'
    }
  ];

  const itemsXml = games
    .map(({ title, link, data, schedule, venue, key }) => {
      const fr = data?.fr && data.fr !== 'xx' ? data.fr : 'Pending / Shooting';
      const sr = data?.sr && data.sr !== 'xx' ? data.sr : 'Pending / Shooting';
      const direct = data?.common_numbers?.direct ? data.common_numbers.direct.join(', ') : 'Check online';
      const house = data?.common_numbers?.house ? data.common_numbers.house.join(', ') : 'Check online';
      const ending = data?.common_numbers?.ending ? data.common_numbers.ending.join(', ') : 'Check online';

      const description = `Official ${data?.name || 'Teer'} traditional archery competition results for ${todayFormatted}. First Round (FR): ${fr}, Second Round (SR): ${sr}. Venue: ${venue}. Schedule: ${schedule}. Target House: ${house}, Ending: ${ending}.`;

      const contentEncoded = `
        <![CDATA[
          <h2>${title}</h2>
          <p><strong>Date:</strong> ${todayFormatted}</p>
          <p><strong>Venue:</strong> ${venue}</p>
          <p><strong>Official Schedule:</strong> ${schedule}</p>
          <hr />
          <h3>Declared Winning Numbers:</h3>
          <ul>
            <li><strong>First Round (FR):</strong> ${fr}</li>
            <li><strong>Second Round (SR):</strong> ${sr}</li>
          </ul>
          <h3>Target Common Numbers:</h3>
          <p><strong>Direct Numbers:</strong> ${direct}</p>
          <p><strong>House:</strong> ${house} | <strong>Ending:</strong> ${ending}</p>
          <p>For zero-refresh live streaming and authentic archival charts, visit <a href="${link}">${link}</a>.</p>
        ]]>
      `.trim();

      return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${link}#${liveData.date}-${key}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>Sports/Archery</category>
      <description><![CDATA[${description}]]></description>
      <content:encoded>${contentEncoded}</content:encoded>
      <media:content url="${host}/og-image.jpg" medium="image" type="image/jpeg" width="1200" height="630" />
    </item>`;
    })
    .join('\n');

  // Add Dream Numbers & Formula Item
  const dreamItem = `    <item>
      <title><![CDATA[Teer Dream Numbers & Common Target Formulas for Today (${todayFormatted})]]></title>
      <link>${host}/dream-numbers</link>
      <guid isPermaLink="false">${host}/dream-numbers#${liveData.date}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>Educational/Traditional</category>
      <description><![CDATA[Complete A-Z Khasi traditional dream interpretations ("Ka Jingphohsniew") and daily lucky numbers for Shillong, Khanapara, and Juwai Teer.]]></description>
      <media:content url="${host}/og-image.jpg" medium="image" type="image/jpeg" width="1200" height="630" />
    </item>`;

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Teer Result Live • Official Meghalaya Archery Results News</title>
    <link>${host}/</link>
    <atom:link href="${host}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Fastest official reporting portal for Shillong Teer, Khanapara Teer, and Juwai Teer traditional archery contest results, daily common numbers, and dream interpretations.</description>
    <language>en-in</language>
    <copyright>© 2026 Teer Result Live (teerresultlive.in). All rights reserved.</copyright>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <image>
      <url>${host}/icon-192.png</url>
      <title>Teer Result Live</title>
      <link>${host}/</link>
      <width>192</width>
      <height>192</height>
    </image>
${itemsXml}
${dreamItem}
  </channel>
</rss>`.trim();

  return new Response(rss, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
};

export const HEAD: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
};

export const ALL = GET;
