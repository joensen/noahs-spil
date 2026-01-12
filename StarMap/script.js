// Game State Constants
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    VICTORY: 'victory'
};

// Configuration
const CONFIG = {
    STAR_SPHERE_RADIUS: 500,
    RAYCASTER_THRESHOLD: 5,
    CAMERA_ROTATION_SENSITIVITY: 0.005,
    LINE_FADE_DURATION: 1000, // ms
    MAX_ELEVATION: Math.PI / 2 - 0.01, // Prevent flipping
    MIN_ELEVATION: -Math.PI / 2 + 0.01,
    HOVER_STAR_SCALE: 2.5, // How much larger stars get on hover
    LINE_WIDTH: 5, // Much thicker lines
    LABEL_SCALE: 100 // Larger constellation labels
};

// Global Game State
let currentState = GameState.LOADING;
let selectedStar = null;
let hoveredStar = null;
let hardMode = false;
let showStarNames = false;

// Three.js Objects
let scene, camera, renderer;
let starField;
let hardModeStarField = null;
let highlightMesh = null;
let hoverGlowMesh = null;
let previewLine = null;
const constellationLabels = [];
const starNameLabels = [];

// Game Data
let starsData = [];
let constellationsData = {};
let constellationNames = {};
let starMeshMap = new Map(); // hr -> {position, index, hr, magnitude}

// Line Management
const drawnLines = [];
const correctLines = new Set(); // "hr1-hr2" format (sorted)

// Constellation Progress
const constellationProgress = new Map(); // name -> {required: Set, completed: Set}
const foundConstellations = [];

// Camera Controls
const controls = {
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    rotation: { azimuth: 0, elevation: 0 },
    zoom: 75 // Field of view (lower = more zoomed in)
};

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const victoryScreen = document.getElementById('victory-screen');
const loadingScreen = document.getElementById('loading-screen');
const hudElement = document.getElementById('hud');
const startButton = document.getElementById('start-button');
const playAgainButton = document.getElementById('play-again-button');
const hardModeButton = document.getElementById('hard-mode-button');
const toggleNamesButton = document.getElementById('toggle-names-button');
const resetGameButton = document.getElementById('reset-game-button');
const starTooltip = document.getElementById('star-tooltip');

// ===== INITIALIZATION =====
async function init() {
    console.log('Initializing Star Map...');

    // Load all data files
    try {
        await loadGameData();
    } catch (error) {
        console.error('Failed to load game data:', error);
        loadingScreen.querySelector('h1').textContent = 'Error Loading Data';
        loadingScreen.querySelector('p').textContent = 'Please refresh the page';
        return;
    }

    // Initialize Three.js
    initThreeJS();

    // Filter and render stars
    const filteredStars = filterConstellationStars();
    createStarField(filteredStars);

    // Initialize constellation tracking
    initConstellationTracking();

    // Setup event listeners
    setupEventListeners();

    // Setup camera controls
    setupCameraControls();

    // Load saved progress from local storage
    loadProgress();

    // Start animation loop
    animate();

    // Transition to menu
    setState(GameState.MENU);
}

// ===== LOCAL STORAGE =====
function saveProgress() {
    const saveData = {
        foundConstellations: foundConstellations,
        correctLines: Array.from(correctLines),
        hardMode: hardMode
    };
    localStorage.setItem('starmap-progress', JSON.stringify(saveData));
    console.log('Progress saved');
}

