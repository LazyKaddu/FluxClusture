import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

/**
 * Encodes an array of ImageData frames into an MP4 video Blob.
 */
export async function encodeFramesToMP4(frames, width, height, fps = 30) {
    const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
            codec: 'avc',
            width,
            height
        },
        fastStart: 'in-memory'
    });

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error("VideoEncoder error:", e)
    });

    videoEncoder.configure({
        codec: 'avc1.4d0033', // H.264 Main Profile Level 5.1
        width,
        height,
        bitrate: 6_000_000,   // 6 Mbps for high quality
        framerate: fps
    });

    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });

    const frameMicroseconds = (1 / fps) * 1_000_000;

    for (let i = 0; i < frames.length; i++) {
        // Draw the stored frame data to our offscreen encoding canvas
        ctx.putImageData(frames[i], 0, 0);

        const videoFrame = new VideoFrame(offscreen, {
            timestamp: i * frameMicroseconds,
            duration: frameMicroseconds
        });

        // Insert a keyframe every 30 frames
        const keyFrame = i % 30 === 0;
        videoEncoder.encode(videoFrame, { keyFrame });

        // Free GPU memory immediately after encoding the frame
        videoFrame.close();
    }

    await videoEncoder.flush();
    muxer.finalize();

    const { buffer } = muxer.target;
    return new Blob([buffer], { type: 'video/mp4' });
}