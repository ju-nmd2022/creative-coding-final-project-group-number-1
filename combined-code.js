let video;
let poseNet;
let poses = [];

let baseRadius;
let maxRadius;
let pulseSpeed = 0.025;
let Rcolor, Gcolor, Bcolor;
let insideSquare = true; // Track whether the orb is inside the square

let squareSize; // Size of the square boundary

function setup() {
  createCanvas(800, 800); // Main canvas for the pulsating orb and video
  background(0);

  // Initialize white color for the pulsating orb
  Rcolor = 0;
  Gcolor = 255;
  Bcolor = 0;

  // Pulsating orb settings
  baseRadius = 10;
  maxRadius = 100;

  // Define the square size for color change
  squareSize = 100; // Size of the square (adjust as needed)

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

  // Draw the square boundary (as a visual aid)
  stroke(255);
  strokeWeight(2);
  noFill();
  rectMode(CENTER); // Draw the square from the center
  rect(width / 2, height / 2, squareSize, squareSize); // Draw the square

  // Pulsating orb animation on the main canvas
  let radius =
    baseRadius + sin(frameCount * pulseSpeed) * (maxRadius - baseRadius);
  drawPulsatingOrb(width / 2, height / 2, radius, 100);

  // Display the PoseNet video and keypoints in the top-right corner
  drawPoseNetVideo();
}

// Function to draw the pulsating orb
function drawPulsatingOrb(xCenter, yCenter, radius, numPoints) {
  // Determine if the orb's radius is larger or smaller than the square's half size
  let isLarger = radius > squareSize / 2;

  // If the orb crosses the boundary from inside to outside, or vice versa, change the color
  if (isLarger && insideSquare) {
    // Orb has grown larger than the square, change to red
    console.log(color);
    Rcolor = 255;
    Gcolor = 0;
    Bcolor = 0; // Red when the orb is larger than the square
    insideSquare = false; // Mark that the orb is now outside the square
  } else if (!isLarger && !insideSquare) {
    // Orb has shrunk smaller than the square, change to green
    Rcolor = 0;
    Gcolor = 255;
    Bcolor = 0; // Green when the orb is smaller than the square
    insideSquare = true; // Mark that the orb is now inside the square
  }

  // Drawing the pulsating orb
  let angleStep = TWO_PI / numPoints;
  for (let i = 0; i < numPoints; i++) {
    let angle = i * angleStep;
    let noiseFactor = noise(i * 0.1, frameCount * 0.01);
    let adjustedRadius = radius + map(noiseFactor, 0, 1, -10, 10);

    let x = xCenter + cos(angle) * adjustedRadius;
    let y = yCenter + sin(angle) * adjustedRadius;

    fill(Rcolor, Gcolor, Bcolor);
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
