import React, { useState } from 'react'
import ModelCanvas from './Model';





const UploadBox = () => {

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

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

                    <label className="cursor-pointer">
                        <input
                            type="file"
                            accept=".glb"
                            className="hidden"
                            onChange={handleFile}
                        />

                        <div className="border border-white p-10">
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
                    <div className='absolute bottom-0 right-0 p-2' onClick={resetUpload}>delete</div>

                </div>
            )}

        </div>
    )
}

export default UploadBox
