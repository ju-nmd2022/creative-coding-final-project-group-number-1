let video;
let poseNet;
let poses = [];

let baseRadius;
let maxRadius;
let pulseSpeed = 0.0075; // Initial pulse speed factor

let coldColor, hotColor; // Define the cold and hot colors

let previousKeypoints = []; // To store keypoints from the previous frame
let movementSpeed = 0; // Average speed of keypoints
let transitionFactor = 0.02; // Factor to adjust how fast size changes

// Reactionstate
let reactionStateNeutural = false;
let reactionStateBored = false;
let reactionStateScared = true;

console.log(reactionStateNeutural);
console.log(reactionStateBored);
console.log(reactionStateScared);

// Variables for panic mode
let isPanic = false; // To track panic state
let panicStartTime = 0; // To record when panic started
let panicDuration = 1000; // Duration for panic effect (1 second)

function setup() {
  createCanvas(800, 800); // Main canvas for the pulsating orb and video
  background(0);

  // Pulsating orb settings
  baseRadius = 10;
  maxRadius = 100;

  // Define the color gradient: coldColor (blue) and hotColor (red)
  coldColor = color(0, 0, 255); // Blue
  hotColor = color(255, 0, 0); // Red
  greenColor = color(0, 255, 0); //geen

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

  // Pulsating orb animation on the main canvas
  let radius =
    baseRadius + abs(sin(frameCount * pulseSpeed)) * (maxRadius - baseRadius); // Using abs(sin()) to keep radius positive

  // Define a threshold for the radius to change color
  let colorThreshold = 130; // Threshold for changing color

  // Map the radius to a color scale only if it exceeds the threshold
  let t = 0; // Initialize t
  if (radius > colorThreshold) {
    t = map(radius, colorThreshold, maxRadius, 0, 1);
  }
  // Define orb color based on panic state
  let orbColor;
  if (isPanic) {
    orbColor = color(0, 255, 0); // Green color when panicking
  } else {
    orbColor = lerpColor(coldColor, hotColor, t); // Interpolates between cold and hot color
  }
  // Draw the pulsating orb with the interpolated color
  drawPulsatingOrb(width / 2, height / 2, radius, 100, orbColor);

  // Display the PoseNet video and keypoints in the top-right corner
  drawPoseNetVideo();
}

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
    let exaggerationFactor = 4;

    // Map the area to the baseRadius and maxRadius with exaggeration
    baseRadius = lerp(
      baseRadius,
      map(area, 0, 640 * 480, 10, 100) * exaggerationFactor,
      transitionFactor
    );
    maxRadius = lerp(
      maxRadius,
      map(area, 0, 640 * 480, 20, 200) * exaggerationFactor,
      transitionFactor
    );

    // Clamp maxRadius to ensure it's large enough
    maxRadius = constrain(maxRadius, 100, 600); // Example range

    // Optional: Adjust the transition factor based on speed
    updateTransitionSpeedWithMovement();
  }
}

// Function to adjust the transition factor based on keypoint movement speed
function updateTransitionSpeedWithMovement() {
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
    transitionFactor = map(movementSpeed, 0, 100, 0.01, 0.3); // Increased max value for more sensitivity
  }

  // Store the current keypoints for the next frame
  previousKeypoints = poses;
}

// Function to draw the orb without movement when bored
function drawPulsatingOrb(xCenter, yCenter, radius, numPoints, orbColor) {
  let angleStep = TWO_PI / numPoints;

  for (let i = 0; i < numPoints; i++) {
    let angle = i * angleStep;

    if (reactionStateNeutural == true) {
      // Neutural state: Pulsating behavior with noise
      let noiseFactor = noise(i * 0.1, frameCount * 0.01);
      let adjustedRadius = radius + map(noiseFactor, 0, 1, -10, 10); // Adjust radius with noise

      let x = xCenter + cos(angle) * adjustedRadius;
      let y = yCenter + sin(angle) * adjustedRadius;

      fill(orbColor);
      noStroke();
      ellipse(x, y, 5, 5);
    } else if (reactionStateBored == true) {
      // Bored state: Fixed radius, no pulsation or movement
      let adjustedRadius = radius; // Keep the radius fixed

      let x = xCenter + cos(angle) * adjustedRadius;
      let y = yCenter + sin(angle) * adjustedRadius;

      fill(155, 155, 155);
      noStroke();
      ellipse(x, y, 5, 5);
    } else if (reactionStateScared == true) {
      let noiseFactor = noise(i * 10, frameCount * 0.01);
      let adjustedRadius = radius + map(noiseFactor, 0, 1, -10, 10); // Adjust radius with noise

      let x = xCenter + cos(angle) * adjustedRadius;
      let y = yCenter + sin(angle) * adjustedRadius;

      fill(orbColor);
      noStroke();
      ellipse(x, y, 5, 5);
    }
  }
  giveOrbPersonality(radius, orbColor);
}

// Function to give the orb personality and react based on size and color
function giveOrbPersonality(radius, orbColor) {
  if (poses.length > 0) {
    let pose = poses[0].pose;
    let nose = pose.keypoints[0].position; // Nose (index 0)
    let leftEye = pose.keypoints[1].position; // Left eye (index 1)
    let rightEye = pose.keypoints[2].position; // Right eye (index 2)
    let leftEar = pose.keypoints[3].position; // Left ear (index 3)
    let rightEar = pose.keypoints[4].position; // Right ear (index 4)

    // Calculate the width and height of the "face" bounding box
    let faceWidth = dist(leftEar.x, leftEar.y, rightEar.x, rightEar.y);
    let faceHeight = dist(
      nose.x,
      nose.y,
      (leftEye.x + rightEye.x) / 2,
      (leftEye.y + rightEye.y) / 2
    );

    let faceArea = faceWidth * faceHeight; // Approximate face area

    // Probability of panic when face area indicates closeness
    if (reactionStateScared === true && faceArea > 10000) {
      // Calculate probability
      let probability = 0;
      if (reactionStateScared === true && faceArea > 10000) {
        // Face is close
        probability = 0.005; // 0.5% probability to panic but is pretty high due to millis counting system.
      } else {
        probability = 0.0005; // Low probability when not close
      }

      // Random chance to trigger the panic response
      if (random(1) < probability) {
        if (!isPanic) {
          // Check if not already in panic
          isPanic = true; // Set panic mode
          panicStartTime = millis(); // Record the start time of panic
        }
        pulseSpeed = 0.03; // Increase pulse speed when close
        baseRadius = lerp(baseRadius, 30, 0.1); // Reduce the orb size
        console.log("You're too close! The orb is panicking!");
      }
    } else {
      pulseSpeed = 0.0075; // Normal pulse speed
    }
  }

  // Check if panic duration has elapsed
  if (isPanic && millis() - panicStartTime > panicDuration) {
    isPanic = false; // Reset panic mode
    console.log("The orb has calmed down.");
  }
}

// Function to draw PoseNet video feed and keypoints
function drawPoseNetVideo() {
  image(video, width - 320, 0); // Draw video in top-right corner
  stroke(255);
  strokeWeight(2);
  for (let i = 0; i < poses.length; i++) {
    let keypoints = poses[i].pose.keypoints;
    for (let j = 0; j < keypoints.length; j++) {
      let keypoint = keypoints[j];
      if (keypoint.score > 0.2) {
        fill(255, 0, 0); // Green for detected keypoints
        ellipse(keypoint.position.x + width - 320, keypoint.position.y, 10, 10); // Draw keypoints
      }
    }
  }
}
