import React, { useState } from 'react'
import ModelCanvas from './Model';





const UploadBox = ({ file, setFile, loading, setLoading, previewUrl, setPreviewUrl }) => {

    const handleFile = async (e) => {
        const selectedFile = e.target.files?.[0];

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

    const resetUpload = () => {
        // Remove the GLB object URL from the browser
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        // Reset everything
        setPreviewUrl(null);
        setFile(null);
        setLoading(false);

        // Optional: reset the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="w-full h-full">

            {/* UPLOAD */}
            {!loading && !previewUrl && (
                <div className="w-full h-full flex items-center justify-center">

                    <label className="cursor-pointer flex flex-col items-center">
                        <input
                            type="file"
                            accept=".glb"
                            className="hidden"
                            onChange={handleFile}
                        />

                        <img src="/upload.png" alt="upload--v1" className='w-10 h-10 invert' />
                        <div className="">
                            Upload GLB

                        </div>

                    </label>

                </div>
            )}

            {/* LOADING */}
            {loading && (
                <div className="w-full h-full flex flex-col items-center justify-center">

                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />

                    <p className="mt-4 text-white/60">
                        Processing model...
                    </p>

                </div>
            )}

            {/* PREVIEW */}
            {!loading && previewUrl && (
                <div className="w-full h-full">

                    <ModelCanvas url={previewUrl} />
                    <div
                        className="absolute bottom-0 right-0 cursor-pointer"
                        style={{
                            filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.8))'
                        }}
                        onClick={resetUpload}
                    >
                        <div
                            className="p-1 pl-10 bg-black text-white"
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
