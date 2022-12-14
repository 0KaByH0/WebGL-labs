'use strict';

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.
let surfaceType;
let lPosElements;
let pointsLength = 0;

function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, true, 0, 0);
    gl.enableVertexAttribArray(shProgram.iNormal);

    if (surfaceType.checked) {
      gl.drawArrays(gl.TRIANGLES_FAN, 0, this.count);
    } else {
      const stepLength = this.count / pointsLength;
      for (let step = 0; step < this.count; step += stepLength) {
        gl.drawArrays(gl.LINE_STRIP, step, stepLength);
      }
    }
  };
}

// Constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  this.iAttribVertex = -1;
  this.iColor = -1;

  this.iModelViewProjectionMatrix = -1;

  // normals
  this.iNormal = 0;
  this.iNormalMatrix = 0;

  // colors
  this.iAmbientColor = 0;
  this.iDiffuseColor = 0;
  this.iSpecularColor = 0;

  // shines
  this.iShininess = 0;

  // light pos
  this.iLightPos = 0;
  this.iLightVec = 0;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const lPos = Array.from(lPosElements.getElementsByTagName('input')).map((el) => +el.value);

  /* Set the values of the projection transformation */
  const projection = m4.orthographic(-20, 20, -20, 20, -20, 20);

  /* Get the view matrix from the SimpleRotator object.*/
  const modelView = spaceball.getViewMatrix();

  const rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
  const translateToPointZero = m4.translation(0, 0, -10);

  const matAccum0 = m4.multiply(rotateToPointZero, modelView);
  const matAccum1 = m4.multiply(translateToPointZero, matAccum0);

  const modelViewProjection = m4.multiply(projection, matAccum1);

  const modelviewInv = m4.inverse(matAccum1, new Float32Array(16));
  const normalMatrix = m4.transpose(modelviewInv, new Float32Array(16));

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

  gl.uniform1f(shProgram.iShininess, 10.0);
  gl.uniform3fv(shProgram.iLightPos, lPos);
  gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));
  gl.uniform3fv(shProgram.iAmbientColor, [0.2, 0.1, 0.0]);
  gl.uniform3fv(shProgram.iDiffuseColor, [1.0, 1.0, 0.0]);
  gl.uniform3fv(shProgram.iSpecularColor, [1.0, 1.0, 1.0]);

  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

  surface.Draw();
}

function rerender() {
  surface.BufferData(CreateSurfaceData());
  draw();
}

function CreateSurfaceData() {
  let vertexList = [];

  const scale = 3.5;

  const U_END = 360;
  const V_END = 50;
  const a = 1;
  const b = 1;
  const n = 1;

  const step = surfaceType.checked ? 0.2 : 1;

  for (let u = 0; u < U_END; u += step) {
    for (let v = -1; v < V_END; v += step) {
      const vRad = deg2rad(v);
      const uRad = deg2rad(u);

      let x = (a + b * Math.sin(n * uRad)) * Math.cos(uRad) - vRad * Math.sin(uRad);
      let y = (a + b * Math.sin(n * uRad)) * Math.sin(uRad) + vRad * Math.cos(uRad);
      let z = b * Math.cos(n * uRad);

      vertexList.push(x * scale, y * scale, z * scale);
    }
  }

  pointsLength = U_END;

  return vertexList;
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, 'vertex');
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, 'ModelViewProjectionMatrix');
  shProgram.iColor = gl.getUniformLocation(prog, 'color');

  shProgram.iNormal = gl.getAttribLocation(prog, 'normal');
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, 'normalMatrix');

  shProgram.iAmbientColor = gl.getUniformLocation(prog, 'ambientColor');
  shProgram.iDiffuseColor = gl.getUniformLocation(prog, 'diffuseColor');
  shProgram.iSpecularColor = gl.getUniformLocation(prog, 'specularColor');

  shProgram.iShininess = gl.getUniformLocation(prog, 'shininessVal');

  shProgram.iLightPos = gl.getUniformLocation(prog, 'lightPos');
  shProgram.iLightVec = gl.getUniformLocation(prog, 'lightVec');

  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());

  gl.enable(gl.DEPTH_TEST);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in vertex shader:  ' + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error('Error in fragment shader:  ' + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Link error in program:  ' + gl.getProgramInfoLog(prog));
  }
  return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  surfaceType = document.getElementById('SurfaceType');
  lPosElements = document.getElementById('lPos');

  let canvas;
  try {
    canvas = document.getElementById('webglcanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {
      throw 'Browser does not support WebGL';
    }
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not get a WebGL graphics context.</p>';
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById('canvas-holder').innerHTML =
      '<p>Sorry, could not initialize the WebGL graphics context: ' + e + '</p>';
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  draw();
}
