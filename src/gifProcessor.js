import React, { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

function GifProcessor() {
  const [ready, setReady] = useState(false);
  const [gif, setGif] = useState();
  const [result, setResult] = useState();
  const [processing, setProcessing] = useState(false);
  const [fps, setFps] = useState(12);
  const [maxColors, setMaxColors] = useState(128);
  const [scale, setScale] = useState(75);
  const [originalSize, setOriginalSize] = useState(0);
  const [processedSize, setProcessedSize] = useState(0);


  const ffmpegRef = useRef(new FFmpeg());

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd'
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => console.log(message));
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setReady(true);
  }

  useEffect(() => {
    load();
  }, []);

  const processGif = async () => {
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;
    const inputName = 'input.gif';
    await ffmpeg.writeFile(inputName, await fetchFile(gif));

    // Step 1: Initial compression
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', `fps=${fps},split[s0][s1];[s0]palettegen=max_colors=32:stats_mode=full[p];[s1][p]paletteuse=new=1:dither=floyd_steinberg:diff_mode=rectangle`,
      '-gifflags', '-offsetting',
      '-loop', '0',
      'output_compressed.gif'
    ]);

    // Step 2: Further compression
    await ffmpeg.exec([
      '-i', 'output_compressed.gif',
      '-vf', `fps=${fps},split[s0][s1];[s0]palettegen=max_colors=${maxColors}:stats_mode=diff[p];[s1][p]paletteuse=dither=floyd_steinberg:diff_mode=rectangle`,
      '-gifflags', '+transdiff',
      '-loop', '0',
      'output2_compressed.gif'
    ]);

    // Step 3: Resize
    await ffmpeg.exec([
      '-i', 'output2_compressed.gif',
      '-vf', `scale=iw*${scale/100}:ih*${scale/100}`,
      'output_final.gif'
    ]);


    const data = await ffmpeg.readFile('output_final.gif');
    const processedGif = new Blob([data.buffer], { type: 'image/gif' });
    setResult(URL.createObjectURL(processedGif));

    // Set file sizes
    setOriginalSize(gif.size);
    setProcessedSize(processedGif.size);

    setProcessing(false);
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result;
    link.download = 'processed.gif';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return ready ? (
    <div className="gif-processor">
      <div className="input-group">
        <input type="file" onChange={(e) => setGif(e.target.files[0])} />
      </div>
      <div className="input-group">
        <label>FPS:</label>
        <input type="number" value={fps} onChange={(e) => setFps(e.target.value)} />
      </div>
      <div className="input-group">
        <label>Max Colors:</label>
        <input type="number" value={maxColors} onChange={(e) => setMaxColors(e.target.value)} />
      </div>
      <div className="input-group">
        <label>Scale %:</label>
        <input type="number" value={scale} onChange={(e) => setScale(e.target.value)} />
      </div>
      <button onClick={processGif} disabled={!gif || processing}>Process GIF</button>
      {processing && <p className="processing">Processing...</p>}
      <div className="gif-container">
        <div className="gif-box">
          <h3>Original GIF</h3>
          {gif && <img src={URL.createObjectURL(gif)} alt="Original GIF" />}
          {originalSize > 0 && <p>Size: {formatFileSize(originalSize)}</p>}
        </div>
        <div className="gif-box">
          <h3>Processed GIF</h3>
          {result && <img src={result} alt="Processed GIF" />}
          {processedSize > 0 && <p>Size: {formatFileSize(processedSize)}</p>}
        </div>
      </div>
      {result && (
        <div className="download-section">
          <button onClick={handleDownload}>Download Processed GIF</button>
        </div>
      )}
      {originalSize > 0 && processedSize > 0 && (
        <div className="memory-saved">
          <p>Memory saved: {formatFileSize(originalSize - processedSize)}</p>
          <p>Compression ratio: {((processedSize / originalSize) * 100).toFixed(2)}% of the original size</p>
        </div>
      )}
    </div>
  ) : (
    <p>Loading FFmpeg...</p>
  );
}


export default GifProcessor; 