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

let saveBtn;

let CAMERA = 1;
let PREDICTION = 2;
let OUTCOME = 3;

let state = CAMERA;

function preload(){
  shutterSound=loadSound('sound/shutter.wav');
  fontPoem = loadFont('font/Caveat-Regular.ttf');
  fontDigital= loadFont('font/PressStart2P-Regular.ttf');
  camFrame = loadImage('assets/camFrame2.png');
}

function setup() {
  createCanvas(1440,900);
  background(0);
  video = createCapture(VIDEO);
  // video.size(975,760); 
  video.hide();
  offscreenBuffer = createGraphics(975,760); // Create an offscreen buffer
  
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
  let str = port.readUntil("\n");
  if (str.length > 0) {
    buttonVal = parseInt(str[0]);
  }

// ---------------Check if buttonVal has changed from 1 to 0--------------------
  if (preButtonVal == 1 && buttonVal == 0) {
    // background(0, 0, 255);
    state = PREDICTION;
    photo = get(0,0,1440,840);

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
    translate(1130, 0);
    scale(-1, 1);
    offscreenBuffer.image(video, 130,165, 975,760);
    offscreenBuffer.filter(POSTERIZE, 3);
    image(offscreenBuffer, 0, 0, 975,760);
    pop();
    
    isBlinking = false;
    captions = "";
    image(camFrame,-20,-350,1540, 1540);
    drawInstructions();
  }
  
  if (state == PREDICTION){
    isBlinking = true;
    drawBlinks();
    drawInstructions();
    image(camFrame,-20,-350,1540, 1540);
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
    image(photo, width / 2, height / 4, width / 2, height / 2);
    drawCaption();
    drawInstructions();
    saveBtn = createButton('Save')
    saveBtn.position(width/2+30,height/2+320);
    saveBtn.mousePressed(savePoem);
  }
}

function savePoem(){
  saveCanvas('PoeticaLens', 'png');
}

function connectBtnClick() {
  if (!port.opened()) {
    port.open('Arduino', 57600);
  } else {
    port.close();
  }
}

function keyPressed() {
  background(0);
  state = CAMERA;
  captions = "";
}

function donePredicting(results) {
  console.log(results);
  // Disable blinking effect when prediction is done
  isBlinking = false;
  captions = results;
}

function drawCaption() {
  fill(255);
  noStroke();
  textSize(35);
  textAlign(CENTER,CENTER);
  textWrap(WORD);
  textFont(fontPoem);
  text(captions, 20, height/2, width/2);
}

function drawBlinks() {
  background(0);

  if (isBlinking) {
    push();
    translate(1130, 0);
    scale(-1, 1);
    offscreenBuffer.filter(THRESHOLD, 0.5);
    image(offscreenBuffer, 0, 0, 975,760);
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
    textSize(25);
    textAlign(CENTER);
    textFont(fontDigital);
    text('Starting prediction,', width / 2-150, height / 2 - 15);
    text('this might take a bit', width / 2-160, height / 2 + 35);
  }
} 
function drawInstructions(){
  fill(255);
  textAlign(LEFT);
  textFont(fontDigital);
  textSize(20);
  if(state == OUTCOME){
    text("Insturction: Want another shot?",width/2+30,height/2+260);
    text("Press any key: Back to the camera",width/2+30,height/2+290)
  }else{
    text("Instruction: Click the shutter to capture a moment,",100,865);
    text("Await the alchemy for about 15 heartbeats...",360,890)
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