function loadProgress() {
    const saved = localStorage.getItem('starmap-progress');
    if (!saved) return;

    try {
        const data = JSON.parse(saved);

        // Restore hard mode
        if (data.hardMode) {
            hardMode = true;
            toggleHardMode();
        }

        // Restore found constellations
        if (data.foundConstellations && data.foundConstellations.length > 0) {
            data.foundConstellations.forEach(name => {
                if (!foundConstellations.includes(name)) {
                    foundConstellations.push(name);
                    addToFoundList(name, false); // Don't animate
                    showConstellationLabel(name);
                }
            });
            updateProgressCounter();
        }

        // Restore correct lines
        if (data.correctLines && data.correctLines.length > 0) {
            data.correctLines.forEach(lineId => {
                correctLines.add(lineId);
                const [hr1, hr2] = lineId.split('-').map(Number);
                const star1Data = starMeshMap.get(hr1);
                const star2Data = starMeshMap.get(hr2);
                if (star1Data && star2Data) {
                    const lineData = drawLine(star1Data, star2Data, true); // true = correct line

                    // Find which constellation(s) this line belongs to
                    const belongsToConstellations = [];
                    for (let [constellationName, constellationData] of Object.entries(constellationsData)) {
                        const stars = constellationData.stars;
                        for (let i = 0; i < stars.length - 1; i++) {
                            if ((stars[i] === hr1 && stars[i + 1] === hr2) ||
                                (stars[i] === hr2 && stars[i + 1] === hr1)) {
                                belongsToConstellations.push(constellationName);
                                break;
                            }
                        }
                    }

                    lineData.belongsTo = belongsToConstellations;

                    // If all constellations this line belongs to are completed, color it green
                    const allComplete = belongsToConstellations.every(name =>
                        foundConstellations.includes(name)
                    );
                    if (allComplete) {
                        lineData.line.material.color.set(0x00ff00); // Green for completed
                    }
                }
            });
        }

        console.log('Progress loaded:', data.foundConstellations.length, 'constellations');
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

function clearProgress() {
    localStorage.removeItem('starmap-progress');
    console.log('Progress cleared');
}

// ===== DATA LOADING =====
async function loadGameData() {
    console.log('Loading game data...');

    // Add cache-busting timestamp to force reload of updated data
    const timestamp = new Date().getTime();
    const [starsResponse, constellationsResponse, namesResponse] = await Promise.all([
        fetch(`data/visibleStarsFormatted.json?v=${timestamp}`),
        fetch(`data/ConstellationLines.json?v=${timestamp}`),
        fetch(`data/constellationNames.json?v=${timestamp}`)
    ]);

    if (!starsResponse.ok || !constellationsResponse.ok || !namesResponse.ok) {
        throw new Error('Failed to fetch data files');
    }

    starsData = await starsResponse.json();
    constellationsData = await constellationsResponse.json();
    constellationNames = await namesResponse.json();

    console.log(`Loaded ${starsData.length} stars and ${Object.keys(constellationsData).length} constellations`);

    // Debug: Check if HR 5506 exists
    const hr5506 = starsData.find(s => s.hr === 5506);
    if (hr5506) {
        console.log('DEBUG: HR 5506 (Izar) found in loaded data:', hr5506);
    } else {
        console.error('DEBUG: HR 5506 NOT found in loaded data!');
    }
}

// ===== STAR FILTERING =====
function filterConstellationStars() {
    console.log('Filtering constellation stars...');

    const requiredHRNumbers = new Set();

    // Collect all HR numbers from all constellations
    Object.values(constellationsData).forEach(constellation => {
        constellation.stars.forEach(hr => requiredHRNumbers.add(hr));
    });

    console.log(`DEBUG: Required HR numbers include 5506: ${requiredHRNumbers.has(5506)}`);

    // Filter star data to only required stars
    const filteredStars = starsData.filter(star => requiredHRNumbers.has(star.hr));

    console.log(`Filtered to ${filteredStars.length} constellation stars from ${starsData.length} total stars`);

    // Debug: Check if HR 5506 made it through
    const hr5506Filtered = filteredStars.find(s => s.hr === 5506);
    if (hr5506Filtered) {
        console.log('DEBUG: HR 5506 passed filter! Position:', hr5506Filtered.x, hr5506Filtered.y, hr5506Filtered.z);
    } else {
        console.error('DEBUG: HR 5506 did NOT pass filter!');
    }

    return filteredStars;
}

// ===== THREE.JS SETUP =====
function initThreeJS() {
    console.log('Initializing Three.js...');

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);

    // Create camera (at origin, looking outward)
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );
    camera.position.set(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // Configure raycaster
    raycaster.params.Points.threshold = CONFIG.RAYCASTER_THRESHOLD;
}

// ===== STAR FIELD CREATION =====
function createStarField(filteredStars) {
    console.log('Creating star field...');

    const starCount = filteredStars.length;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    let hr5506Index = -1;

    filteredStars.forEach((star, index) => {
        // Debug: Track HR 5506
        if (star.hr === 5506) {
            hr5506Index = index;
        }
        // Stars already have Cartesian coordinates (x, y, z)
        // Scale to our sphere radius
        const magnitude = Math.sqrt(star.x * star.x + star.y * star.y + star.z * star.z);
        const scale = CONFIG.STAR_SPHERE_RADIUS / (magnitude || 1);

        const pos = {
            x: star.x * scale,
            y: star.y * scale,
            z: star.z * scale
        };

        // Store position
        positions[index * 3] = pos.x;
        positions[index * 3 + 1] = pos.y;
        positions[index * 3 + 2] = pos.z;

        // Calculate color from color index
        const color = colorFromIndex(star.ci);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        // Calculate size from magnitude
        sizes[index] = sizeFromMagnitude(star.mag);

        // Store reference for lookup
        starMeshMap.set(star.hr, {
            position: new THREE.Vector3(pos.x, pos.y, pos.z),
            index: index,
            hr: star.hr,
            magnitude: star.mag
        });
    });

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create material
    const material = new THREE.PointsMaterial({
        size: 3,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9
    });

    // Create points mesh
    starField = new THREE.Points(geometry, material);
    scene.add(starField);

    console.log(`Star field created with ${starCount} stars`);

    // Debug: Report HR 5506
    if (hr5506Index >= 0) {
        const hr5506Data = starMeshMap.get(5506);
        console.log(`DEBUG: HR 5506 added to star field at index ${hr5506Index}`);
        console.log(`  Position in scene:`, hr5506Data);
        console.log(`  BufferGeometry position:`, positions[hr5506Index * 3], positions[hr5506Index * 3 + 1], positions[hr5506Index * 3 + 2]);
        console.log(`  Size:`, sizes[hr5506Index]);
    } else {
        console.error('DEBUG: HR 5506 NOT added to star field!');
    }
}

// ===== HARD MODE =====
function toggleHardMode() {
    hardMode = !hardMode;

    if (hardMode) {
        // Add 200 brightest non-constellation stars
        createHardModeStars();
        hardModeButton.textContent = 'Hard Mode: ON';
        hardModeButton.classList.add('active');
    } else {
        // Remove hard mode stars
        if (hardModeStarField) {
            scene.remove(hardModeStarField);
            hardModeStarField = null;
        }
        hardModeButton.textContent = 'Hard Mode: OFF';
        hardModeButton.classList.remove('active');
    }

    saveProgress();
}

function createHardModeStars() {
    // Get HR numbers already in constellations
    const constellationHRs = new Set();
    Object.values(constellationsData).forEach(constellation => {
        constellation.stars.forEach(hr => constellationHRs.add(hr));
    });

    // Filter to brightest non-constellation stars (magnitude < 6.0)
    const extraStars = starsData
        .filter(star => !constellationHRs.has(star.hr) && star.mag < 6.0)
        .sort((a, b) => a.mag - b.mag) // Sort by brightness
        .slice(0, 1000); // Take 1000 brightest

    if (extraStars.length === 0) return;

    const starCount = extraStars.length;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    extraStars.forEach((star, index) => {
        const magnitude = Math.sqrt(star.x * star.x + star.y * star.y + star.z * star.z);
        const scale = CONFIG.STAR_SPHERE_RADIUS / (magnitude || 1);

        const pos = {
            x: star.x * scale,
            y: star.y * scale,
            z: star.z * scale
        };

        positions[index * 3] = pos.x;
        positions[index * 3 + 1] = pos.y;
        positions[index * 3 + 2] = pos.z;

        // Same color logic as regular stars
        const color = colorFromIndex(star.ci);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        sizes[index] = sizeFromMagnitude(star.mag); // Same size as regular stars
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 3,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9 // Same opacity as regular stars
    });

    hardModeStarField = new THREE.Points(geometry, material);
    scene.add(hardModeStarField);

    console.log(`Hard mode: Added ${starCount} extra stars`);
}

// ===== STAR NAMES TOGGLE =====
function toggleStarNames() {
    showStarNames = !showStarNames;

    if (showStarNames) {
        toggleNamesButton.textContent = 'Star Names: ON';
        showAllStarNames();
    } else {
        toggleNamesButton.textContent = 'Star Names: OFF';
        hideAllStarNames();
    }
}

function showAllStarNames() {
    // Create 3D text sprites for all stars with proper names
    starsData.forEach(star => {
        if (star.proper && starMeshMap.has(star.hr)) {
            const starData = starMeshMap.get(star.hr);
            const sprite = createStarNameSprite(star.proper);
            sprite.position.copy(starData.position);
            scene.add(sprite);
            starNameLabels.push(sprite);
        }
    });
    console.log(`Showing ${starNameLabels.length} star names`);
}

function hideAllStarNames() {
    // Remove all star name labels from the scene
    starNameLabels.forEach(label => {
        scene.remove(label);
    });
    starNameLabels.length = 0;
}

function createStarNameSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    context.font = 'Bold 36px Arial';
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 3;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Add outline for better visibility
    context.strokeText(text, 256, 64);
    context.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(80, 20, 1); // Larger star name labels

    return sprite;
}

