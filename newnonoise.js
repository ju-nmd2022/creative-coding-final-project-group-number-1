let video;
let poseNet;
let poses = [];

let baseRadius;
let maxRadius;
let noiseFactor = 0; // Initial noise factor for the radius

let coldColor, hotColor; // Define the cold and hot colors

let previousKeypoints = []; // To store keypoints from the previous frame
let movementSpeed = 0; // Average speed of keypoints
let transitionFactor = 0.05; // Factor to adjust how fast size changes

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

  // Update the baseRadius and maxRadius based on keypoints and their speed
  updateOrbSize();

  // Calculate the radius using noise
  noiseFactor += 0.01; // Increment noise factor for variety
  let radius = baseRadius + noise(noiseFactor) * (maxRadius - baseRadius); // Random radius based on noise

  // Define a threshold for the radius to change color
  let colorThreshold = maxRadius * 0.8; // Change color only when radius exceeds 80% of maxRadius

  // Map the radius to a color scale only if it exceeds the threshold
  let t =
    radius > colorThreshold ? map(radius, colorThreshold, maxRadius, 0, 1) : 0; // `t` is 0 if below threshold
  let orbColor = lerpColor(coldColor, hotColor, t); // Interpolates between blue and red

  // Draw the pulsating orb with the interpolated color
  drawPulsatingOrb(width / 2, height / 2, radius, 100, orbColor);

  // Display the PoseNet video and keypoints in the top-right corner
  drawPoseNetVideo();
}

// Function to update the baseRadius and maxRadius based on the area covered by the keypoints and movement speed
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

    // Exaggeration factors for baseRadius and maxRadius
    let areaExaggerationFactor = 5; // Increase impact of area on radius
    let speedExaggerationFactor = 0.5; // Increase impact of speed on radius

    // Calculate area-based size changes
    let newBaseRadius =
      map(area, 0, 640 * 480, 10, 100) * areaExaggerationFactor;
    let newMaxRadius =
      map(area, 0, 640 * 480, 20, 200) * areaExaggerationFactor;

    // Lerp to smoothly transition to new sizes
    baseRadius = lerp(baseRadius, newBaseRadius, transitionFactor);
    maxRadius = lerp(maxRadius, newMaxRadius, transitionFactor);

    // Adjust the transition factor based on speed
    updateTransitionSpeedWithMovement(speedExaggerationFactor);
  }
}

// Function to adjust the transition factor based on keypoint movement speed
function updateTransitionSpeedWithMovement(speedExaggerationFactor) {
  if (poses.length > 0 && previousKeypoints.length > 0) {
    let totalSpeed = 0;
    let count = 0;

    // Loop through each keypoint and calculate speed
    for (let i = 0; i < poses.length; i++) {
      let pose = poses[i].pose;
      for (let j = 0; j < pose.keypoints.length; j++) {
        let keypoint = pose.keypoints[j];
        let previousKeypoint = previousKeypoints[i]?.pose?.keypoints[j];

        if (keypoint && previousKeypoint && keypoint.score > 0.1) {
          // Calculate distance moved
          let dx = keypoint.position.x - previousKeypoint.position.x;
          let dy = keypoint.position.y - previousKeypoint.position.y;
          let distance = sqrt(dx * dx + dy * dy); // Euclidean distance

          totalSpeed += distance;
          count++;
        }
      }
    }

    // Calculate the average speed
    if (count > 0) {
      movementSpeed = totalSpeed / count;
    }

    // Map movement speed to the transition factor (how fast the size changes)
    transitionFactor =
      map(movementSpeed, 0, 100, 0.01, 0.5) * speedExaggerationFactor; // Increased max value for more sensitivity
  }

  // Store the current keypoints for the next frame
  previousKeypoints = poses;
}

// Function to draw the pulsating orb
function drawPulsatingOrb(xCenter, yCenter, radius, numPoints, orbColor) {
  let angleStep = TWO_PI / numPoints;
  for (let i = 0; i < numPoints; i++) {
    let angle = i * angleStep;

    // Adjusted radius with noise effect
    let adjustedRadius = radius; // Use noise effect already included in radius calculation

    let x = xCenter + cos(angle) * adjustedRadius;
    let y = yCenter + sin(angle) * adjustedRadius;

    fill(orbColor);
    noStroke();
    ellipse(x, y, 5, 5);
  }

  // Introduce personality and probability
  giveOrbPersonality(radius, orbColor);
}

// Function to give the orb personality and react based on size and color
function giveOrbPersonality(radius, orbColor) {
  // Define thresholds for large and small orb sizes
  let largeThreshold = maxRadius * 0.8;
  let smallThreshold = baseRadius;

  // Define the probability based on the orb's current size
  let probability = 0;

  if (radius > largeThreshold) {
    probability = 0.8; // High probability when orb is large
  } else if (radius < smallThreshold) {
    probability = 0.0005; // Low probability when orb is small
  }
  // Random chance to trigger the response
  if (random(1) < probability) {
    console.log("I will become mad if you don't stop!");
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
