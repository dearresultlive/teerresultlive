/**
 * Teer Consensus & Byzantine Fault Tolerant Voting Engine (Node.js ES Module)
 * 
 * Rules:
 * 1. Tier 1 (Official Polo Ground Direct JSON / Verified Machine API): Weight = 2 (Consensus reached instantly).
 * 2. Tier 2 (General 3rd-Party Web Scrapers): Weight = 1. A candidate number requires >= 2 independent votes to be declared.
 * 3. Echo Chamber / Sybil Guard: Multiple scrapers from the same syndicate (e.g. GoodReturns + ShillongTeerGrounds)
 *    are grouped into an Echo Cluster; secondary echoes receive 0 additional vote weight to prevent false quorums.
 * 4. Cross-Game Bleed Guard: Prevents cross-contamination (e.g., Juwai Day SR mistakenly echoed into Juwai Morning SR).
 * 5. Majority Override: If a round was previously declared with N votes, but another candidate subsequently achieves >= 3 votes AND strictly more votes (higher majority), the new number overrides the old number!
 * 6. Source Self-Correction: If original voting sources change their declared numbers, votes are dynamically recalculated and our site self-heals immediately.
 */

// Known SEO Scraper / Aggregator Syndicate (They echo/scrape each other's tables)
export const ECHO_CLUSTERS = {
  'goodreturns': 'seo_scraper_syndicate',
  'shillongteergrounds': 'seo_scraper_syndicate',
  'teerresulttoday': 'seo_scraper_syndicate',
  'teerground_com': 'seo_scraper_syndicate'
};

export function cleanNumber(val) {
  if (val === undefined || val === null) return 'xx';
  const str = String(val).trim().toLowerCase();
  if (!str || str === '—' || str === '-' || str === '--' || str === '---' || str === 'xx' || str === '??' || str === 'null' || str === 'undefined' || str === 'nan') {
    return 'xx';
  }
  const match = str.match(/^(\d{1,2})$/);
  return match ? match[1].padStart(2, '0') : 'xx';
}

/**
 * Resolves consensus for a single round (FR or SR).
 */
export function resolveRoundConsensus(
  gameKey,
  round,
  currentVal,
  reports,
  suspiciousEchos = []
) {
  const voteMap = {};
  const seenClustersForCandidate = {};

  for (const rep of reports) {
    const raw = rep[round];
    const num = cleanNumber(raw);
    if (num === 'xx') continue;

    if (!voteMap[num]) {
      voteMap[num] = { count: 0, sources: [], hasTier1: false };
      seenClustersForCandidate[num] = new Set();
    }
    voteMap[num].sources.push(rep.source);

    const cluster = ECHO_CLUSTERS[rep.source];
    let weight = rep.tier === 1 ? 2 : 1;

    // Echo Chamber / Sybil Guard:
    // If multiple scrapers from the same echo syndicate report the exact same number,
    // subsequent echo scrapers do NOT get a full independent vote!
    if (cluster) {
      if (seenClustersForCandidate[num].has(cluster)) {
        weight = 0; // Echo duplicate: 0 additional voting power to prevent false quorums!
      } else {
        seenClustersForCandidate[num].add(cluster);
      }
    }

    if (rep.tier === 1) {
      voteMap[num].hasTier1 = true;
    }
    voteMap[num].count += weight;
  }

  // Rank candidate numbers by total votes descending, with Tier 1 and stability tie-breakers
  const candidates = Object.keys(voteMap).sort((a, b) => {
    // 1. Primary: Highest total vote count
    if (voteMap[b].count !== voteMap[a].count) {
      return voteMap[b].count - voteMap[a].count;
    }
    // 2. Tie-breaker: Verified Tier 1 referee feed always beats unofficial 3rd-party scrapers
    if (voteMap[b].hasTier1 !== voteMap[a].hasTier1) {
      return voteMap[b].hasTier1 ? 1 : -1;
    }
    // 3. Tie-breaker: Stability preference (keep current value if tied to avoid visual jitter)
    if (a === currentVal) return -1;
    if (b === currentVal) return 1;
    return 0;
  });

  function buildResult(declaredNumber, voteCount, sources, status) {
    let verification_level = 'UNVERIFIED';
    if (declaredNumber && declaredNumber !== 'xx') {
      verification_level = sources.length >= 2 ? 'VERIFIED' : 'FAST_UPDATE';
    }
    return { declaredNumber, voteCount, sources, status, verification_level };
  }

  if (candidates.length === 0) {
    if (currentVal && currentVal !== 'xx') {
      return buildResult(currentVal, 0, [], 'STABLE');
    }
    return buildResult('xx', 0, [], 'PENDING');
  }

  const topCandidate = candidates[0];
  const topVotes = voteMap[topCandidate].count;
  const topSources = voteMap[topCandidate].sources;

  // Case 1: Nothing declared yet for today's round
  if (!currentVal || currentVal === 'xx') {
    // Cross-game echo guard: If candidate matches another game's result that just declared (e.g. Khanapara echoing Shillong, or Juwai Day echoing Morning)
    const isSuspiciousEcho = suspiciousEchos.includes(topCandidate);
    if (isSuspiciousEcho) {
      // Must have official Tier-1 feed OR >= 3 independent sources to be declared
      const isQuorumMet = voteMap[topCandidate].hasTier1 || topSources.length >= 3;
      if (!isQuorumMet) {
        return buildResult('xx', topVotes, topSources, 'WAITING_FOR_2ND_SOURCE');
      }
    }

    // Requires at least 2 votes (either 2 Tier 2 scrapers OR 1 Tier 1 direct API)
    if (topVotes >= 2) {
      return buildResult(topCandidate, topVotes, topSources, 'CONSENSUS_REACHED');
    }
    return buildResult('xx', topVotes, topSources, 'WAITING_FOR_2ND_SOURCE');
  }

  // Case 2: Round already has a declared number. Check for Majority Override or Correction!
  const currentVotes = voteMap[currentVal] ? voteMap[currentVal].count : 0;

  if (topCandidate !== currentVal) {
    // Rule 2a: Official Tier 1 Machine Feed Overrides Unofficial Scrapers / Corrections
    if (voteMap[topCandidate].hasTier1 && !voteMap[currentVal]?.hasTier1 && topVotes >= 2) {
      return buildResult(
        topCandidate,
        topVotes,
        topSources,
        currentVotes === 0 ? 'OVERRIDDEN_BY_CORRECTION' : 'OVERRIDDEN_BY_MAJORITY'
      );
    }

    // Rule 2b: Stronger Majority Override (Top candidate has >= 3 votes and beats current candidate)
    if (topVotes >= 3 && topVotes > currentVotes) {
      return buildResult(topCandidate, topVotes, topSources, 'OVERRIDDEN_BY_MAJORITY');
    }

    // Rule 3: Source Self-Correction (Current candidate lost quorum (<2 votes), and top candidate has consensus >= 2)
    if (currentVotes < 2 && topVotes >= 2) {
      return buildResult(topCandidate, topVotes, topSources, 'OVERRIDDEN_BY_CORRECTION');
    }
  }

  return buildResult(currentVal, currentVotes, voteMap[currentVal]?.sources || [], 'STABLE');
}

