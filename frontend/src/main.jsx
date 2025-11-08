import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <-- Add this line!
import './index.css'
import App from './App.jsx'

window.addEventListener('unhandledrejection', function(event) {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
  alert('UNHANDLED PROMISE REJECTION: ' + (event.reason && event.reason.message ? event.reason.message : JSON.stringify(event.reason)));
});

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
