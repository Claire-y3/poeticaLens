let replicate_api_proxy = "https://splashy-rambunctious-leader.glitch.me/";
let video;
let captions;
let offscreenBuffer; // New offscreen buffer
let photo;
let camFrame;

let isBlinking = false; 
let blinkHeight = 0;
let blinkDirection = 1;

let shutterSound;
let soundPlayed = false;
let fontPoem, fontDigital;

let port;
let connectBtn;
let buttonVal;
let preButtonVal = 0;

// let saveBtn;

let CAMERA = 1;
let PREDICTION = 2;
let OUTCOME = 3;

let state = CAMERA;

let scrWidth = 4480;
let scrHeight=2520;


function preload(){
  shutterSound=loadSound('sound/shutter.wav');
  fontPoem = loadFont('font/Caveat-Regular.ttf');
  fontDigital= loadFont('font/PressStart2P-Regular.ttf');
  camFrame = loadImage('assets/iphoneFrame1.png');
}

function setup() {
  // createCanvas(1440,900);
  // createCanvas(scrWidth,scrHeight);
  createCanvas(windowWidth,windowHeight);
  background(0);
  video = createCapture(VIDEO);
  // video.size( windowWidth-500, (windowWidth-500)*0.75)); 
  video.hide();
  offscreenBuffer = createGraphics(windowWidth-500, (windowWidth-500)*0.75); // Create an offscreen buffer
  
  port = createSerial();
  
  // in setup, we can open ports we have used previously
  // without user interaction

  let usedPorts = usedSerialPorts();
  if (usedPorts.length > 0) {
    port.open(usedPorts[0], 57600);
  }

  // any other ports can be opened via a dialog after
  // user interaction (see connectBtnClick below)

  connectBtn = createButton('Connect to Arduino');
  connectBtn.position(80, 200);
  connectBtn.mousePressed(connectBtnClick);
}

function draw() {
  // background(0);
  
  // reads in complete lines and prints them at the bottom of the canvas
  let str;
  str = port.readUntil("\n");
  while (str.length > 0) {
    buttonVal = parseInt(str[0]);
    str = port.readUntil("\n");
  }

// ---------------Check if buttonVal has changed from 1 to 0--------------------
  if (preButtonVal == 1 && buttonVal == 0) {
    if (state == CAMERA) {
      // Execute code for CAMERA state
      state = PREDICTION;
      photo = get(50, 0, windowWidth-500, windowHeight-300);
    // -------------------------img-to-text model-------------------------------------
    let modelInput
    = {
      image: get(),
      prompt: "Describe the image and imply what happened and related philosophical idea by writing an imaginative and dreamlike poem in the style of sonnet. Pay attention to the meter and rhyme. Limit the poem to exactly 40-60 words. At the beginning of the poem, write a title in the first line. Do not write the exact word title, create an imaginative title instead.At the end of the poem, add a pseudo signature related to PoeticaLens, the current date and time in the format of: 'by' + signature + date + time",
      max_tokens: 256,
      temperature: 0.2
    };

    predictReplicate(
      "yorickvp/llava-13b:c293ca6d551ce5e74893ab153c61380f5bcbd80e02d49e08c582de184a8f6c83",
      modelInput,
      donePredicting
    );
    console.log('Starting prediction, this might take a bit');
    } else if (state == OUTCOME) {
      // Execute code for OUTCOME state
      background(0);
      state = CAMERA;
      captions = "";
    }
  }
  preButtonVal = buttonVal;
  
// ------------changes button label based on connection status-----------------
  if (!port.opened()) {
    connectBtn.html('Connect to Arduino');
  } else {
    connectBtn.hide();
  }

// ------------Check if captions are available and draw them---------------------
  if (captions) {
    state = OUTCOME;
  } 
  
  // ------------------------state info------------------------------------------
  if (state == CAMERA){
    push();
    translate(windowWidth-500, 0);
    scale(-1, 1);
    offscreenBuffer.image(video, 0,0,  windowWidth-500, (windowWidth-500)*0.75);
    offscreenBuffer.filter(POSTERIZE, 3);
    image(offscreenBuffer, 0, 0,  windowWidth-500, (windowWidth-500)*0.75);
    pop();
    
    isBlinking = false;
    captions = "";
    image(camFrame,0,0,windowWidth,windowHeight);
    drawInstructions();
  }
  
  if (state == PREDICTION){
    isBlinking = true;
    drawBlinks();
    drawInstructions();
    image(camFrame,0,0,windowWidth,windowHeight);
    if (!soundPlayed) {
      shutterSound.play();
      soundPlayed = true;
    }
  } else {
    soundPlayed = false;
  }
  
  if (state == OUTCOME){
    isBlinking = false;
    fill(0);
    rect(0, 0, width, height);
    image(photo, 0, 0, width-100, height);
    drawCaption();
    drawInstructions();
    // saveBtn = createButton('Save')
    // saveBtn.position(width/2+30,height/2+320);
    // saveBtn.mousePressed(savePoem);
  }
}

