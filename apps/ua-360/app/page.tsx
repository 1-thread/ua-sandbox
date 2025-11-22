'use client';

import { useState } from 'react';
import UaInputScreen from '@/components/UaInputScreen';
import IpEcosystemView from '@/components/IpEcosystemView';
import { AppMode, GenerateIPResponse } from '@/lib/types';

export default function Home() {
  const [mode, setMode] = useState<AppMode>('idle');
  const [result, setResult] = useState<GenerateIPResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (idea: string) => {
    setMode('loading');
    setError(null);

    try {
      const response = await fetch('/api/generate-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idea }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate IP');
      }

      const data: GenerateIPResponse = await response.json();
      setResult(data);
      setMode('ready');
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred');
      setMode('error');
    }
  };

  const handleReset = () => {
    setMode('idle');
    setResult(null);
    setError(null);
  };

  if (mode === 'idle' || mode === 'loading') {
    return <UaInputScreen onSubmit={handleSubmit} isLoading={mode === 'loading'} />;
  }

  if (mode === 'error') {
    return (
      <div className="error-screen">
        <div className="error-container">
          <h1 className="error-title">Error</h1>
          <p className="error-message">{error}</p>
          <button onClick={handleReset} className="retry-button">
            Try Again
          </button>
        </div>
        <style jsx>{`
          .error-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: white;
          }
          .error-container {
            text-align: center;
            max-width: 500px;
            padding: 32px;
          }
          .error-title {
            font-size: 32px;
            font-weight: bold;
            margin: 0 0 16px 0;
            color: #d32f2f;
          }
          .error-message {
            font-size: 16px;
            color: #666;
            margin: 0 0 24px 0;
          }
          .retry-button {
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            background: #000;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .retry-button:hover {
            background: #333;
          }
        `}</style>
      </div>
    );
  }

  if (mode === 'ready' && result) {
    return <IpEcosystemView result={result} onReset={handleReset} />;
  }

  return null;
}

