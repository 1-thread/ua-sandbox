'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GenerateIPResponse, ComicPanelImage } from '@/lib/types';
import EntertainmentPanel from './EntertainmentPanel';
import GamePanel from './GamePanel';
import ToyPanel from './ToyPanel';

interface IpEcosystemViewProps {
  result: GenerateIPResponse;
  onReset: () => void;
  onResultUpdate?: (result: GenerateIPResponse) => void;
}

// Placeholder 3D Viewer with a floating box
function Placeholder3DViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const boxRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') {
      console.log('Placeholder3DViewer: Missing container or window');
      return;
    }

    let animationId: number;
    let initTimeout: NodeJS.Timeout;
    let handleResize: () => void;

    console.log('Placeholder3DViewer: Initializing...');

    // Small delay to ensure container is properly sized
    initTimeout = setTimeout(() => {
      if (!containerRef.current) {
        console.log('Placeholder3DViewer: Container missing after timeout');
        return;
      }

      // Wait for container to have dimensions
      const checkSize = (attempt: number = 0) => {
        if (!containerRef.current) {
          console.log('Placeholder3DViewer: Container missing during check');
          return;
        }
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        console.log(`Placeholder3DViewer: Checking size (attempt ${attempt}):`, { width, height });
        
        if ((width === 0 || height === 0) && attempt < 10) {
          // Container not sized yet, check again (max 10 attempts = 500ms)
          setTimeout(() => checkSize(attempt + 1), 50);
          return;
        }
        
        // Use default size if still no dimensions
        const finalWidth = width || 400;
        const finalHeight = height || 400;
        console.log('Placeholder3DViewer: Initializing scene with size:', { finalWidth, finalHeight });
        initScene(finalWidth, finalHeight);
      };
      
      const initScene = (width: number, height: number) => {
        if (!containerRef.current) {
          console.log('Placeholder3DViewer: Container missing during scene init');
          return;
        }
        
        try {

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
          50,
          width / height,
          0.1,
          1000
        );
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        if (containerRef.current) {
          containerRef.current.innerHTML = ''; // Clear any existing content
          containerRef.current.appendChild(renderer.domElement);
        }
        rendererRef.current = renderer;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 5, -5);
        scene.add(fillLight);

        // Create a floating 3D box
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x666666,
          metalness: 0.3,
          roughness: 0.4
        });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(0, 0, 0);
        box.castShadow = true;
        scene.add(box);
        boxRef.current = box;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 3;
        controls.maxDistance = 10;
        controlsRef.current = controls;

        // Animation loop
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          
          // Rotate the box (very slow)
          if (boxRef.current) {
            boxRef.current.rotation.x += 0.002;
            boxRef.current.rotation.y += 0.002;
            // Float up and down (slower)
            boxRef.current.position.y = Math.sin(Date.now() * 0.0005) * 0.3;
          }
          
          if (controlsRef.current && cameraRef.current) {
            controlsRef.current.update();
          }
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        };
        animate();

        // Handle resize
        handleResize = () => {
          if (!containerRef.current || !cameraRef.current) return;
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          if (rendererRef.current) {
            rendererRef.current.setSize(width, height);
          }
        };
        window.addEventListener('resize', handleResize);
        console.log('Placeholder3DViewer: Scene initialized successfully');
        } catch (error) {
          console.error('Placeholder3DViewer: Error initializing scene:', error);
        }
      };
      
      checkSize();
    }, 100); // 100ms delay

    // Cleanup for the useEffect
    return () => {
      clearTimeout(initTimeout);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (containerRef.current && rendererRef.current?.domElement) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          // Element may have already been removed
        }
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (boxRef.current) {
        boxRef.current.geometry.dispose();
        (boxRef.current.material as THREE.Material).dispose();
      }
      cameraRef.current = null;
    };
  }, []);

  console.log('Placeholder3DViewer: Rendering placeholder component');
  
  return (
    <div className="glb-viewer-placeholder">
      <div ref={containerRef} className="glb-viewer-placeholder-canvas" />
      <p className="glb-viewer-placeholder-text">3D model will appear here after generation</p>
    </div>
  );
}

