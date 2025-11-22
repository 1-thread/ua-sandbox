'use client';

import { GenerateIPResponse } from '@/lib/types';
import EntertainmentPanel from './EntertainmentPanel';
import GamePanel from './GamePanel';
import ToyPanel from './ToyPanel';

interface IpEcosystemViewProps {
  result: GenerateIPResponse;
  onReset: () => void;
}

export default function IpEcosystemView({ result, onReset }: IpEcosystemViewProps) {
  return (
    <div className="ecosystem-view">
      <div className="ecosystem-header">
        <h1 className="ecosystem-title">Your 360 IP</h1>
        <button onClick={onReset} className="reset-button">
          Generate Another 360 IP
        </button>
      </div>
      <div className="ecosystem-panels">
        <div className="panel-section">
          <h2 className="section-title">ENTERTAINMENT</h2>
          <EntertainmentPanel
            storyConfig={result.storyConfig}
            comicPanels={result.comicPanels}
          />
        </div>
        <div className="panel-section">
          <h2 className="section-title">GAME</h2>
          <GamePanel
            gameConfig={result.gameConfig}
            model3D={result.model3D}
          />
        </div>
        <div className="panel-section">
          <h2 className="section-title">TOY</h2>
          <ToyPanel
            model3D={result.model3D}
            characterName={result.storyConfig.main_character.name}
          />
        </div>
      </div>
      <style jsx>{`
        .ecosystem-view {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 32px;
        }
        .ecosystem-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .ecosystem-title {
          font-size: 36px;
          font-weight: bold;
          margin: 0;
          color: #000;
        }
        .reset-button {
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
        .reset-button:hover {
          background: #333;
        }
        .ecosystem-panels {
          display: flex;
          flex-direction: column;
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .panel-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #666;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        @media (max-width: 768px) {
          .ecosystem-view {
            padding: 16px;
          }
          .ecosystem-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }
          .ecosystem-title {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}

