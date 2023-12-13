const socket = new WebSocket(`ws://localhost:29763/spinner/websocket?name=${name}`);

let wheel;

socket.onmessage = (m) => {
  const event = JSON.parse(m.data);
  if (event.type === "config") {
    updateConfig(event.config);
  } else if (event.type === "spin") {
    startSpin();
  }
}

function updateConfig(config) {
  const segments = config.segments;
  let sumWeights = 0;
  const weights = segments.map(segment => segment.weight).filter(s => s);
  if (segments && weights) {
    sumWeights = weights.reduce((sum, weight) => sum + weight, 0);
  }

  const displaySegments = segments.map(segment => ({
    text: segment.label,
    fillStyle: segment.color ?? random_hex_color_code(),
    size: segment.weight ? 360 * segment.weight / sumWeights : undefined
  }))

  wheel = new Winwheel({
    drawMode: config.wheelImage ? 'image': null,
    outerRadius: config.size / 2,      // Set outer radius so wheel fits inside the background.
    innerRadius: config.innerRadius,        // Make wheel hollow so segments don't go all way to center.
    textFontSize: config.textSize,          // Set default font size for the segments.
    textOrientation: 'vertical',                  // Make text vertial so goes down from the outside of wheel.
    textAlignment: 'outer',                       // Align text to outside of wheel.
    numSegments: segments.length,                 // Specify number of segments.
    segments: displaySegments,                           // Define segments including colour and text.
    pins: {
      number: config.pins,
    },
    animation: {                                  // Specify the animation to use.
      type: 'spinToStop',
      duration: config.duration,                         // Duration in seconds.
      spins: config.spins,                                // Default number of complete spins.
     }
  });
  const loadedImg = new Image();
  loadedImg.src = config.wheelImage;
  loadedImg.onload = function () {
    wheel.wheelImage = loadedImg;              // Make wheelImage equal the loaded image object.
    wheel.draw();                              // Also call draw function to render the wheel.
  };
}

function startSpin() {
  wheel.rotationAngle = 0;
  wheel.stopAnimation(false);
  wheel.startAnimation();
}

const random_hex_color_code = () => {
  const n = (Math.random() * 0xfffff * 1000000).toString(16);
  return '#' + n.slice(0, 6);
};