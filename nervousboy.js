let video;
let poseNet;
let poses = [];

let baseRadius;
let maxRadius;
let pulseSpeed = 0.0075; // Initial pulse speed factor

let coldColor, hotColor; // Define the cold and hot colors

let previousKeypoints = [];
let movementSpeed = 0;
let transitionFactor = 0.02; // Factor to adjust how fast size changes

// Reactionstate
let happy = true;
let bored = false;
let scared = false;

console.log("happy " + happy);
console.log("bored " + bored);
console.log("scared " + scared);

// Variables for panic mode
let isPanic = false;
let panicStartTime = 0;
let panicDuration = 5000; // Duration for panic effect (5 second)

//variables for boredClose mode
let isBoredClose = false;
let boredStartTime = 0;
let boredDuration = 5000; // Duration for boredClose effect (5 second)

// Variables for happyClose mode
let isHappyClose = false;
let happyStartTime = 0;
let happyDuration = 5000;

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

  switchReactionState();
  switchCloseReactionState();
}

function modelReady() {
  console.log("PoseNet model loaded");
}

function draw() {
  background(0, 20);

  updateOrbSize();

  let radius =
    baseRadius + abs(sin(frameCount * pulseSpeed)) * (maxRadius - baseRadius);

  let colorThreshold = 130;
  let t = 0;
  if (radius > colorThreshold) {
    t = map(radius, colorThreshold, maxRadius, 0, 1);
  }
  // Define orb color based on panic state
  let orbColor;
  if (isPanic) {
    orbColor = color(255, 0, 0); // red color when panicking
  } else if (isBoredClose) {
    orbColor = color(155, 155, 155);
  } else if (isHappyClose) {
    orbColor = color(255, 223, 0);
  } else {
    orbColor = lerpColor(coldColor, hotColor, t);
  }

  drawPulsatingOrb(width / 2, height / 2, radius, 100, orbColor);

  drawPoseNetVideo();
}

// Function to randomly trigger isPanic, isBoredClose, or isHappyClose
function switchCloseReactionState() {
  let randomDelay = random(1000, 3000); // Random delay between 1 and 3 seconds

  setTimeout(() => {
    let randomValue = random(1); // Get a random number between 0 and 1

    // Reset all close states
    isPanic = false;
    isBoredClose = false;
    isHappyClose = false;

    if (randomValue < 0.005) {
      // 0.5% chance for panic
      isPanic = true;
      panicStartTime = millis(); // Start the panic timer
      console.log("Randomly triggered panic mode.");
    } else if (randomValue < 0.01) {
      // 0.5% chance for boredClose
      isBoredClose = true;
      boredStartTime = millis(); // Start the bored timer
      console.log("Randomly triggered boredClose mode.");
    } else if (randomValue < 0.015) {
      // 0.5% chance for happyClose
      isHappyClose = true;
      happyStartTime = millis(); // Start the happy timer
      console.log("Randomly triggered happyClose mode.");
    }

    // Call switchCloseReactionState again with a new random delay
    switchCloseReactionState();
  }, randomDelay); // Set the timeout with the random delay
}

// Function to switch reaction states automatically with random delay
// got help from chat here
function switchReactionState() {
  let randomDelay = random(8000, 15000); // Random delay between 8 and 15 seconds

  setTimeout(() => {
    let randomValue = random(1); // Get a random number between 0 and 1

    // all the states true or false
    happy = false;
    bored = false;
    scared = false;

    if (randomValue < 0.33) {
      // 33% chance for happy
      happy = true;
      console.log("The orb is now happy.");
    } else if (randomValue < 0.66) {
      // 33% chance for bored
      bored = true;
      console.log("The orb is now bored.");
    } else if (randomValue < 0.99) {
      // 33% chance for scared
      scared = true;
      console.log("The orb is now scared.");
    } else {
      // 1% chance for neutral state (no reaction)
      console.log("The orb is in a neutral state.");
    }

    // Call switchReactionState again with a new random delay
    switchReactionState();
  }, randomDelay); // Set the timeout with the random delay
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

    let width = maxX - minX;
    let height = maxY - minY;

    let area = width * height;

    let exaggerationFactor = 4;

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

    maxRadius = constrain(maxRadius, 100, 600);

    updateTransitionSpeedWithMovement();
  }
}

// got help from chat here
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
          let dx = keypoint.position.x - previousKeypoint.position.x;
          let dy = keypoint.position.y - previousKeypoint.position.y;
          let distance = sqrt(dx * dx + dy * dy);

          totalSpeed += distance;
          count++;
        }
      }
    }

    if (count > 0) {
      movementSpeed = totalSpeed / count;
    }

    transitionFactor = map(movementSpeed, 0, 100, 0.01, 0.3);
  }

  previousKeypoints = poses;
}

