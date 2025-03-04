import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Game variables
let scene, camera, renderer, controls;
let level, player;
let bluePortal, orangePortal;
let raycaster;

// Initialize game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // Average human height
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-canvas').appendChild(renderer.domElement);
    
    // Setup controls
    controls = new PointerLockControls(camera, renderer.domElement);
    setupControlsListeners();
    
    // Create raycaster for portal placement
    raycaster = new THREE.Raycaster();
    
    // Create portals (initially not visible)
    createPortals();
    
    // Create test level
    createLevel();
    
    // Player physics
    player = {
        velocity: new THREE.Vector3(),
        onGround: false,
        height: 1.6,
        speed: 0.1,
        jumpStrength: 0.2
    };
    
    // Add lights
    addLights();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Setup control event listeners
function setupControlsListeners() {
    const container = document.getElementById('container');
    
    // Click to start pointer lock
    container.addEventListener('click', () => {
        controls.lock();
    });
    
    // Lock/unlock controls
    controls.addEventListener('lock', () => {
        document.getElementById('instruction').style.display = 'none';
    });
    
    controls.addEventListener('unlock', () => {
        document.getElementById('instruction').style.display = 'block';
    });
    
    // Mouse buttons for portals
    document.addEventListener('mousedown', (event) => {
        if (!controls.isLocked) return;
        
        // Left click - blue portal
        if (event.button === 0) {
            placePortal('blue');
        }
        // Right click - orange portal
        else if (event.button === 2) {
            placePortal('orange');
        }
    });
    
    // Prevent context menu on right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Movement keys
    const keysPressed = {};
    document.addEventListener('keydown', (event) => {
        keysPressed[event.code] = true;
        
        // Jump when space is pressed and player is on ground
        if (event.code === 'Space' && player.onGround) {
            player.velocity.y = player.jumpStrength;
            player.onGround = false;
        }
    });
    
    document.addEventListener('keyup', (event) => {
        keysPressed[event.code] = false;
    });
    
    // Update player velocity based on keys pressed
    setInterval(() => {
        // Reset horizontal velocity
        player.velocity.x = 0;
        player.velocity.z = 0;
        
        // Apply movement based on pressed keys
        const direction = new THREE.Vector3();
        const rotation = controls.getObject().rotation;
        
        if (keysPressed['KeyW']) {
            direction.z = -1;
        }
        if (keysPressed['KeyS']) {
            direction.z = 1;
        }
        if (keysPressed['KeyA']) {
            direction.x = -1;
        }
        if (keysPressed['KeyD']) {
            direction.x = 1;
        }
        
        // Normalize and rotate direction vector
        if (direction.length() > 0) {
            direction.normalize();
            direction.applyEuler(new THREE.Euler(0, rotation.y, 0));
            
            player.velocity.x = direction.x * player.speed;
            player.velocity.z = direction.z * player.speed;
        }
    }, 16);
}

// Create portals
function createPortals() {
    // Portal geometry (vertical oval)
    const portalGeometry = new THREE.RingGeometry(0.8, 1, 32, 8);
    
    // Blue portal
    const bluePortalMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0088FF,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    bluePortal = new THREE.Mesh(portalGeometry, bluePortalMaterial);
    bluePortal.scale.y = 1.5; // Make it oval
    bluePortal.visible = false;
    scene.add(bluePortal);
    
    // Orange portal
    const orangePortalMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF8800,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    orangePortal = new THREE.Mesh(portalGeometry, orangePortalMaterial);
    orangePortal.scale.y = 1.5; // Make it oval
    orangePortal.visible = false;
    scene.add(orangePortal);
}

// Create test level
function createLevel() {
    level = new THREE.Group();
    
    // Floor
    const floorGeometry = new THREE.BoxGeometry(20, 0.5, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.25;
    floor.receiveShadow = true;
    floor.userData = { isWall: true };
    level.add(floor);
    
    // Ceiling
    const ceilingGeometry = new THREE.BoxGeometry(20, 0.5, 20);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.y = 4.75;
    ceiling.receiveShadow = true;
    ceiling.userData = { isWall: true };
    level.add(ceiling);
    
    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xEEEEEE });
    
    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 5, 0.5), wallMaterial);
    backWall.position.set(0, 2.25, -10);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    backWall.userData = { isWall: true };
    level.add(backWall);
    
    // Front wall
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(20, 5, 0.5), wallMaterial);
    frontWall.position.set(0, 2.25, 10);
    frontWall.receiveShadow = true;
    frontWall.castShadow = true;
    frontWall.userData = { isWall: true };
    level.add(frontWall);
    
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 20), wallMaterial);
    leftWall.position.set(-10, 2.25, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData = { isWall: true };
    level.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 20), wallMaterial);
    rightWall.position.set(10, 2.25, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    rightWall.userData = { isWall: true };
    level.add(rightWall);
    
    // Add some test blocks for portals
    const blockMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    
    // Center block
    const centerBlock = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), blockMaterial);
    centerBlock.position.set(0, 1.5, 0);
    centerBlock.castShadow = true;
    centerBlock.receiveShadow = true;
    centerBlock.userData = { isWall: true };
    level.add(centerBlock);
    
    // Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 4), blockMaterial);
    platform.position.set(-5, 2, -5);
    platform.castShadow = true;
    platform.receiveShadow = true;
    platform.userData = { isWall: true };
    level.add(platform);
    
    // Add level to scene
    scene.add(level);
}

