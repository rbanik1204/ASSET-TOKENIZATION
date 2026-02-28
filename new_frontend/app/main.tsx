// Node.js polyfills for algosdk / wallet SDKs
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../index.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
