import * as THREE from 'three';
/** Geometry adapter for reviewed local-XZ outer/void loops. No project edits. */
export function horizontalShape(outer,holes=[]){
 const shape=new THREE.Shape(outer.map(p=>new THREE.Vector2(p.x,-p.z)));
 for(const hole of holes)shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(p.x,-p.z))));
 return shape;
}
export function slabWithVoids(outlines){
 const depth=outlines.topY-outlines.bottomY;
 return new THREE.ExtrudeGeometry(horizontalShape(outlines.outer,outlines.holes),{depth,bevelEnabled:false}).translate(0,0,-depth).rotateX(-Math.PI/2);
}
export function ceilingWithVoids(outer,holes=[]){return new THREE.ShapeGeometry(horizontalShape(outer,holes)).rotateX(-Math.PI/2)}