// Add lights to the scene
function addLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);
    
    // Directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.6);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
}

// Place portal on wall
function placePortal(type) {
    // Set raycaster from camera
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Find intersections with walls
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    for (const intersect of intersects) {
        // Check if we hit a wall
        if (intersect.object.userData.isWall) {
            const normal = intersect.face.normal.clone();
            normal.transformDirection(intersect.object.matrixWorld);
            
            // Position the portal at intersection point, slightly offset from the wall
            const portalPosition = intersect.point.clone().add(normal.multiplyScalar(0.01));
            
            // Determine which portal to place
            const portal = type === 'blue' ? bluePortal : orangePortal;
            
            // Make portal visible
            portal.visible = true;
            
            // Position portal
            portal.position.copy(portalPosition);
            
            // Orient portal to face away from wall
            portal.lookAt(intersect.point.clone().add(normal));
            
            // Make portal slightly larger than player for passing through
            portal.scale.set(1.2, 1.8, 1);
            
            break;
        }
    }
}

// Check if player is near a portal and should teleport
function checkPortalTeleport() {
    // Only check if both portals are placed
    if (!bluePortal.visible || !orangePortal.visible) return;
    
    // Get player position (camera position)
    const playerPosition = camera.position.clone();
    
    // Check distance to blue portal
    const distToBluePortal = playerPosition.distanceTo(bluePortal.position);
    if (distToBluePortal < 0.7) {
        // Check if player is facing the portal
        const playerDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const portalNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(bluePortal.quaternion);
        
        const dotProduct = playerDirection.dot(portalNormal);
        
        // If player is facing portal, teleport to orange portal
        if (dotProduct > 0.3) {
            // Calculate new position at orange portal
            const orangePortalPosition = orangePortal.position.clone();
            const orangePortalNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(orangePortal.quaternion);
            
            // Set new position slightly in front of the orange portal
            const newPosition = orangePortalPosition.clone().add(orangePortalNormal.multiplyScalar(0.7));
            camera.position.copy(newPosition);
            
            // Maintain momentum/velocity but adjust direction
            // This is a simplistic implementation
            const currentVelocity = player.velocity.clone();
            
            // Rotate the velocity to match the new portal orientation
            // For a more realistic portal mechanic, you'd need more complex math here
            const bluePortalQuat = bluePortal.quaternion.clone();
            const orangePortalQuat = orangePortal.quaternion.clone();
            const rotationChange = new THREE.Quaternion().multiplyQuaternions(
                orangePortalQuat,
                bluePortalQuat.invert()
            );
            
            // Apply rotation to velocity
            player.velocity.applyQuaternion(rotationChange);
        }
    }
    
    // Check distance to orange portal
    const distToOrangePortal = playerPosition.distanceTo(orangePortal.position);
    if (distToOrangePortal < 0.7) {
        // Check if player is facing the portal
        const playerDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const portalNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(orangePortal.quaternion);
        
        const dotProduct = playerDirection.dot(portalNormal);
        
        // If player is facing portal, teleport to blue portal
        if (dotProduct > 0.3) {
            // Calculate new position at blue portal
            const bluePortalPosition = bluePortal.position.clone();
            const bluePortalNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(bluePortal.quaternion);
            
            // Set new position slightly in front of the blue portal
            const newPosition = bluePortalPosition.clone().add(bluePortalNormal.multiplyScalar(0.7));
            camera.position.copy(newPosition);
            
            // Maintain momentum/velocity but adjust direction
            const currentVelocity = player.velocity.clone();
            
            // Rotate the velocity to match the new portal orientation
            const orangePortalQuat = orangePortal.quaternion.clone();
            const bluePortalQuat = bluePortal.quaternion.clone();
            const rotationChange = new THREE.Quaternion().multiplyQuaternions(
                bluePortalQuat,
                orangePortalQuat.invert()
            );
            
            // Apply rotation to velocity
            player.velocity.applyQuaternion(rotationChange);
        }
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Simple physics update
function updatePhysics() {
    // Apply gravity
    if (!player.onGround) {
        player.velocity.y -= 0.01; // Gravity
    }
    
    // Limit falling speed
    if (player.velocity.y < -0.3) {
        player.velocity.y = -0.3;
    }
    
    // Update player position based on velocity
    camera.position.x += player.velocity.x;
    camera.position.z += player.velocity.z;
    camera.position.y += player.velocity.y;
    
    // Simple floor collision
    if (camera.position.y < player.height) {
        camera.position.y = player.height;
        player.velocity.y = 0;
        player.onGround = true;
    }
    
    // Simple wall collisions (very basic)
    // For a proper implementation, you'd want to use a physics library
    
    // Check for portal teleportation
    checkPortalTeleport();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    updatePhysics();
    
    renderer.render(scene, camera);
}

// Start the game
init();

