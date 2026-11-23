// Solara Bay — explosions, smoke, fire and damage feedback.
// Effects are transient scene objects with a lifetime, updated each frame.

export function explode(G, x, z) {
  const THREE = window.THREE;
  const fire = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff7722, transparent: true, opacity: 0.95 }),
  );
  fire.position.set(x, 1.2, z);
  G.scene.add(fire);
  const light = new THREE.PointLight(0xff8844, 3.0, 30);
  light.position.set(x, 3, z);
  G.scene.add(light);
  const smoke = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(1.0 + Math.random() * 0.8, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x444444, transparent: true, opacity: 0.7 }),
    );
    s.position.set(x + (Math.random() - 0.5) * 2, 1 + i * 0.8, z + (Math.random() - 0.5) * 2);
    G.scene.add(s);
    smoke.push(s);
  }
  const sparks = [];
  const sparkGeo = new THREE.SphereGeometry(0.12, 6, 6);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Mesh(sparkGeo, sparkMat);
    sp.position.set(x, 1, z);
    sp.userData.vx = (Math.random() - 0.5) * 14;
    sp.userData.vy = Math.random() * 10 + 4;
    sp.userData.vz = (Math.random() - 0.5) * 14;
    G.scene.add(sp);
    sparks.push(sp);
  }
  G.effects.push({ kind: 'explosion', fire, light, smoke, sparks, t: 0, life: 1.6 });
  G.shake = Math.max(G.shake, 0.7);
  // Nearby pedestrians scatter.
  for (const ped of G.peds) {
    const dx = ped.x - x;
    const dz = ped.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 22) {
      ped.scatter = 3;
      ped.scatterX = dx / (d || 1);
      ped.scatterZ = dz / (d || 1);
    }
  }
}

export function spawnSmokePuff(G, x, y, z, dark) {
  const THREE = window.THREE;
  const s = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 8),
    new THREE.MeshLambertMaterial({ color: dark ? 0x222222 : 0x888888, transparent: true, opacity: 0.55 }),
  );
  s.position.set(x, y, z);
  G.scene.add(s);
  G.effects.push({ kind: 'puff', mesh: s, t: 0, life: 1.4 });
}

export function updateEffects(G, dt) {
  for (let i = G.effects.length - 1; i >= 0; i--) {
    const e = G.effects[i];
    e.t += dt;
    if (e.kind === 'explosion') {
      const k = e.t / e.life;
      e.fire.scale.setScalar(1 + k * 3.5);
      e.fire.material.opacity = Math.max(0, 0.95 - k);
      e.light.intensity = Math.max(0, 3.0 * (1 - k));
      for (const s of e.smoke) {
        s.position.y += dt * 2.2;
        s.material.opacity = Math.max(0, 0.7 - k * 0.7);
      }
      for (const sp of e.sparks) {
        sp.position.x += sp.userData.vx * dt;
        sp.position.y += sp.userData.vy * dt;
        sp.position.z += sp.userData.vz * dt;
        sp.userData.vy -= 22 * dt;
        if (sp.position.y < 0.1) sp.position.y = 0.1;
      }
    } else if (e.kind === 'puff') {
      e.mesh.position.y += dt * 1.6;
      e.mesh.material.opacity = Math.max(0, 0.55 - (e.t / e.life) * 0.55);
      e.mesh.scale.setScalar(1 + (e.t / e.life) * 1.6);
    }
    if (e.t >= e.life) {
      if (e.fire) G.scene.remove(e.fire);
      if (e.light) G.scene.remove(e.light);
      if (e.smoke) for (const s of e.smoke) G.scene.remove(s);
      if (e.sparks) for (const sp of e.sparks) G.scene.remove(sp);
      if (e.mesh) G.scene.remove(e.mesh);
      G.effects.splice(i, 1);
    }
  }
  G.shake = Math.max(0, G.shake - dt * 1.4);
}

// Damaged cars smoke (below 50 health) and burn (below 25).
export function updateCarDamageFx(G, dt) {
  for (const car of G.cars) {
    if (car.wrecked) continue;
    car.smokeTimer -= dt;
    if (car.health < 50 && car.smokeTimer <= 0) {
      spawnSmokePuff(G, car.x, 1.4, car.z, car.health < 25);
      car.smokeTimer = car.health < 25 ? 0.25 : 0.6;
    }
  }
}

export function damageFlash(G) {
  const el = document.getElementById('damage-flash');
  if (!el) return;
  el.style.opacity = '0.45';
  setTimeout(() => { el.style.opacity = '0'; }, 120);
}
