import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, ArrowDownUp, Bookmark, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Code2, ExternalLink, Flag, Layers3, LoaderCircle, Plus, RefreshCw, Search, Target, X, SlidersHorizontal, Download, Copy, AlertCircle, CheckCircle2, Moon, Sun } from 'lucide-react';
import { groupProblems, selectProblems, problemUrl, submissionUrl, recommendationRange } from './model.js';
import { readState, writeState } from './storage.js';
import { requestCodeforces, requestSource } from './codeforces.js';
const MY_HANDLE = 'milangarg901';
const STORAGE = 'cf-ladder-state-v1';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const number = (n) => n.toLocaleString();
const date = (n) => n ? new Date(n * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const ratingClass = (n) => n >= 2400 ? 'red' : n >= 2100 ? 'orange' : n >= 1900 ? 'purple' : n >= 1600 ? 'blue' : n >= 1400 ? 'cyan' : n >= 1200 ? 'green' : 'gray';
export default function Home() {
    const [profiles, setProfiles] = useState([]);
    const [mine, setMine] = useState(null);
    const [active, setActive] = useState('');
    const [saved, setSaved] = useState({});
    const [ready, setReady] = useState(false);
    const [theme, setTheme] = useState('light');
    const [recommended, setRecommended] = useState(true);
    const [radius, setRadius] = useState(200);
    const [tab, setTab] = useState('practice');
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [search, setSearch] = useState('');
    const [exact, setExact] = useState('');
    const [min, setMin] = useState('');
    const [max, setMax] = useState('');
    const [tag, setTag] = useState('');
    const [sort, setSort] = useState('recent');
    const [bookmarksFirst, setBookmarksFirst] = useState(false);
    const [advanced, setAdvanced] = useState(false);
    const [page, setPage] = useState(1);
    const [drawer, setDrawer] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [codeBusy, setCodeBusy] = useState(false);
    const [undo, setUndo] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState('');
    const busyRef = useRef(false);
    const sourceToken = useRef(0);
    const addInput = useRef(null);
    const closeRef = useRef(null);
    const drawerRef = useRef(null);
    const restoreFocus = useRef(null);
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const old = await readState() || JSON.parse(localStorage.getItem(STORAGE) || 'null');
                if (!mounted)
                    return;
                if (old && Array.isArray(old.profiles)) {
                    setProfiles(old.profiles);
                    setMine(old.mine || null);
                    setActive(old.active || '');
                    setSaved(old.saved || {});
                    setTheme(old.theme === 'dark' ? 'dark' : 'light');
                }
            }
            catch {
                setError('Saved browser data could not be read. You can add your profiles again.');
            }
            finally {
                if (mounted)
                    setReady(true);
            }
        })();
        return () => { mounted = false; };
    }, []);
    useEffect(() => {
        if (!ready)
            return;
        writeState({ profiles, mine, active, saved, theme }).catch(() => setError('Browser storage is full or unavailable. Keep this tab open and export your progress before leaving.'));
    }, [profiles, mine, active, saved, theme, ready]);
    useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
    useEffect(() => { if (!notice)
        return; const t = setTimeout(() => { setNotice(''); setUndo(null); }, 6500); return () => clearTimeout(t); }, [notice]);
    useEffect(() => { setPage(1); }, [tab, search, exact, min, max, tag, sort, bookmarksFirst, active, recommended, radius]);
    useEffect(() => {
        if (!drawer)
            return;
        restoreFocus.current = document.activeElement;
        closeRef.current?.focus();
        const key = (e) => {
            if (e.key === 'Escape')
                closeDrawer();
            if (e.key === 'Tab') {
                const els = drawerRef.current?.querySelectorAll('button:not(:disabled),a[href],select,textarea');
                if (!els?.length)
                    return;
                const first = els[0], last = els[els.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
                else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', key);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; restoreFocus.current?.focus(); };
    }, [!!drawer]);
    async function api(method, handle, from = 1) {
        for (let retry = 0; retry < 3; retry++) {
            const response = await requestCodeforces(method, handle, from);
            const data = await response.json();
            if (response.ok && data.status === 'OK')
                return data.result;
            if (retry < 2 && /limit|too many|429/i.test(data.error || data.comment || '')) {
                await wait(3000 * (retry + 1));
                continue;
            }
            throw new Error(data.error || data.comment || 'Could not load this profile. Please try again.');
        }
    }
    async function loadProfile(handle) {
        setBusy(`Loading ${handle}…`);
        const info = (await api('user.info', handle))[0];
        let all = [];
        for (let from = 1;; from += 5000) {
            setBusy(`Fetching ${info.handle} · ${number(all.length)} submissions`);
            const batch = await api('user.status', info.handle, from);
            all.push(...batch);
            if (batch.length < 5000)
                break;
        }
        const unique = [...new Map(all.map(s => [s.id, s])).values()];
        return { handle: info.handle, info, submissions: unique, synced: Date.now() };
    }
    async function addProfile(e) {
        e?.preventDefault();
        const handle = input.trim().replace(/^https?:\/\/(?:www\.)?codeforces.com\/profile\//i, '').replace(/\/$/, '');
        if (!/^[A-Za-z0-9_.-]{1,24}$/.test(handle)) {
            setError('Enter a Codeforces handle or a profile URL.');
            return;
        }
        if (handle.toLowerCase() === MY_HANDLE.toLowerCase()) {
            setError('That is your profile. Add someone else as your target.');
            return;
        }
        const existing = profiles.find(p => p.handle.toLowerCase() === handle.toLowerCase());
        if (existing) {
            setActive(existing.handle);
            setInput('');
            return;
        }
        if (busyRef.current)
            return;
        busyRef.current = true;
        setError('');
        try {
            if (!mine) {
                const own = await loadProfile(MY_HANDLE);
                setMine(own);
            }
            const p = await loadProfile(handle);
            setProfiles(ps => [...ps, p]);
            setActive(p.handle);
            setInput('');
            setTab('practice');
            setNotice(`${p.handle} added. All available submissions loaded.`);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy('');
            busyRef.current = false;
        }
    }
    async function sync() {
        if (busyRef.current)
            return;
        busyRef.current = true;
        setError('');
        try {
            const own = await loadProfile(MY_HANDLE);
            setMine(own);
            const target = profiles.find(p => p.handle === active);
            if (target) {
                const p = await loadProfile(target.handle);
                setProfiles(ps => ps.map(old => old.handle === p.handle ? p : old));
            }
            setNotice('Profiles are up to date.');
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy('');
            busyRef.current = false;
        }
    }
    const target = profiles.find(p => p.handle === active);
    const targetRows = useMemo(() => target ? groupProblems(target.submissions, target.handle) : [], [target]);
    const myRows = useMemo(() => mine ? groupProblems(mine.submissions, mine.handle) : [], [mine]);
    const solved = useMemo(() => new Set(myRows.filter((p) => p.lastAccepted).map((p) => p.key)), [myRows]);
    const library = useMemo(() => {
        const rows = new Map();
        Object.values(saved).forEach(s => { if (s.row)
            rows.set(s.row.key, s.row); });
        for (const p of profiles)
            for (const row of groupProblems(p.submissions, p.handle)) {
                const old = rows.get(row.key);
                if (old) {
                    row.handles = [...new Set([...old.handles, ...row.handles])];
                    row.submissions = [...new Map([...old.submissions, ...row.submissions].map((s) => [s.id, s])).values()];
                    row.lastAccepted = Math.max(old.lastAccepted, row.lastAccepted);
                }
                rows.set(row.key, row);
            }
        return [...rows.values()];
    }, [profiles, saved]);
    const source = tab === 'practice' ? targetRows : library;
    const queue = selectProblems({ rows: targetRows, mine: solved, saved, tab: 'practice' });
    const bookmarkCount = Object.values(saved).filter(s => s.bookmarked && !s.checked).length;
    const checkedCount = Object.values(saved).filter(s => s.checked).length;
    const recommendation = recommendationRange(mine?.info.rating, radius);
    const applyingRecommendation = tab === 'practice' && !!target && recommended && !!recommendation;
    const scopedRows = applyingRecommendation ? source.filter((p) => p.rating != null && p.rating >= recommendation.min && p.rating <= recommendation.max) : source;
    const filtered = selectProblems({ rows: scopedRows, mine: solved, saved, tab, search, exact, min, max, tag, sort, bookmarksFirst });
    const tags = [...new Set(source.flatMap((p) => p.tags || []))].sort();
    const maxPage = Math.max(1, Math.ceil(filtered.length / 25));
    const currentPage = Math.min(page, maxPage);
    const visible = filtered.slice((currentPage - 1) * 25, currentPage * 25);
    const ratingBands = [800, 1200, 1600, 2000, 2400, 2800];
    const distribution = ratingBands.map((low, i) => queue.filter((p) => p.rating >= low && (i === 5 || p.rating < ratingBands[i + 1])).length);
    const maxBand = Math.max(...distribution, 1);
    const hasFilters = !!(search || exact || min || max || tag || applyingRecommendation);
    function resetFilters() { setSearch(''); setExact(''); setMin(''); setMax(''); setTag(''); }
    function changeTab(value) { setTab(value); resetFilters(); }
    function toggle(row, field) {
        const previous = saved[row.key];
        const value = !previous?.[field];
        setSaved(s => ({ ...s, [row.key]: { ...s[row.key], row, [field]: value, ...(field === 'bookmarked' ? { bookmarkedAt: value ? Date.now() : 0 } : {}) } }));
        setUndo({ key: row.key, previous });
        setNotice(field === 'checked' ? (value ? 'Moved to Checked. Hidden from every other tab.' : 'Question restored from Checked.') : (value ? 'Saved to your bookmarks.' : 'Bookmark removed.'));
    }
    function undoAction() { if (!undo)
        return; setSaved(s => { const copy = { ...s }; if (undo.previous)
        copy[undo.key] = undo.previous;
    else
        delete copy[undo.key]; return copy; }); setUndo(null); setNotice('Change undone.'); }
    function openDrawer(row) { setDrawer(row); setSubmission(null); setCode(''); setCodeError(''); setCodeBusy(false); sourceToken.current++; }
    function closeDrawer() { setDrawer(null); sourceToken.current++; }
    async function viewSource(s) {
        const token = ++sourceToken.current;
        setSubmission(s);
        setCode('');
        setCodeError('');
        setCodeBusy(true);
        try {
            const source = await requestSource(submissionUrl(s));
            if (token !== sourceToken.current)
                return;
            setCode(source);
        }
        catch (e) {
            if (token === sourceToken.current)
                setCodeError(e.message);
        }
        finally {
            if (token === sourceToken.current)
                setCodeBusy(false);
        }
    }
    function exportProgress() {
        const blob = new Blob([JSON.stringify({ version: 1, exported: new Date().toISOString(), profiles: profiles.map(p => p.handle), saved }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cf-ladder-progress.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    const drawerSubmissions = drawer ? [...new Map([...drawer.submissions, ...(myRows.find((p) => p.key === drawer.key)?.submissions || [])].map((s) => [s.id, s])).values()].sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds) : [];
    const EmptyIcon = tab === 'checked' ? CheckCheck : tab === 'bookmarks' ? Bookmark : Target;
    return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="./" aria-label="CF Ladder home"><span className="brand-mark"><i /><i /><i /></span><span>cf<span className="brand-light">ladder</span><small>MAKE THE NEXT CLIMB</small></span></a>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav aria-label="Problem tabs">
        <button className={tab === 'practice' ? 'nav-item selected' : 'nav-item'} onClick={() => changeTab('practice')}><Layers3 size={18}/>Practice queue<span>{queue.length}</span></button>
        <button className={tab === 'bookmarks' ? 'nav-item selected' : 'nav-item'} onClick={() => changeTab('bookmarks')}><Bookmark size={18}/>Bookmarks<span>{bookmarkCount}</span></button>
        <button className={tab === 'checked' ? 'nav-item selected' : 'nav-item'} onClick={() => changeTab('checked')}><CheckCheck size={18}/>Checked<span>{checkedCount}</span></button>
      </nav>
      <div className="sidebar-divider"/>
      <div className="section-label">TARGET PROFILES<button className="icon-button muted" aria-label="Add target profile" onClick={() => addInput.current?.focus()}><Plus size={17}/></button></div>
      <div className="profile-list">{profiles.map(p => <div className={'profile-item ' + (active === p.handle ? 'active' : '')} key={p.handle}>
        <button className="profile-select" onClick={() => { setActive(p.handle); changeTab('practice'); }}><span className={'avatar ' + ratingClass(p.info.rating)}>{p.handle.slice(0, 2).toUpperCase()}</span><span><strong>{p.handle}</strong><small>{p.info.rating ? `${p.info.rating} · ${p.info.rank}` : 'Unrated'}</small></span>{active === p.handle && <span className="active-dot"/>}</button>
        <button className="remove-profile icon-button" aria-label={`Remove ${p.handle}`} onClick={() => setConfirmRemove(p.handle)}><X size={13}/></button>
      </div>)}</div>
      {profiles.length === 0 && <p className="sidebar-empty">A little inspiration goes a long way. Add a coder to follow.</p>}
      <form onSubmit={addProfile} className="add-profile"><input aria-label="Target Codeforces handle" ref={addInput} value={input} onChange={e => setInput(e.target.value)} placeholder="Enter a handle…" disabled={!!busy}/><button disabled={!!busy || !input.trim()} aria-label="Add profile">{busy ? <LoaderCircle size={16} className="spin"/> : <Plus size={17}/>}</button></form>
      <div className="sidebar-bottom"><div className="local-note"><span className="green-dot"/>Saved in this browser<button className="icon-button" title="Export progress" aria-label="Export progress" onClick={exportProgress}><Download size={15}/></button></div>
        <a href={`https://codeforces.com/profile/${MY_HANDLE}`} target="_blank" rel="noreferrer" className="my-profile"><span className="my-avatar">M</span><span><strong>{MY_HANDLE}</strong><small>My profile {mine?.info.rating ? `· ${mine.info.rating}` : ''}</small></span><ArrowUpRight size={15}/></a>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{tab === 'practice' ? 'Practice queue' : tab === 'bookmarks' ? 'Bookmarks' : 'Checked questions'}</strong></div><div className="topbar-actions"><button className="theme-toggle" aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={15}/> : <Sun size={15}/>}<span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span></button><a href="https://codeforces.com" target="_blank" rel="noreferrer">Codeforces <ArrowUpRight size={14}/></a></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><span /> ONE PROBLEM BETTER, EVERY DAY</div><h1>{tab === 'practice' ? 'Your next problem, found.' : tab === 'bookmarks' ? 'Good problems. Saved.' : 'One more step up.'}</h1><p>{tab === 'practice' ? <>Learn from the coders you follow. Build a practice queue that’s yours.</> : tab === 'bookmarks' ? 'Your handpicked problems, across all target profiles.' : 'Your checked questions live here, and nowhere else. Uncheck to restore.'}</p></div><button className="sync-button" onClick={sync} disabled={!!busy}><RefreshCw size={16} className={busy ? 'spin' : ''}/>{busy ? 'Syncing…' : 'Sync profiles'}</button></div>
        {(busy || error) && <div className={'status-banner ' + (error ? 'error' : '')} role={error ? 'alert' : 'status'}>{error ? <AlertCircle size={17}/> : <LoaderCircle size={17} className="spin"/>}<span>{error || busy}</span>{error && <button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button>}</div>}

        <section className="overview" aria-label="Practice overview">
          <div className="compare-card"><div className="card-overline"><Target size={14}/> THE COMPARISON</div><div className="comparison"><div><span className="tiny-label">MY PROFILE</span><strong>{MY_HANDLE}</strong><small>{mine ? `${number(solved.size)} solved` : 'Sync to load your progress'}</small></div><span className="versus"><ArrowRight size={18}/></span><div><span className="tiny-label">TARGET PROFILE</span>{profiles.length > 0 ? <select aria-label="Selected target profile" value={active} onChange={e => { setActive(e.target.value); setPage(1); }}>{profiles.map(p => <option key={p.handle}>{p.handle}</option>)}</select> : <button className="choose-target" onClick={() => addInput.current?.focus()}>Add a target <Plus size={14}/></button>}<small>{target ? `${number(targetRows.filter((p) => p.lastAccepted).length)} solved` : 'Your next source of inspiration'}</small></div></div><div className="compare-foot"><span className="mini-dot"/> Target’s accepted problems − your solved problems</div></div>
          <div className="stat-card featured"><span className="stat-icon"><Flag size={17}/></span><span className="stat-label">Ready to practice</span><strong>{target ? number(queue.length) : '—'}</strong><span className="stat-foot">Your next opportunities <ArrowUpRight size={14}/></span></div>
          <div className="stat-card"><span className="stat-icon bookmark-icon"><Bookmark size={17}/></span><span className="stat-label">Bookmarked</span><strong>{number(bookmarkCount)}</strong><button onClick={() => changeTab('bookmarks')} className="stat-foot">Saved for later <ArrowRight size={14}/></button></div>
          <div className="stat-card"><span className="stat-icon check-icon"><CheckCheck size={17}/></span><span className="stat-label">Checked off</span><strong>{number(checkedCount)}</strong><button onClick={() => changeTab('checked')} className="stat-foot">Little wins add up <ArrowRight size={14}/></button></div>
        </section>

        <div className="work-area"><section className="problem-panel">
          <div className="panel-top"><div className="tabs" role="tablist" aria-label="Questions"><button role="tab" aria-selected={tab === 'practice'} className={tab === 'practice' ? 'current' : ''} onClick={() => changeTab('practice')}>Practice queue <span>{queue.length}</span></button><button role="tab" aria-selected={tab === 'bookmarks'} className={tab === 'bookmarks' ? 'current' : ''} onClick={() => changeTab('bookmarks')}>Bookmarks <span>{bookmarkCount}</span></button><button role="tab" aria-selected={tab === 'checked'} className={tab === 'checked' ? 'current' : ''} onClick={() => changeTab('checked')}>Checked <span>{checkedCount}</span></button></div><span className="live-label"><span /> {target || tab !== 'practice' ? 'Your collection' : 'Let’s get started'}</span></div>
          {tab === 'practice' && <div className="recommendation-bar"><div className="recommendation-heading"><span className="recommendation-icon"><Target size={16}/></span><div><strong>Practice at your level</strong><small>{mine?.info.rating ? <>Your rating: {mine.info.rating} · 100-point rating steps</> : 'Sync your profile to get personalized recommendations'}</small></div></div><div className="recommendation-controls"><div className="scope-toggle"><button className={recommended ? 'active' : ''} aria-pressed={recommended} onClick={() => { setRecommended(true); setExact(''); setMin(''); setMax(''); }}>For you</button><button className={!recommended ? 'active' : ''} aria-pressed={!recommended} onClick={() => setRecommended(false)}>All unsolved</button></div>{recommended && recommendation && <label className="range-control"><select aria-label="Recommended rating range" value={radius} onChange={e => setRadius(Number(e.target.value))}>{Array.from({ length: 10 }, (_, i) => (i + 1) * 100).map(r => <option key={r} value={r}>±{r} points</option>)}</select><span>{recommendation.min}–{recommendation.max}</span></label>}</div></div>}
          <div className="filters"><div className="search-field"><Search size={17}/><input aria-label="Search problems" placeholder="Search problems, IDs, or tags…" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={14}/></button>}</div><div className="select-wrap"><span className="select-label">Rating</span><select aria-label="Exact problem rating" value={exact} onChange={e => { setExact(e.target.value); setMin(''); setMax(''); setRecommended(false); }}><option value="">All ratings</option>{Array.from({ length: 33 }, (_, i) => 800 + i * 100).map(r => <option key={r} value={r}>{r}</option>)}<option value="unrated">Unrated</option></select></div><button className={'filter-button ' + (advanced ? 'on' : '')} onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}><SlidersHorizontal size={16}/><span>Filters</span>{(min || max || tag) && <i />}</button></div>
          {advanced && <div className="advanced-filters"><label>Min rating<input type="number" min="0" step="100" placeholder="Any" value={min} onChange={e => { setMin(e.target.value); setExact(''); setRecommended(false); }}/></label><label>Max rating<input type="number" min="0" step="100" placeholder="Any" value={max} onChange={e => { setMax(e.target.value); setExact(''); setRecommended(false); }}/></label><label>Problem tag<select value={tag} onChange={e => setTag(e.target.value)}><option value="">All tags</option>{tags.map(t => <option key={t}>{t}</option>)}</select></label></div>}
          <div className="sort-row"><span><strong>{number(filtered.length)}</strong> {tab === 'checked' ? 'checked questions' : tab === 'bookmarks' ? 'saved problems' : 'problems to explore'}{hasFilters && <button className="clear-filters" onClick={() => { resetFilters(); setRecommended(false); }}>Clear filters <X size={11}/></button>}</span><div className="sort-options"><label className="bookmark-sort"><input type="checkbox" checked={bookmarksFirst} onChange={e => setBookmarksFirst(e.target.checked)}/><Bookmark size={13}/> Bookmarks first</label><label className="sort-select"><ArrowDownUp size={14}/><select aria-label="Sort problems" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Latest solved</option><option value="oldest">Earliest solved</option><option value="rating-asc">Rating: low to high</option><option value="rating-desc">Rating: high to low</option><option value="bookmarked">Recently bookmarked</option><option value="attempts">Most submissions</option><option value="name">Problem name</option></select></label></div></div>
          {visible.length > 0 ? <><div className="table-scroll"><table><thead><tr><th className="bookmark-cell"><Bookmark size={13}/><span className="sr-only">Bookmark</span></th><th>PROBLEM</th><th>RATING</th><th>TARGET SOLVED <ChevronDown size={11}/></th><th>SUBMISSIONS</th><th className="check-cell">{tab === 'checked' ? 'RESTORE' : 'CHECK'}</th></tr></thead><tbody>{visible.map(p => <tr key={p.key} className={saved[p.key]?.bookmarked ? 'is-bookmarked' : ''}><td><button className={'row-bookmark icon-button ' + (saved[p.key]?.bookmarked ? 'bookmarked' : '')} aria-label={`${saved[p.key]?.bookmarked ? 'Remove bookmark from' : 'Bookmark'} ${p.name}`} aria-pressed={!!saved[p.key]?.bookmarked} onClick={() => toggle(p, 'bookmarked')}><Bookmark size={17} fill={saved[p.key]?.bookmarked ? 'currentColor' : 'none'}/></button></td><td><a className="problem-name" href={problemUrl(p)} target="_blank" rel="noreferrer"><span className="problem-id">{p.contestId}{p.index}</span>{p.name}<ArrowUpRight size={12}/></a><div className="problem-tags">{p.tags?.slice(0, 3).map((t) => <button key={t} onClick={() => { setTag(t); setAdvanced(true); }}>{t}</button>)}{p.tags?.length > 3 && <span title={p.tags.slice(3).join(', ')}>+{p.tags.length - 3}</span>}{tab !== 'practice' && <span className="handle-tag">{p.handles.join(', ')}</span>}{solved.has(p.key) && <span className="solved-tag">Solved by you</span>}</div></td><td><span className={'rating-pill ' + ratingClass(p.rating)}><span /> {p.rating ?? 'Unrated'}</span></td><td className="date-cell">{date(p.lastAccepted)}</td><td><button className="submission-button" onClick={() => openDrawer(p)}><Code2 size={15}/>{p.submissions.length}<span>View</span></button></td><td className="check-cell"><button className={'check-question ' + (saved[p.key]?.checked ? 'checked' : '')} aria-label={`${saved[p.key]?.checked ? 'Uncheck' : 'Check'} ${p.name}`} aria-pressed={!!saved[p.key]?.checked} onClick={() => toggle(p, 'checked')}><Check size={13}/></button></td></tr>)}</tbody></table></div><div className="pagination"><span>Showing {(currentPage - 1) * 25 + 1}–{Math.min(currentPage * 25, filtered.length)} of {number(filtered.length)}</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button><span>Page {currentPage} of {maxPage}</span><button aria-label="Next page" disabled={currentPage === maxPage} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></div></div></> : <div className="empty-state"><div className="empty-art"><span className="orbit one"/><span className="orbit two"/><div><EmptyIcon size={31}/></div><i className="spark s1"/><i className="spark s2"/><i className="spark s3"/></div><span className="empty-kicker">{hasFilters ? 'REFINE YOUR SEARCH' : tab === 'practice' && !target ? 'A NEW WAY TO PRACTICE' : 'ROOM FOR YOUR NEXT CHALLENGE'}</span><h2>{applyingRecommendation ? 'Find your next stretch.' : hasFilters ? 'No problems match these filters.' : tab === 'checked' ? 'Your progress belongs here.' : tab === 'bookmarks' ? 'Keep the good ones close.' : !target ? 'Great coders leave a trail.' : 'You’re all caught up.'}</h2><p>{applyingRecommendation ? <>No target problems match your {recommendation.min}–{recommendation.max} range and current filters. Widen the range, add another target, or explore all unsolved problems.</> : hasFilters ? 'Try a different rating, tag, or search to find your next problem.' : tab === 'checked' ? 'Check a question when you’re finished with it. It will move here and disappear from all other tabs.' : tab === 'bookmarks' ? 'Bookmark an interesting problem to build your own collection. Checked questions stay in the Checked tab.' : !target ? <>Add a target Codeforces profile. We’ll find the problems they’ve solved that you haven’t—ready for your next session.</> : 'There are no unchecked, unsolved problems from this target. Add another profile or sync for fresh submissions.'}</p>{hasFilters ? <button className="primary-button" onClick={() => { resetFilters(); setRecommended(false); }}>Show all unsolved problems <ArrowRight size={15}/></button> : tab === 'practice' ? <button className="primary-button" onClick={() => addInput.current?.focus()}>Add a target profile <Plus size={16}/></button> : <button className="primary-button" onClick={() => changeTab('practice')}>Explore practice queue <ArrowRight size={15}/></button>}{!target && tab === 'practice' && !hasFilters && <small>Any public Codeforces handle. No password needed.</small>}</div>}
        </section>

        <aside className="insights"><section className="insight-card"><div className="insight-title"><h3>The next rung</h3><span>01 / ∞</span></div><div className="ladder-illustration"><div className="rung r1"/><div className="rung r2"/><div className="rung r3"/><div className="rung r4"><Flag size={19}/></div><span className="ladder-path"/></div><h4>Small steps.<br />Stronger problem solving.</h4><p>Pick a problem just outside your comfort zone. Give it a real attempt before opening the code.</p><div className="tip-foot"><span /> Consistency beats intensity.</div></section>
          <section className="rating-card"><div className="insight-title"><h3>Difficulty mix</h3><span><SlidersHorizontal size={14}/></span></div><p>Your current practice queue</p><div className="bar-chart" aria-label="Problem count by rating range">{distribution.map((n, i) => <button key={i} onClick={() => { setRecommended(false); setExact(''); setMin(String(ratingBands[i])); setMax(i === 5 ? '' : String(ratingBands[i + 1] - 1)); setTab('practice'); setAdvanced(true); }} title={`${ratingBands[i]}${i === 5 ? '+' : `–${ratingBands[i + 1] - 1}`}: ${n} problems`} aria-label={`Filter ${ratingBands[i]}${i === 5 ? ' and above' : ` to ${ratingBands[i + 1] - 1}`}, ${n} problems`}><span className={'bar bar-' + i} style={{ height: `${Math.max(4, n / maxBand * 70)}px` }}/><span>{ratingBands[i] / 1000}k</span></button>)}</div><div className="chart-note">Click a bar to explore a rating range.</div></section>
          <div className="quiet-note"><CheckCircle2 size={17}/><p><strong>A cleaner queue.</strong>Checked questions are tucked away in their own tab. Always.</p></div>
        </aside></div>
        <footer><span>Built for the climb. Powered by the <a href="https://codeforces.com/apiHelp" target="_blank" rel="noreferrer">Codeforces API <ArrowUpRight size={10}/></a></span><span>{target ? `Last synced ${new Date(target.synced).toLocaleString()}` : 'Your progress stays on this device.'}</span></footer>
      </div>
    </main>

    {notice && <div className="toast" role="status"><CheckCircle2 size={17}/><span>{notice}</span>{undo && <button onClick={undoAction}>Undo</button>}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14}/></button></div>}
    {confirmRemove && <div className="modal-backdrop"><div className="remove-modal" role="dialog" aria-modal="true" aria-labelledby="remove-title"><h2 id="remove-title">Remove {confirmRemove}?</h2><p>Your bookmarks and checked questions will stay saved in this browser.</p><div><button onClick={() => setConfirmRemove('')}>Keep profile</button><button className="primary-button" onClick={() => { setProfiles(ps => ps.filter(p => p.handle !== confirmRemove)); if (active === confirmRemove)
        setActive(profiles.find(p => p.handle !== confirmRemove)?.handle || ''); setConfirmRemove(''); }}>Remove profile</button></div></div></div>}
    {drawer && <div className="drawer-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        closeDrawer(); }}><section className="drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div className="drawer-header"><span><Code2 size={18}/> SUBMISSION EXPLORER</span><button ref={closeRef} className="icon-button" aria-label="Close submission viewer" onClick={closeDrawer}><X size={21}/></button></div><div className="drawer-body"><div className="drawer-problem"><span className="eyebrow">{drawer.contestId}{drawer.index} · {drawer.rating ?? 'Unrated'}</span><h2 id="drawer-title">{drawer.name}</h2><a href={problemUrl(drawer)} target="_blank" rel="noreferrer">Open problem <ArrowUpRight size={14}/></a></div><p className="drawer-hint">All loaded attempts for this question, including your own. Select an attempt to view its code.</p><div className="attempts">{drawerSubmissions.map((s) => <button key={s.id} className={'attempt ' + (submission?.id === s.id ? 'chosen' : '')} onClick={() => viewSource(s)}><span><span className={'verdict ' + (s.verdict === 'OK' ? 'accepted' : '')}>{s.verdict === 'OK' ? 'Accepted' : (s.verdict || 'Testing').replaceAll('_', ' ')}</span><strong>{s.handle} <small>#{s.id}</small></strong><small>{s.programmingLanguage} · {date(s.creationTimeSeconds)} · {s.timeConsumedMillis} ms</small></span><ChevronRight size={17}/></button>)}</div>{submission ? <div className="code-viewer"><div className="code-toolbar"><strong>{submission.programmingLanguage}</strong><div>{code && <button aria-label="Copy source code" onClick={async () => { try {
        await navigator.clipboard.writeText(code);
        setNotice('Source code copied.');
    }
    catch {
        setNotice('Copy unavailable. Select the code and copy it manually.');
    } }}><Copy size={15}/></button>}<a href={submissionUrl(submission)} target="_blank" rel="noreferrer">Codeforces <ExternalLink size={13}/></a></div></div>{codeBusy ? <div className="code-message"><LoaderCircle size={20} className="spin"/>Loading submission code…</div> : codeError ? <div className="code-message"><AlertCircle size={22}/><p>{codeError}</p><a className="primary-button" href={submissionUrl(submission)} target="_blank" rel="noreferrer">Open original submission <ArrowUpRight size={15}/></a></div> : <pre tabIndex={0}><code>{code}</code></pre>}</div> : <div className="select-attempt"><Code2 size={28}/><p>Choose a submission to see its code.</p><small>If Codeforces restricts source access, we’ll link you to the original.</small></div>}</div></section></div>}
  </div>;
}