// Function to draw the orb without movement when bored
function drawPulsatingOrb(xCenter, yCenter, radius, numPoints, orbColor) {
  let angleStep = TWO_PI / numPoints;

  for (let i = 0; i < numPoints; i++) {
    let angle = i * angleStep;

    if (happy == true) {
      // Happy state with noise
      let noiseFactor = noise(i * 0.1, frameCount * 0.01);
      let adjustedRadius = radius + map(noiseFactor, 0, 1, -10, 10);

      let x = xCenter + cos(angle) * adjustedRadius;
      let y = yCenter + sin(angle) * adjustedRadius;

      fill(orbColor);
      noStroke();
      ellipse(x, y, 5, 5);
    } else if (bored == true) {
      // Bored state: Fixed radius, no pulsation or movement
      let adjustedRadius = radius; // Keep the radius fixed

      let x = xCenter + cos(angle) * adjustedRadius;
      let y = yCenter + sin(angle) * adjustedRadius;

      fill(orbColor);
      noStroke();
      ellipse(x, y, 5, 5);
    } else if (scared == true) {
      let noiseFactor = noise(i * 10, frameCount * 0.01);
      let adjustedRadius = radius + map(noiseFactor, 0, 1, -10, 10);

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

    let faceArea = faceWidth * faceHeight;

    // scared reaction with probability
    if (scared === true && faceArea > 10000) {
      let probability = 0.005; // 0.5% chance to panic when scared

      if (random(1) < probability) {
        if (!isPanic) {
          // Trigger panic mode
          isPanic = true;
          panicStartTime = millis(); // Start the panic timer
        }
        pulseSpeed = 0.03; // pulse speed
        baseRadius = lerp(baseRadius, 30, 0.1); // Reduce the orb size
        console.log("You're too close! The orb is panicking!");
      }
    }
    // Handle boredClose reaction with probability
    else if (bored === true && faceArea > 10000) {
      let probability = 0.002;

      if (random(1) < probability) {
        if (!isBoredClose) {
          // Trigger boredClose mode
          isBoredClose = true;
          boredStartTime = millis(); // Start the bored timer
        }

        console.log("The orb is bored and you are too close.");
        pulseSpeed = 0.002; // Slow down the pulse
        baseRadius = lerp(baseRadius, 150, 0.1); // Increase orb size smoothly
      }
    }
    // happy using probailbity
    else if (happy === true && faceArea > 10000) {
      let probability = 0.003; // set probability

      if (random(1) < probability) {
        if (!isHappyClose) {
          // Trigger happyClose mode
          isHappyClose = true;
          happyStartTime = millis(); // Start the Happy timer
        }

        console.log("The orb is Happy and you are too close.");
        pulseSpeed = 3.005; // Happy pulse speed
        baseRadius = lerp(baseRadius, 100, 0.1);
      }
    } else {
      pulseSpeed = 0.0075; // Normal pulse speed
    }
  }

  // Check if panic is done
  if (isPanic && millis() - panicStartTime > panicDuration) {
    isPanic = false; // Reset panic mode
    console.log("The orb has calmed down from panic.");
  }

  // Check if boredClose duration is done
  if (isBoredClose && millis() - boredStartTime > boredDuration) {
    isBoredClose = false; // Reset boredClose mode
    console.log("The orb is no longer bored.");
  }

  // Check if HappyClose duration is done
  if (isHappyClose && millis() - happyStartTime > happyDuration) {
    isHappyClose = false; // Reset HappyClose mode
    console.log("The orb is no longer Happy.");
  }
}

// Function to draw PoseNet video feed and keypoints
// got help from 05 using "bodyparse" https://editor.p5js.org/dansakamoto/sketches/rJoEw4ucX
function drawPoseNetVideo() {
  // image(video, width - 320, 0); // Draw video in top-right corner comment out when live
  stroke(255);
  strokeWeight(0); // change stroke to 0 when live
  for (let i = 0; i < poses.length; i++) {
    let keypoints = poses[i].pose.keypoints;
    for (let j = 0; j < keypoints.length; j++) {
      let keypoint = keypoints[j];
      if (keypoint.score > 0.2) {
        fill(0, 0, 0); // Green for detected keypoints. change to black when live
        ellipse(keypoint.position.x + width - 320, keypoint.position.y, 10, 10); // Draw keypoints
      }
    }
  }
}
