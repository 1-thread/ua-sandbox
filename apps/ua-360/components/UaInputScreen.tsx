'use client';

import { useState } from 'react';

interface UaInputScreenProps {
  onSubmit: (idea: string) => void;
  isLoading: boolean;
}

export default function UaInputScreen({ onSubmit, isLoading }: UaInputScreenProps) {
  const [idea, setIdea] = useState('');
  const exampleIdea = "A shy dragon who secretly runs a bakery on a floating island.";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ideaToUse = idea.trim() || exampleIdea;
    onSubmit(ideaToUse);
  };

  return (
    <div className="input-screen">
      <div className="input-container">
        <div className="logo">UA</div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="add a short IP idea here ..."
            className="idea-input"
            rows={4}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="create-button"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Create 360 IP'}
          </button>
        </form>
        {!isLoading && (
          <div className="hint">
            e.g., "{exampleIdea}"
          </div>
        )}
        {isLoading && (
          <div className="loading-text">
            Generating your 360 IP… (Story → Comic → Game → Toy)
          </div>
        )}
      </div>
      <style jsx>{`
        .input-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: white;
        }
        .input-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          max-width: 600px;
          width: 90%;
        }
        .logo {
          font-size: 48px;
          font-weight: bold;
          color: #000;
          letter-spacing: 4px;
        }
        .idea-input {
          width: 100%;
          padding: 16px;
          font-size: 16px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: inherit;
          resize: vertical;
        }
        .idea-input:focus {
          outline: none;
          border-color: #000;
        }
        .idea-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }
        .create-button {
          width: 100%;
          padding: 16px;
          font-size: 18px;
          font-weight: 600;
          background: #000;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .create-button:hover:not(:disabled) {
          background: #333;
        }
        .create-button:disabled {
          background: #999;
          cursor: not-allowed;
        }
        .hint {
          font-size: 14px;
          color: #666;
          text-align: center;
          font-style: italic;
        }
        .loading-text {
          font-size: 16px;
          color: #000;
          text-align: center;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

