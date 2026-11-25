import './style.css';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';

const root = document.querySelector('#game-root');
const loading = document.querySelector('#loading');
const hint = document.querySelector('#hint');
const spawner = document.querySelector('#spawner');
const toolLabel = document.querySelector('#tool');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91a9bf);
scene.fog = new THREE.Fog(0x91a9bf, 24, 90);
const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, 0.1, 180);
camera.rotation.order = 'YXZ';
camera.position.set(0, 2, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xddeeff, 0x58606b, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 3.0);
sun.position.set(-12, 22, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); scene.add(sun);

const floorMat = new THREE.MeshStandardMaterial({ color: 0x66717b, roughness: 0.92 });
const floor = new THREE.Mesh(new THREE.BoxGeometry(48, 1, 48), floorMat);
floor.position.y = -0.5; floor.receiveShadow = true; scene.add(floor);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8795a3, roughness: 0.9 });
function wall(x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),wallMat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;scene.add(m);return m}
wall(0,4,-24,48,8,1); wall(-24,4,0,1,8,48); wall(24,4,0,1,8,48);
const grid = new THREE.GridHelper(48,48,0x34495e,0x8293a0); grid.position.y=.012; scene.add(grid);

let world, eventQueue;
const props = [];
const keys = new Set();
const raycaster = new THREE.Raycaster();
let locked = false, yaw = 0, pitch = 0, verticalVelocity = 0, grounded = false;
let selectedTool = 'physics', held = null, holdDistance = 5;
const clock = new THREE.Clock();

function addProp(kind='crate', position=null){
  const defs = {
    crate:{size:[1,1,1],color:0xb77b45,mass:2,shape:'box'},
    metal:{size:[1,1,1],color:0x8798aa,mass:8,shape:'box'},
    plank:{size:[2.4,.22,.65],color:0xb68a5c,mass:1.5,shape:'box'},
    barrel:{size:[.85,1.3,.85],color:0x477f9c,mass:4,shape:'cylinder'},
    ball:{size:[.8,.8,.8],color:0xd5e0ed,mass:1,shape:'ball'},
    beach:{size:[.9,.9,.9],color:0xe5a34b,mass:.7,shape:'ball'}
  };
  const d=defs[kind]||defs.crate;
  const p=position||camera.position.clone().add(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).multiplyScalar(5));
  p.y=Math.max(p.y,1.2);
  let geometry;
  if(d.shape==='ball') geometry=new THREE.SphereGeometry(d.size[0]/2,24,16);
  else if(d.shape==='cylinder') geometry=new THREE.CylinderGeometry(d.size[0]/2,d.size[0]/2,d.size[1],20);
  else geometry=new THREE.BoxGeometry(...d.size);
  const material=new THREE.MeshStandardMaterial({color:d.color,roughness:kind==='metal'?.32:.78,metalness:kind==='metal'?.65:.02});
  const mesh=new THREE.Mesh(geometry,material); mesh.position.copy(p); mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  let desc;
  if(d.shape==='ball') desc=world.createCollider(RAPIER.ColliderDesc.ball(d.size[0]/2).setRestitution(.72).setFriction(.7));
  else if(d.shape==='cylinder') desc=world.createCollider(RAPIER.ColliderDesc.cylinder(d.size[1]/2,d.size[0]/2).setRestitution(.25).setFriction(.8));
  else desc=world.createCollider(RAPIER.ColliderDesc.cuboid(d.size[0]/2,d.size[1]/2,d.size[2]/2).setRestitution(.2).setFriction(.8));
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setLinearDamping(.12).setAngularDamping(.18));
  world.createCollider(desc,body); body.setAdditionalMass(d.mass,true);
  props.push({mesh,body,kind}); return props[props.length-1];
}
function syncProps(){for(const p of props){const t=p.body.translation(),r=p.body.rotation();p.mesh.position.set(t.x,t.y,t.z);p.mesh.quaternion.set(r.x,r.y,r.z,r.w)}}
function setTool(tool){selectedTool=tool;toolLabel.textContent='TOOL: '+(tool==='physics'?'PHYSICS GUN':'SPAWN TOOL')}
function forward(){return new THREE.Vector3(0,0,-1).applyEuler(camera.rotation).normalize()}
function targetPoint(distance=holdDistance){return camera.position.clone().add(forward().multiplyScalar(distance))}
function findTarget(){raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hits=raycaster.intersectObjects(props.map(p=>p.mesh),false);return hits.length?props.find(p=>p.mesh===hits[0].object):null}
function pointerDown(){if(!locked){renderer.domElement.requestPointerLock();return}const hit=findTarget();if(!hit)return;if(selectedTool==='physics'){if(held===hit){held=null;return}held=hit;holdDistance=Math.max(2,Math.min(10,camera.position.distanceTo(hit.mesh.position)))}else removeProp(hit)}
function removeProp(p){if(held===p)held=null;world.removeRigidBody(p.body);scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();props.splice(props.indexOf(p),1)}
function onKey(e,down){const k=e.key.toLowerCase();if(down)keys.add(k);else keys.delete(k);if(!down)return;if(k==='2'){spawner.classList.toggle('open');}if(k==='1'){setTool('physics');spawner.classList.remove('open')}if(k===' '){e.preventDefault();if(grounded)verticalVelocity=7.2}if(k==='escape'){hint.textContent='CLICK THE VIEW TO RE-ENTER'} }
document.addEventListener('keydown',e=>onKey(e,true));document.addEventListener('keyup',e=>onKey(e,false));
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;hint.textContent=locked?'':'CLICK THE VIEW TO ENTER THE SANDBOX'});
document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=Math.max(-1.48,Math.min(1.48,pitch));camera.rotation.set(pitch,yaw,0)});
renderer.domElement.addEventListener('mousedown',pointerDown);
document.querySelectorAll('[data-prop]').forEach(b=>b.addEventListener('click',()=>addProp(b.dataset.prop)));
document.addEventListener('wheel',e=>{if(held)holdDistance=Math.max(2,Math.min(12,holdDistance+Math.sign(e.deltaY)*.5))},{passive:true});

