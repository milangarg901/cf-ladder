export const problemKey = p => `${p.contestId ?? p.problemsetName ?? 'unknown'}-${p.index}`;
export function recommendationRange(rating, radius=200) {
  if (!Number.isFinite(rating) || rating<=0) return null;
  return {min:Math.max(0,Math.ceil((rating-radius)/100)*100),max:Math.floor((rating+radius)/100)*100,center:rating};
}
export function groupProblems(submissions, handle) {
  const map = new Map();
  for (const s of submissions) {
    if (!s.problem) continue;
    const key = problemKey(s.problem);
    const row = map.get(key) || {...s.problem, key, submissions: [], handles: [handle], lastAccepted: 0, firstAccepted: Infinity};
    row.submissions.push({...s, handle});
    if (s.verdict === 'OK') {
      row.lastAccepted = Math.max(row.lastAccepted, s.creationTimeSeconds);
      row.firstAccepted = Math.min(row.firstAccepted, s.creationTimeSeconds);
    }
    map.set(key, row);
  }
  return [...map.values()];
}
export function selectProblems({rows, mine, saved, tab, search='', exact='', min='', max='', tag='', sort='recent', bookmarksFirst=false}) {
  return rows.filter(p => {
    const state = saved[p.key] || {};
    if (tab === 'checked') { if (!state.checked) return false; }
    else {
      if (state.checked) return false;
      if (tab === 'bookmarks') { if (!state.bookmarked) return false; }
      else if (!p.lastAccepted || mine.has(p.key)) return false;
    }
    const haystack = `${p.name} ${p.key} ${(p.tags || []).join(' ')}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (exact === 'unrated' && p.rating != null) return false;
    if (exact && exact !== 'unrated' && p.rating !== Number(exact)) return false;
    if (min !== '' && (p.rating == null || p.rating < Number(min))) return false;
    if (max !== '' && (p.rating == null || p.rating > Number(max))) return false;
    if (tag && !p.tags?.includes(tag)) return false;
    return true;
  }).sort((a,b) => {
    if (bookmarksFirst) {const difference = Number(!!saved[b.key]?.bookmarked)-Number(!!saved[a.key]?.bookmarked); if(difference) return difference;}
    let n=0;
    if(sort==='recent') n=b.lastAccepted-a.lastAccepted;
    if(sort==='oldest') n=a.lastAccepted-b.lastAccepted;
    if(sort==='rating-asc') n=(a.rating ?? Infinity)-(b.rating ?? Infinity);
    if(sort==='rating-desc') n=(b.rating ?? -Infinity)-(a.rating ?? -Infinity);
    if(sort==='name') n=a.name.localeCompare(b.name);
    if(sort==='attempts') n=b.submissions.length-a.submissions.length;
    if(sort==='bookmarked') n=(saved[b.key]?.bookmarkedAt||0)-(saved[a.key]?.bookmarkedAt||0);
    return n || a.key.localeCompare(b.key);
  });
}
export function problemUrl(p) {return p.contestId ? `https://codeforces.com/${p.contestId >= 100000 ? 'gym' : 'contest'}/${p.contestId}/problem/${encodeURIComponent(p.index)}` : 'https://codeforces.com/problemset';}
export function submissionUrl(s) {return s.contestId ? `https://codeforces.com/${s.contestId >= 100000 ? 'gym' : 'contest'}/${s.contestId}/submission/${s.id}` : `https://codeforces.com/submissions/${encodeURIComponent(s.handle || '')}`;}
