/**
 * Teer Consensus & Byzantine Fault Tolerant Voting Engine
 * 
 * Rules:
 * 1. Tier 1 (Official Polo Ground Direct JSON / Verified Machine API): Weight = 2 (Consensus reached instantly).
 * 2. Tier 2 (General 3rd-Party Web Scrapers): Weight = 1. A candidate number requires >= 2 independent votes to be declared.
 * 3. Majority Override: If a round was previously declared with N votes, but another candidate subsequently achieves >= 3 votes AND strictly more votes (higher majority), the new number overrides the old number!
 * 4. Source Self-Correction: If original voting sources change their declared numbers (e.g. fixing typos), the old number loses quorum (<2 votes), and our site self-heals immediately.
 */

/**
 * Strictly validate and clean 2-digit numbers (00-99 only)
 */
export function cleanNumber(val) {
  if (!val) return 'xx';
  const str = String(val).trim();
  if (str === '—' || str === '-' || str === 'xx' || str === '??' || str === 'null') return 'xx';
  const match = str.match(/^(\d{1,2})$/);
  return match ? match[1].padStart(2, '0') : 'xx';
}

/**
 * Resolves consensus for a single round (FR or SR).
 * 
 * @param {string} gameKey - 'shillong' | 'khanapara' | 'juwai' | 'night'
 * @param {'fr' | 'sr'} round - 'fr' | 'sr'
 * @param {string} currentVal - Current declared number or 'xx'
 * @param {Array<{source: string, tier: 1|2, fr: string, sr: string}>} reports - Reports collected from sources
 * @returns {{declaredNumber: string, voteCount: number, sources: string[], status: string}}
 */
export function resolveRoundConsensus(gameKey, round, currentVal, reports) {
  const voteMap = {};

  for (const rep of reports) {
    const raw = rep[round];
    const num = cleanNumber(raw);
    if (num === 'xx') continue;

    if (!voteMap[num]) {
      voteMap[num] = { count: 0, sources: [], hasTier1: false };
    }
    voteMap[num].sources.push(rep.source);
    if (rep.tier === 1) {
      voteMap[num].hasTier1 = true;
      voteMap[num].count += 2; // Tier 1 verified feed carries double weight
    } else {
      voteMap[num].count += 1;
    }
  }

  // Rank candidate numbers by total votes descending
  const candidates = Object.keys(voteMap).sort((a, b) => voteMap[b].count - voteMap[a].count);

  if (candidates.length === 0) {
    return {
      declaredNumber: currentVal || 'xx',
      voteCount: 0,
      sources: [],
      status: 'PENDING'
    };
  }

  const topCandidate = candidates[0];
  const topVotes = voteMap[topCandidate].count;
  const topSources = voteMap[topCandidate].sources;

  // Case 1: Nothing declared yet for today's round
  if (!currentVal || currentVal === 'xx') {
    // Requires at least 2 votes (either 2 Tier 2 scrapers OR 1 Tier 1 direct API)
    if (topVotes >= 2) {
      return {
        declaredNumber: topCandidate,
        voteCount: topVotes,
        sources: topSources,
        status: 'CONSENSUS_REACHED'
      };
    }
    return {
      declaredNumber: 'xx',
      voteCount: topVotes,
      sources: topSources,
      status: 'WAITING_FOR_2ND_SOURCE'
    };
  }

  // Case 2: Round already has a declared number. Check for Majority Override or Correction!
  const currentVotes = voteMap[currentVal] ? voteMap[currentVal].count : 0;

  if (topCandidate !== currentVal) {
    // Rule 2: Stronger Majority Override (Top candidate has >= 3 votes and strictly beats current candidate)
    if (topVotes >= 3 && topVotes > currentVotes) {
      return {
        declaredNumber: topCandidate,
        voteCount: topVotes,
        sources: topSources,
        status: 'OVERRIDDEN_BY_MAJORITY'
      };
    }

    // Rule 3: Source Self-Correction (Current candidate lost quorum (<2 votes), and top candidate has consensus >= 2)
    if (currentVotes < 2 && topVotes >= 2) {
      return {
        declaredNumber: topCandidate,
        voteCount: topVotes,
        sources: topSources,
        status: 'OVERRIDDEN_BY_CORRECTION'
      };
    }
  }

  return {
    declaredNumber: currentVal,
    voteCount: currentVotes,
    sources: voteMap[currentVal]?.sources || [],
    status: 'STABLE'
  };
}

/**
 * Resolves consensus across all 4 games.
 * 
 * @param {Record<string, {fr: string, sr: string}>} currentGames
 * @param {Record<string, Array<{source: string, tier: 1|2, fr: string, sr: string}>>} allReports
 */
export function evaluateMultiSourceConsensus(currentGames, allReports) {
  const result = {};

  for (const gameKey of ['shillong', 'khanapara', 'juwai', 'night']) {
    const curFR = currentGames[gameKey]?.fr || 'xx';
    const curSR = currentGames[gameKey]?.sr || 'xx';
    const reps = allReports[gameKey] || [];

    result[gameKey] = {
      fr: resolveRoundConsensus(gameKey, 'fr', curFR, reps),
      sr: resolveRoundConsensus(gameKey, 'sr', curSR, reps)
    };
  }

  return result;
}