await RAPIER.init();
world=new RAPIER.World({x:0,y:-9.81,z:0}); eventQueue=new RAPIER.EventQueue(true);
const groundBody=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-.5,0));
world.createCollider(RAPIER.ColliderDesc.cuboid(24,.5,24).setFriction(.9),groundBody);
for(let i=0;i<3;i++)addProp('crate',new THREE.Vector3((i-1)*1.25,1.2,-3));
addProp('barrel',new THREE.Vector3(2,1.3,-4));addProp('ball',new THREE.Vector3(-2,2,-4));
loading.style.display='none';

function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.033);
 if(locked){
  const speed=keys.has('shift')?10:6;
  const f=forward();f.y=0;f.normalize();const right=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize();
  const move=new THREE.Vector3();if(keys.has('w'))move.add(f);if(keys.has('s'))move.sub(f);if(keys.has('d'))move.add(right);if(keys.has('a'))move.sub(right);
  if(move.lengthSq())move.normalize().multiplyScalar(speed*dt);
  camera.position.add(move);verticalVelocity-=19*dt;camera.position.y+=verticalVelocity*dt;
  if(camera.position.y<=1.7){camera.position.y=1.7;verticalVelocity=0;grounded=true}else grounded=false;
 }
 if(held&&locked){const goal=targetPoint();const t=held.body.translation();held.body.setLinvel({x:(goal.x-t.x)*12,y:(goal.y-t.y)*12,z:(goal.z-t.z)*12},true);held.body.setAngvel({x:0,y:0,z:0},true)}
 world.timestep=dt;world.step(eventQueue);syncProps();renderer.render(scene,camera);
}
animate();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
