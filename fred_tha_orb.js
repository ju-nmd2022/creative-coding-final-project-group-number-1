let baseRadius;
let maxRadius;
let pulseSpeed = 0.025;
let Rcolor, Gcolor, Bcolor; // Define the color variables outside of setup

function setup() {
  createCanvas(800, 800);
  background(0);

  // Initialize the random colors
  Rcolor = random(0, 255);
  Gcolor = random(0, 255);
  Bcolor = random(0, 255);

  stroke(255);
  noFill();
  frameRate(30); // Faster frame rate for smoother animation
  baseRadius = 10;
  maxRadius = 50;
}

function draw() {
  background(0, 20); // Slight background refresh for a fading trail effect

  // Calculate the current radius with a sine wave for pulsation
  let radius =
    baseRadius + sin(frameCount * pulseSpeed) * (maxRadius - baseRadius);

  // Draw the pulsating orb
  drawPulsatingOrb(width / 2, height / 2, radius, 100);
}

function drawPulsatingOrb(xCenter, yCenter, radius, numPoints) {
  let angleStep = TWO_PI / numPoints;

  for (let i = 0; i < numPoints; i++) {
    let angle = i * angleStep;

    // Use noise to slightly randomize the radius for a "ragged" effect
    let noiseFactor = noise(i * 0.1, frameCount * 0.01);
    let adjustedRadius = radius + map(noiseFactor, 0, 1, -10, 10);

    let x = xCenter + cos(angle) * adjustedRadius;
    let y = yCenter + sin(angle) * adjustedRadius;

    fill(Rcolor, Gcolor, Bcolor); // Use the color variables
    noStroke();
    ellipse(x, y, 5, 5); // Small circles to form the orb
  }
}