// ===== COORDINATE CONVERSION =====
function sphericalToCartesian(radius, phi, theta) {
    return {
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.cos(theta),
        z: radius * Math.sin(theta) * Math.sin(phi)
    };
}

// ===== COLOR AND SIZE HELPERS =====
function colorFromIndex(ci) {
    // B-V color index: negative = blue, positive = red
    // Typical range: -0.4 (blue) to +2.0 (red)
    const normalized = Math.max(0, Math.min(1, (ci + 0.4) / 2.4));

    if (normalized < 0.33) {
        // Blue stars
        return new THREE.Color(0.7, 0.7 + normalized, 1.0);
    } else if (normalized < 0.66) {
        // White/yellow stars
        return new THREE.Color(1.0, 1.0, 1.0 - (normalized - 0.33) * 0.5);
    } else {
        // Red stars
        return new THREE.Color(1.0, 0.7 - (normalized - 0.66), 0.3);
    }
}

function sizeFromMagnitude(mag) {
    // Lower magnitude = brighter star = larger point
    // Magnitude range: -1.5 (brightest) to 6.5 (dimmest visible)
    const size = (7 - mag) * 1.5;
    return Math.max(1, Math.min(size, 10)); // Clamp between 1-10
}

// ===== CONSTELLATION TRACKING =====
function initConstellationTracking() {
    console.log('Initializing constellation tracking...');

    for (let [name, data] of Object.entries(constellationsData)) {
        const stars = data.stars;
        const requiredLines = new Set();

        // Generate all required line IDs
        for (let i = 0; i < stars.length - 1; i++) {
            const lineId = createLineId(stars[i], stars[i + 1]);
            requiredLines.add(lineId);
        }

        constellationProgress.set(name, {
            required: requiredLines,
            completed: new Set()
        });
    }

    console.log(`Tracking ${constellationProgress.size} constellations`);
}