// Simple GLB Viewer component for displaying next to character reference
function GLBViewer({ model3D }: { model3D: { url: string; format: string } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined' || !model3D?.url) {
      // Clear any existing content if model is not available
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    let animationId: number;
    let handleResize: () => void;
    let cleanupFn: (() => void) | null = null;

    // Wait for container to have proper dimensions
    const initScene = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth || 400;
      const height = containerRef.current.clientHeight || 400;
      
      if (width === 0 || height === 0) {
        // Retry after a short delay
        setTimeout(initScene, 50);
        return;
      }

      console.log('GLBViewer: Initializing scene with dimensions:', { width, height });

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(
        50,
        width / height,
        0.1,
        1000
      );
      // Start with a better default position to see models
      camera.position.set(0, 2, 5);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.setPixelRatio(window.devicePixelRatio);
      
      // Clear container and append renderer
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);
        
        // Ensure canvas is visible
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
      }
      rendererRef.current = renderer;
      
      // Force an initial render to show the scene background and helpers
      renderer.render(scene, camera);
      
      console.log('GLBViewer: Renderer created and appended. Canvas dimensions:', {
        canvasWidth: renderer.domElement.width,
        canvasHeight: renderer.domElement.height,
        containerWidth: width,
        containerHeight: height,
        canvasStyle: {
          display: renderer.domElement.style.display,
          width: renderer.domElement.style.width,
          height: renderer.domElement.style.height
        },
        isInDOM: containerRef.current?.contains(renderer.domElement)
      });

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-5, 5, -5);
      scene.add(fillLight);

      // Add a helper grid to visualize the scene (optional, can remove later)
      const gridHelper = new THREE.GridHelper(10, 10, 0xcccccc, 0xcccccc);
      scene.add(gridHelper);

      // Add axes helper to visualize orientation (optional, can remove later)
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 3;
      controls.maxDistance = 20;
      controlsRef.current = controls;

      // Load model
      // If URL is from Meshy CDN, proxy through our API to avoid CORS issues
      const modelUrl = model3D.url.startsWith('https://assets.meshy.ai/')
        ? `/api/proxy-model?url=${encodeURIComponent(model3D.url)}`
        : model3D.url;
      
      console.log('Loading 3D model from:', modelUrl, 'Format:', model3D.format);
      
      const loader = model3D.format === 'glb' ? new GLTFLoader() : new OBJLoader();
      
      loader.load(
      modelUrl,
      (object) => {
        console.log('3D model loaded successfully:', object);
        let model: THREE.Object3D;
        
        if (model3D.format === 'glb') {
          model = (object as any).scene;
          console.log('GLB model scene:', model);
        } else {
          model = object as THREE.Object3D;
        }

        if (!model) {
          console.error('Model object is null or undefined');
          return;
        }

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        console.log('Model bounds:', { center, size, maxDim });
        
        if (maxDim === 0) {
          console.warn('Model has zero size, using default scale');
          // Set a default position if model has no size
          model.position.set(0, 0, 0);
        } else {
          // Scale to fit in a 3-unit cube
          const scale = 3 / maxDim;
          console.log('Applying scale:', scale, 'to model with maxDim:', maxDim);
          model.scale.multiplyScalar(scale);
          
          // Center the model at origin
          model.position.x = -center.x * scale;
          model.position.y = -center.y * scale;
          model.position.z = -center.z * scale;
        }
        
        // Ensure model and all children are visible
        model.visible = true;
        model.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
            child.visible = true;
            if (child instanceof THREE.Mesh && child.material) {
              // Ensure material is not transparent
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.transparent = false;
                    mat.opacity = 1.0;
                  }
                });
              } else if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.transparent = false;
                child.material.opacity = 1.0;
              }
            }
          }
        });
        
        scene.add(model);
        
        console.log('Model added to scene:', {
          position: { x: model.position.x, y: model.position.y, z: model.position.z },
          scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
          visible: model.visible,
          children: model.children.length,
          sceneChildren: scene.children.length,
          gridVisible: scene.children.some(child => child instanceof THREE.GridHelper),
          axesVisible: scene.children.some(child => child instanceof THREE.AxesHelper)
        });
        
        // Update camera and controls to frame the model
        if (cameraRef.current && controlsRef.current && rendererRef.current) {
          const newBox = new THREE.Box3().setFromObject(model);
          const newCenter = newBox.getCenter(new THREE.Vector3());
          const newSize = newBox.getSize(new THREE.Vector3());
          const maxSize = Math.max(newSize.x, newSize.y, newSize.z);
          
          // Position camera to view the model nicely
          // Calculate a good viewing distance based on model size
          const distance = Math.max(maxSize * 2.5, 5); // At least 5 units away
          
          // Position camera at an angle to see the model
          cameraRef.current.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
          cameraRef.current.lookAt(newCenter);
          
          // Update controls to focus on the model
          controlsRef.current.target.copy(newCenter);
          controlsRef.current.update();
          
          // Force an immediate render to show the model
          if (sceneRef.current && rendererRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          
          console.log('Camera positioned:', {
            cameraPos: { 
              x: cameraRef.current.position.x.toFixed(2), 
              y: cameraRef.current.position.y.toFixed(2), 
              z: cameraRef.current.position.z.toFixed(2) 
            },
            target: { 
              x: controlsRef.current.target.x.toFixed(2), 
              y: controlsRef.current.target.y.toFixed(2), 
              z: controlsRef.current.target.z.toFixed(2) 
            },
            modelSize: maxSize.toFixed(2),
            distance: distance.toFixed(2),
            sceneObjects: scene.children.length,
            rendererSize: { 
              width: rendererRef.current.domElement.width, 
              height: rendererRef.current.domElement.height 
            }
          });
        }
      },
      (progress) => {
        if (progress.lengthComputable) {
          const percentComplete = (progress.loaded / progress.total) * 100;
          console.log('Loading progress:', percentComplete.toFixed(2) + '%');
        }
      },
      (error) => {
        console.error('Error loading 3D model:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Error details:', {
          message: errorMessage,
          stack: errorStack,
          url: modelUrl,
          format: model3D.format
        });
      }
      );

      // Animation loop
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        if (controlsRef.current && cameraRef.current) {
          controlsRef.current.update();
        }
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };
      animate();

      // Handle resize
      handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        if (containerWidth > 0 && containerHeight > 0) {
          cameraRef.current.aspect = containerWidth / containerHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(containerWidth, containerHeight);
        }
      };
      window.addEventListener('resize', handleResize);

      // Initial render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Store cleanup function
      cleanupFn = () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        if (handleResize) {
          window.removeEventListener('resize', handleResize);
        }
        if (containerRef.current && rendererRef.current?.domElement) {
          try {
            containerRef.current.removeChild(rendererRef.current.domElement);
          } catch (e) {
            // Element may have already been removed
          }
        }
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
        sceneRef.current = null;
        rendererRef.current = null;
        controlsRef.current = null;
        cameraRef.current = null;
      };
    };

    // Start initialization
    initScene();
    
    // Return cleanup function from useEffect
    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [model3D?.url, model3D?.format]);

  return <div ref={containerRef} className="glb-viewer" />;
}

