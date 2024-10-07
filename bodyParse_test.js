let video;
let poseNet;
let poses = [];

function setup() {
  createCanvas(640, 480);

  // Create the video capture
  video = createCapture(VIDEO);
  video.size(width, height);

  // Check if ml5.js is properly loaded
  if (ml5 !== undefined && ml5.poseNet !== undefined) {
    // Create a new poseNet method with a single detection
    poseNet = ml5.poseNet(video, modelReady);

    // Hide the video element, and just show the canvas
    video.hide();

    // This sets up an event that fills the global variable "poses"
    poseNet.on("pose", function (results) {
      poses = results;
      console.log(poses); // Log the pose results for debugging
    });
  } else {
    console.error("ml5 or poseNet is not loaded properly");
  }
}

function modelReady() {
  console.log("Model Loaded!"); // Confirm the model has loaded
}

function draw() {
  // Draw the video feed
  image(video, 0, 0, width, height);

  // Call functions to draw keypoints and skeletons
  drawKeypoints();
  drawSkeleton();
}

// Function to draw ellipses over the detected keypoints
function drawKeypoints() {
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i].pose;

    // Loop through all keypoints
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      if (keypoint.score > 0.1) {
        fill(255, 0, 0); // Red fill for the keypoints
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10); // Draw red dots on keypoints
      }
    }
  }
}

// Function to draw the skeleton
function drawSkeleton() {
  for (let i = 0; i < poses.length; i++) {
    let skeleton = poses[i].skeleton;

    for (let j = 0; j < skeleton.length; j++) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      stroke(255, 0, 0); // Red lines for the skeleton
      strokeWeight(2);   // Set line thickness
      line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
    }
  }
}
