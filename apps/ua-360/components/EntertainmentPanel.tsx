'use client';

import { useEffect, useRef } from 'react';
import { StoryConfig, ComicPanelImage } from '@/lib/types';

interface EntertainmentPanelProps {
  storyConfig: StoryConfig;
  comicPanels: ComicPanelImage[];
  loadingStatus?: string;
  isLoading?: boolean;
  characterRefImage?: { url: string };
  hasFirstPanel?: boolean;
  hasCharacterRef?: boolean;
  onRedoFrom?: (step: string) => void;
  onGenerateFirstPanel?: () => void;
  onGenerateSecondPanel?: () => void;
  onGenerateThirdPanel?: () => void;
}

export default function EntertainmentPanel({ 
  storyConfig, 
  comicPanels, 
  loadingStatus, 
  isLoading,
  characterRefImage,
  hasFirstPanel,
  hasCharacterRef,
  onRedoFrom,
  onGenerateFirstPanel,
  onGenerateSecondPanel,
  onGenerateThirdPanel
}: EntertainmentPanelProps) {
  // Auto-scroll to first panel when image appears
  const firstPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Check if first panel image has loaded
    if (comicPanels[0]?.url && comicPanels[0].url !== 'placeholder' && firstPanelRef.current) {
      setTimeout(() => {
        firstPanelRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 200); // Slightly longer delay to ensure image has rendered
    }
  }, [comicPanels[0]?.url]);
  return (
    <div className="entertainment-panel">
      {/* Story Config Section */}
      <div className="section-header">
        <h3 className="section-header-title">Story Config</h3>
        <button 
          onClick={() => onRedoFrom?.('storyConfig')}
          className="redo-button-black"
          disabled={isLoading}
        >
          {isLoading && loadingStatus?.includes('story') ? (
            <>
              <span className="spinner"></span>
              <span>Regenerating...</span>
            </>
          ) : (
            'Redo'
          )}
        </button>
      </div>
      
      {/* DEBUG: Show raw story config fields */}
      <div className="debug-config">
        <div className="debug-fields">
          <div className="debug-field">
            <strong>Title:</strong> {storyConfig.title || '(missing)'}
          </div>
          <div className="debug-field">
            <strong>Logline:</strong> {storyConfig.logline || '(missing)'}
          </div>
          <div className="debug-field">
            <strong>Character Name:</strong> {storyConfig.main_character?.name || '(missing)'}
          </div>
          <div className="debug-field">
            <strong>Character Description:</strong> {storyConfig.main_character?.short_description || '(missing)'}
          </div>
          <div className="debug-field">
            <strong>Character Style:</strong> {storyConfig.main_character?.style || '(missing)'}
          </div>
          <div className="debug-field">
            <strong>Character Colors:</strong> {storyConfig.main_character?.colors?.join(', ') || '(missing)'}
          </div>
          <div className="debug-field">
            <strong>Character Ref Prompt:</strong> {storyConfig.character_ref_prompt || '(missing)'}
          </div>
          <div className="debug-field">
            <strong>Number of Panels:</strong> {storyConfig.panels?.length || 0}
          </div>
          {storyConfig.panels?.map((panel, idx) => (
            <div key={idx} className="debug-panel">
              <strong>Panel {idx + 1}:</strong>
              <div className="debug-panel-content">
                <div><strong>Caption:</strong> {panel.caption || '(missing)'}</div>
                <div><strong>Image Prompt:</strong> {panel.image_prompt?.substring(0, 100) || '(missing)'}...</div>
              </div>
            </div>
          ))}
        </div>
        <details className="debug-raw-json">
          <summary>Raw JSON (click to expand)</summary>
          <pre>{JSON.stringify(storyConfig, null, 2)}</pre>
        </details>
      </div>

      {/* Comic Panel Section Headers - Show if panels are generated */}
      {hasFirstPanel && onRedoFrom && (
        <div className="section-header">
          <h3 className="section-header-title">Comic Panel 1</h3>
          <button 
            onClick={() => onRedoFrom('firstPanel')}
            className="redo-button-black"
            disabled={isLoading}
          >
            {isLoading && loadingStatus?.includes('panel') ? (
              <>
                <span className="spinner"></span>
                <span>Regenerating...</span>
              </>
            ) : (
              'Redo'
            )}
          </button>
        </div>
      )}
      {comicPanels[1]?.url && comicPanels[1].url !== 'placeholder' && onRedoFrom && (
        <div className="section-header">
          <h3 className="section-header-title">Comic Panel 2</h3>
          <button 
            onClick={() => onRedoFrom('secondPanel')}
            className="redo-button-black"
            disabled={isLoading}
          >
            {isLoading && loadingStatus?.includes('panel') ? (
              <>
                <span className="spinner"></span>
                <span>Regenerating...</span>
              </>
            ) : (
              'Redo'
            )}
          </button>
        </div>
      )}
      {comicPanels[2]?.url && comicPanels[2].url !== 'placeholder' && onRedoFrom && (
        <div className="section-header">
          <h3 className="section-header-title">Comic Panel 3</h3>
          <button 
            onClick={() => onRedoFrom('thirdPanel')}
            className="redo-button-black"
            disabled={isLoading}
          >
            {isLoading && loadingStatus?.includes('panel') ? (
              <>
                <span className="spinner"></span>
                <span>Regenerating...</span>
              </>
            ) : (
              'Redo'
            )}
          </button>
        </div>
      )}

      <div className="panel-header">
        <h2 className="story-title">{storyConfig.title}</h2>
        <p className="logline">{storyConfig.logline}</p>
      </div>
      <div className="comic-container">
        {storyConfig.panels.map((panel, index) => (
          <div 
            key={index} 
            className="comic-panel"
            ref={index === 0 ? firstPanelRef : undefined}
          >
            {comicPanels[index] && comicPanels[index].url && comicPanels[index].url !== 'placeholder' && (
              <img
                src={comicPanels[index].url}
                alt={`Panel ${index + 1}`}
                className="panel-image"
              />
            )}
            {(!comicPanels[index] || comicPanels[index].url === 'placeholder') && (
              <div className="panel-placeholder">
                {index === 0 && onGenerateFirstPanel ? (
                  <button 
                    onClick={onGenerateFirstPanel}
                    className="generate-image-button"
                    disabled={isLoading}
                  >
                    {isLoading && loadingStatus?.includes('first comic panel') ? (
                      <>
                        <span className="spinner"></span>
                        <span>Generating...</span>
                      </>
                    ) : (
                      'Generate Image 1'
                    )}
                  </button>
                ) : index === 1 && onGenerateSecondPanel ? (
                  <button 
                    onClick={onGenerateSecondPanel}
                    className="generate-image-button"
                    disabled={isLoading}
                  >
                    {isLoading && loadingStatus?.includes('second comic panel') ? (
                      <>
                        <span className="spinner"></span>
                        <span>Generating...</span>
                      </>
                    ) : (
                      'Generate Image 2'
                    )}
                  </button>
                ) : index === 2 && onGenerateThirdPanel ? (
                  <button 
                    onClick={onGenerateThirdPanel}
                    className="generate-image-button"
                    disabled={isLoading}
                  >
                    {isLoading && loadingStatus?.includes('third comic panel') ? (
                      <>
                        <span className="spinner"></span>
                        <span>Generating...</span>
                      </>
                    ) : (
                      'Generate Image 3'
                    )}
                  </button>
                ) : (
                  <>Panel {index + 1} Image (Not Generated)</>
                )}
              </div>
            )}
            <p className="panel-caption">{panel.caption}</p>
          </div>
        ))}
      </div>

      <style jsx>{`
        .entertainment-panel {
          padding: 32px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .debug-config {
          margin-bottom: 32px;
          padding: 20px;
          background: #f9f9f9;
          border: 2px solid #ddd;
          border-radius: 8px;
        }
        .debug-title {
          font-size: 18px;
          font-weight: bold;
          color: #666;
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .debug-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .debug-field {
          padding: 8px;
          background: white;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.5;
        }
        .debug-field strong {
          color: #333;
          margin-right: 8px;
        }
        .debug-panel {
          padding: 12px;
          background: #f0f0f0;
          border-radius: 4px;
          margin-top: 8px;
        }
        .debug-panel-content {
          margin-top: 8px;
          padding-left: 16px;
        }
        .debug-panel-content div {
          margin-bottom: 4px;
          font-size: 13px;
        }
        .debug-raw-json {
          margin-top: 16px;
          padding: 12px;
          background: #e8e8e8;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          color: #333;
        }
        .debug-raw-json summary {
          cursor: pointer;
          color: #000;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .debug-raw-json pre {
          margin: 0;
          font-size: 12px;
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
          color: #333;
        }
        .panel-header {
          margin-bottom: 24px;
          text-align: center;
        }
        .story-title {
          font-size: 32px;
          font-weight: bold;
          margin: 0 0 12px 0;
          color: #000;
        }
        .logline {
          font-size: 18px;
          color: #666;
          margin: 0;
          font-style: italic;
        }
        .comic-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .comic-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .panel-image {
          width: 100%;
          height: auto;
          border-radius: 8px;
          object-fit: cover;
        }
        .panel-caption {
          font-size: 14px;
          color: #333;
          text-align: center;
          margin: 0;
        }
        .panel-placeholder {
          width: 100%;
          aspect-ratio: 1;
          background: #f0f0f0;
          border: 2px dashed #ccc;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 12px;
          text-align: center;
          padding: 16px;
          position: relative;
        }
        .generate-image-button {
          padding: 16px 32px;
          font-size: 18px;
          font-weight: 600;
          background: #000;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 180px;
        }
        .generate-image-button:hover:not(:disabled) {
          background: #333;
        }
        .generate-image-button:disabled {
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
        .loading-status {
          padding: 16px;
          background: #e3f2fd;
          border: 2px solid #2196f3;
          border-radius: 8px;
          margin-bottom: 24px;
          text-align: center;
          color: #1565c0;
          font-weight: 500;
          scroll-margin-top: 100px; /* Add offset for scroll positioning */
        }
        .loading-status p {
          margin: 0;
        }
        .character-ref-section {
          margin-top: 32px;
          padding: 24px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
          scroll-margin-top: 100px; /* Add offset for scroll positioning */
        }
        .character-ref-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #333;
        }
        .character-ref-image {
          max-width: 100%;
          max-height: 400px;
          border-radius: 8px;
          object-fit: contain;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e0e0e0;
        }
        .section-header-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .redo-button-black {
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          background: #000;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 80px;
        }
        .redo-button-black:hover:not(:disabled) {
          background: #333;
        }
        .redo-button-black:disabled {
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
        @media (max-width: 768px) {
          .comic-container {
            grid-template-columns: 1fr;
          }
          .story-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}