// function savePoem(){
//   saveCanvas('PoeticaLens', 'png');
// }

function connectBtnClick() {
  if (!port.opened()) {
    port.open('Arduino', 57600);
  } else {
    port.close();
  }
}

// function keyPressed() {
//   background(0);
//   state = CAMERA;
//   captions = "";
// }

function donePredicting(results) {
  console.log(results);
  // Disable blinking effect when prediction is done
  isBlinking = false;
  captions = results;
}

function drawCaption() {
  let textX = 20; // X position of the text
  let textY = height / 2; // Y position of the text

  // Get the bounding box of the text
  let bbox = fontPoem.textBounds(captions, textX, textY, 35);

  // Adjust the position of the red rectangle based on the bounding box
  let rectX = width/4; 
  let rectY = 300; 
  let rectWidth = bbox.w + 200; 
  let rectHeight = height; 

  fill(0, 150);
  rect(rectX, rectY, rectWidth, rectHeight);
  
  fill(255);
  noStroke();

  textSize(45);
  textAlign(CENTER,CENTER);
  textWrap(WORD);
  textFont(fontPoem);
  text(captions, 20, height/2, width/2);

}

function drawBlinks() {
  background(0);

  if (isBlinking) {
    push();
    translate(windowWidth-500, 0);
    scale(-1, 1);
    offscreenBuffer.filter(THRESHOLD, 0.5);
    image(offscreenBuffer, 0, 0,  windowWidth-500, (windowWidth-500)*0.75);
    pop();
    
    // Draw the blinking effect
    fill(0);
    rect(0, 0, width, blinkHeight);
    rect(0, height - blinkHeight, width, blinkHeight);

    blinkHeight += 15 * blinkDirection;

    if (blinkHeight >= height / 2 || blinkHeight <= 0) {
      blinkDirection *= -1;
    }
    if (!isBlinking && blinkHeight === 0) {
      isBlinking = true;
    }

    fill(random(255), random(255), random(255));
    textSize(50);
    textAlign(CENTER);
    textFont(fontDigital);
    text('Starting prediction,', width / 2, height / 2 - 45);
    text('this might take a bit', width / 2, height / 2 + 55);
  }
} 
function drawInstructions(){
  fill(255);
  textAlign(LEFT);
  textFont(fontDigital);
  textSize(35);
  if(state == OUTCOME){
    text("Insturction: Want another shot?",200,height-70);
    text("Press the shutter ONCE again: Back to the camera",460,height-30);
  }else{
    text("Instruction: Click the shutter ONCE to capture a moment,",200,height-70);
    text("Await the alchemy for about 15 heartbeats...",460,height-30);
  }  
}

// function mousePressed() {
//   if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
//     let fs = fullscreen();
//     fullscreen(!fs);
//   }else{
//     fill(255);
//     text('Click here to fullscreen!',width/2,height/2)
//   }
// }