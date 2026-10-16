import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import { loginParameters } from './authConfig';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import './styles.css';
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {domain && clientId && audience ? <Auth0Provider domain={domain} clientId={clientId}
      authorizationParams={loginParameters(audience, window.location.origin)}
      onRedirectCallback={() => window.history.replaceState({}, document.title, '/')}>
      <App />
    </Auth0Provider> : <main className="setup"><h1>Configuração pendente</h1><p>Preencha as variáveis públicas do Auth0 em .env.local e reinicie o frontend.</p></main>}
  </StrictMode>,
);
