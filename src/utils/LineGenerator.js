import * as THREE from "/modules/three.module.js";
import Delaunator from "https://cdn.skypack.dev/delaunator@5.0.0";

import { createNoise2D, createNoise3D } from "/modules/simplex-noise.js";

const noise2D = createNoise2D();
const noise3D = createNoise3D();

class LineGenerator {
    constructor(scene) {
        this.scene = scene;
        this.lines = [];

    }

    createLines() {
        //creates buffer geometry for lines
        let geometry = new THREE.BufferGeometry();
        let positions = [];
        let colors = [];
        let color = new THREE.Color(0xffffff);
        let n = 25;
        for (let i = 0; i < n; i++) {
            positions.push(
                THREE.MathUtils.randFloatSpread(50),
                THREE.MathUtils.randFloatSpread(50),
               0
            );
            colors.push(color.r, color.g, color.b);
        }
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();
        let material = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: 1
        });
        let line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.lines.push(line);

    }


    update() {

    }
}

export { LineGenerator };
