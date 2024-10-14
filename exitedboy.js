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

// Variables for probability-driven reaction states
let currentState = "neutral"; // Default starting state

// Variables for panic mode
let isPanic = false; // To track panic state
let panicStartTime = 0; // To record when panic started
let panicDuration = 5000; // Duration for panic effect (5 seconds)

// Variables for boredClose mode
let isBoredClose = false; // To track boredClose state
let boredStartTime = 0; // To record when boredClose started
let boredDuration = 5000; // Duration for boredClose effect (5 seconds)

// Variables for happyClose mode
let isHappyClose = false; // To track happyClose state
let happyStartTime = 0; // To record when happyClose started
let happyDuration = 5000; // Duration for happyClose effect (10 seconds)

function setup() {
  createCanvas(800, 800); // Main canvas for the pulsating orb and video
  background(0);

  // Pulsating orb settings
  baseRadius = 10;
  maxRadius = 100;

  // Define the color gradient: coldColor (blue) and hotColor (red)
  coldColor = color(0, 0, 255); // Blue
  hotColor = color(255, 0, 0); // Red
  greenColor = color(0, 255, 0); // Green

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

  // Randomly decide which state the orb will be in based on probability
  chooseState();

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

  // Define orb color based on the current state
  let orbColor;
  if (isPanic) {
    orbColor = color(0, 255, 0); // Green color when panicking
  } else if (isBoredClose) {
    orbColor = color(155, 155, 155); // Gray when bored
  } else if (isHappyClose) {
    orbColor = color(255, 223, 0); // Yellow when happy
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
// Choose the state of the orb randomly with different probabilities
function chooseState() {
  let randomValue = random(); // Generates a random number between 0 and 1
  let happyProbability = 0.4; // 40% chance for happy
  let boredProbability = 0.3; // 30% chance for bored
  let scaredProbability = 0.2; // 20% chance for scared

  if (randomValue < happyProbability) {
    currentState = "happy";
    if (!isHappyClose) {
      isHappyClose = true;
      happyStartTime = millis(); // Start the Happy timer
      console.log("The orb is Happy!");
    }
  } else if (randomValue < happyProbability + boredProbability) {
    currentState = "bored";
    if (!isBoredClose) {
      isBoredClose = true;
      boredStartTime = millis(); // Start the bored timer
      console.log("The orb is Bored!");
    }
  } else if (
    randomValue <
    happyProbability + boredProbability + scaredProbability
  ) {
    currentState = "scared";
    if (!isPanic) {
      isPanic = true;
      panicStartTime = millis(); // Start the panic timer
      console.log("The orb is Scared!");
    }
  } else {
    currentState = "neutral";
    console.log("The orb is Neutral.");
  }

  // Reset states after durations
  resetStates();
}

// Reset the states after their respective durations
function resetStates() {
  // Check if panic duration has elapsed
  if (isPanic && millis() - panicStartTime > panicDuration) {
    isPanic = false; // Reset panic mode
    console.log("The orb has calmed down from panic.");
  }

  // Check if boredClose duration has elapsed
  if (isBoredClose && millis() - boredStartTime > boredDuration) {
    isBoredClose = false; // Reset boredClose mode
    console.log("The orb is no longer bored.");
  }

  // Check if HappyClose duration has elapsed
  if (isHappyClose && millis() - happyStartTime > happyDuration) {
    isHappyClose = false; // Reset HappyClose mode
    console.log("The orb is no longer Happy.");
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

// Function to draw the pulsating orb
function drawPulsatingOrb(xCenter, yCenter, radius, numPoints, orbColor) {
  let angleStep = TWO_PI / numPoints;

  for (let i = 0; i < numPoints; i++) {
    let angle = i * angleStep;

    // Calculate the coordinates for each point of the pulsating orb
    let noiseFactor = noise(i * 0.1, frameCount * 0.01);
    let adjustedRadius = radius + map(noiseFactor, 0, 1, -10, 10); // Adjust radius with noise for pulsation

    let x = xCenter + cos(angle) * adjustedRadius;
    let y = yCenter + sin(angle) * adjustedRadius;

    // Set the color and draw the orb
    fill(orbColor);
    noStroke();
    ellipse(x, y, 5, 5); // Draw small circles to form the orb
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
        fill(255, 0, 0); // Red for detected keypoints
        ellipse(keypoint.position.x + width - 320, keypoint.position.y, 10, 10); // Draw keypoints
      }
    }
  }
}
