import { useEffect, useState } from 'react';
import { Enrollments } from './Enrollments';
const enc = encodeURIComponent;
const csv = value => value.split(',').map(s => s.trim()).filter(Boolean);
const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
function Field({ label, children }) { return <label>{label}{children}</label>; }
export default function Admin({ data, api, act, busy }) {
  const permissions = data.session.permissions;
  const can = p => permissions.includes(p);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState(null);
  const [times, setTimes] = useState([{ dia_semana:0, inicio:'08:00', fim:'10:00' }]);
  useEffect(() => {
    if (!can('manage:matriculas')) return;
    let active = true;
    api('solicitacoes', '/matriculas').then(rows => { if (active) { setEnrollments(rows); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [api, data]);
  async function submit(event, service, path, body, message, method = 'POST') {
    event.preventDefault();
    await act(() => api(service, path, { method, body }), message);
  }
  const values = e => Object.fromEntries(new FormData(e.currentTarget));
  return <div className="admin-layout">
    <p className="admin-note">As alterações abaixo afetam a oferta e os registros acadêmicos. Cada operação exige sua permissão específica.</p>
    {can('manage:oferta') ? <>
      <section className="form-section"><h2>Cadastrar disciplina</h2><form onSubmit={e => { const v = values(e); submit(e, 'disciplinas', '/disciplinas', { codigo:v.codigo, nome:v.nome, pre_requisitos:csv(v.pre) }, 'Disciplina cadastrada.'); }}>
        <div className="form-grid"><Field label="Código"><input name="codigo" required maxLength={30} placeholder="Ex.: CAL1" /></Field><Field label="Nome da disciplina"><input name="nome" required maxLength={150} /></Field><Field label="Códigos dos pré-requisitos (separados por vírgula)"><input name="pre" placeholder="Opcional" /></Field></div><button className="primary" disabled={busy}>Cadastrar disciplina</button>
      </form></section>
      <section className="form-section"><h2>Abrir turma</h2><form onSubmit={e => { const v = values(e); submit(e, 'disciplinas', '/turmas', { disciplina_codigo:v.codigo, periodo:v.periodo, capacidade:Number(v.capacidade), horarios:times }, 'Turma cadastrada.'); }}>
        <div className="form-grid"><Field label="Disciplina"><select name="codigo" required><option value="">Selecione</option>{data.courses.map(c => <option value={c.codigo} key={c.codigo}>{c.codigo} — {c.nome}</option>)}</select></Field><Field label="Período letivo"><input name="periodo" required maxLength={20} placeholder="Ex.: 2026-2" /></Field><Field label="Capacidade"><input name="capacidade" type="number" min="1" max="10000" required /></Field></div>
        <fieldset><legend>Horários da turma</legend>{times.map((time, i) => <div className="schedule-form" key={i}><Field label="Dia"><select aria-label={`Dia do horário ${i+1}`} value={time.dia_semana} onChange={e => setTimes(times.map((t, j) => j === i ? { ...t, dia_semana:Number(e.target.value) } : t))}>{days.map((d, index) => <option key={d} value={index}>{d}</option>)}</select></Field>{['inicio','fim'].map(key => <Field label={key === 'inicio' ? 'Início' : 'Fim'} key={key}><input type="time" required value={time[key]} onChange={e => setTimes(times.map((t, j) => j === i ? { ...t, [key]:e.target.value } : t))} /></Field>)}{times.length > 1 ? <button type="button" className="secondary" onClick={() => setTimes(times.filter((_, j) => j !== i))}>Remover</button> : null}</div>)}<button type="button" className="secondary" disabled={times.length >= 20} onClick={() => setTimes([...times, { dia_semana:0, inicio:'08:00', fim:'10:00' }])}>Adicionar horário</button></fieldset><button className="primary" disabled={busy || !data.courses.length}>Cadastrar turma</button>
      </form></section>
    </> : null}
    {can('manage:historicos') ? <section className="form-section"><h2>Atualizar histórico acadêmico</h2><p>Informe o identificador do aluno exibido no Auth0. Salvar substitui o histórico acadêmico atual.</p><form onSubmit={e => { const v = values(e); e.preventDefault(); if (window.confirm('Substituir o histórico acadêmico deste aluno pelos dados informados?')) submit(e, 'solicitacoes', `/alunos/${enc(v.aluno)}/historico`, { disciplinas:csv(v.disciplinas), coeficiente:Number(v.coeficiente), periodo_aluno:Number(v.periodo) }, 'Histórico atualizado.', 'PUT'); }}>
      <div className="form-grid"><Field label="Identificador do aluno"><input name="aluno" required maxLength={150} placeholder="auth0|…" /></Field><Field label="Disciplinas concluídas (códigos separados por vírgula)"><input name="disciplinas" /></Field><Field label="Coeficiente (0 a 10)"><input name="coeficiente" type="number" required min="0" max="10" step="0.01" /></Field><Field label="Período do aluno"><input name="periodo" type="number" required min="1" max="30" /></Field></div><button className="primary" disabled={busy}>Salvar histórico</button>
    </form></section> : null}
    {can('manage:processamento') ? <section className="form-section"><h2>Critério e lista de espera</h2><p>O critério ordena a fila; não redistribui vagas já aprovadas.</p><form onSubmit={e => { const v = values(e); submit(e, 'processamento', `/turmas/${enc(v.turma)}/criterio`, { criterio:v.criterio }, 'Critério atualizado.', 'PUT'); }}>
      <div className="form-grid"><Field label="Turma"><select name="turma" required><option value="">Selecione</option>{data.classes.map(t => <option value={t.id} key={t.id}>{t.disciplina_codigo} / {t.periodo} / {t.id.slice(0,8)}</option>)}</select></Field><Field label="Critério"><select name="criterio"><option value="coeficiente">Maior coeficiente</option><option value="periodo">Maior período</option><option value="ordem_chegada">Ordem de chegada</option></select></Field></div><div className="table-actions"><button className="primary" disabled={busy || !data.classes.length}>Salvar critério</button><button type="button" className="secondary" disabled={busy} onClick={async e => { const id = new FormData(e.currentTarget.form).get('turma'); if (!id) { setError('Selecione uma turma.'); return; } setError(''); setQueue(null); try { setQueue(await api('processamento', `/turmas/${enc(id)}/lista-espera`)); } catch (e) { setError(e.message); } }}>Consultar fila</button></div>
    </form>{queue ? <div className="table-scroll"><table><thead><tr><th>Posição</th><th>Aluno</th><th>Coeficiente</th><th>Período</th></tr></thead><tbody>{queue.map(c => <tr key={c.solicitacao_id}><td>{c.posicao}</td><td>{c.aluno_id}</td><td>{c.coeficiente}</td><td>{c.periodo_aluno}</td></tr>)}</tbody></table>{!queue.length ? <p>Nenhum aluno na lista de espera desta turma.</p> : null}</div> : null}</section> : null}
    {error ? <p role="alert" className="error">{error}</p> : null}
    {can('manage:matriculas') ? <Enrollments admin items={enrollments} classes={data.classes} courses={data.courses} api={api} act={act} busy={busy} /> : null}
  </div>;
}