export default function IpEcosystemView({ result, onReset, onResultUpdate }: IpEcosystemViewProps) {
  const [comicPanels, setComicPanels] = useState<ComicPanelImage[]>(result.comicPanels);
  const [characterRefImage, setCharacterRefImage] = useState(result.characterRefImage);
  const [characterRefPrompt, setCharacterRefPrompt] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [skipToStep, setSkipToStep] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const generatingRef = useRef(false);

  // Load prompt from localStorage on mount if character ref image exists
  useEffect(() => {
    if (characterRefImage?.url && characterRefImage.url !== 'placeholder') {
      try {
        const savedPrompt = localStorage.getItem('ua-360-character-ref-prompt');
        if (savedPrompt) {
          setCharacterRefPrompt(savedPrompt);
        }
      } catch (error) {
        console.error('Failed to load prompt from localStorage:', error);
      }
    }
  }, []);

  // Sync local state when result prop changes (e.g., after story config regeneration)
  useEffect(() => {
    setComicPanels(result.comicPanels);
    setCharacterRefImage(result.characterRefImage);
    // Reset hasStarted when story config changes to trigger regeneration
    if (result.storyConfig) {
      setHasStarted(false);
    }
  }, [result.storyConfig?.title]); // Use title as a stable identifier for story config changes

  // Don't auto-start generation - wait for manual button clicks
  useEffect(() => {
    setHasStarted(true);
    setIsLoading(false);
  }, []);

  // Manual generation handlers - no automatic generation

  // Generate first comic panel manually
  const handleGenerateFirstPanel = async () => {
    if (!result.storyConfig?.panels || result.storyConfig.panels.length === 0) return;
    if (comicPanels[0]?.url && comicPanels[0].url !== 'placeholder') return; // Already generated
    
    setIsLoading(true);
    setLoadingStatus('Generating first comic panel...');
    generatingRef.current = true;

    try {
      const firstPanel = result.storyConfig.panels[0];
      const response = await fetch('/api/generate-comic-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt: firstPanel.image_prompt }),
      });

      if (response.ok) {
        const data = await response.json();
        const newPanels = [
          { url: data.url },
          comicPanels[1] || { url: 'placeholder' },
          comicPanels[2] || { url: 'placeholder' },
        ];
        setComicPanels(newPanels);
        // Update parent
        if (onResultUpdate) {
          onResultUpdate({ ...result, comicPanels: newPanels });
        }
        setLoadingStatus('');
        setIsLoading(false);
        generatingRef.current = false;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to generate first comic panel:', errorData);
        setLoadingStatus(`Error: ${errorData.error || 'Failed to generate first comic panel'}`);
        setIsLoading(false);
        generatingRef.current = false;
      }
    } catch (error: any) {
      console.error('Error generating first comic panel:', error);
      setLoadingStatus(`Error: ${error.message || 'Failed to generate first comic panel'}`);
      setIsLoading(false);
      generatingRef.current = false;
    }
  };

  const handleGenerateSecondPanel = async () => {
    if (!result.storyConfig?.panels || result.storyConfig.panels.length < 2) return;
    if (comicPanels[1]?.url && comicPanels[1].url !== 'placeholder') return; // Already generated
    
    setIsLoading(true);
    setLoadingStatus('Generating second comic panel...');
    generatingRef.current = true;

    try {
      const secondPanel = result.storyConfig.panels[1];
      const response = await fetch('/api/generate-comic-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt: secondPanel.image_prompt }),
      });

      if (response.ok) {
        const data = await response.json();
        const newPanels = [
          comicPanels[0] || { url: 'placeholder' },
          { url: data.url },
          comicPanels[2] || { url: 'placeholder' },
        ];
        setComicPanels(newPanels);
        // Update parent
        if (onResultUpdate) {
          onResultUpdate({ ...result, comicPanels: newPanels });
        }
        setLoadingStatus('');
        setIsLoading(false);
        generatingRef.current = false;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to generate second comic panel:', errorData);
        setLoadingStatus(`Error: ${errorData.error || 'Failed to generate second comic panel'}`);
        setIsLoading(false);
        generatingRef.current = false;
      }
    } catch (error: any) {
      console.error('Error generating second comic panel:', error);
      setLoadingStatus(`Error: ${error.message || 'Failed to generate second comic panel'}`);
      setIsLoading(false);
      generatingRef.current = false;
    }
  };

  const handleGenerateThirdPanel = async () => {
    if (!result.storyConfig?.panels || result.storyConfig.panels.length < 3) return;
    if (comicPanels[2]?.url && comicPanels[2].url !== 'placeholder') return; // Already generated
    
    setIsLoading(true);
    setLoadingStatus('Generating third comic panel...');
    generatingRef.current = true;

    try {
      const thirdPanel = result.storyConfig.panels[2];
      const response = await fetch('/api/generate-comic-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt: thirdPanel.image_prompt }),
      });

      if (response.ok) {
        const data = await response.json();
        const newPanels = [
          comicPanels[0] || { url: 'placeholder' },
          comicPanels[1] || { url: 'placeholder' },
          { url: data.url },
        ];
        setComicPanels(newPanels);
        // Update parent
        if (onResultUpdate) {
          onResultUpdate({ ...result, comicPanels: newPanels });
        }
        setLoadingStatus('');
        setIsLoading(false);
        generatingRef.current = false;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to generate third comic panel:', errorData);
        setLoadingStatus(`Error: ${errorData.error || 'Failed to generate third comic panel'}`);
        setIsLoading(false);
        generatingRef.current = false;
      }
    } catch (error: any) {
      console.error('Error generating third comic panel:', error);
      setLoadingStatus(`Error: ${error.message || 'Failed to generate third comic panel'}`);
      setIsLoading(false);
      generatingRef.current = false;
    }
  };

  // Generate 3D model from character reference image
  const handleGenerate3DModel = async () => {
    if (!characterRefImage?.url || characterRefImage.url === 'placeholder') {
      setLoadingStatus('Error: Character reference image must be generated first');
      return;
    }
    
    setIsLoading(true);
    setLoadingStatus('3D');
    generatingRef.current = true;

    try {
      // Step 1: Create the task
      const createResponse = await fetch('/api/generate-3d-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          characterRefImageUrl: characterRefImage.url
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to create 3D model task:', errorData);
        setLoadingStatus(`Error: ${errorData.error || 'Failed to create 3D model task'}`);
        setIsLoading(false);
        generatingRef.current = false;
        return;
      }

      const { taskId, baseUrl } = await createResponse.json();
      console.log('3D model task created:', taskId);

      // Step 2: Poll for progress
      const pollInterval = 3000; // Poll every 3 seconds
      const maxPollTime = 300000; // 5 minutes max
      const startTime = Date.now();
      let lastProgress = 0;
      let pollTimeout: NodeJS.Timeout | null = null;

      const pollStatus = async (): Promise<void> => {
        if (Date.now() - startTime > maxPollTime) {
          throw new Error('Timeout waiting for 3D model generation');
        }

        // Check if we should stop polling (component unmounted or user cancelled)
        if (!generatingRef.current) {
          return;
        }

        try {
          const statusResponse = await fetch(
            `/api/check-3d-model-status?taskId=${encodeURIComponent(taskId)}&baseUrl=${encodeURIComponent(baseUrl)}`
          );

          if (!statusResponse.ok) {
            const errorData = await statusResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to check 3D model status');
          }

          const statusData = await statusResponse.json();
          console.log('3D model status:', statusData);

          if (statusData.status === 'SUCCEEDED') {
            // Generation complete
            if (!statusData.url) {
              throw new Error('Model URL not found in successful response');
            }
            const newModel3D = { url: statusData.url, format: statusData.format || 'glb' };
            console.log('3D model generation complete:', newModel3D);
            
            // Update parent with new model
            if (onResultUpdate) {
              const updatedResult = { ...result, model3D: newModel3D };
              console.log('Updating parent result with new 3D model:', updatedResult);
              onResultUpdate(updatedResult);
            }
            setLoadingStatus('');
            setIsLoading(false);
            generatingRef.current = false;
          } else if (statusData.status === 'FAILED' || statusData.status === 'CANCELED') {
            throw new Error(`3D model generation ${statusData.status.toLowerCase()}`);
          } else {
            // Still in progress, update progress and continue polling
            const progress = statusData.progress || lastProgress;
            lastProgress = progress;
            setLoadingStatus(`3D: ${progress}%`);
            
            // Continue polling
            pollTimeout = setTimeout(pollStatus, pollInterval);
          }
        } catch (error: any) {
          console.error('Error polling 3D model status:', error);
          setLoadingStatus(`Error: ${error.message || 'Failed to check 3D model status'}`);
          setIsLoading(false);
          generatingRef.current = false;
          if (pollTimeout) {
            clearTimeout(pollTimeout);
          }
        }
      };

      // Start polling
      pollStatus();
    } catch (error: any) {
      console.error('Error generating 3D model:', error);
      setLoadingStatus(`Error: ${error.message || 'Failed to generate 3D model'}`);
      setIsLoading(false);
      generatingRef.current = false;
    }
  };

  // Generate character reference image manually
  const handleGenerateCharacterImage = async () => {
    const firstPanelUrl = comicPanels[0]?.url;
    if (!firstPanelUrl || firstPanelUrl === 'placeholder') {
      setLoadingStatus('Error: First panel image must be generated first');
      return;
    }
    if (characterRefImage?.url && characterRefImage.url !== 'placeholder') return; // Already generated
    
    setIsLoading(true);
    setLoadingStatus('Generating character reference image...');
    generatingRef.current = true;

    try {
      const response = await fetch('/api/generate-character-ref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstPanelImageUrl: firstPanelUrl,
          storyConfig: result.storyConfig
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newCharRef = { url: data.url };
        setCharacterRefImage(newCharRef);
        if (data.prompt) {
          setCharacterRefPrompt(data.prompt);
          // Save prompt to localStorage
          try {
            localStorage.setItem('ua-360-character-ref-prompt', data.prompt);
          } catch (error) {
            console.error('Failed to save prompt to localStorage:', error);
          }
        }
        // Update parent
        if (onResultUpdate) {
          onResultUpdate({ ...result, characterRefImage: newCharRef });
        }
        setLoadingStatus('');
        setIsLoading(false);
        generatingRef.current = false;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to generate character reference image:', errorData);
        setLoadingStatus(`Error: ${errorData.error || 'Failed to generate character reference image'}`);
        setIsLoading(false);
        generatingRef.current = false;
      }
    } catch (error: any) {
      console.error('Error generating character reference image:', error);
      setLoadingStatus(`Error: ${error.message || 'Failed to generate character reference image'}`);
      setIsLoading(false);
      generatingRef.current = false;
    }
  };

  // Handler for "redo from here" buttons
  const handleRedoFrom = async (step: string) => {
    setIsLoading(true);
    
    // Show immediate status message based on the step
    if (step === 'storyConfig') {
      setLoadingStatus('Regenerating story config...');
    } else if (step === 'firstPanel') {
      setLoadingStatus('Regenerating first comic panel image...');
    } else if (step === 'secondPanel') {
      setLoadingStatus('Regenerating second comic panel image...');
    } else if (step === 'thirdPanel') {
      setLoadingStatus('Regenerating third comic panel image...');
    } else if (step === 'characterRef') {
      setLoadingStatus('Regenerating character reference image...');
    }

    if (step === 'storyConfig') {
      // Regenerate story config - need original idea
      const idea = result.originalIdea || result.storyConfig.logline || '';
      if (!idea) {
        console.error('No idea available for story config regeneration');
        setLoadingStatus('Error: No idea available for regeneration');
        setIsLoading(false);
        return;
      }

      // Status message already set above
      try {
        const response = await fetch('/api/generate-story-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea }),
        });

        if (response.ok) {
          const data = await response.json();
          const newStoryConfig = data.storyConfig;
          
          // Reset all dependent assets since story config changed
          setComicPanels([
            { url: 'placeholder' },
            { url: 'placeholder' },
            { url: 'placeholder' },
          ]);
          setCharacterRefImage({ url: 'placeholder' });

          // Update result with new story config
          const updatedResult = {
            ...result,
            storyConfig: newStoryConfig,
            comicPanels: [
              { url: 'placeholder' },
              { url: 'placeholder' },
              { url: 'placeholder' },
            ],
            characterRefImage: { url: 'placeholder' },
          };
          
          if (onResultUpdate) {
            onResultUpdate(updatedResult);
          }

          // Show success message briefly, then proceed to first panel generation
          setLoadingStatus('Story config regenerated successfully! Generating first comic panel...');
          
          // Small delay to show success message before proceeding
          setTimeout(() => {
            setSkipToStep('firstPanel');
            // Trigger regeneration by resetting hasStarted
            setHasStarted(false);
          }, 1500);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to regenerate story config:', errorData);
          setLoadingStatus(`Error: ${errorData.error || 'Failed to regenerate story config'}`);
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Error regenerating story config:', error);
        setLoadingStatus(`Error: ${error.message || 'Failed to regenerate story config'}`);
        setIsLoading(false);
      }
    } else if (step === 'firstPanel') {
      // Reset first panel and regenerate
      const newPanels = [
        { url: 'placeholder' },
        comicPanels[1] || { url: 'placeholder' },
        comicPanels[2] || { url: 'placeholder' },
      ];
      setComicPanels(newPanels);
      
      // Generate first panel
      generatingRef.current = true;
      try {
        const firstPanel = result.storyConfig.panels[0];
        const response = await fetch('/api/generate-comic-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePrompt: firstPanel.image_prompt }),
        });

        if (response.ok) {
          const data = await response.json();
          const updatedPanels = [
            { url: data.url },
            newPanels[1],
            newPanels[2],
          ];
          setComicPanels(updatedPanels);
          if (onResultUpdate) {
            onResultUpdate({ ...result, comicPanels: updatedPanels });
          }
          setLoadingStatus('');
          setIsLoading(false);
          generatingRef.current = false;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to regenerate first comic panel:', errorData);
          setLoadingStatus(`Error: ${errorData.error || 'Failed to regenerate first comic panel'}`);
          setIsLoading(false);
          generatingRef.current = false;
        }
      } catch (error: any) {
        console.error('Error regenerating first comic panel:', error);
        setLoadingStatus(`Error: ${error.message || 'Failed to regenerate first comic panel'}`);
        setIsLoading(false);
        generatingRef.current = false;
      }
    } else if (step === 'secondPanel') {
      // Reset second panel and regenerate
      const newPanels = [
        comicPanels[0] || { url: 'placeholder' },
        { url: 'placeholder' },
        comicPanels[2] || { url: 'placeholder' },
      ];
      setComicPanels(newPanels);
      
      // Generate second panel
      generatingRef.current = true;
      try {
        const secondPanel = result.storyConfig.panels[1];
        const response = await fetch('/api/generate-comic-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePrompt: secondPanel.image_prompt }),
        });

        if (response.ok) {
          const data = await response.json();
          const updatedPanels = [
            newPanels[0],
            { url: data.url },
            newPanels[2],
          ];
          setComicPanels(updatedPanels);
          if (onResultUpdate) {
            onResultUpdate({ ...result, comicPanels: updatedPanels });
          }
          setLoadingStatus('');
          setIsLoading(false);
          generatingRef.current = false;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to regenerate second comic panel:', errorData);
          setLoadingStatus(`Error: ${errorData.error || 'Failed to regenerate second comic panel'}`);
          setIsLoading(false);
          generatingRef.current = false;
        }
      } catch (error: any) {
        console.error('Error regenerating second comic panel:', error);
        setLoadingStatus(`Error: ${error.message || 'Failed to regenerate second comic panel'}`);
        setIsLoading(false);
        generatingRef.current = false;
      }
    } else if (step === 'thirdPanel') {
      // Reset third panel and regenerate
      const newPanels = [
        comicPanels[0] || { url: 'placeholder' },
        comicPanels[1] || { url: 'placeholder' },
        { url: 'placeholder' },
      ];
      setComicPanels(newPanels);
      
      // Generate third panel
      generatingRef.current = true;
      try {
        const thirdPanel = result.storyConfig.panels[2];
        const response = await fetch('/api/generate-comic-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePrompt: thirdPanel.image_prompt }),
        });

        if (response.ok) {
          const data = await response.json();
          const updatedPanels = [
            newPanels[0],
            newPanels[1],
            { url: data.url },
          ];
          setComicPanels(updatedPanels);
          if (onResultUpdate) {
            onResultUpdate({ ...result, comicPanels: updatedPanels });
          }
          setLoadingStatus('');
          setIsLoading(false);
          generatingRef.current = false;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to regenerate third comic panel:', errorData);
          setLoadingStatus(`Error: ${errorData.error || 'Failed to regenerate third comic panel'}`);
          setIsLoading(false);
          generatingRef.current = false;
        }
      } catch (error: any) {
        console.error('Error regenerating third comic panel:', error);
        setLoadingStatus(`Error: ${error.message || 'Failed to regenerate third comic panel'}`);
        setIsLoading(false);
        generatingRef.current = false;
      }
    } else if (step === 'characterRef') {
      // Keep existing image visible while regenerating - don't reset it
      // The button will show the spinner to indicate regeneration is in progress
      
      const firstPanelUrl = comicPanels[0]?.url;
      if (!firstPanelUrl || firstPanelUrl === 'placeholder') {
        setLoadingStatus('Error: First panel image must be generated first');
        setIsLoading(false);
        return;
      }

      // Generate character reference image
      try {
        const response = await fetch('/api/generate-character-ref', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            firstPanelImageUrl: firstPanelUrl,
            storyConfig: result.storyConfig
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newCharRef = { url: data.url };
          console.log('New character reference image URL received:', data.url);
          
          // Update the image with the new URL - React will re-render due to key prop
          setCharacterRefImage(newCharRef);
          if (data.prompt) {
            setCharacterRefPrompt(data.prompt);
            // Save prompt to localStorage
            try {
              localStorage.setItem('ua-360-character-ref-prompt', data.prompt);
            } catch (error) {
              console.error('Failed to save prompt to localStorage:', error);
            }
          }
          // Update parent
          if (onResultUpdate) {
            onResultUpdate({ ...result, characterRefImage: newCharRef });
          }
          setLoadingStatus('');
          setIsLoading(false);
          generatingRef.current = false;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to regenerate character reference image:', errorData);
          setLoadingStatus(`Error: ${errorData.error || 'Failed to regenerate character reference image'}`);
          setIsLoading(false);
          generatingRef.current = false;
        }
      } catch (error: any) {
        console.error('Error regenerating character reference image:', error);
        setLoadingStatus(`Error: ${error.message || 'Failed to regenerate character reference image'}`);
        setIsLoading(false);
        generatingRef.current = false;
      }
    }
  };

  // Create updated result with progressive images
  const updatedResult: GenerateIPResponse = {
    ...result,
    comicPanels,
    characterRefImage,
    model3D: result.model3D || { url: 'placeholder', format: 'glb' },
  };
  return (
    <div className="ecosystem-view">
      <div className="ecosystem-panels">
        <div className="panel-section">
          <h2 className="section-title">ENTERTAINMENT</h2>
          <EntertainmentPanel
            storyConfig={result.storyConfig}
            comicPanels={comicPanels}
            loadingStatus={loadingStatus}
            isLoading={isLoading}
            characterRefImage={characterRefImage}
            hasFirstPanel={!!(comicPanels[0]?.url && comicPanels[0].url !== 'placeholder')}
            hasCharacterRef={!!(characterRefImage?.url && characterRefImage.url !== 'placeholder')}
            onRedoFrom={handleRedoFrom}
            onGenerateFirstPanel={handleGenerateFirstPanel}
            onGenerateSecondPanel={handleGenerateSecondPanel}
            onGenerateThirdPanel={handleGenerateThirdPanel}
          />
        </div>

        {/* Product Section */}
        <div className="panel-section">
          <h2 className="section-title">PRODUCT</h2>
          {!characterRefImage?.url || characterRefImage.url === 'placeholder' ? (
            <div className="product-panel">
              {comicPanels[0]?.url && comicPanels[0].url !== 'placeholder' ? (
                <div className="generate-button-container">
                  <button 
                    onClick={handleGenerateCharacterImage}
                    className="generate-button"
                    disabled={isLoading}
                  >
                    {isLoading && loadingStatus?.includes('character') ? (
                      <>
                        <span className="spinner"></span>
                        <span>Generating...</span>
                      </>
                    ) : (
                      'Generate character image'
                    )}
                  </button>
                </div>
              ) : (
                <div className="product-placeholder">
                  Generate Comic Panel 1 first to enable character image generation
                </div>
              )}
            </div>
          ) : (
            <div className="product-panel">
              <h2 className="section-title">CHARACTER REFERENCE</h2>
              <div className="character-ref-container">
                <div className="character-ref-section">
                  <div className="section-title-with-button">
                    <h3 className="glb-viewer-title">Toy Image</h3>
                    <button 
                      onClick={() => handleRedoFrom('characterRef')}
                      className="redo-button-black"
                      disabled={isLoading}
                    >
                      {isLoading && loadingStatus?.includes('character') ? (
                        <>
                          <span className="spinner"></span>
                          <span>Regenerating...</span>
                        </>
                      ) : (
                        'Redo'
                      )}
                    </button>
                  </div>
                  <div className="character-ref-image-wrapper">
                    {characterRefImage?.url && characterRefImage.url !== 'placeholder' ? (
                      <img
                        key={characterRefImage.url}
                        src={characterRefImage.url}
                        alt="Character Reference"
                        className="character-ref-image"
                        onLoad={() => {
                          // Force image refresh by clearing any potential cache
                          console.log('Character reference image loaded:', characterRefImage.url);
                        }}
                      />
                    ) : (
                      <div className="character-ref-placeholder">
                        Character reference image will appear here
                      </div>
                    )}
                  </div>
                  {characterRefPrompt && characterRefImage?.url && characterRefImage.url !== 'placeholder' && (
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPromptModal(true);
                      }}
                      className="prompt-link"
                    >
                      View prompt
                    </a>
                  )}
                </div>
                <div className="glb-viewer-section">
                  <div className="section-title-with-button">
                    <h3 className="glb-viewer-title">3D Model</h3>
                    {characterRefImage?.url && characterRefImage.url !== 'placeholder' ? (
                      <button 
                        onClick={handleGenerate3DModel}
                        className="generate-button-black"
                        disabled={isLoading}
                      >
                        {isLoading && loadingStatus?.includes('3D') ? (
                          <>
                            <span className="spinner"></span>
                            <span>
                              {loadingStatus.startsWith('3D:') 
                                ? loadingStatus.replace('3D: ', '') 
                                : 'Generating...'}
                            </span>
                          </>
                        ) : (
                          'Generate'
                        )}
                      </button>
                    ) : null}
                  </div>
                  {(() => {
                    // Use updatedResult if it has a model, otherwise use result
                    const modelToUse = updatedResult.model3D?.url && updatedResult.model3D.url !== 'placeholder' 
                      ? updatedResult.model3D 
                      : (result.model3D?.url && result.model3D.url !== 'placeholder' ? result.model3D : null);
                    
                    console.log('GLB Viewer Debug - model3D:', {
                      updatedResult: updatedResult.model3D,
                      result: result.model3D,
                      modelToUse,
                      shouldShowPlaceholder: !modelToUse?.url || modelToUse.url === 'placeholder'
                    });
                    
                    // Show placeholder if no valid model URL exists
                    if (!modelToUse || !modelToUse.url || modelToUse.url === 'placeholder') {
                      console.log('Showing Placeholder3DViewer');
                      return <Placeholder3DViewer />;
                    }
                    
                    console.log('Showing GLBViewer with model:', modelToUse.url);
                    return <GLBViewer model3D={modelToUse} />;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* DEBUG MODE: Hide Game and Toy panels */}
        {(result.session_id === 'debug-mode-no-session' || !result.gameConfig?.game_id || result.gameConfig?.game_id === 'debug') && (
          <div className="debug-notice">
            <p><strong>DEBUG MODE:</strong> Pipeline stopped after story config generation.</p>
            <p>Game and Toy generation skipped for debugging.</p>
          </div>
        )}
        {result.session_id !== 'debug-mode-no-session' && updatedResult.gameConfig?.game_id && updatedResult.gameConfig?.game_id !== 'debug' && (
          <>
            <div className="panel-section">
              <h2 className="section-title">GAME</h2>
              <GamePanel
                gameConfig={updatedResult.gameConfig}
                model3D={updatedResult.model3D}
              />
            </div>
            <div className="panel-section">
              <h2 className="section-title">TOY</h2>
              <ToyPanel
                model3D={updatedResult.model3D}
                characterName={result.storyConfig.main_character.name}
              />
            </div>
          </>
        )}
      </div>
      
      {/* Make New IP Button at bottom */}
      <div className="reset-container">
        <button onClick={onReset} className="make-new-button">
          Make new IP
        </button>
      </div>

      {/* Prompt Modal */}
      {showPromptModal && characterRefPrompt && (
        <div className="modal-overlay" onClick={() => setShowPromptModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Character Reference Prompt</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPromptModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <pre className="prompt-text">{characterRefPrompt}</pre>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .ecosystem-view {
          background: #f5f5f5;
          padding: 40px 32px;
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
        .character-ref-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e0e0e0;
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
        .debug-notice {
          padding: 24px;
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 8px;
          margin: 24px 0;
          text-align: center;
          color: #856404;
        }
        .debug-notice p {
          margin: 8px 0;
        }
        .debug-notice strong {
          color: #664d03;
        }
        .generate-button-container {
          margin: 24px 0;
          text-align: center;
        }
        .generate-button {
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
        }
        .generate-button:hover:not(:disabled) {
          background: #333;
        }
        .generate-button:disabled {
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
        .product-panel {
          padding: 32px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .product-placeholder {
          padding: 40px;
          text-align: center;
          color: #999;
          font-style: italic;
        }
        .character-ref-container {
          display: flex;
          gap: 24px;
          margin-top: 24px;
          align-items: flex-start;
        }
        .character-ref-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .character-ref-image-wrapper {
          width: 100%;
          height: 400px;
          min-height: 400px;
          border-radius: 8px;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
        }
        .character-ref-image {
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          border-radius: 8px;
          object-fit: contain;
        }
        .character-ref-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 14px;
          background: #f5f5f5;
          border: 2px dashed #ddd;
          border-radius: 8px;
          min-height: 400px;
        }
        .prompt-link {
          display: inline-block;
          margin-top: 12px;
          font-size: 14px;
          color: #666;
          text-decoration: underline;
          cursor: pointer;
          text-align: center;
        }
        .prompt-link:hover {
          color: #000;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 800px;
          width: 100%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }
        .modal-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          color: #000;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 32px;
          line-height: 1;
          color: #666;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .modal-close:hover {
          background: #f0f0f0;
          color: #000;
        }
        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .prompt-text {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #333;
          background: #f5f5f5;
          padding: 16px;
          border-radius: 8px;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          border: 1px solid #e0e0e0;
        }
        .glb-viewer-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .section-title-with-button {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .glb-viewer-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin: 0;
          text-align: left;
        }
        .generate-button-black {
          padding: 8px 16px;
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
          min-width: 100px;
        }
        .generate-button-black:hover:not(:disabled) {
          background: #333;
        }
        .generate-button-black:disabled {
          background: #999;
          cursor: not-allowed;
        }
        .glb-viewer {
          width: 100%;
          height: 400px;
          min-height: 400px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e0e0e0;
          background: #f5f5f5;
        }
        .glb-viewer-placeholder {
          width: 100%;
          height: 400px;
          min-height: 400px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          color: #666;
          font-size: 14px;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }
        .glb-viewer-placeholder-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        .glb-viewer-placeholder-canvas canvas {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }
        .glb-viewer-placeholder-text {
          margin: 12px 0;
          text-align: center;
          padding: 4px 12px;
          font-weight: 500;
          position: relative;
          z-index: 1;
          background: rgba(245, 245, 245, 0.9);
          border-radius: 4px;
          pointer-events: none;
        }
        @media (max-width: 968px) {
          .character-ref-container {
            flex-direction: column;
          }
          .glb-viewer {
            height: 350px;
          }
        }
        .reset-container {
          display: flex;
          justify-content: center;
          padding: 40px 0;
          margin-top: 40px;
          border-top: 1px solid #e0e0e0;
        }
        .make-new-button {
          padding: 16px 48px;
          font-size: 18px;
          font-weight: 600;
          background: #000;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .make-new-button:hover {
          background: #333;
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

