import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';

const MoleculeStudio = () => {
  const [moleculeName, setMoleculeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [moleculeData, setMoleculeData] = useState(null);
  const [error, setError] = useState('');
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const moleculeGroupRef = useRef(null);
  const animationRef = useRef(null);

  // Element colors based on CPK coloring convention
  const elementColors = {
    'H': 0xFFFFFF,  // White
    'C': 0x404040,  // Dark gray
    'N': 0x3050F8,  // Blue
    'O': 0xFF0D0D,  // Red
    'F': 0x90E050,  // Green
    'Cl': 0x1FF01F, // Green
    'Br': 0xA62929, // Dark red
    'I': 0x940094,  // Purple
    'P': 0xFF8000,  // Orange
    'S': 0xFFFF30,  // Yellow
    'B': 0xFFB5B5,  // Pink
    'Li': 0xCC80FF, // Violet
    'Na': 0xAB5CF2, // Violet
    'K': 0x8F40D4,  // Violet
    'Mg': 0x8AFF00, // Green
    'Ca': 0x3DFF00, // Green
    'Fe': 0xE06633, // Orange
    'Zn': 0x7D80B0, // Blue-gray
  };

  // Element radii in Angstroms (scaled for visualization)
  const elementRadii = {
    'H': 0.31,
    'C': 0.76,
    'N': 0.71,
    'O': 0.66,
    'F': 0.57,
    'Cl': 0.99,
    'Br': 1.14,
    'I': 1.33,
    'P': 1.07,
    'S': 1.05,
    'B': 0.84,
    'Li': 1.28,
    'Na': 1.66,
    'K': 2.03,
    'Mg': 1.41,
    'Ca': 1.76,
    'Fe': 1.32,
    'Zn': 1.22,
  };

  const fetchMoleculeData = async (name) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Provide the 3D molecular structure data for ${name}. Return ONLY a valid JSON object with this exact format:

{
  "formula": "chemical formula (e.g., H2O)",
  "atoms": [
    {
      "element": "element symbol (e.g., H, C, N, O)",
      "x": number,
      "y": number,
      "z": number
    }
  ],
  "bonds": [
    {
      "atom1": index_of_first_atom,
      "atom2": index_of_second_atom,
      "order": bond_order (1=single, 2=double, 3=triple)
    }
  ]
}

Use realistic 3D coordinates in Angstroms. DO NOT include any text outside the JSON. If the molecule doesn't exist or you're unsure, return an error object: {"error": "Molecule not found or invalid"}`
            }
          ]
        })
      });

      const data = await response.json();
      let responseText = data.content[0].text.trim();
      
      // Clean up any markdown formatting
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const moleculeInfo = JSON.parse(responseText);
      
      if (moleculeInfo.error) {
        setError(moleculeInfo.error);
        setMoleculeData(null);
      } else {
        setMoleculeData(moleculeInfo);
        setError('');
      }
    } catch (error) {
      console.error('Error fetching molecule data:', error);
      setError('Failed to fetch molecule data. Please try again.');
      setMoleculeData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (moleculeName.trim()) {
      fetchMoleculeData(moleculeName.trim());
    }
  };

  const initializeScene = () => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Controls (mouse interaction)
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    const onMouseDown = (event) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onMouseMove = (event) => {
      if (!isMouseDown || !moleculeGroupRef.current) return;
      
      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;
      
      moleculeGroupRef.current.rotation.y += deltaX * 0.01;
      moleculeGroupRef.current.rotation.x += deltaY * 0.01;
      
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onWheel = (event) => {
      event.preventDefault();
      const scale = event.deltaY > 0 ? 0.9 : 1.1;
      camera.position.multiplyScalar(scale);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
    };
  };

  const createMoleculeVisualization = (data) => {
    if (!sceneRef.current) return;

    // Remove existing molecule
    if (moleculeGroupRef.current) {
      sceneRef.current.remove(moleculeGroupRef.current);
    }

    const moleculeGroup = new THREE.Group();
    moleculeGroupRef.current = moleculeGroup;

    // Create atoms
    data.atoms.forEach((atom, index) => {
      const element = atom.element;
      const radius = (elementRadii[element] || 0.5) * 0.3; // Scale down for visualization
      const color = elementColors[element] || 0x999999;

      const geometry = new THREE.SphereGeometry(radius, 32, 16);
      const material = new THREE.MeshLambertMaterial({ color });
      const sphere = new THREE.Mesh(geometry, material);
      
      sphere.position.set(atom.x, atom.y, atom.z);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      
      moleculeGroup.add(sphere);
    });

    // Create bonds
    data.bonds.forEach((bond) => {
      const atom1 = data.atoms[bond.atom1];
      const atom2 = data.atoms[bond.atom2];
      
      const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
      const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
      
      const direction = new THREE.Vector3().subVectors(end, start);
      const distance = direction.length();
      
      // Create cylinder for bond
      const bondRadius = 0.1;
      const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, distance, 8);
      const material = new THREE.MeshLambertMaterial({ color: 0x666666 });
      const cylinder = new THREE.Mesh(geometry, material);
      
      // Position and orient the cylinder
      cylinder.position.copy(start).add(direction.clone().multiplyScalar(0.5));
      cylinder.lookAt(end);
      cylinder.rotateX(Math.PI / 2);
      
      moleculeGroup.add(cylinder);

      // For double and triple bonds, add additional cylinders
      if (bond.order > 1) {
        const offset = 0.15;
        const perpendicular = new THREE.Vector3(0, 1, 0).cross(direction).normalize().multiplyScalar(offset);
        
        for (let i = 1; i < bond.order; i++) {
          const extraCylinder = cylinder.clone();
          extraCylinder.position.add(perpendicular.clone().multiplyScalar(i % 2 === 0 ? 1 : -1));
          moleculeGroup.add(extraCylinder);
        }
      }
    });

    // Center the molecule
    const box = new THREE.Box3().setFromObject(moleculeGroup);
    const center = box.getCenter(new THREE.Vector3());
    moleculeGroup.position.sub(center);

    sceneRef.current.add(moleculeGroup);

    // Adjust camera position based on molecule size
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;
    cameraRef.current.position.set(distance, distance, distance);
    cameraRef.current.lookAt(0, 0, 0);
  };

  useEffect(() => {
    const cleanup = initializeScene();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    if (moleculeData && sceneRef.current) {
      createMoleculeVisualization(moleculeData);
    }
  }, [moleculeData]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-light text-gray-800 mb-2">Molecule Studio</h1>
          <p className="text-gray-600">Minimalist molecular structure visualization</p>
        </header>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              value={moleculeName}
              onChange={(e) => setMoleculeName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
              placeholder="Enter molecule name (e.g., water, caffeine, aspirin)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || !moleculeName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Loading...' : 'Visualize'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {moleculeData && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Molecule Information</h3>
              <p className="text-blue-800">
                <span className="font-medium">Formula:</span> {moleculeData.formula}
              </p>
              <p className="text-blue-800">
                <span className="font-medium">Atoms:</span> {moleculeData.atoms.length}
              </p>
              <p className="text-blue-800">
                <span className="font-medium">Bonds:</span> {moleculeData.bonds.length}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div 
            ref={mountRef} 
            className="w-full h-96 bg-gray-50"
            style={{ minHeight: '400px' }}
          />
          
          {!moleculeData && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">⚛️</div>
                <p className="text-lg">Enter a molecule name to begin visualization</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600 text-center">
          <p>Drag to rotate • Scroll to zoom • Colors follow CPK convention</p>
        </div>
      </div>
    </div>
  );
};

export default MoleculeStudio;