/**
 * Resolves consensus across all games.
 */
export function evaluateMultiSourceConsensus(currentGames, allReports) {
  const result = {};

  const shillongFR = currentGames.shillong?.fr;
  const shillongSR = currentGames.shillong?.sr;
  const juwaiFR = currentGames.juwai?.fr;
  const juwaiSR = currentGames.juwai?.sr;
  const juwaiMorningFR = currentGames.juwai_morning?.fr;
  const juwaiMorningSR = currentGames.juwai_morning?.sr;

  for (const gameKey of ['shillong', 'khanapara', 'juwai', 'juwai_morning', 'night']) {
    const curFR = currentGames[gameKey]?.fr || 'xx';
    const curSR = currentGames[gameKey]?.sr || 'xx';
    const reps = allReports[gameKey] || [];

    // Guard against cross-game scraping contamination:
    // 1. Khanapara echoing Shillong
    // 2. Juwai Morning echoing Juwai Day (e.g. Day SR 35 mistakenly bled into Morning SR)
    // 3. Juwai Day echoing Juwai Morning
    const suspiciousEchosFR = [];
    const suspiciousEchosSR = [];

    if (gameKey === 'khanapara') {
      if (shillongFR && shillongFR !== 'xx') suspiciousEchosFR.push(shillongFR);
      if (shillongSR && shillongSR !== 'xx') suspiciousEchosSR.push(shillongSR);
    } else if (gameKey === 'juwai_morning') {
      if (juwaiFR && juwaiFR !== 'xx') suspiciousEchosFR.push(juwaiFR);
      if (juwaiSR && juwaiSR !== 'xx') suspiciousEchosSR.push(juwaiSR);
    } else if (gameKey === 'juwai') {
      if (juwaiMorningFR && juwaiMorningFR !== 'xx') suspiciousEchosFR.push(juwaiMorningFR);
      if (juwaiMorningSR && juwaiMorningSR !== 'xx') suspiciousEchosSR.push(juwaiMorningSR);
    }

    result[gameKey] = {
      fr: resolveRoundConsensus(gameKey, 'fr', curFR, reps, suspiciousEchosFR),
      sr: resolveRoundConsensus(gameKey, 'sr', curSR, reps, suspiciousEchosSR)
    };
  }

  return result;
}
