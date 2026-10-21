export const EXAMPLE_GAMES = [
  ['뉴욕 양키스', 'LA 다저스'],
  ['뉴욕 메츠', '샌디에이고 파드리스'],
  ['시카고 컵스', '필라델피아 필리스'],
  ['보스턴 레드삭스', '시애틀 매리너스'],
  ['휴스턴 애스트로스', '토론토 블루제이스'],
  ['애틀랜타 브레이브스', '샌프란시스코 자이언츠'],
].map(([away, home], index) => ({ id: `example-${index}`, away, home, example: true, state: 'Preview', status: '화면 예시', venue: '예시 경기', date: null }));

export function normalizeGame(game) {
  return {
    id: String(game.gamePk),
    away: game.teams.away.team.name,
    home: game.teams.home.team.name,
    awayScore: game.teams.away.score,
    homeScore: game.teams.home.score,
    state: game.status.abstractGameState,
    status: game.status.detailedState,
    date: game.gameDate,
    venue: game.venue?.name || '구장 미정',
    inning: game.linescore?.currentInningOrdinal,
    inningHalf: game.linescore?.inningHalf,
  };
}

export async function loadGames(signal, now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - 7);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 7);
  const params = new URLSearchParams({ sportId: '1', startDate: date.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), hydrate: 'linescore' });
  const endpoint = import.meta.env?.VITE_BASEBALL_API_PATH || 'https://statsapi.mlb.com/api/v1/schedule';
  const response = await fetch(`${endpoint}?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
  if (!response.ok) throw new Error(`경기 데이터 요청 실패 (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload.dates)) throw new Error('경기 데이터 형식을 확인할 수 없습니다.');
  const games = payload.dates.flatMap(day => day.games).map(normalizeGame);
  const priority = game => game.state === 'Live' ? 0 : game.state === 'Preview' ? 1 : 2;
  return games.sort((a, b) => priority(a) - priority(b) || Math.abs(new Date(a.date) - now) - Math.abs(new Date(b.date) - now));
}

export function streamUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    // Only embed supported official providers; never render arbitrary HTML.
    if (['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) && /^\/embed\/[\w-]+$/.test(url.pathname)) return url.href;
    if (url.hostname === 'player.twitch.tv' && url.searchParams.has('channel')) {
      url.searchParams.set('parent', window.location.hostname);
      return url.href;
    }
  } catch { /* Missing or invalid configuration. */ }
  return null;
}