function createLineId(hr1, hr2) {
    // Create normalized line ID (sorted to match both directions)
    return [hr1, hr2].sort((a, b) => a - b).join('-');
}

// ===== CAMERA CONTROLS =====
function setupCameraControls() {
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('click', onMouseClick);
    document.addEventListener('wheel', onMouseWheel, { passive: false });
}

function onMouseDown(event) {
    if (currentState !== GameState.PLAYING) return;

    controls.isDragging = true;
    controls.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseMove(event) {
    if (currentState !== GameState.PLAYING) return;

    // Update mouse position for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Handle camera rotation
    if (controls.isDragging) {
        hideHoverGlow(); // Hide glow when dragging
        const deltaX = event.clientX - controls.previousMousePosition.x;
        const deltaY = event.clientY - controls.previousMousePosition.y;

        controls.rotation.azimuth -= deltaX * CONFIG.CAMERA_ROTATION_SENSITIVITY;
        controls.rotation.elevation -= deltaY * CONFIG.CAMERA_ROTATION_SENSITIVITY;

        // Clamp elevation to prevent flipping
        controls.rotation.elevation = Math.max(
            CONFIG.MIN_ELEVATION,
            Math.min(CONFIG.MAX_ELEVATION, controls.rotation.elevation)
        );

        updateCameraRotation();

        controls.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    } else {
        // Check hover for cursor feedback
        checkHover(event);
    }
}

function onMouseUp() {
    controls.isDragging = false;
}

function onMouseWheel(event) {
    if (currentState !== GameState.PLAYING) return;

    event.preventDefault();

    // Adjust zoom based on wheel delta
    const zoomSpeed = 0.1;
    const delta = event.deltaY * zoomSpeed;

    controls.zoom += delta;

    // Clamp zoom to reasonable limits (30 = very zoomed in, 120 = zoomed out)
    controls.zoom = Math.max(30, Math.min(120, controls.zoom));

    // Update camera field of view
    camera.fov = controls.zoom;
    camera.updateProjectionMatrix();
}

function updateCameraRotation() {
    const euler = new THREE.Euler(
        controls.rotation.elevation,
        controls.rotation.azimuth,
        0,
        'YXZ'
    );
    camera.quaternion.setFromEuler(euler);
}

// ===== STAR SELECTION =====
function onMouseClick(event) {
    if (currentState !== GameState.PLAYING || controls.isDragging) return;

    // Update mouse coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(starField);

    if (intersects.length > 0) {
        const intersection = intersects[0];
        const starIndex = intersection.index;
        const clickedStar = findStarByIndex(starIndex);

        if (clickedStar) {
            handleStarClick(clickedStar);
        }
    }
}

function checkHover(event) {
    if (!starField) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(starField);

    if (intersects.length > 0) {
        const newHoveredStar = findStarByIndex(intersects[0].index);

        // Show tooltip with star name if available
        if (newHoveredStar) {
            // Check if star is fully completed
            const isCompleted = isStarFullyCompleted(newHoveredStar.hr);

            // Always show star name tooltip if star has a proper name
            const starInfo = starsData.find(s => s.hr === newHoveredStar.hr);
            if (starInfo && starInfo.proper) {
                starTooltip.textContent = starInfo.proper;
                starTooltip.style.left = (event.clientX + 15) + 'px';
                starTooltip.style.top = (event.clientY + 15) + 'px';
                starTooltip.classList.remove('hidden');
            } else {
                starTooltip.classList.add('hidden');
            }

            if (isCompleted) {
                // Show tooltip but no interactive effects for completed stars
                document.body.style.cursor = 'default';
                hideHoverGlow();
                hoveredStar = null;
            } else {
                // Show full hover effects for incomplete stars
                document.body.style.cursor = 'pointer';

                // Show enlarged glow around hovered star
                if (!hoveredStar || hoveredStar.hr !== newHoveredStar.hr) {
                    showHoverGlow(newHoveredStar);
                }

                hoveredStar = newHoveredStar;
            }
        }
    } else {
        document.body.style.cursor = 'default';
        hideHoverGlow();
        hoveredStar = null;
        starTooltip.classList.add('hidden');
    }

    // Update preview line if a star is selected (follows mouse)
    if (selectedStar) {
        updatePreviewLineToMouse(selectedStar, event);
    }
}

function showHoverGlow(star) {
    // Remove existing hover glow
    if (hoverGlowMesh) {
        scene.remove(hoverGlowMesh);
    }

    // Create a bright, enlarged sphere at the star's position
    const geometry = new THREE.SphereGeometry(4, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.6
    });

    hoverGlowMesh = new THREE.Mesh(geometry, material);
    hoverGlowMesh.position.copy(star.position);
    scene.add(hoverGlowMesh);
}

