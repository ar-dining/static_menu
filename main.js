/****************************************
         *     1. Setup Scene, Camera, Renderer *
         ****************************************/
const canvas = document.getElementById("sceneCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputEncoding = THREE.sRGBEncoding;

// Create scene
const scene = new THREE.Scene();
const n = 6;
const randomIndex = Math.floor(Math.random() * n) + 1;
const randomPanoramaPath = `assets/panoramas/${randomIndex}.jpg`;

const textureLoader = new THREE.TextureLoader();
textureLoader.load(randomPanoramaPath, (texture) => {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    renderer.setClearColor(0xffffff, 1);
});

// Create camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 0.5, 1.5);

// Orbit Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.minDistance = 0.5;
controls.maxDistance = 5;
controls.zoomSpeed = 0.5;
controls.enablePan = false;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = (Math.PI / 2) + 0.6;

/****************************************
 *         2. Lighting (Optional)       *
 ****************************************/
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

/****************************************
 * 3. GLTF Loader and Model Management  *
 ****************************************/
// DRACOLoader setup
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.144.0/examples/js/libs/draco/gltf/');

// GLTFLoader with Draco support
const loader = new THREE.GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// Data for 3D assets
const assets = {
    starters: [
        "assets/starters/sushi.rapid.glb",
        "assets/starters/veg_pastry.rapid.glb"
    ],
    main: [
        "assets/mains/noodles.glb",
        "assets/mains/mandu.glb",
        "assets/mains/beef_rice.glb"
    ],
    desserts: [
        "assets/deserts/barfi.rapid.glb",
        "assets/deserts/cream_roll.rapid.glb",
        "assets/deserts/kalakand.rapid.glb"
    ]
};

// Data for corresponding PNG images
const imageAssets = {
    starters: [
        "assets/food_description/sushi.png",
        "assets/food_description/veg_pastry.png"
    ],
    main: [
        "assets/food_description/noodles.png",
        "assets/food_description/mandu.png",
        "assets/food_description/beef_rice.png"
    ],
    desserts: [
        "assets/food_description/barfi.png",
        "assets/food_description/cream_roll.png",
        "assets/food_description/kalakand.png"
    ]
};

let currentCategory = "main";
let currentIndex = 0;
document.getElementById("category").value = "main";

let loadedModels = [];    // Objects currently in the scene (food models + planes)
let loadCounter = 0;      // To cancel out-of-date loads (if user switches too fast)
let tableModel = null;    // The table reference
let z_offset = -0.3;

// --- NEW: Keep track of preloaded assets so we can reuse them ---
const preloaded3DModels = {};  // { modelPath: THREE.Group (GLTF scene) }
const preloadedTextures = {};  // { imagePath: THREE.Texture }

/****************************************
 *          3a. Preload Functions       *
 ****************************************/
/**
 * Preloads a single model & its texture in the background and stores them.
 */
function preloadModel(category, index) {
    const modelPath = assets[category][index];
    const imagePath = imageAssets[category][index];

    // If not already loaded, load the 3D model
    if (!preloaded3DModels[modelPath]) {
        loader.load(
            modelPath,
            (gltf) => {
                preloaded3DModels[modelPath] = gltf.scene;
                console.log(`Preloaded 3D model: ${modelPath}`);
            },
            undefined,
            (err) => console.error(`Error preloading model ${modelPath}:`, err)
        );
    }

    // If not already loaded, load the texture
    if (!preloadedTextures[imagePath]) {
        const texLoader = new THREE.TextureLoader();
        texLoader.load(
            imagePath,
            (texture) => {
                preloadedTextures[imagePath] = texture;
                console.log(`Preloaded texture: ${imagePath}`);
            },
            undefined,
            (err) => console.error(`Error preloading texture ${imagePath}:`, err)
        );
    }
}

/****************************************
 * 3b. Table Model (loads once)         *
 ****************************************/
function loadTableModel() {
    const tablePath = "assets/tables/uzbek_blue.rapid.glb";
    // const tablePath = "assets/tables/uzbek_red_nr.glb";
    console.log("table mode");
    loader.load(
        tablePath,
        (gltf) => {
            tableModel = gltf.scene;
            scene.add(tableModel);

            // Scale & position
            tableModel.scale.set(1.05, 1.05, 1.05);
            tableModel.position.set(0, -0.415 + z_offset, 0);
            // tableModel.rotation.y = -Math.PI;
            tableModel.rotation.y = 0;

        },
        undefined,
        (error) => {
            console.error("Error loading table model:", error);
        }
    );
}

/****************************************
 * 3c. Removing Previous Models         *
 ****************************************/
function removeAllModels() {
    loadedModels.forEach((obj) => {
        scene.remove(obj);
        obj.traverse?.((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    });
    loadedModels = [];
}

/****************************************
 *     3d. Load Current Model           *
 ****************************************/
function loadModel() {
    // Each load attempt gets a unique ID
    const thisLoadID = ++loadCounter;
    console.log("model loaded")

    // Remove old models
    removeAllModels();

    // Identify paths
    const modelPath = assets[currentCategory][currentIndex];
    const imagePath = imageAssets[currentCategory][currentIndex];

    // --- Check if the model & texture are preloaded ---
    const preloadedScene = preloaded3DModels[modelPath];
    const preloadedTex = preloadedTextures[imagePath];

    // If we have both preloaded, we can skip the loader entirely
    if (preloadedScene && preloadedTex) {
        // "Clone" the preloaded scene to allow multiple usage
        const model = preloadedScene.clone(true);
        finalizeModelAndPlane(model, preloadedTex, thisLoadID);
    }
    else {
        // Otherwise, load from disk
        loader.load(
            modelPath,
            (gltf) => {
                if (thisLoadID !== loadCounter) {
                    console.warn("Old load finished after a newer request—ignoring.");
                    return;
                }
                // Cache the scene so we don’t reload it next time
                preloaded3DModels[modelPath] = gltf.scene;

                // If we also have the texture, finalize immediately
                if (preloadedTextures[imagePath]) {
                    finalizeModelAndPlane(gltf.scene, preloadedTextures[imagePath], thisLoadID);
                }
                else {
                    // If the texture is not preloaded, load it now
                    const texLoader = new THREE.TextureLoader();
                    texLoader.load(
                        imagePath,
                        (texture) => {
                            preloadedTextures[imagePath] = texture;
                            if (thisLoadID === loadCounter) {
                                finalizeModelAndPlane(gltf.scene, texture, thisLoadID);
                            }
                        },
                        undefined,
                        (err) => {
                            console.error("Error loading texture:", err);
                        }
                    );
                }
            },
            undefined,
            (error) => {
                if (thisLoadID !== loadCounter) {
                    console.warn("Old load errored after a newer request—ignoring.");
                    return;
                }
                console.error("Error loading model:", error);
            }
        );
    }
}

/**
 * Helper to position the model, create the plane with the given texture, etc.
 */
function finalizeModelAndPlane(gltfScene, texture, loadID) {
    // Double-check we’re still the current load
    if (loadID !== loadCounter) return;

    // Add model to the scene
    const model = gltfScene;
    scene.add(model);
    loadedModels.push(model);

    // Scale the model
    model.scale.set(5, 5, 5);

    // Center the food at (0, ??, 0), then lift it above the table
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Reposition so center is at y=0
    model.position.sub(center);
    // Raise it so it sits above y=0 (table top)
    model.position.y += (size.y / 2 + 0.00) + z_offset;

    // Create plane for the texture
    const planeGeom = new THREE.PlaneGeometry(2, 1);
    const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);

    let sf = 0.5;
    plane.scale.set(sf, sf, sf);
    plane.rotation.x = -0.3;
    plane.position.set(0.0, (0.6 + z_offset), -0.4);

    scene.add(plane);
    loadedModels.push(plane);

    // Update OrbitControls target
    controls.target.set(0, 0, 0);
    controls.update();

    // --- Finally, preload the *next* model in background ---
    const nextIndex = (currentIndex + 1) % assets[currentCategory].length;
    preloadModel(currentCategory, nextIndex);
}

/****************************************
 *      4. UI Functions (Next/Prev)     *
 ****************************************/
const categoryDropdown = document.getElementById("category");

function switchCategory() {
    currentCategory = categoryDropdown.value;
    currentIndex = 0;
    loadModel();
}

function nextModel() {
    currentIndex = (currentIndex + 1) % assets[currentCategory].length;
    loadModel();
}

function prevModel() {
    currentIndex =
        (currentIndex - 1 + assets[currentCategory].length) %
        assets[currentCategory].length;
    loadModel();
}

/****************************************
 *     5. Initial Setup & Rendering     *
 ****************************************/
loadTableModel();   // Table persists
loadModel();        // Load initial food model

// Handle window resize
window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Render loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();