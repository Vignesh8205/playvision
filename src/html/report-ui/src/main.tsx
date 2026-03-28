import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const renderApp = () => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <App />
            </React.StrictMode>,
        );
    }
};

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', renderApp);
} else {
    renderApp();
}

