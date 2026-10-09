import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Si esta ventana se abrió como popup de OAuth y regresó con parámetros de sesión o error,
// enviamos los datos a la ventana principal (iframe de AI Studio) y cerramos el popup.
if (
  typeof window !== 'undefined' &&
  window.opener &&
  window.opener !== window &&
  (window.location.pathname.startsWith('/auth/callback') ||
    window.location.hash.includes('access_token=') ||
    window.location.hash.includes('error=') ||
    window.location.search.includes('code=') ||
    window.location.search.includes('error='))
) {
  try {
    window.opener.postMessage(
      {
        type: 'MONDINO_OAUTH_CALLBACK',
        hash: window.location.hash || '',
        search: window.location.search || '',
      },
      '*'
    );
    setTimeout(() => {
      window.close();
    }, 150);
  } catch {
    // ignore postMessage errors
  }
}

createRoot(document.getElementById('root')!).render(<App />);
