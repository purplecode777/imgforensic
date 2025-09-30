import React, { useState, useRef } from 'react';
import { Upload, ImageIcon, Info, AlertCircle, FileText, Camera, Calendar, MapPin, Ruler, Hash } from 'lucide-react';

const ImageForensicTool = () => {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setLoading(true);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setImageUrl(event.target.result);
          extractMetadata(file, img);
          performAnalysis(img, file);
          setLoading(false);
        };
        img.src = event.target.result;
      };
      
      reader.readAsDataURL(file);
    }
  };

  const extractMetadata = (file, img) => {
    const meta = {
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(2) + ' KB',
      fileType: file.type,
      lastModified: new Date(file.lastModified).toLocaleString(),
      dimensions: `${img.width} x ${img.height}`,
      aspectRatio: (img.width / img.height).toFixed(2),
      megapixels: ((img.width * img.height) / 1000000).toFixed(2) + ' MP'
    };
    setMetadata(meta);
  };

  const performAnalysis = (img, file) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Color analysis
    let rTotal = 0, gTotal = 0, bTotal = 0;
    let uniqueColors = new Set();
    let histogram = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0) };
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      rTotal += r;
      gTotal += g;
      bTotal += b;
      
      histogram.r[r]++;
      histogram.g[g]++;
      histogram.b[b]++;
      
      uniqueColors.add(`${r},${g},${b}`);
    }
    
    const totalPixels = pixels.length / 4;
    const avgColor = {
      r: Math.round(rTotal / totalPixels),
      g: Math.round(gTotal / totalPixels),
      b: Math.round(bTotal / totalPixels)
    };
    
    // Detect potential manipulation indicators
    const warnings = [];
    
    // Check for unusual color distribution
    const colorVariety = uniqueColors.size / totalPixels;
    if (colorVariety < 0.01) {
      warnings.push('Low color variety detected - possible compression or editing');
    }
    
    // Check for histogram anomalies
    const rStdDev = calculateStdDev(histogram.r);
    const gStdDev = calculateStdDev(histogram.g);
    const bStdDev = calculateStdDev(histogram.b);
    
    if (rStdDev < 10 || gStdDev < 10 || bStdDev < 10) {
      warnings.push('Unusual histogram distribution - may indicate processing');
    }
    
    // Check file size vs dimensions ratio
    const expectedSize = (img.width * img.height * 3) / 1024;
    const compressionRatio = file.size / 1024 / expectedSize;
    
    if (compressionRatio < 0.01) {
      warnings.push('High compression detected - possible quality loss or re-encoding');
    }
    
    // Edge detection analysis
    const edgeStrength = detectEdges(imageData);
    
    setAnalysis({
      avgColor,
      uniqueColors: uniqueColors.size,
      colorVariety: (colorVariety * 100).toFixed(4) + '%',
      compressionRatio: compressionRatio.toFixed(4),
      edgeStrength: edgeStrength.toFixed(2),
      warnings,
      histogram
    });
  };

  const calculateStdDev = (arr) => {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(avgSquareDiff);
  };

  const detectEdges = (imageData) => {
    const pixels = imageData.data;
    const width = imageData.width;
    let edgeTotal = 0;
    
    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const curr = pixels[idx];
        const right = pixels[idx + 4];
        const down = pixels[idx + width * 4];
        
        const gradientX = Math.abs(curr - right);
        const gradientY = Math.abs(curr - down);
        edgeTotal += Math.sqrt(gradientX * gradientX + gradientY * gradientY);
      }
    }
    
    return edgeTotal / (width * imageData.height);
  };

  const generateReport = () => {
    const report = `
IMAGE FORENSIC ANALYSIS REPORT
==============================
Generated: ${new Date().toLocaleString()}

FILE INFORMATION
----------------
File Name: ${metadata.fileName}
File Size: ${metadata.fileSize}
File Type: ${metadata.fileType}
Last Modified: ${metadata.lastModified}

IMAGE PROPERTIES
----------------
Dimensions: ${metadata.dimensions}
Aspect Ratio: ${metadata.aspectRatio}
Megapixels: ${metadata.megapixels}

FORENSIC ANALYSIS
-----------------
Unique Colors: ${analysis.uniqueColors}
Color Variety: ${analysis.colorVariety}
Average Color: RGB(${analysis.avgColor.r}, ${analysis.avgColor.g}, ${analysis.avgColor.b})
Compression Ratio: ${analysis.compressionRatio}
Edge Strength: ${analysis.edgeStrength}

FINDINGS
--------
${analysis.warnings.length > 0 ? analysis.warnings.map((w, i) => `${i + 1}. ${w}`).join('\n') : 'No significant anomalies detected.'}

CONCLUSION
----------
This report provides technical analysis of the image file. Warnings indicate potential
areas of concern but do not definitively prove manipulation. Further investigation may
be required for conclusive forensic determination.
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Camera className="w-12 h-12 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Image Forensic Analysis Tool</h1>
          </div>
          <p className="text-blue-200">Advanced digital forensics for image authentication and analysis</p>
        </div>

        {!imageUrl ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-blue-400/50 rounded-xl p-16 text-center cursor-pointer hover:border-blue-400 hover:bg-white/5 transition-all"
            >
              <Upload className="w-20 h-20 text-blue-400 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-2">Upload Image for Analysis</h3>
              <p className="text-blue-200 mb-4">Click to browse or drag and drop</p>
              <p className="text-sm text-blue-300">Supports: JPG, PNG, GIF, BMP, WebP</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-6 h-6" />
                  Original Image
                </h2>
                <button
                  onClick={() => {
                    setImage(null);
                    setImageUrl(null);
                    setMetadata(null);
                    setAnalysis(null);
                    fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="bg-black/30 rounded-lg p-4 flex items-center justify-center">
                <img src={imageUrl} alt="Uploaded" className="max-h-96 rounded-lg shadow-2xl" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
                  <FileText className="w-6 h-6" />
                  Metadata
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-blue-300 text-sm">File Name</p>
                      <p className="text-white font-mono text-sm break-all">{metadata?.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <Ruler className="w-5 h-5 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-blue-300 text-sm">Dimensions</p>
                      <p className="text-white font-mono">{metadata?.dimensions}</p>
                      <p className="text-blue-300 text-xs mt-1">Aspect Ratio: {metadata?.aspectRatio} | {metadata?.megapixels}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <Hash className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-blue-300 text-sm">File Size & Type</p>
                      <p className="text-white font-mono">{metadata?.fileSize} • {metadata?.fileType}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <Calendar className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-blue-300 text-sm">Last Modified</p>
                      <p className="text-white font-mono text-sm">{metadata?.lastModified}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
                  <AlertCircle className="w-6 h-6" />
                  Forensic Analysis
                </h2>
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-blue-300 text-sm mb-2">Color Analysis</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-12 h-12 rounded-lg border-2 border-white/30"
                        style={{ backgroundColor: `rgb(${analysis?.avgColor.r}, ${analysis?.avgColor.g}, ${analysis?.avgColor.b})` }}
                      />
                      <div>
                        <p className="text-white font-mono text-sm">
                          RGB({analysis?.avgColor.r}, {analysis?.avgColor.g}, {analysis?.avgColor.b})
                        </p>
                        <p className="text-blue-300 text-xs">Average Color</p>
                      </div>
                    </div>
                    <p className="text-white text-sm">Unique Colors: <span className="font-mono">{analysis?.uniqueColors.toLocaleString()}</span></p>
                    <p className="text-white text-sm">Variety: <span className="font-mono">{analysis?.colorVariety}</span></p>
                  </div>
                  
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-blue-300 text-sm mb-1">Technical Metrics</p>
                    <p className="text-white text-sm">Compression Ratio: <span className="font-mono">{analysis?.compressionRatio}</span></p>
                    <p className="text-white text-sm">Edge Strength: <span className="font-mono">{analysis?.edgeStrength}</span></p>
                  </div>

                  {analysis?.warnings.length > 0 && (
                    <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                      <p className="text-yellow-200 font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Potential Concerns
                      </p>
                      <ul className="space-y-1">
                        {analysis.warnings.map((warning, idx) => (
                          <li key={idx} className="text-yellow-100 text-sm">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis?.warnings.length === 0 && (
                    <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <p className="text-green-200 text-sm">✓ No significant anomalies detected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={generateReport}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg transition-colors flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Download Forensic Report
              </button>
            </div>
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ImageForensicTool;