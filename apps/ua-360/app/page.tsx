'use client';

import { useState, useEffect } from 'react';
import UaInputScreen from '@/components/UaInputScreen';
import IpEcosystemView from '@/components/IpEcosystemView';
import { AppMode, GenerateIPResponse } from '@/lib/types';
import { loadAssetsFromLocalStorage, saveAssetsToLocalStorage, clearAssetsFromLocalStorage } from '@/lib/localStorage';

export default function Home() {
  const [mode, setMode] = useState<AppMode>('idle');
  const [result, setResult] = useState<GenerateIPResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Check for existing assets on mount
  useEffect(() => {
    const savedAssets = loadAssetsFromLocalStorage();
    if (savedAssets && savedAssets.storyConfig) {
      // Auto-load results if assets exist
      setResult(savedAssets);
      setMode('ready');
    }
  }, []);

  const handleSubmit = async (idea: string) => {
    setMode('loading');
    setError(null);
    setProgressMessage('Generating story...');

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
      // Save to localStorage and show results
      saveAssetsToLocalStorage(data);
      setResult(data);
      setMode('ready');
      setProgressMessage('');
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred');
      setProgressMessage('');
      // Don't set mode to 'error' - keep showing input form
    }
  };

  const handleReset = () => {
    clearAssetsFromLocalStorage();
    setMode('idle');
    setResult(null);
    setError(null);
    setProgressMessage('');
  };

  const handleResultUpdate = (updatedResult: GenerateIPResponse) => {
    saveAssetsToLocalStorage(updatedResult);
    setResult(updatedResult);
  };

  return (
    <div className="single-page-container">
      {/* Input form always at top */}
      <div className="input-section">
        <UaInputScreen 
          onSubmit={handleSubmit} 
          isLoading={mode === 'loading'} 
          progressMessage={progressMessage}
          error={error}
        />
      </div>

      {/* Results expand vertically below */}
      {result && (
        <div className="results-section">
          <IpEcosystemView 
            result={result} 
            onReset={handleReset} 
            onResultUpdate={handleResultUpdate} 
          />
        </div>
      )}

      <style jsx>{`
        .single-page-container {
          min-height: 100vh;
          background: white;
          display: flex;
          flex-direction: column;
        }
        .input-section {
          flex-shrink: 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .results-section {
          flex: 1;
          width: 100%;
        }
      `}</style>
    </div>
  );
}

