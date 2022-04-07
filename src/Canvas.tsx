import React, { useEffect } from "react";

export type CanvasState = {
	data?: GLData;
	animationHandle?: number
}

export type AttribData = {
	buffer: WebGLBuffer | null;
	location: number;
}

export type GLData = {
	program: WebGLProgram;
	texture?: WebGLTexture | null;
	attribs: {
		[key: string]: AttribData 
	};
	uniforms: {
		[key: string]: WebGLUniformLocation | null;
	};
}

const vertexSrc = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

uniform vec2 u_resolution;

void main() {
    vec2 zeroToOne = a_position / u_resolution;
 
    vec2 zeroToTwo = zeroToOne * 2.0;
 
    vec2 clipSpace = zeroToTwo - 1.0;

	v_texCoord = a_texCoord;
 
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`

const fragSrc = `
precision mediump float;

uniform sampler2D u_image;
uniform vec2 u_image_res;

varying vec2 v_texCoord;

void main() {
  gl_FragColor = texture2D(u_image, v_texCoord / u_image_res);
}
`

function createProgram(gl: WebGLRenderingContext) {
	const vertex = createShader(gl, vertexSrc, gl.VERTEX_SHADER);
	const fragment = createShader(gl, fragSrc, gl.FRAGMENT_SHADER);

	const program = gl.createProgram();
	if (program === null) throw new Error("Failed to create program!");
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);

	const success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (success) return program;

	const error = new Error("Failed to link program! " + gl.getProgramInfoLog(program));
	gl.deleteProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	throw error;
}

function createShader(gl: WebGLRenderingContext, src: string, type: number) {
	const shader = gl.createShader(type);
	if (shader === null) throw new Error("Failed to create shader!");
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (success) {
		return shader;
	}
	const error = new Error("Failed to compile shader! " + gl.getShaderInfoLog(shader));
	gl.deleteShader(shader);
	throw error;
}

export class Canvas extends React.Component<{}, CanvasState> {
	canvasRef: React.RefObject<HTMLCanvasElement>

	constructor(props: {}) {
		super(props)
		this.canvasRef = React.createRef();
		this.state = {}
	}

	componentDidMount() {
		const gl = this.getGLContext();
		if (gl === null) return;

		const createAttrib = (program: WebGLProgram, name: string, defaultData: number[]) => {
			const attribData: AttribData = {
				buffer: gl.createBuffer(),
				location: gl.getAttribLocation(program, name)
			}
			gl.enableVertexAttribArray(attribData.location);
			gl.bindBuffer(gl.ARRAY_BUFFER, attribData.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(defaultData), gl.DYNAMIC_DRAW)
			gl.vertexAttribPointer(attribData.location, 2, gl.FLOAT, false, 0, 0)
			return attribData;
		}

		const createTexture = () => {
			return new Promise<WebGLTexture | null>((res, rej) => {
				const image = new Image();
				image.crossOrigin = "anonymous";
				image.src = "https://www.haizor.net/rotmg/assets/production/atlases/characters.png";
				image.onload = () => {
					if (this.state.data) {
						gl.useProgram(this.state.data.program);
						gl.uniform2f(this.state.data.uniforms["u_image_res"], image.naturalWidth, image.naturalHeight);
					}

					const texture = gl.createTexture();
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

					res(texture);
				}
			})
		}

		if (!this.state.data) {
			const data: GLData = {
				program: createProgram(gl),
				attribs: {},
				uniforms: {},
			}

			data.attribs["a_position"] = createAttrib(data.program, "a_position", [
				0, 0,
				256, 0,
				256, 256,
				0, 256
			]);
			data.attribs["a_texCoord"] = createAttrib(data.program, "a_texCoord", [
				1624, 388,
				1624 + 16, 388,
				1624 + 16, 388 + 16,
				1624, 388 + 16
			]);

			data.uniforms["u_resolution"] = gl.getUniformLocation(data.program, "u_resolution");
			data.uniforms["u_image_res"] = gl.getUniformLocation(data.program, "u_image_res");

			createTexture().then((texture: WebGLTexture | null) => {
				this.setState((state) => {
					if (state.data) {
						state.data.texture = texture;
					}
					
				})
			})

			this.setState({data});
		}
		requestAnimationFrame(this.animate);
	}

	componentWillUnmount() {
		if (this.state.animationHandle) {
			cancelAnimationFrame(this.state.animationHandle);
		}
	}

	getGLContext = () => {
		const canvas = this.canvasRef.current;
		if (canvas === null) return null;
		const gl = canvas.getContext("webgl");
		return gl;
	}

	animate = (timestamp: DOMHighResTimeStamp) => {
		const gl = this.getGLContext();
		if (gl !== null && this.state.data !== undefined) {
			const { program, attribs, uniforms } = this.state.data;

			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
			gl.clearColor(0, 0, 0, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.useProgram(program);

			gl.uniform2f(uniforms["u_resolution"], gl.drawingBufferWidth, gl.drawingBufferHeight);


			var primitiveType = gl.TRIANGLE_FAN;
			var offset = 0;
			var count = 4;
			gl.drawArrays(primitiveType, offset, count);
		}
		requestAnimationFrame(this.animate);
	}

	render() {
		return <canvas width={400} height={400} ref={this.canvasRef}></canvas>
	}
}