function hideHoverGlow() {
    if (hoverGlowMesh) {
        scene.remove(hoverGlowMesh);
        hoverGlowMesh = null;
    }
}

function updatePreviewLineToMouse(star, event) {
    // Convert mouse position to 3D world space
    const vector = new THREE.Vector3();
    vector.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(camera);
    vector.sub(camera.position).normalize();
    const distance = CONFIG.STAR_SPHERE_RADIUS;
    const mousePos = camera.position.clone().add(vector.multiplyScalar(distance));

    // Remove existing preview line
    if (previewLine) {
        scene.remove(previewLine);
    }

    // Create thick preview line using cylinder geometry
    const direction = new THREE.Vector3().subVectors(mousePos, star.position);
    const length = direction.length();
    const cylinderGeometry = new THREE.CylinderGeometry(0.8, 0.8, length, 8);

    const material = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.4
    });

    previewLine = new THREE.Mesh(cylinderGeometry, material);

    // Position cylinder at midpoint between star and mouse
    previewLine.position.copy(star.position).add(mousePos).multiplyScalar(0.5);

    // Orient cylinder to point from star to mouse position
    previewLine.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
    );

    scene.add(previewLine);
}

function findStarByIndex(index) {
    for (let [hr, starData] of starMeshMap) {
        if (starData.index === index) {
            return starData;
        }
    }
    return null;
}

