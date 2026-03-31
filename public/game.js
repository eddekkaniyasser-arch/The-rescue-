const socket = io();

let room="", myId, players={};

// ================= STATE =================
let level = parseInt(localStorage.getItem("level")) || 1;
let love = parseInt(localStorage.getItem("love")) || 0;

let mode = "menu"; // menu | cutscene | game

// ================= CANVAS =================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

// ================= CAMERA =================
let camera = {x:0,y:0};
function updateCamera(p){
  camera.x += (p.x - canvas.width/2 - camera.x) * 0.1;
  camera.y += (p.y - canvas.height/2 - camera.y) * 0.1;
}

// ================= SPRITE =================
const sprite = new Image();
sprite.src = "https://i.imgur.com/JYUB0m3.png";

// ================= PARTICLES =================
let particles=[];
function spawnParticles(x,y,color){
  for(let i=0;i<10;i++){
    particles.push({
      x,y,
      vx:(Math.random()-0.5)*4,
      vy:(Math.random()-0.5)*4,
      life:30,
      color
    });
  }
}

// ================= CUTSCENES =================
const cutscenes = [
  ["You see each other for the first time...",
   "Something feels different..."],

  ["You talk...",
   "Hours feel like minutes..."],

  ["You laugh together...",
   "It feels natural..."],

  ["Silence becomes comfortable...",
   "You feel safe..."],

  ["Your heart reacts differently...",
   "You can't explain it..."],

  ["You start caring...",
   "More than you expected..."],

  ["You miss them...",
   "Even when they just left..."],

  ["You feel closer...",
   "Almost too close..."],

  ["You want to say something...",
   "But you're afraid..."],

  ["You realize it...",
   "You are falling in love 💖"]
];

// ================= CUTSCENE ENGINE =================
let currentScene = [];
let textIndex = 0;
let charIndex = 0;
let displayText = "";
let typingSpeed = 2;
let sceneTimer = 0;

function startCutscene(){
  mode = "cutscene";
  currentScene = cutscenes[(level-1) % cutscenes.length];
  textIndex = 0;
  charIndex = 0;
  displayText = "";
  sceneTimer = 0;
}

function updateCutscene(){
  ctx.fillStyle="black";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  sceneTimer++;

  if(textIndex < currentScene.length){
    let fullText = currentScene[textIndex];

    if(charIndex < fullText.length){
      if(sceneTimer % typingSpeed === 0){
        displayText += fullText[charIndex];
        charIndex++;
      }
    } else {
      if(sceneTimer > 100){
        textIndex++;
        charIndex = 0;
        displayText = "";
        sceneTimer = 0;
      }
    }
  } else {
    mode = "game";
  }

  ctx.fillStyle="white";
  ctx.font="20px Arial";
  ctx.fillText(displayText, 40, canvas.height/2);
}

// ================= START =================
function startGame(){
  room = document.getElementById("room").value;
  document.getElementById("menu").style.display="none";

  socket.emit("joinRoom", room);

  startCutscene();
}

socket.on("connect", ()=> myId = socket.id);
socket.on("updatePlayers", data=> players = data.players);

// ================= CONTROLS =================
function move(dir){
  let p = players[myId];
  if(p && mode==="game"){
    p.x += dir * 10;
    socket.emit("move",{room,x:p.x});
  }
}

function jump(){
  let p = players[myId];
  if(p && p.onGround && mode==="game"){
    p.vy = -10;
  }
}

// ================= OBSTACLES =================
let obstacles=[];

function spawnObstacle(){
  obstacles.push({
    x: Math.random()*canvas.width,
    y: -20,
    speed: 2 + level*0.3
  });
}

// ================= GAME LOOP =================
function gameLoop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(mode === "cutscene"){
    updateCutscene();
    requestAnimationFrame(gameLoop);
    return;
  }

  let me = players[myId];

  if(me){
    me.vy = me.vy || 0;
    me.vy += 0.6;
    me.y += me.vy;

    if(me.y > canvas.height-50){
      me.y = canvas.height-50;
      me.vy = 0;
      me.onGround = true;
    }

    updateCamera(me);
  }

  // spawn obstacles
  if(Math.random() < 0.02 + level*0.002){
    spawnObstacle();
  }

  // draw obstacles
  obstacles.forEach((o,i)=>{
    o.y += o.speed;

    ctx.fillStyle="orange";
    ctx.fillRect(o.x-camera.x,o.y-camera.y,20,20);

    for(let id in players){
      let p=players[id];
      if(Math.abs(p.x-o.x)<20 && Math.abs(p.y-o.y)<20){
        fail(p.x,p.y);
      }
    }

    if(o.y > canvas.height) obstacles.splice(i,1);
  });

  // draw players
  for(let id in players){
    let p = players[id];

    ctx.drawImage(sprite,0,0,32,32,
      p.x-camera.x,
      p.y-camera.y,
      32,32
    );
  }

  // particles
  particles.forEach((p,i)=>{
    p.x+=p.vx;
    p.y+=p.vy;
    p.life--;

    ctx.fillStyle=p.color;
    ctx.fillRect(p.x-camera.x,p.y-camera.y,4,4);

    if(p.life<=0) particles.splice(i,1);
  });

  // save condition
  let ids = Object.keys(players);
  if(ids.length===2){
    let a=players[ids[0]];
    let b=players[ids[1]];

    if(Math.abs(a.x-b.x)<30 && Math.abs(a.y-b.y)<30){
      success(a.x,a.y);
    }
  }

  requestAnimationFrame(gameLoop);
}

// ================= SUCCESS =================
function success(x,y){
  spawnParticles(x,y,"pink");

  love += 10;
  level++;

  localStorage.setItem("love", love);
  localStorage.setItem("level", level);

  obstacles = [];

  startCutscene();
}

// ================= FAIL =================
function fail(x,y){
  spawnParticles(x,y,"red");

  love -= 5;
  localStorage.setItem("love", love);

  alert("💔 You failed...");
}

gameLoop();
