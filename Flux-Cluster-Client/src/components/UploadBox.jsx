import React, { useState, useRef } from 'react'
import ModelCanvas from './Model';

const UploadBox = ({ file, setFile, loading, setLoading, previewUrl, setPreviewUrl }) => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFile = (selectedFile) => {
        if (!selectedFile) return;

        if (!selectedFile.name.toLowerCase().endsWith(".glb")) {
            alert("Only .glb files are allowed");
            return;
        }

        setFile(selectedFile);
        setLoading(true);

        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        setLoading(false);
    };

    const handleFile = (e) => {
        const selectedFile = e.target.files?.[0];
        processFile(selectedFile);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        processFile(droppedFile);
    };

    const resetUpload = (e) => {
        if (e) e.stopPropagation();
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl(null);
        setFile(null);
        setLoading(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="w-full h-full relative select-none">
            {/* UPLOAD / DROPZONE */}
            {!loading && !previewUrl && (
                <div
                    className={`w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 border-2 border-dashed ${
                        isDragging
                            ? 'border-white bg-white/10 scale-[0.99]'
                            : 'border-white/20 hover:border-white/50 bg-black/40'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".glb"
                        className="hidden"
                        onChange={handleFile}
                    />

                    <div className="w-12 h-12 mb-3 border border-white/30 flex items-center justify-center bg-black transition-transform duration-200 group-hover:scale-105">
                        <img src="/upload.png" alt="upload" className="w-6 h-6 invert opacity-90" />
                    </div>

                    <p className="text-xs uppercase tracking-widest text-white font-bold mb-1">
                        {isDragging ? "Drop .GLB To Stage" : "Drop .GLB or Click to Browse"}
                    </p>
                    <span className="text-[10px] tracking-wider text-gray-500 uppercase">
                        glTF 2.0 Binary Payload (Max 150MB)
                    </span>
                </div>
            )}

            {/* LOADING */}
            {loading && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black/60">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="mt-4 text-xs uppercase tracking-widest text-white/70">
                        Indexing BVH & Mesh...
                    </p>
                </div>
            )}

            {/* PREVIEW */}
            {!loading && previewUrl && (
                <div className="w-full h-full relative">
                    <ModelCanvas url={previewUrl} />

                    {/* Model Tag */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 border border-white/20 text-[10px] text-gray-400 font-mono tracking-widest uppercase truncate max-w-[60%] pointer-events-none">
                        {file?.name || "MODEL_LOADED"}
                    </div>

                    {/* Delete button with polygon clip-path */}
                    <div
                        className="absolute bottom-0 right-0 cursor-pointer z-10 group"
                        style={{ filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.8))' }}
                        onClick={resetUpload}
                    >
                        <div
                            className="p-1 pl-8 bg-black text-white text-[11px] uppercase tracking-wider group-hover:bg-white group-hover:text-black transition-colors"
                            style={{ clipPath: 'polygon(40% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
                        >
                            delete
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UploadBox
