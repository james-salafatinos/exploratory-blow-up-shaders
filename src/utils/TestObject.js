import * as THREE from "/modules/three.module.js";


class TestObject {
    constructor(scene) {
        this.scene = scene;

    }

    createMesh() {
        let geometry = new THREE.SphereGeometry(10, 10, 10)
        let material = new CellularNoiseMaterial();
        material.transparent = true;
        material.grid = 8;
        material.speed = 2.0;
        material.divisionScaleX = 2.0;

        let mesh = new THREE.Mesh(geometry, material)
        mesh.position.x = 20
        mesh.position.set(camera.position.x, camera.position.y - 10, camera.position.z - 20)
        this.scene.add(mesh)



    }


    updateMesh() {

    }
}

export { TestObject };
