'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GameConfig, Model3D } from '@/lib/types';

interface GamePanelProps {
  gameConfig: GameConfig;
  model3D: Model3D;
}

interface GameState {
  score: number;
  isPlaying: boolean;
  isPaused: boolean;
  gameOver: boolean;
  message: string;
  timeRemaining: number;
  movesRemaining: number;
}

export default function GamePanel({ gameConfig, model3D }: GamePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterRef = useRef<THREE.Object3D | null>(null);
  const prizesRef = useRef<THREE.Mesh[]>([]);
  const hazardsRef = useRef<THREE.Mesh[]>([]);
  const targetPositionRef = useRef<THREE.Vector3 | null>(null);
  const isMovingRef = useRef(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const boardPlaneRef = useRef<THREE.Mesh | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    message: '',
    timeRemaining: gameConfig.session.duration_sec,
    movesRemaining: gameConfig.session.max_moves,
  });

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(gameConfig.theme.background_color);
    sceneRef.current = scene;

    // Camera
    const camConfig = gameConfig.camera;
    const camera = new THREE.PerspectiveCamera(
      camConfig.field_of_view,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(camConfig.position.x, camConfig.position.y, camConfig.position.z);
    camera.lookAt(camConfig.look_at.x, camConfig.look_at.y, camConfig.look_at.z);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, gameConfig.theme.light_intensity);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Board
    const boardGeometry = new THREE.PlaneGeometry(
      gameConfig.theme.board_size.width,
      gameConfig.theme.board_size.height
    );
    const boardMaterial = new THREE.MeshStandardMaterial({ color: gameConfig.theme.board_color });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.rotation.x = -Math.PI / 2;
    board.receiveShadow = true;
    scene.add(board);
    boardPlaneRef.current = board;

    // Load character model
    // If URL is from Meshy CDN, proxy through our API to avoid CORS issues
    const modelUrl = model3D.url.startsWith('https://assets.meshy.ai/')
      ? `/api/proxy-model?url=${encodeURIComponent(model3D.url)}`
      : model3D.url;
    
    const loader = model3D.format === 'glb' ? new GLTFLoader() : new OBJLoader();
    loader.load(
      modelUrl,
      (object) => {
        let model: THREE.Object3D;
        if (model3D.format === 'glb') {
          model = (object as any).scene;
        } else {
          model = object as THREE.Object3D;
        }

        // Scale and position character
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.5 / maxDim;
        model.scale.multiplyScalar(scale);
        model.position.set(0, 0.5, 0);

        scene.add(model);
        characterRef.current = model;
      },
      undefined,
      (error) => {
        console.error('Error loading character model:', error);
      }
    );

    // Spawn prizes and hazards
    const spawnObjects = () => {
      // Clear existing
      prizesRef.current.forEach(prize => scene.remove(prize));
      hazardsRef.current.forEach(hazard => scene.remove(hazard));
      prizesRef.current = [];
      hazardsRef.current = [];

      // Spawn prizes
      for (let i = 0; i < gameConfig.objects.max_prizes; i++) {
        const region = gameConfig.objects.spawn_regions[0];
        const x = THREE.MathUtils.randFloat(region.x_min, region.x_max);
        const z = THREE.MathUtils.randFloat(region.z_min, region.z_max);
        const prize = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 16),
          new THREE.MeshStandardMaterial({ color: gameConfig.theme.prize_color, emissive: gameConfig.theme.prize_color, emissiveIntensity: 0.5 })
        );
        prize.position.set(x, 0.5, z);
        prize.castShadow = true;
        scene.add(prize);
        prizesRef.current.push(prize);
      }

      // Spawn hazards
      for (let i = 0; i < gameConfig.objects.max_hazards; i++) {
        const region = gameConfig.objects.spawn_regions[0];
        const x = THREE.MathUtils.randFloat(region.x_min, region.x_max);
        const z = THREE.MathUtils.randFloat(region.z_min, region.z_max);
        const hazard = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1, 8),
          new THREE.MeshStandardMaterial({ color: gameConfig.theme.hazard_color })
        );
        hazard.position.set(x, 0.5, z);
        hazard.castShadow = true;
        scene.add(hazard);
        hazardsRef.current.push(hazard);
      }
    };

    spawnObjects();

    // Click handler
    const handleClick = (event: MouseEvent) => {
      if (!gameState.isPlaying || gameState.gameOver || isMovingRef.current) return;

      const rect = containerRef.current!.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(board);

      if (intersects.length > 0 && characterRef.current) {
        const point = intersects[0].point;
        const bounds = gameConfig.theme.board_size;
        const clampedX = THREE.MathUtils.clamp(point.x, -bounds.width / 2, bounds.width / 2);
        const clampedZ = THREE.MathUtils.clamp(point.z, -bounds.height / 2, bounds.height / 2);
        targetPositionRef.current = new THREE.Vector3(clampedX, 0.5, clampedZ);
        isMovingRef.current = true;

        setGameState(prev => ({
          ...prev,
          movesRemaining: prev.movesRemaining - 1,
        }));
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Game loop
    let lastTime = performance.now();
    const gameLoop = () => {
      requestAnimationFrame(gameLoop);
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (!gameState.isPlaying || gameState.gameOver) {
        renderer.render(scene, camera);
        return;
      }

      // Move character
      if (characterRef.current && targetPositionRef.current && isMovingRef.current) {
        const charPos = characterRef.current.position;
        const target = targetPositionRef.current;
        const direction = new THREE.Vector3().subVectors(target, charPos);
        const distance = direction.length();

        if (distance > 0.1) {
          // Rotate toward target
          const targetAngle = Math.atan2(direction.x, direction.z);
          const currentAngle = characterRef.current.rotation.y;
          let angleDiff = targetAngle - currentAngle;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          const turnSpeed = (gameConfig.character.turn_speed_deg_per_sec * Math.PI) / 180;
          const turnAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnSpeed * deltaTime);
          characterRef.current.rotation.y += turnAmount;

          // Move forward
          const moveSpeed = gameConfig.character.move_speed_units_per_sec;
          const moveAmount = Math.min(moveSpeed * deltaTime, distance);
          characterRef.current.translateZ(moveAmount);
        } else {
          isMovingRef.current = false;
          targetPositionRef.current = null;
        }

        // Check collisions
        if (characterRef.current) {
          const charPos = characterRef.current.position;

          // Check prizes
          prizesRef.current.forEach((prize, index) => {
            const distance = charPos.distanceTo(prize.position);
            if (distance < 1) {
              setGameState(prev => ({
                ...prev,
                score: prev.score + gameConfig.objects.prize_value,
              }));
              scene.remove(prize);
              prizesRef.current.splice(index, 1);

              if (gameConfig.objects.respawn_on_collect) {
                const region = gameConfig.objects.spawn_regions[0];
                const x = THREE.MathUtils.randFloat(region.x_min, region.x_max);
                const z = THREE.MathUtils.randFloat(region.z_min, region.z_max);
                prize.position.set(x, 0.5, z);
                scene.add(prize);
                prizesRef.current.push(prize);
              }
            }
          });

          // Check hazards
          hazardsRef.current.forEach((hazard, index) => {
            const distance = charPos.distanceTo(hazard.position);
            if (distance < 1) {
              setGameState(prev => ({
                ...prev,
                score: prev.score + gameConfig.objects.hazard_penalty,
              }));

              // Explosion effect
              hazard.scale.set(0, 0, 0);
              setTimeout(() => {
                scene.remove(hazard);
                hazardsRef.current.splice(index, 1);

                if (gameConfig.objects.respawn_on_explode) {
                  const region = gameConfig.objects.spawn_regions[0];
                  const x = THREE.MathUtils.randFloat(region.x_min, region.x_max);
                  const z = THREE.MathUtils.randFloat(region.z_min, region.z_max);
                  hazard.scale.set(1, 1, 1);
                  hazard.position.set(x, 0.5, z);
                  scene.add(hazard);
                  hazardsRef.current.push(hazard);
                }
              }, 200);
            }
          });
        }
      }

      // Update game state
      if (gameConfig.session.mode === 'timed') {
        setGameState(prev => {
          const newTime = Math.max(0, prev.timeRemaining - deltaTime);
          if (newTime === 0 && !prev.gameOver) {
            return {
              ...prev,
              timeRemaining: 0,
              gameOver: true,
              isPlaying: false,
              message: gameConfig.copy.time_up_message,
            };
          }
          return { ...prev, timeRemaining: newTime };
        });
      } else {
        setGameState(prev => {
          if (prev.movesRemaining <= 0 && !prev.gameOver) {
            return {
              ...prev,
              gameOver: true,
              isPlaying: false,
              message: gameConfig.copy.time_up_message,
            };
          }
          return prev;
        });
      }

      // Check win/lose conditions
      setGameState(prev => {
        if (prev.gameOver) return prev;
        if (prev.score >= gameConfig.session.target_score) {
          return {
            ...prev,
            gameOver: true,
            isPlaying: false,
            message: gameConfig.copy.win_message,
          };
        }
        if (prev.score <= gameConfig.session.min_score) {
          return {
            ...prev,
            gameOver: true,
            isPlaying: false,
            message: gameConfig.copy.lose_message,
          };
        }
        return prev;
      });

      renderer.render(scene, camera);
    };

    gameLoop();

    // Start game
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      message: gameConfig.copy.start_message,
    }));

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameConfig, model3D]);

  return (
    <div className="game-panel">
      <div className="game-header">
        <h2 className="game-title">{gameConfig.game_title}</h2>
        <p className="game-instructions">{gameConfig.short_instructions}</p>
      </div>
      <div className="game-ui">
        <div className="score-display">
          <span className="score-label">{gameConfig.copy.score_label}:</span>
          <span className="score-value">{gameState.score}</span>
        </div>
        {gameConfig.session.mode === 'timed' && (
          <div className="timer">
            Time: {Math.ceil(gameState.timeRemaining)}s
          </div>
        )}
        {gameConfig.session.mode === 'moves' && (
          <div className="moves">
            Moves: {gameState.movesRemaining}
          </div>
        )}
      </div>
      {gameState.message && (
        <div className={`game-message ${gameState.gameOver ? 'game-over' : ''}`}>
          {gameState.message}
        </div>
      )}
      <div ref={containerRef} className="game-canvas" />
      <style jsx>{`
        .game-panel {
          padding: 32px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .game-header {
          margin-bottom: 16px;
          text-align: center;
        }
        .game-title {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 8px 0;
          color: #000;
        }
        .game-instructions {
          font-size: 14px;
          color: #666;
          margin: 0;
        }
        .game-ui {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        .score-display {
          display: flex;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
        }
        .score-label {
          color: #666;
        }
        .score-value {
          color: #000;
        }
        .timer, .moves {
          font-size: 16px;
          color: #666;
        }
        .game-message {
          text-align: center;
          padding: 12px;
          margin-bottom: 16px;
          background: #e3f2fd;
          border-radius: 8px;
          font-weight: 500;
        }
        .game-message.game-over {
          background: #fff3e0;
          font-size: 18px;
        }
        .game-canvas {
          width: 100%;
          height: 500px;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .game-canvas {
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
}

