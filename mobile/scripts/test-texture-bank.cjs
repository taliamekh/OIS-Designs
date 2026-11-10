const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  THREE = require("three");
require.extensions[".ts"] = (mod, file) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const { SharedTextureBank } = require("../src/scene/textureBank.ts"),
  hashes = { 0: { sha256: "a".repeat(64), mimeType: "image/png" } };
function fixture(edit = () => {}) {
  let closed = 0;
  const image = {
      width: 256,
      height: 256,
      close() {
        closed++;
      },
    },
    texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  edit(texture);
  const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: "#987654",
    }),
    scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
  return {
    gltf: {
      scene,
      parser: {
        json: { textures: [{ source: 0 }] },
        associations: new Map([[texture, { textures: 0 }]]),
      },
    },
    material,
    texture,
    image,
    closed: () => closed,
  };
}
test("texture leases share identical semantics, preserve independent tint/normal strength and dispose only after final source", () => {
  const bank = new SharedTextureBank(),
    a = fixture(),
    b = fixture();
  a.material.normalScale.set(0.2, 0.3);
  b.material.normalScale.set(0.7, 0.8);
  bank.bind(a.gltf, hashes);
  bank.bind(b.gltf, hashes);
  assert.equal(a.material.map, b.material.map);
  assert.equal(bank.snapshot().textures, 1);
  assert.equal(bank.snapshot().leases, 2);
  assert.equal(b.closed(), 1);
  b.material.color.set("#333d40");
  assert.equal(a.material.color.getHexString(), "987654");
  assert.deepEqual(a.material.normalScale.toArray(), [0.2, 0.3]);
  assert.deepEqual(b.material.normalScale.toArray(), [0.7, 0.8]);
  let disposed = 0;
  a.texture.addEventListener("dispose", () => disposed++);
  bank.release(a.gltf.scene);
  assert.equal(disposed, 0);
  assert.equal(a.closed(), 0);
  bank.release(b.gltf.scene);
  assert.equal(disposed, 1);
  assert.equal(a.closed(), 1);
  assert.equal(bank.snapshot().textures, 0);
  bank.release(b.gltf.scene);
  assert.equal(disposed, 1);
});
test("native localUri data upload remains on its original canonical Texture", () => {
  const bank = new SharedTextureBank(),
    a = fixture((t) => {
      t.image = {
        data: { localUri: "file:///first.png" },
        width: 256,
        height: 256,
      };
      t.isDataTexture = true;
    }),
    b = fixture((t) => {
      t.image = {
        data: { localUri: "file:///duplicate.png" },
        width: 256,
        height: 256,
      };
      t.isDataTexture = true;
    });
  bank.bind(a.gltf, hashes);
  bank.bind(b.gltf, hashes);
  assert.equal(b.material.map, a.texture);
  assert.equal(b.material.map.isDataTexture, true);
  assert.equal(b.material.map.image.data.localUri, "file:///first.png");
  bank.release(a.gltf.scene);
  assert.equal(bank.snapshot().textures, 1);
  bank.release(b.gltf.scene);
  assert.equal(bank.snapshot().textures, 0);
});
test("sampler,colourspace,UV,unpack and native-upload differences never alias", () => {
  const edits = [
    (t) => (t.wrapS = THREE.ClampToEdgeWrapping),
    (t) => (t.wrapT = THREE.MirroredRepeatWrapping),
    (t) => (t.magFilter = THREE.NearestFilter),
    (t) => (t.minFilter = THREE.NearestFilter),
    (t) => (t.colorSpace = THREE.NoColorSpace),
    (t) => (t.flipY = false),
    (t) => (t.generateMipmaps = false),
    (t) => (t.channel = 1),
    (t) => (t.offset.x = 0.25),
    (t) => (t.repeat.y = 2),
    (t) => (t.center.x = 0.2),
    (t) => (t.rotation = 0.5),
    (t) => (t.anisotropy = 4),
    (t) => (t.premultiplyAlpha = true),
    (t) => (t.unpackAlignment = 1),
    (t) => (t.type = THREE.FloatType),
    (t) => (t.format = THREE.RGBFormat),
    (t) => (t.internalFormat = "RGBA16F"),
    (t) => (t.mapping = THREE.EquirectangularReflectionMapping),
    (t) => (t.isDataTexture = true),
  ];
  // Texture defaults clamp wrapping; force the baseline to Repeat for wrap guards.
  for (const edit of edits) {
    const bank = new SharedTextureBank(),
      a = fixture((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
      }),
      b = fixture((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        edit(t);
      });
    bank.bind(a.gltf, hashes);
    bank.bind(b.gltf, hashes);
    assert.notEqual(a.material.map, b.material.map);
    assert.equal(bank.snapshot().textures, 2);
    bank.release(a.gltf.scene);
    bank.release(b.gltf.scene);
    assert.equal(bank.snapshot().textures, 0);
  }
});
test("unknown image identities and custom mip chains remain private", () => {
  const bank = new SharedTextureBank(),
    unknown = fixture(),
    custom = fixture(
      (t) => (t.mipmaps = [{ data: new Uint8Array(4), width: 1, height: 1 }]),
    );
  bank.bind(unknown.gltf, {});
  bank.bind(custom.gltf, hashes);
  assert.equal(bank.snapshot().textures, 0);
  assert.equal(unknown.material.map, unknown.texture);
  assert.equal(custom.material.map, custom.texture);
  assert.equal(bank.release(unknown.gltf.scene).size, 0);
  assert.equal(bank.release(custom.gltf.scene).size, 0);
});
