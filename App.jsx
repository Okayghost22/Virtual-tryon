import { useState } from "react";
import axios from "axios";
import "./App.css";

const mongoose = require('mongoose');
mongoose.connect('your-mongodb-connection-string', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error", err));

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);


export default function App() {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [glassesSize, setGlassesSize] = useState(1.0);
  const [glassesYOffset, setGlassesYOffset] = useState(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const drawImageOnCanvas = (imageUrl) => {
    const canvas = document.getElementById("overlayCanvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  };

  const runFaceMeshOnImage = async (imageUrl) => {
    const calculateAngle = (x1, y1, x2, y2) => {
      return Math.atan2(y2 - y1, x2 - x1);
    };

    const canvas = document.getElementById("overlayCanvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = async () => {
      console.log("Running FaceMesh...");

      const faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7, // Higher confidence for better detection
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        if (results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];

          // ✅ IMPROVED LANDMARK SELECTION
          // Use better landmarks for glasses positioning
          const noseBridge = landmarks[6];      // Top of nose bridge
          const leftEyeInner = landmarks[133];  // Inner corner of left eye  
          const rightEyeInner = landmarks[362]; // Inner corner of right eye
          const leftEyeOuter = landmarks[33];   // Outer corner of left eye
          const rightEyeOuter = landmarks[263]; // Outer corner of right eye

          // Calculate center point between inner eye corners (more accurate)
          const leftInnerX = leftEyeInner.x * canvas.width;
          const leftInnerY = leftEyeInner.y * canvas.height;
          const rightInnerX = rightEyeInner.x * canvas.width;
          const rightInnerY = rightEyeInner.y * canvas.height;

          // Use outer eye corners for width calculation
          const leftOuterX = leftEyeOuter.x * canvas.width;
          const leftOuterY = leftEyeOuter.y * canvas.height;
          const rightOuterX = rightEyeOuter.x * canvas.width;
          const rightOuterY = rightEyeOuter.y * canvas.height;

          // ✅ IMPROVED POSITIONING
          const centerX = (leftInnerX + rightInnerX) / 2;
          const centerY = (leftInnerY + rightInnerY) / 2 + glassesYOffset;

          // Use outer eye distance for more accurate scaling
          const eyeDistance = Math.hypot(rightOuterX - leftOuterX, rightOuterY - leftOuterY);

          // ✅ BETTER SCALING - glasses should span from outer eye to outer eye
          const glassesWidth = eyeDistance * 1.3 * glassesSize; // Reduced multiplier for better fit
          const glassesHeight = glassesWidth * 0.35; // Slightly smaller height ratio

          // Use outer eye corners for rotation angle
          const angle = calculateAngle(leftOuterX, leftOuterY, rightOuterX, rightOuterY);

          // ✅ IMPROVED GLASSES POSITIONING
          const glassesImg = new Image();
          glassesImg.src = "/glasses.png";
          glassesImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Add subtle shadow for depth
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);

            // Draw glasses centered on the nose bridge
            ctx.drawImage(
              glassesImg,
              -glassesWidth / 2,
              -glassesHeight / 2,
              glassesWidth,
              glassesHeight
            );
            ctx.restore();

            // Clear shadow for next drawing
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            console.log("🕶️ Glasses drawn with improved positioning!");
            console.log(`Center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
            console.log(`Size: ${glassesWidth.toFixed(1)} x ${glassesHeight.toFixed(1)}`);
            console.log(`Angle: ${(angle * 180 / Math.PI).toFixed(1)}°`);
          };
        }
      });

      await faceMesh.send({ image: img });
    };
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post(
        "https://81f8ccbb-9720-4f98-a433-c30a7a1f7194-00-1twxpg3j6rgta.sisko.replit.dev/api/upload",
        formData
      );

      const fullImageUrl = `https://81f8ccbb-9720-4f98-a433-c30a7a1f7194-00-1twxpg3j6rgta.sisko.replit.dev${res.data.path}`;
      setImageUrl(fullImageUrl);
      drawImageOnCanvas(fullImageUrl);
      runFaceMeshOnImage(fullImageUrl);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed");
    }
  };

  // Re-process image when sliders change
  const handleSliderChange = () => {
    if (imageUrl) {
      runFaceMeshOnImage(imageUrl);
    }
  };

  return (
    <main style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🕶️ Upload Your Selfie - AR Glasses Try-On</h2>

      <div style={{ marginBottom: '20px' }}>
        <input type="file" onChange={handleFileChange} accept="image/*" />
        <button 
          onClick={handleUpload}
          style={{ 
            marginLeft: '10px', 
            padding: '8px 16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Upload & Try Glasses
        </button>
      </div>

      {/* ✅ NEW: Adjustment Controls */}
      {imageUrl && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>🎛️ Adjust Glasses Fit:</h3>
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <div>
              <label>Size: </label>
              <input 
                type="range" 
                min="0.7" 
                max="1.5" 
                step="0.1" 
                value={glassesSize}
                onChange={(e) => {
                  setGlassesSize(parseFloat(e.target.value));
                  handleSliderChange();
                }}
              />
              <span style={{ marginLeft: '10px' }}>{glassesSize.toFixed(1)}x</span>
            </div>

            <div>
              <label>Vertical Position: </label>
              <input 
                type="range" 
                min="-30" 
                max="30" 
                step="2" 
                value={glassesYOffset}
                onChange={(e) => {
                  setGlassesYOffset(parseInt(e.target.value));
                  handleSliderChange();
                }}
              />
              <span style={{ marginLeft: '10px' }}>{glassesYOffset}px</span>
            </div>
          </div>
        </div>
      )}

      <canvas
        id="overlayCanvas"
        width="640"
        height="480"
        style={{ 
          border: "2px solid #007bff", 
          marginTop: "20px",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
        }}
      ></canvas>

      {imageUrl && (
        <div style={{ marginTop: '20px' }}>
          <h3>📸 Original Image:</h3>
          <img 
            src={imageUrl} 
            alt="Uploaded" 
            width="300" 
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
        </div>
      const express = require('express');
      const cors = require('cors');
      const mongoose = require('mongoose');
      const uploadRoutes = require('./routes/uploadRoutes');
      const authRoutes = require('./routes/authRoutes'); // ✅ NEW

      require("dotenv").config(); // for .env file

      const app = express();

      app.use(cors());
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      // Connect to MongoDB
      mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/tryon", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }).then(() => console.log("✅ MongoDB Connected"))
        .catch((err) => console.error("MongoDB Error:", err));

      // Static route for image serving
      app.use('/uploads', express.static('uploads'));

      // Routes
      app.use('/api/upload', uploadRoutes);
      app.use('/api/auth', authRoutes); // ✅ Add this

      module.exports = app;

      )}
    </main>
  );
}
