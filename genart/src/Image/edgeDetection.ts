/**
 * @param data - input pixels data
 * @param idx - the index of the central pixel
 * @param w - image width (width*4 in case of RGBA)
 * @param m - the gradient mask (for Sobel=[1, 2, 1])
 */
function conv3x(data, idx, w, m) {
  return (
    m[0] * data[idx - w - 4] +
    m[1] * data[idx - 4] +
    m[2] * data[idx + w - 4] -
    m[0] * data[idx - w + 4] -
    m[1] * data[idx + 4] -
    m[2] * data[idx + 4 + 4]
  )
}

function conv3y(data, idx, w, m) {
  return (
    m[0] * data[idx - w - 4] +
    m[1] * data[idx - w] +
    m[2] * data[idx - w + 4] -
    (m[0] * data[idx + w - 4] + m[1] * data[idx + w] + m[2] * data[idx + w + 4])
  )
}

/**
 * @param pixels - Object of image parameters
 * @param
 */
export function edgeDetection(pixels: Uint8ClampedArray, width: number) {
  // mask - gradient operator e.g. Prewitt, Sobel, Scharr, etc.
  const mask = [1, 2, 1]
  var data = pixels
  var w = width * 4
  var l = data.length - w - 4
  var edges = new Uint8ClampedArray(data.length)

  for (var i = w + 4; i < l; i += 4) {
    var dx = conv3x(data, i, w, mask)
    var dy = conv3y(data, i, w, mask)
    edges[i] = edges[i + 1] = edges[i + 2] = Math.sqrt(dx * dx + dy * dy)
    edges[i + 3] = 255
  }
  return edges
}
