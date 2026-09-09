import { coreHealthcheck } from '@sep/core';
import './App.css';

export default function App() {
  const status = coreHealthcheck();

  return (
    <main className="app">
      <h1>SEP</h1>
      <p>
        Клиентское приложение для поиска допустимых конфигураций солнечной
        энергетической установки.
      </p>
      <p className="status">
        Статус <code>@sep/core</code>: <strong>{status}</strong>
      </p>
    </main>
  );
}
