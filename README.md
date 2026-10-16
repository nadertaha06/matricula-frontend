# Portal de matrícula

React + Vite + SDK oficial Auth0. Login, catálogo com filtros, solicitações, cancelamento, histórico, posição na lista de espera e administração por permissão.

## Rodar localmente

Node 24 e npm. Com as APIs nas portas 8001–8003:

```sh
cp .env.example .env.local
npm ci
npm run dev
```

Abra http://localhost:5173. O Vite encaminha `/api/{servico}` para o backend, evitando CORS entre origens. As URLs permitidas da SPA Auth0 devem conter `http://localhost:5173` para callback, logout e web origin. A API registrada é `https://matricula-api`; RBAC e inclusão de permissões no access token devem estar habilitados.

Também é possível iniciar frontend, APIs e dependências com `docker compose up -d --build --wait` em `../matricula-infra`, após executar seu `scripts/configure.py`. O frontend Docker é servido na mesma porta 5173, sem necessidade de Vite.

A SPA utiliza Authorization Code com PKCE pelo SDK. Access tokens ficam em memória, nunca no localStorage. `VITE_*` é público: não coloque senhas, chaves privadas nem Client Secret nessas variáveis. O backend valida os tokens e as permissões independentemente da interface.

## Permissões

Usuários autenticados comuns gerenciam suas próprias matrículas. O papel `administrador` recebe:

- `manage:oferta`: disciplinas e turmas.
- `manage:historicos`: históricos acadêmicos.
- `manage:matriculas`: consulta administrativa (até 500 registros recentes) e cancelamento.
- `manage:processamento`: critérios e lista completa de espera.

A posição individual da fila não revela coeficiente ou identidade de outros alunos. A interface consulta `/session` para descobrir permissões efetivas do access token. Após mudar papéis no Auth0, saia e entre novamente.

## Identidade visual

Referência: [Guia de Marca Insper](https://www.insper.edu.br/content/dam/insper-portal/imagens/institucional/guia-marca-insper_sala-imprensa.pdf), páginas 11, 19 e 24. Vermelho `#E50505`, preto, branco, Inter hospedada localmente. GT Ultra e Acumin são fontes licenciadas não incluídas neste projeto: títulos usam Georgia como alternativa de sistema. O portal é identificado como projeto acadêmico, sem reprodução improvisada do logotipo oficial.

## Verificação

```sh
npm test
npm run build
```

CI executa testes e build e publica o artefato `dist`. A publicação na EC2 deve ser feita após configurar HTTPS e as URLs Auth0 da implantação. O compose local não altera o servidor remoto.

## Autorizar a SPA a acessar a API

Em Applications → APIs → Matricula API → Settings → Application Access Policy, configure User-Delegated Access como Per-app authorization. Em Application Access, localize Projeto-Final, clique Edit e habilite Grant Access em User-Delegated Access, selecionando as quatro permissões manage:* listadas acima. Salve. Isso autoriza a aplicação a pedir tokens; o RBAC continua limitando cada usuário aos seus próprios papéis.

O frontend solicita explicitamente esses scopes. Se aparecer “Client is not authorized to access resource server”, confira essa autorização da aplicação e a correspondência exata do Identifier com VITE_AUTH0_AUDIENCE. Não use Client Access/Machine-to-Machine para a SPA.
