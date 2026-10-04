// GPU launch flags per platform, and a check that WebGL really runs on a GPU.
// Headless Chromium falls back to software rendering (SwiftShader / llvmpipe) when it can't reach the GPU:
// the frames are still correct, just many times slower. WebGL pieces set TIMELINE.gpu (or pass --gpu).
export const GPU_ARGS = process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']
  : process.platform === 'darwin' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']
  : ['--use-angle=vulkan', '--enable-features=Vulkan', '--enable-gpu', '--ignore-gpu-blocklist'];

export async function gpuReport(page) {
  const r = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return { ok: false, renderer: 'no WebGL' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return { ok: !/swiftshader|llvmpipe|software|basic render/i.test(renderer), renderer };
  });
  if (r.ok) console.log(`gpu: ${r.renderer}`);
  else console.warn(`WARNING: no GPU for WebGL (${r.renderer}). Rendering falls back to software: correct but much slower. ` +
    (process.platform === 'win32' ? 'Check the graphics driver.' : 'GPU flags are best on Windows (ANGLE/D3D11); on macOS/Linux expect software rendering in headless mode, or run with a display.'));
  return r;
}
