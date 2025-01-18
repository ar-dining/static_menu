import express from 'express';
const app = express();

const PORT = 3000;

// Sample data simulating a database
const assets = {
    starters: [
        { id: 1, name: "Plant", url: "https://cdn.example.com/starters/plant.glb" },
        { id: 2, name: "Random", url: "https://cdn.example.com/starters/random.glb" },
    ],
    main: [
        { id: 1, name: "Noodles", url: "https://cdn.example.com/mains/noodles.glb" },
        { id: 2, name: "Mandu", url: "https://cdn.example.com/mains/mandu.glb" },
    ],
};

// API to fetch metadata
app.get('/api/assets/:category', (req, res) => {
    const category = req.params.category;
    res.json(assets[category] || []);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
