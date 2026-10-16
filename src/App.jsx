import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createApi } from './api';
import Admin from './Admin';
import { Enrollments } from './Enrollments';

const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export default function App() {
  const auth = useAuth0();
  const [loginError, setLoginError] = useState('');
  if (auth.isLoading) return <main className="setup" role="status">Abrindo seu portal…</main>;
  if (!auth.isAuthenticated) return <main className="login">
    <div className="login-story"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true">m</span><span> Matrícula</span></a><div><h1>Seu próximo<br />semestre<br />começa aqui.</h1><p>Escolha suas disciplinas, acompanhe as solicitações e organize seus horários em um só lugar.</p></div><small>Projeto acadêmico · Insper</small></div>
    <section className="login-panel"><div><span className="section-icon" aria-hidden="true">↗</span><h2>Vamos planejar<br />seus estudos?</h2><p>Entre com sua conta para consultar as turmas disponíveis e acompanhar suas matrículas.</p>
      {auth.error || loginError ? <p role="alert" className="error">Não foi possível entrar: {auth.error?.message || loginError}</p> : null}
      <button className="primary" onClick={async () => { try { await auth.loginWithRedirect(); } catch (e) { setLoginError(e.message); } }}>Entrar no portal</button><small>Use o e-mail cadastrado na sua conta.</small></div></section>
  </main>;
  return <Portal auth={auth} />;
}

function Portal({ auth }) {
  const api = useMemo(() => createApi(auth.getAccessTokenSilently), [auth.getAccessTokenSilently]);
  const [page, setPage] = useState('catalogo');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('');
  const generation = useRef(0);
  const mutation = useRef(false);
  const refresh = useCallback(async () => {
    const id = ++generation.current;
    try {
      const [session, courses, classes, enrollments] = await Promise.all([
        api('solicitacoes', '/session'), api('disciplinas', '/disciplinas'),
        api('disciplinas', '/turmas'), api('solicitacoes', '/matriculas/me'),
      ]);
      if (id === generation.current) { setData({ session, courses, classes, enrollments }); setError(''); }
    } catch (e) { if (id === generation.current) setError(e.message); }
  }, [api]);
  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (!document.hidden && !mutation.current) refresh(); }, 10000);
    return () => { clearInterval(timer); generation.current++; };
  }, [refresh]);
  async function act(work, message) {
    if (mutation.current) return false;
    mutation.current = true; setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(message); await refresh(); return true; }
    catch (e) { setError(e.message); return false; }
    finally { mutation.current = false; setBusy(false); }
  }
  const permissions = data?.session.permissions || [];
  const admin = permissions.some(p => p.startsWith('manage:'));
  const titles = { catalogo: 'Encontre seu próximo aprendizado.', matriculas: 'Acompanhe cada etapa.', admin: 'Organize a oferta acadêmica.' };
  const coursesByCode = Object.fromEntries((data?.courses || []).map(c => [c.codigo, c]));
  const classes = (data?.classes || []).filter(t => (!period || t.periodo === period) && `${t.disciplina_codigo} ${coursesByCode[t.disciplina_codigo]?.nome || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="shell"><a className="skip" href="#content">Pular para o conteúdo</a>
    <aside className="sidebar"><a href="/" className="brand"><span className="brand-mark" aria-hidden="true">m</span><span> Matrícula</span></a><p className="sidebar-caption">Seu espaço acadêmico</p>
      <nav aria-label="Navegação principal"><button aria-current={page === 'catalogo' ? 'page' : undefined} onClick={() => setPage('catalogo')}>Disciplinas e turmas</button><button aria-current={page === 'matriculas' ? 'page' : undefined} onClick={() => setPage('matriculas')}>Minhas matrículas</button>{admin ? <button aria-current={page === 'admin' ? 'page' : undefined} onClick={() => setPage('admin')}>Administração</button> : null}</nav>
      <div className="sidebar-footer"><span className="avatar">{(auth.user?.name || 'A').slice(0, 1)}</span><div><strong>{auth.user?.name || 'Aluno'}</strong><small>{admin ? 'Administrador' : 'Aluno'}</small></div><button className="logout" onClick={() => auth.logout({ logoutParams: { returnTo: window.location.origin } })}>Sair</button></div>
    </aside>
    <main id="content" className="workspace"><header className="page-header"><div><p>Portal acadêmico / {page === 'admin' ? 'Administração' : 'Matrícula'}</p><h1>{titles[page]}</h1></div><button className="secondary" disabled={busy} onClick={refresh}>Atualizar</button></header>
      {error ? <div role="alert" className="error">{error} <button onClick={() => auth.loginWithRedirect()}>Entrar novamente</button></div> : null}
      {notice ? <p role="status" className="success">{notice}</p> : null}
      {!data ? <p role="status">{error ? 'Os dados não puderam ser carregados.' : 'Carregando seus dados…'}</p> : <>
        {page === 'catalogo' ? <><section className="semester-banner"><div><h2>Monte um semestre que faz sentido para você.</h2><p>Confira horários e pré-requisitos antes de solicitar sua matrícula.</p></div><div className="summary-count"><strong>{data.enrollments.filter(e => e.status === 'DEFERIDA').length}</strong><span>matrículas aprovadas</span></div></section>
          <div className="section-heading"><h2>Turmas disponíveis <span>{classes.length}</span></h2><div className="filters"><label>Buscar disciplina<input type="search" placeholder="Nome ou código" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Período<select value={period} onChange={e => setPeriod(e.target.value)}><option value="">Todos os períodos</option>{[...new Set(data.classes.map(t => t.periodo))].sort().map(p => <option key={p}>{p}</option>)}</select></label></div></div>
          {!classes.length ? <div className="empty"><h3>Nenhuma turma encontrada.</h3><p>Altere os filtros ou aguarde o cadastro de novas turmas pela administração.</p></div> : <div className="course-grid">{classes.map(t => {
            const course = coursesByCode[t.disciplina_codigo];
            const existing = data.enrollments.find(e => e.turma_id === t.id && ['SOLICITADA', 'DEFERIDA', 'EM_ESPERA'].includes(e.status));
            return <article className="course" key={t.id}><div className="course-meta"><span>{t.disciplina_codigo}</span><span>{t.periodo}</span></div><h3>{course?.nome || t.disciplina_codigo}</h3><ul className="schedules">{t.horarios.map((h, i) => <li key={i}>{days[h.dia_semana]} <strong>{h.inicio} — {h.fim}</strong></li>)}</ul><p className="prereqs">Pré-requisitos: {t.pre_requisitos.length ? t.pre_requisitos.join(', ') : 'nenhum'}</p><footer><span className={t.vagas_disponiveis ? 'available' : 'full'}>{t.vagas_disponiveis ? `${t.vagas_disponiveis} vagas disponíveis` : 'Lista de espera'}</span><button className="primary" disabled={busy || !!existing} onClick={() => act(() => api('solicitacoes', '/matriculas', { method: 'POST', body: { turma_id: t.id } }), 'Solicitação enviada. Acompanhe o resultado em Minhas matrículas.')}>{existing ? 'Solicitada' : 'Solicitar matrícula'}</button></footer></article>;
          })}</div>}</> : null}
        {page === 'matriculas' ? <Enrollments items={data.enrollments} classes={data.classes} courses={data.courses} api={api} act={act} busy={busy} /> : null}
        {page === 'admin' && admin ? <Admin data={data} api={api} act={act} busy={busy} /> : null}
      </>}
      <footer className="page-footer">Projeto acadêmico · Insper <span>As solicitações são processadas automaticamente. Dados atualizados a cada 10 segundos.</span></footer>
    </main></div>;
}
