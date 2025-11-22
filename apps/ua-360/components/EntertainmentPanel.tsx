'use client';

import { StoryConfig, ComicPanelImage } from '@/lib/types';

interface EntertainmentPanelProps {
  storyConfig: StoryConfig;
  comicPanels: ComicPanelImage[];
}

export default function EntertainmentPanel({ storyConfig, comicPanels }: EntertainmentPanelProps) {
  return (
    <div className="entertainment-panel">
      <div className="panel-header">
        <h2 className="story-title">{storyConfig.title}</h2>
        <p className="logline">{storyConfig.logline}</p>
      </div>
      <div className="comic-container">
        {storyConfig.panels.map((panel, index) => (
          <div key={index} className="comic-panel">
            {comicPanels[index] && (
              <img
                src={comicPanels[index].url}
                alt={`Panel ${index + 1}`}
                className="panel-image"
              />
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

