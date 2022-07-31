import * as THREE from "/modules/three.module.js";

class ProjectileGenerator {
  constructor(scene, camera, window, worldOctree) {
    this.scene = scene;
    this.camera = camera;
    this.window = window;
    this.worldOctree = worldOctree;

    this.vector1 = new THREE.Vector3();
    this.vector2 = new THREE.Vector3();
    this.vector3 = new THREE.Vector3();
    this.GRAVITY = 9.8 ** 2;
    this.NUM_SPHERES = 25;
    this.SPHERE_RADIUS = 2;
    this.STEPS_PER_FRAME = 5;

    this.sphereGeometry = new THREE.IcosahedronGeometry(this.SPHERE_RADIUS, 5);
    this.sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xbbbb44 });

    this.spheres = [];
    this.sphereIdx = 0;

    this.time_beginning = 0;
    this.clock = new THREE.Clock();

    this.initializeBufferSpheres();

    window.addEventListener("click", () => {
      console.log("click");
      this.shoot(
        new THREE.Vector3(
          this.camera.position.x,
          this.camera.position.y,
          this.camera.position.z
        ),
        this.cameraLookDir(camera)
      );
    });
  }
  initializeBufferSpheres() {
    for (let i = 0; i < this.NUM_SPHERES; i++) {
      const sphere = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
      sphere.castShadow = true;
      sphere.receiveShadow = true;

      this.scene.add(sphere);

      this.spheres.push({
        mesh: sphere,
        collider: new THREE.Sphere(
          new THREE.Vector3(0, -100, 0),
          this.SPHERE_RADIUS
        ),
        velocity: new THREE.Vector3(),
      });
    }
  }

  //Camera Position: Vector3(), Look Vector: Vector3()
  shoot(CameraPos, LookVec) {
    const sphere = this.spheres[this.sphereIdx];

    const impulse =
      15 +
      250 * (1 - Math.exp((this.time_beginning - performance.now()) * 0.01));

    sphere.velocity.copy(LookVec).multiplyScalar(impulse);

    sphere.collider.center.copy(CameraPos).addScaledVector(LookVec, 1.5);

    this.sphereIdx = (this.sphereIdx + 1) % this.spheres.length;
  }

  cameraLookDir(camera) {
    var vector = new THREE.Vector3(0, 0, -1);
    vector.applyEuler(camera.rotation, camera.rotation.order);
    return vector;
  }

  spheresCollisions() {
    for (let i = 0, length = this.spheres.length; i < length; i++) {
      const s1 = this.spheres[i];

      for (let j = i + 1; j < length; j++) {
        const s2 = this.spheres[j];

        const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
        const r = s1.collider.radius + s2.collider.radius;
        const r2 = r * r;

        if (d2 < r2) {
          const normal = this.vector1
            .subVectors(s1.collider.center, s2.collider.center)
            .normalize();
          const v1 = this.vector2
            .copy(normal)
            .multiplyScalar(normal.dot(s1.velocity));
          const v2 = this.vector3
            .copy(normal)
            .multiplyScalar(normal.dot(s2.velocity));

          s1.velocity.add(v2).sub(v1);
          s2.velocity.add(v1).sub(v2);

          const d = (r - Math.sqrt(d2)) / 2;

          s1.collider.center.addScaledVector(normal, d);
          s2.collider.center.addScaledVector(normal, -d);
        }
      }
    }
  }

  updateSpheres(deltaTime) {
    //Updates the bounding boxes of the spheres
    for (const sphere of this.spheres) {
      sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

      const result = this.worldOctree.sphereIntersect(sphere.collider);
      if (result) {
        sphere.velocity.addScaledVector(
          result.normal,
          -result.normal.dot(sphere.velocity) * 1.5
        );
        sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
      } else {
        sphere.velocity.y -= this.GRAVITY * deltaTime;
      }

      const damping = Math.exp(-0.01 * deltaTime) - 1;
      sphere.velocity.addScaledVector(sphere.velocity, damping);
    }

    //Checks collisions
    this.spheresCollisions();

    //Updates the actual visual mesh
    for (const sphere of this.spheres) {
      sphere.mesh.position.copy(sphere.collider.center);
    }
  }

  update() {
    const deltaTime =
      Math.min(0.05, this.clock.getDelta()) / this.STEPS_PER_FRAME;
    for (let i = 0; i < this.STEPS_PER_FRAME; i++) {
      this.updateSpheres(deltaTime);
    }
  }
}
export { ProjectileGenerator };
