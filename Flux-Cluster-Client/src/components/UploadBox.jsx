import React, { useState, useRef } from 'react';
import ModelCanvas from './Model';

const UploadBox = ({ file, setFile, loading, setLoading, previewUrl, setPreviewUrl }) => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFile = (selectedFile) => {
        if (!selectedFile) return;

        if (!selectedFile.name.toLowerCase().endsWith(".glb")) {
            alert("Only .glb files are supported.");
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
            {/* Upload dropzone */}
            {!loading && !previewUrl && (
                <div
                    className={`w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors border border-dashed rounded-lg ${
                        isDragging
                            ? 'border-[#AF3240] bg-[#AF3240]/5'
                            : 'border-white/[0.12] hover:border-white/[0.24] bg-[#0f0f10]'
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

                    <div className="w-10 h-10 mb-3 rounded-lg border border-white/[0.08] bg-[#19191b] flex items-center justify-center text-[#85858b]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                    </div>

                    <p className="text-xs font-mono font-medium text-[#ededed] mb-1">
                        {isDragging ? "Drop .glb model to load" : "Select or drag .glb 3D asset"}
                    </p>
                    <span className="text-[11px] font-mono text-[#85858b]">
                        Binary glTF 2.0 asset (up to 150MB)
                    </span>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0f10] rounded-lg">
                    <div className="w-7 h-7 border-2 border-white/20 border-t-[#AF3240] rounded-full animate-spin" />
                    <p className="mt-3 text-xs font-mono text-[#a1a1a6]">
                        Indexing mesh and BVH acceleration...
                    </p>
                </div>
            )}

            {/* 3D Preview */}
            {!loading && previewUrl && (
                <div className="w-full h-full relative rounded-lg overflow-hidden bg-[#0f0f10]">
                    <ModelCanvas url={previewUrl} />

                    {/* File tag */}
                    <div className="absolute top-2 left-2 px-2.5 py-1 bg-[#141415]/90 backdrop-blur-sm border border-white/[0.08] rounded text-xs font-mono text-[#a1a1a6] truncate max-w-[70%] pointer-events-none">
                        {file?.name || "Model loaded"}
                    </div>

                    {/* Clear button */}
                    <button
                        type="button"
                        onClick={resetUpload}
                        className="absolute bottom-2 right-2 px-2.5 py-1 bg-[#141415]/90 hover:bg-[#232325] text-xs font-mono text-[#85858b] hover:text-[#ededed] border border-white/[0.08] rounded transition-colors cursor-pointer"
                    >
                        Replace model
                    </button>
                </div>
            )}
        </div>
    );
};

export default UploadBox;