function handleStarClick(star) {
    // Check if star only belongs to completed constellations
    if (isStarFullyCompleted(star.hr)) {
        console.log('Star only belongs to completed constellations - cannot select');
        return;
    }

    if (!selectedStar) {
        // First click: select star
        selectedStar = star;
        highlightStar(star);
    } else if (selectedStar.hr === star.hr) {
        // Click same star: deselect
        unhighlightStar();
        selectedStar = null;
    } else {
        // Second click: attempt to draw line
        attemptDrawLine(selectedStar, star);
        unhighlightStar();
        selectedStar = null;
    }
}

function isStarFullyCompleted(starHR) {
    // Find all constellations this star belongs to
    const belongsToConstellations = [];

    for (let [constellationName, data] of Object.entries(constellationsData)) {
        if (data.stars.includes(starHR)) {
            belongsToConstellations.push(constellationName);
        }
    }

    // If star doesn't belong to any constellation, it's not completed
    if (belongsToConstellations.length === 0) return false;

    // Check if ALL constellations this star belongs to are completed
    return belongsToConstellations.every(name => foundConstellations.includes(name));
}

// ===== STAR HIGHLIGHTING =====
function highlightStar(star) {
    // Remove existing highlight
    if (highlightMesh) {
        scene.remove(highlightMesh);
    }

    // Hide hover glow when selecting a star
    hideHoverGlow();

    // Create glowing sphere at star position
    const geometry = new THREE.SphereGeometry(5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.6,
        wireframe: true
    });

    highlightMesh = new THREE.Mesh(geometry, material);
    highlightMesh.position.copy(star.position);
    scene.add(highlightMesh);
}

function unhighlightStar() {
    if (highlightMesh) {
        scene.remove(highlightMesh);
        highlightMesh = null;
    }
    // Also clear preview line
    if (previewLine) {
        scene.remove(previewLine);
        previewLine = null;
    }
}

// ===== LINE DRAWING =====
function attemptDrawLine(star1, star2) {
    drawLine(star1, star2, false); // false = need to validate
}

function drawLine(star1, star2, isCorrect) {
    // Create thick line using cylinder geometry for better visibility
    const direction = new THREE.Vector3().subVectors(star2.position, star1.position);
    const length = direction.length();
    const cylinderGeometry = new THREE.CylinderGeometry(0.8, 0.8, length, 8);

    const material = new THREE.MeshBasicMaterial({
        color: isCorrect ? 0xffff00 : 0xffffff, // Yellow for correct, white for checking
        transparent: true,
        opacity: 0.9
    });

    const line = new THREE.Mesh(cylinderGeometry, material);

    // Position cylinder at midpoint between stars
    line.position.copy(star1.position).add(star2.position).multiplyScalar(0.5);

    // Orient cylinder to point from star1 to star2
    line.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
    );

    scene.add(line);

    // Store line data
    const lineData = {
        line: line,
        star1Hr: star1.hr,
        star2Hr: star2.hr,
        state: isCorrect ? 'correct' : 'checking',
        belongsTo: [] // Will store constellation names
    };

    drawnLines.push(lineData);

    // Validate line if not already correct
    if (!isCorrect) {
        validateLine(lineData);
    }

    return lineData;
}

