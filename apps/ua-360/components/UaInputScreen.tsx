'use client';

import { useState } from 'react';

interface UaInputScreenProps {
  onSubmit: (idea: string) => void;
  isLoading: boolean;
  progressMessage?: string;
  error?: string | null;
}

export default function UaInputScreen({ onSubmit, isLoading, progressMessage, error }: UaInputScreenProps) {
  const exampleIdea = "A shy dragon who secretly runs a bakery on a floating island.";
  const [idea, setIdea] = useState(exampleIdea);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ideaToUse = idea.trim() || exampleIdea;
    onSubmit(ideaToUse);
  };

  return (
    <div className="input-screen">
      <div className="input-container">
        <form onSubmit={handleSubmit} className="idea-form">
          <div className="logo-text">UA</div>
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="add a short IP idea here ..."
            className="idea-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="create-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                <span>Generating...</span>
              </>
            ) : (
              'Submit'
            )}
          </button>
        </form>
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}
      </div>
      <style jsx>{`
        .input-screen {
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          min-height: auto;
        }
        .input-container {
          display: flex;
          align-items: center;
          max-width: 1400px;
          width: 100%;
        }
        .idea-form {
          display: flex;
          flex-direction: row;
          gap: 12px;
          width: 100%;
          align-items: center;
        }
        .logo-text {
          font-size: 48px;
          font-weight: bold;
          color: #000;
          letter-spacing: 4px;
          line-height: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          margin-right: 20px;
        }
        .idea-input {
          flex: 1;
          padding: 18px 20px;
          font-size: 18px;
          line-height: 1.5;
          height: 56px;
          box-sizing: border-box;
          border: 2px solid #ddd;
          border-radius: 12px;
          font-family: inherit;
          transition: border-color 0.2s;
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
          padding: 18px 32px;
          font-size: 18px;
          font-weight: 600;
          height: 56px;
          box-sizing: border-box;
          background: #000;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
          min-width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .create-button:hover:not(:disabled) {
          background: #333;
        }
        .create-button:disabled {
          background: #999;
          cursor: not-allowed;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .hint {
          font-size: 14px;
          color: #666;
          font-style: italic;
          padding-left: 4px;
        }
        .loading-message {
          font-size: 24px;
          color: #000;
          font-weight: 500;
          padding: 40px 20px;
          text-align: center;
        }
        .error-message {
          font-size: 14px;
          color: #d32f2f;
          padding: 12px;
          background: #ffebee;
          border-radius: 8px;
          margin-top: 12px;
        }
        @media (max-width: 968px) {
          .input-container {
            flex-direction: column;
            gap: 40px;
          }
          .logo-text {
            font-size: 16px;
            letter-spacing: 1px;
          }
          .idea-form {
            flex-direction: column;
          }
          .idea-input {
            height: 48px;
            padding: 14px 18px;
            font-size: 16px;
            width: 100%;
          }
          .create-button {
            height: 48px;
            width: 100%;
            align-self: stretch;
          }
          .form-section {
            width: 100%;
          }
          .create-button {
            align-self: stretch;
          }
        }
      `}</style>
    </div>
  );
}

