/****************************************
 *     1. Setup Scene, Camera, Renderer *
 ****************************************/
const canvas = document.getElementById("sceneCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Create scene
const scene = new THREE.Scene();

// Load a panoramic background
const textureLoader = new THREE.TextureLoader();
textureLoader.load("assets/panoramas/uzbek1.jpg", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
});

// Create camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 1.6, 3);

// Orbit Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

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
const loader = new THREE.GLTFLoader();
const assets = {
    starters: ["assets/starters/plant.glb", "assets/starters/random.glb"],
    main: ["assets/mains/noodles.glb", "assets/mains/mandu.glb", "assets/mains/beef_rice.glb"],
    desserts: ["assets/deserts/milk.glb", "assets/deserts/Muffin.glb"],
};

let currentCategory = "starters";
let currentIndex = 0;
let currentModel = null;

function loadModel() {
    const modelPath = assets[currentCategory][currentIndex];

    // Remove previous model
    if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    }

    // Load new model
    loader.load(
        modelPath,
        (gltf) => {
            currentModel = gltf.scene;
            scene.add(currentModel);
            currentModel.scale.set(5, 5, 5);

            // Center the model
            const box = new THREE.Box3().setFromObject(currentModel);
            const center = box.getCenter(new THREE.Vector3());
            currentModel.position.sub(center);

            // Update OrbitControls target
            controls.target.set(0, 0, 0);
            controls.update();
        },
        undefined,
        (error) => console.error("Error loading model:", error)
    );
}

/****************************************
 * 4. UI Functions                      *
 ****************************************/
function switchCategory() {
    currentCategory = document.getElementById("category").value;
    currentIndex = 0;
    loadModel();
}

function nextModel() {
    currentIndex = (currentIndex + 1) % assets[currentCategory].length;
    loadModel();
}

function prevModel() {
    currentIndex = (currentIndex - 1 + assets[currentCategory].length) % assets[currentCategory].length;
    loadModel();
}

/****************************************
 * 5. Handle Window Resize              *
 ****************************************/
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/****************************************
 * 6. Render Loop                      *
 ****************************************/
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Load the initial model
loadModel();
