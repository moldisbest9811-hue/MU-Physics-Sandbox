# MU Physics Sandbox — Web Edition

A browser-based 3D physics playground. This is the new web implementation, separate from the earlier Harfang and Ursina desktop prototypes.

## Run locally
1. Install Node.js 20.19+ or 22.12+.
2. In this folder run:
   `npm install`
3. Start the development server:
   `npm run dev`
4. Open the local URL printed by Vite.

## Controls
- Click the 3D view to capture the mouse.
- WASD: move; Space: jump; Shift: sprint.
- 1: Physics Gun; click a prop to grab it, click again to release.
- Mouse wheel: adjust grab distance.
- 2: open/close prop spawner.
- Spawn menu buttons: create props.
- ESC: release mouse.

## Stack
- Three.js for 3D rendering.
- Rapier 3D for rigid-body physics.
- Vite for local development and production builds.

## Current prototype scope
- First-person camera movement and mouse look.
- Enclosed test room and lighting.
- Dynamic crates, metal blocks, planks, barrels and balls.
- Rigid-body collisions, gravity, friction and restitution.
- Physics Gun grab/release.
- Spawn menu and basic HUD.

This is an early prototype. Player movement is currently a simple camera controller, not a physics capsule. The break tool and full object manipulation suite are planned for later builds.