function validateLine(lineData) {
    const { star1Hr, star2Hr } = lineData;
    const lineId = createLineId(star1Hr, star2Hr);

    // Check if this line exists in any constellation
    let isCorrect = false;
    const belongsToConstellations = [];

    for (let [constellationName, data] of Object.entries(constellationsData)) {
        const stars = data.stars;

        // Check consecutive pairs in constellation
        for (let i = 0; i < stars.length - 1; i++) {
            const hr1 = stars[i];
            const hr2 = stars[i + 1];

            // Check both directions
            if ((hr1 === star1Hr && hr2 === star2Hr) ||
                (hr1 === star2Hr && hr2 === star1Hr)) {
                isCorrect = true;
                belongsToConstellations.push(constellationName);
                break;
            }
        }
    }

    if (isCorrect) {
        // Mark as correct (yellow for incomplete constellations)
        lineData.state = 'correct';
        lineData.belongsTo = belongsToConstellations;
        lineData.line.material.color.set(0xffff00); // Yellow initially
        correctLines.add(lineId);

        // Save progress
        saveProgress();

        // Check if any constellation is now complete
        belongsToConstellations.forEach(name => {
            checkConstellationCompletion(name);
        });
    } else {
        // Mark as wrong
        lineData.state = 'wrong';
        lineData.line.material.color.set(0xff0000); // Red

        // Fade out and remove after delay
        setTimeout(() => {
            fadeOutLine(lineData);
        }, 500);
    }
}

// Update line colors when constellation is completed
function updateConstellationLineColors(constellationName) {
    drawnLines.forEach(lineData => {
        if (lineData.belongsTo && lineData.belongsTo.includes(constellationName)) {
            // Check if ALL constellations this line belongs to are complete
            const allComplete = lineData.belongsTo.every(name =>
                foundConstellations.includes(name)
            );

            if (allComplete) {
                lineData.line.material.color.set(0x00ff00); // Green for completed
            }
        }
    });
}

function fadeOutLine(lineData) {
    const duration = CONFIG.LINE_FADE_DURATION;
    const startTime = Date.now();

    function fade() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress < 1) {
            lineData.line.material.opacity = 0.8 * (1 - progress);
            requestAnimationFrame(fade);
        } else {
            // Remove from scene and array
            scene.remove(lineData.line);
            const index = drawnLines.indexOf(lineData);
            if (index > -1) {
                drawnLines.splice(index, 1);
            }
        }
    }

    fade();
}

// ===== CONSTELLATION COMPLETION =====
function checkConstellationCompletion(constellationName) {
    const progress = constellationProgress.get(constellationName);
    if (!progress) return;

    const { required, completed } = progress;
    const stars = constellationsData[constellationName].stars;

    // Check all required lines
    for (let i = 0; i < stars.length - 1; i++) {
        const lineId = createLineId(stars[i], stars[i + 1]);

        if (correctLines.has(lineId)) {
            completed.add(lineId);
        }
    }

    // Check if all lines are completed
    if (completed.size === required.size && !foundConstellations.includes(constellationName)) {
        onConstellationComplete(constellationName);
    }
}

function onConstellationComplete(constellationName) {
    console.log(`Constellation complete: ${constellationName}`);

    foundConstellations.push(constellationName);

    // Show constellation name label
    showConstellationLabel(constellationName);

    // Add to found list UI
    addToFoundList(constellationName);

    // Update progress counter
    updateProgressCounter();

    // Save progress to local storage
    saveProgress();

    // Update all lines for this constellation to green
    updateConstellationLineColors(constellationName);

    // Check victory condition
    if (foundConstellations.length === 90) {
        setTimeout(() => {
            setState(GameState.VICTORY);
        }, 1000);
    }
}

// ===== CONSTELLATION LABELS =====
function showConstellationLabel(constellationName) {
    const stars = constellationsData[constellationName].stars;
    const center = calculateConstellationCenter(stars);

    if (!center) return;

    // Show only Danish name on the star map
    const sprite = createTextSprite(getConstellationDanishName(constellationName));
    sprite.position.copy(center);
    scene.add(sprite);

    constellationLabels.push(sprite);
}

