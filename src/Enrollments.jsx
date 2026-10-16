import { useState } from 'react';
export const statusNames = { SOLICITADA:'Em análise', DEFERIDA:'Aprovada', INDEFERIDA:'Indeferida', EM_ESPERA:'Lista de espera', CANCELADA:'Cancelada' };
const reasons = { SEM_VAGAS:'Sem vagas no momento', PRE_REQUISITO:'Pré-requisito não cumprido', CHOQUE_HORARIO:'Conflito de horário', DISCIPLINA_JA_MATRICULADA:'Disciplina já matriculada', AGUARDANDO_VAGA:'Aguardando liberação de vaga', TURMA_INEXISTENTE:'Turma não encontrada' };
export function Enrollments({ items, classes, courses, api, act, busy, admin = false }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function inspect(item) {
    setLoading(true); setError(''); setDetails(null);
    try {
      const [history, queue] = await Promise.all([
        api('solicitacoes', `/matriculas/${item.id}/historico`),
        item.status === 'EM_ESPERA' ? api('processamento', `/turmas/${item.turma_id}/lista-espera`) : Promise.resolve([]),
      ]);
      setDetails({ id: item.id, history, position: queue.find(c => c.solicitacao_id === item.id)?.posicao });
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  return <section><div className="section-heading"><h2>{admin ? 'Solicitações de todos os alunos' : 'Minhas solicitações'}</h2><span>{items.length} registros</span></div>
    {error ? <p className="error" role="alert">{error}</p> : null}
    {!items.length ? <div className="empty"><h3>Nenhuma solicitação por aqui.</h3><p>Escolha uma turma em Disciplinas e turmas para começar.</p></div> : <div className="table-scroll"><table><thead><tr><th>Disciplina / turma</th>{admin ? <th>Aluno</th> : null}<th>Situação</th><th>Solicitada em</th><th>Ações</th></tr></thead><tbody>{items.map(item => {
      const turma = classes.find(t => t.id === item.turma_id);
      const course = courses.find(c => c.codigo === turma?.disciplina_codigo);
      return <tr key={item.id}><td><strong>{course?.nome || item.turma_id}</strong><small>{turma?.disciplina_codigo} {turma?.periodo}</small></td>{admin ? <td className="identifier">{item.aluno_id}</td> : null}<td><span className={`status status-${item.status}`}>{statusNames[item.status]}</span><small>{reasons[item.motivo] || item.motivo}</small></td><td>{new Date(item.solicitado_em).toLocaleDateString('pt-BR')}</td><td><div className="table-actions"><button className="secondary" disabled={loading} onClick={() => inspect(item)}>Detalhes</button>{['SOLICITADA','EM_ESPERA','DEFERIDA'].includes(item.status) ? <button className="danger" disabled={busy} onClick={() => { if (window.confirm('Cancelar esta matrícula? Uma vaga liberada poderá ser ocupada por outro aluno.')) act(() => api('solicitacoes', `/matriculas/${item.id}`, { method:'DELETE' }), 'Matrícula cancelada.'); }}>Cancelar</button> : null}</div></td></tr>;
    })}</tbody></table></div>}
    {loading ? <p role="status">Carregando histórico…</p> : null}
    {details ? <section className="detail-panel" aria-label="Histórico da solicitação"><div className="section-heading"><h3>Histórico da solicitação</h3><button className="secondary" onClick={() => setDetails(null)}>Fechar</button></div>{details.position ? <p>Sua posição na lista de espera: <strong>{details.position}</strong></p> : null}<ol className="timeline">{details.history.map((h, i) => <li key={i}><strong>{statusNames[h.status]}</strong><span>{new Date(h.ocorrido_em).toLocaleString('pt-BR')}</span>{h.motivo ? <small>{reasons[h.motivo] || h.motivo}</small> : null}</li>)}</ol></section> : null}
  </section>;
}
