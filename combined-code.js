let video;
let poseNet;
let poses = [];

let baseRadius;
let maxRadius;
let pulseSpeed = 0.0075;

let coldColor, hotColor; // Define the cold and hot colors

function setup() {
  createCanvas(800, 800); // Main canvas for the pulsating orb and video
  background(0);

  // Pulsating orb settings
  baseRadius = 10;
  maxRadius = 100;

  // Define the color gradient: coldColor (blue) and hotColor (red)
  coldColor = color(0, 0, 255); // Blue
  hotColor = color(255, 0, 0); // Red

  // Set up video capture and PoseNet
  video = createCapture(VIDEO);
  video.size(320, 240); // Smaller size for the top-right video
  video.hide(); // Hide the video element, display only on canvas

  // Create PoseNet method
  if (ml5 !== undefined && ml5.poseNet !== undefined) {
    poseNet = ml5.poseNet(video, modelReady);
    poseNet.on("pose", function (results) {
      poses = results;
    });
  } else {
    console.error("ml5 or poseNet is not loaded properly");
  }
}

function modelReady() {
  console.log("PoseNet model loaded");
}

function draw() {
  background(0, 20); // Fading background for orb trail effect

  // Update the baseRadius and maxRadius based on keypoints
  updateOrbSize();

  // Pulsating orb animation on the main canvas
  let radius =
    baseRadius + abs(sin(frameCount * pulseSpeed)) * (maxRadius - baseRadius); // Using abs(sin()) to keep radius positive

  // Map the radius to a color scale from coldColor to hotColor
  let t = map(radius, baseRadius, maxRadius, 0, 1); // `t` is the interpolation factor between 0 and 1
  let orbColor = lerpColor(coldColor, hotColor, t); // Interpolates between blue and red

  // Draw the pulsating orb with the interpolated color
  drawPulsatingOrb(width / 2, height / 2, radius, 100, orbColor);

  // Display the PoseNet video and keypoints in the top-right corner
  drawPoseNetVideo();
}

// Function to update the baseRadius and maxRadius based on the area covered by the keypoints
function updateOrbSize() {
  if (poses.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    // Calculate the bounding box of all keypoints
    for (let i = 0; i < poses.length; i++) {
      let pose = poses[i].pose;
      for (let j = 0; j < pose.keypoints.length; j++) {
        let keypoint = pose.keypoints[j];
        if (keypoint.score > 0.1) {
          // Only consider keypoints with a certain score
          minX = min(minX, keypoint.position.x);
          minY = min(minY, keypoint.position.y);
          maxX = max(maxX, keypoint.position.x);
          maxY = max(maxY, keypoint.position.y);
        }
      }
    }

    // Calculate the width and height of the bounding box
    let width = maxX - minX;
    let height = maxY - minY;

    // Calculate the area of the bounding box
    let area = width * height;

    // Exaggeration factor for baseRadius and maxRadius
    let exaggerationFactor = 2;

    // Map the area to the baseRadius and maxRadius with exaggeration
    baseRadius = map(area, 0, 640 * 480, 10, 100) * exaggerationFactor; // Adjust the values as needed
    maxRadius = map(area, 0, 640 * 480, 20, 200) * exaggerationFactor; // Adjust the values as needed

    // Optional: Clamp the radius to avoid excessive sizes
    baseRadius = constrain(baseRadius, 10, 200); // Set minimum and maximum limits
    maxRadius = constrain(maxRadius, 20, 300); // Set minimum and maximum limits
  }
}

// Function to draw the pulsating orb
function drawPulsatingOrb(xCenter, yCenter, radius, numPoints, orbColor) {
  let angleStep = TWO_PI / numPoints;
  for (let i = 0; i < numPoints; i++) {
    let angle = i * angleStep;

    // Adding noise to adjust the radius for each point
    let noiseFactor = noise(i * 0.1, frameCount * 0.01);
    let adjustedRadius = radius + map(noiseFactor, 0, 1, -10, 10); // Randomly adjust radius with noise

    let x = xCenter + cos(angle) * adjustedRadius;
    let y = yCenter + sin(angle) * adjustedRadius;

    fill(orbColor);
    noStroke();
    ellipse(x, y, 5, 5);
  }
}

// Function to draw the PoseNet video and detected keypoints
function drawPoseNetVideo() {
  // Draw the video in the top-right corner
  image(video, width - 320, 0, 320, 240);

  // Draw the keypoints and skeleton on top of the video
  drawKeypoints(width - 320, 0);
  drawSkeleton(width - 320, 0);
}

// Function to draw ellipses over the detected keypoints
function drawKeypoints(xOffset, yOffset) {
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i].pose;
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      if (keypoint.score > 0.1) {
        fill(255, 0, 0); // Red keypoints
        noStroke();
        ellipse(
          keypoint.position.x + xOffset,
          keypoint.position.y + yOffset,
          4,
          4
        );
      }
    }
  }
}

// Function to draw skeletons
function drawSkeleton(xOffset, yOffset) {
  for (let i = 0; i < poses.length; i++) {
    let skeleton = poses[i].skeleton;
    for (let j = 0; j < skeleton.length; j++) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      stroke(255, 0, 0); // Red skeleton lines
      strokeWeight(2);
      line(
        partA.position.x + xOffset,
        partA.position.y + yOffset,
        partB.position.x + xOffset,
        partB.position.y + yOffset
      );
    }
  }
}