function calculateConstellationCenter(hrNumbers) {
    const positions = hrNumbers
        .map(hr => starMeshMap.get(hr)?.position)
        .filter(p => p);

    if (positions.length === 0) return null;

    const center = new THREE.Vector3();
    positions.forEach(pos => center.add(pos));
    center.divideScalar(positions.length);

    return center;
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1024; // Larger canvas for better quality
    canvas.height = 256;

    context.font = 'Bold 72px Arial'; // Larger font
    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 4;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Add outline for better visibility
    context.strokeText(text, 512, 128);
    context.fillText(text, 512, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(CONFIG.LABEL_SCALE, CONFIG.LABEL_SCALE / 4, 1); // Larger labels

    return sprite;
}

function getConstellationFullName(abbr) {
    return constellationNames[abbr] || abbr;
}

function getConstellationDanishName(abbr) {
    const fullName = constellationNames[abbr] || abbr;
    // Extract only the Danish name (before the parentheses)
    const match = fullName.match(/^([^(]+)/);
    return match ? match[1].trim() : fullName;
}

// ===== UI UPDATES =====
function addToFoundList(constellationName, animate = true) {
    const foundList = document.getElementById('found-list');

    const entry = document.createElement('div');
    entry.className = 'constellation-entry';
    entry.textContent = getConstellationFullName(constellationName);

    // Add to top (newest first) instead of bottom
    foundList.insertBefore(entry, foundList.firstChild);

    // Optional animation
    if (animate) {
        entry.style.opacity = '0';
        setTimeout(() => {
            entry.style.opacity = '1';
        }, 10);
    }
}

function updateProgressCounter() {
    document.getElementById('found-count').textContent = foundConstellations.length;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    startButton.addEventListener('click', () => {
        startGame();
    });

    playAgainButton.addEventListener('click', () => {
        resetGame();
        setState(GameState.MENU);
    });

    hardModeButton.addEventListener('click', () => {
        toggleHardMode();
    });

    toggleNamesButton.addEventListener('click', () => {
        toggleStarNames();
    });

    resetGameButton.addEventListener('click', () => {
        if (confirm('Reset all progress? This cannot be undone.')) {
            resetGame();
            clearProgress();
        }
    });

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== GAME FLOW =====
function setState(newState) {
    currentState = newState;

    switch (newState) {
        case GameState.MENU:
            menuScreen.classList.remove('hidden');
            victoryScreen.classList.add('hidden');
            loadingScreen.classList.add('hidden');
            hudElement.classList.add('hidden');
            break;

        case GameState.PLAYING:
            menuScreen.classList.add('hidden');
            victoryScreen.classList.add('hidden');
            loadingScreen.classList.add('hidden');
            hudElement.classList.remove('hidden');
            break;

        case GameState.VICTORY:
            menuScreen.classList.add('hidden');
            victoryScreen.classList.remove('hidden');
            loadingScreen.classList.add('hidden');
            hudElement.classList.add('hidden');
            break;
    }
}

function startGame() {
    console.log('Starting game...');
    setState(GameState.PLAYING);
    updateProgressCounter();
}

function resetGame() {
    console.log('Resetting game...');

    // Clear lines
    drawnLines.forEach(lineData => {
        scene.remove(lineData.line);
    });
    drawnLines.length = 0;
    correctLines.clear();

    // Clear labels
    constellationLabels.forEach(label => {
        scene.remove(label);
    });
    constellationLabels.length = 0;

    // Clear found constellations
    foundConstellations.length = 0;
    document.getElementById('found-list').innerHTML = '';

    // Reset progress tracking
    constellationProgress.forEach(progress => {
        progress.completed.clear();
    });

    // Reset camera
    resetCameraView();

    // Reset selection
    selectedStar = null;
    unhighlightStar();

    // Update UI
    updateProgressCounter();
}

function resetCameraView() {
    controls.rotation.azimuth = 0;
    controls.rotation.elevation = 0;
    controls.zoom = 75;
    camera.fov = controls.zoom;
    camera.updateProjectionMatrix();
    updateCameraRotation();
}

// ===== ANIMATION LOOP =====
function animate() {
    requestAnimationFrame(animate);

    // Render scene
    renderer.render(scene, camera);
}

// ===== START =====
init();
