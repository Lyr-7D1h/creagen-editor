// 5x5 gaussian filter master
function calcKernel() {
  const kernel = []
  for (let i = 0; i < 5; i++) {
    kernel[i] = []
    for (let j = 0; j < 5; j++) {
      kernel[i][j] = Math.exp(-((i - 2) ** 2 + (j - 2) ** 2) / 2)
    }
  }
  return kernel
}
