import React, { useEffect } from "react";
import { Action, BasicTexture, Direction, Dye, Skin, Sprite, SpriteData, SpritePosition } from "rotmg-utils";
import { Manager } from "./Assets";

export type CanvasState = {
	data?: GLData;
	direction: Direction;
	action: Action;
	flipped: boolean;
	animationHandle?: number
}

export type CanvasProps = {
	skin?: Skin;
	mainDye?: Dye;
	accessoryDye?: Dye;
}

export type AttribData = {
	buffer: WebGLBuffer | null;
	location: number;
}

export type GLData = {
	program: WebGLProgram;
	texture?: WebGLTexture | null;
	mask?: WebGLTexture | null;
	attribs: {
		[key: string]: AttribData 
	};
	uniforms: {
		[key: string]: WebGLUniformLocation | null;
	};
}

const vertexSrc = `
	precision highp float;

	attribute vec2 a_position;
	attribute vec2 a_tex_coord;
	attribute vec2 a_mask_coord;
	
	attribute vec2 a_relative_coords;

	varying vec2 v_tex_coord;
	varying vec2 v_mask_coord;

	varying vec2 v_relative_coords;

	uniform vec2 u_resolution;

	void main() {
		vec2 zeroToOne = a_position / u_resolution;
	
		vec2 zeroToTwo = zeroToOne * 2.0;
	
		vec2 clipSpace = zeroToTwo - 1.0;

		v_tex_coord = a_tex_coord;
		v_mask_coord = a_mask_coord;

		v_relative_coords = a_relative_coords;
	
		gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
	}
`

const fragSrc = `
	precision highp float;

	uniform sampler2D u_image;
	uniform sampler2D u_mask;
	uniform sampler2D u_textiles;
	
	uniform vec2 u_image_res;
	uniform vec2 u_mask_res;
	uniform vec2 u_textiles_res;
	uniform vec2 u_player_res;

	uniform vec4 u_main_color;
	uniform vec4 u_accessory_color;

	uniform vec4 u_main_textile_coords;
	uniform vec4 u_accessory_textile_coords;
	uniform vec4 u_main_textile_anim;
	uniform vec4 u_accessory_textile_anim;

	varying vec2 v_tex_coord;
	varying vec2 v_mask_coord;

	varying vec2 v_relative_coords;

	void main() {
		vec4 mask = texture2D(u_mask, v_mask_coord / u_mask_res);
		if (mask.a > 0.003) {
			if (mask.g > 0.006) {
				if (u_accessory_color.a > 0.0) {
					gl_FragColor = vec4(mask.g, mask.g, mask.g, 1) * u_accessory_color;
					return;
				}
				if (u_accessory_textile_coords.x != 0.0) {
					float x = mod(u_accessory_textile_coords.z * v_relative_coords.x * u_player_res.x, u_accessory_textile_coords.z);
					float y = mod(u_accessory_textile_coords.w * v_relative_coords.y * u_player_res.y, u_accessory_textile_coords.w);
					gl_FragColor = texture2D(u_textiles, (u_accessory_textile_coords.xy + vec2(x, y)) / u_textiles_res);
					return;
				}
			} else if (mask.r > 0.003) {
				if (u_main_color.a > 0.0) {
					gl_FragColor = vec4(mask.r, mask.r, mask.r, 1) * u_main_color;
					return;
				}
				if (u_main_textile_coords.x != 0.0) {
					float x = mod(u_main_textile_coords.z * v_relative_coords.x * u_player_res.x, u_main_textile_coords.z);
					float y = mod(u_main_textile_coords.w * v_relative_coords.y * u_player_res.y, u_main_textile_coords.w);
					gl_FragColor = texture2D(u_textiles, (u_main_textile_coords.xy + vec2(x, y)) / u_textiles_res);
					return;
				}
			} 
		}
		gl_FragColor = texture2D(u_image, v_tex_coord / u_image_res);
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

export class Canvas extends React.Component<CanvasProps, CanvasState> {
	canvasRef: React.RefObject<HTMLCanvasElement>
	sprites: Sprite[] = [];
	time: number = 0;

	constructor(props: CanvasProps) {
		super(props)
		this.canvasRef = React.createRef();
		this.state = {
			direction: Direction.Front,
			action: Action.Walk,
			flipped: false
		}
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

		const createTexture = (src: string, name: string, index: number) => {
			return new Promise<WebGLTexture | null>((res, rej) => {
				const image = new Image();
				image.crossOrigin = "anonymous";
				image.src = src;
				image.onload = () => {
					if (this.state.data) {
						gl.useProgram(this.state.data.program);
						gl.uniform2f(this.state.data.uniforms[`u_${name}_res`], image.naturalWidth, image.naturalHeight);
					}

					const texture = gl.createTexture();
					gl.activeTexture(index);
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
				32, 32,
				368, 32,
				368, 368,
				32, 368
			]);
			data.attribs["a_tex_coord"] = createAttrib(data.program, "a_tex_coord", [
				1624, 388,
				1624 + 16, 388,
				1624 + 16, 388 + 16,
				1624, 388 + 16
			]);
			data.attribs["a_mask_coord"] = createAttrib(data.program, "a_mask_coord", [
				0, 0,
				0, 0,
				0, 0,
				0, 0 
			]);
			data.attribs["a_relative_coords"] = createAttrib(data.program, "a_relative_coords", [
				0, 0,
				1, 0,
				1, 1,
				0, 1 
			]);


			data.uniforms["u_resolution"] = gl.getUniformLocation(data.program, "u_resolution");
			data.uniforms["u_image_res"] = gl.getUniformLocation(data.program, "u_image_res");
			data.uniforms["u_mask_res"] = gl.getUniformLocation(data.program, "u_mask_res");
			data.uniforms["u_textiles_res"] = gl.getUniformLocation(data.program, "u_textiles_res");
			data.uniforms["u_main_textile_coords"] = gl.getUniformLocation(data.program, "u_main_textile_coords");
			data.uniforms["u_accessory_textile_coords"] = gl.getUniformLocation(data.program, "u_accessory_textile_coords");
			data.uniforms["u_player_res"] = gl.getUniformLocation(data.program, "u_player_res");

			data.uniforms["u_image"] = gl.getUniformLocation(data.program, "u_image");
			data.uniforms["u_mask"] = gl.getUniformLocation(data.program, "u_mask");
			data.uniforms["u_textiles"] = gl.getUniformLocation(data.program, "u_textiles");
			data.uniforms["u_main_color"] = gl.getUniformLocation(data.program, "u_main_color");
			data.uniforms["u_accessory_color"] = gl.getUniformLocation(data.program, "u_accessory_color");
			
			Promise.all([
				createTexture("https://www.haizor.net/rotmg/assets/production/atlases/characters.png", "image", gl.TEXTURE0),
				createTexture("https://www.haizor.net/rotmg/assets/production/atlases/characters_masks.png", "mask", gl.TEXTURE1),
				createTexture("https://www.haizor.net/rotmg/assets/production/atlases/mapObjects.png", "textiles", gl.TEXTURE2),
			]).then((textures: (WebGLTexture | null)[]) => {
				this.setState((state) => {
					if (state.data) {
						state.data.texture = textures[0];
						state.data.mask = textures[1];
					}
					
				})
			})

			this.setState({data});
		}
		requestAnimationFrame(this.animate);
	}

	componentDidUpdate(prevProps: CanvasProps) {
		if (this.props.skin !== undefined) {
			this.updateSprites();
		}
	}

	componentWillUnmount() {
		if (this.state.animationHandle) {
			cancelAnimationFrame(this.state.animationHandle);
		}
	}

	updateSprites() {
		const skin = this.props.skin as Skin;
		const gl = this.getGLContext();
		if (gl === null) return;
		if (this.state.data === undefined) return;
		this.sprites = Manager.get("sprites", {
			texture: skin.texture,
			animated: true,
			multiple: true,
			direction: this.state.direction,
			action: this.state.action
		})?.value as Sprite[]
		const spriteData = this.sprites[0].getData();
		const { program, uniforms, attribs } = this.state.data;
		const textureCoord = attribs["a_tex_coord"];

		gl.bindBuffer(gl.ARRAY_BUFFER, textureCoord.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getVerts(spriteData.position)), gl.DYNAMIC_DRAW)
		gl.vertexAttribPointer(textureCoord.location, 2, gl.FLOAT, false, 0, 0)

		const maskCoord = attribs["a_mask_coord"];
		gl.bindBuffer(gl.ARRAY_BUFFER, maskCoord.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getVerts(spriteData.maskPosition)), gl.DYNAMIC_DRAW)
		gl.vertexAttribPointer(maskCoord.location, 2, gl.FLOAT, false, 0, 0);

		gl.useProgram(program);
		const { mainDye, accessoryDye } = this.props;
		if (mainDye !== undefined) {
			if (mainDye.isColor()) {
				const rgb = mainDye.getRGB() as number[];
				gl.uniform4f(uniforms["u_main_color"], rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1.0);
			}
			if (mainDye.isTextile()) {
				const sprite = Manager.get("sprites", {
					texture: mainDye.getTextileTexture()
				})?.value as Sprite;
				const textilePosition = sprite.getData().position;

				gl.uniform4f(uniforms["u_main_textile_coords"], textilePosition.x, textilePosition.y, textilePosition.w, textilePosition.h);
			}
		}

		if (accessoryDye !== undefined) {
			if (accessoryDye.isColor()) {
				const rgb = accessoryDye.getRGB() as number[];
				gl.uniform4f(uniforms["u_accessory_color"], rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1.0);
			}
			if (accessoryDye.isTextile()) {
				const sprite = Manager.get("sprites", {
					texture: accessoryDye.getTextileTexture()
				})?.value as Sprite;
				const textilePosition = sprite.getData().position;
				gl.uniform4f(uniforms["u_accessory_textile_coords"], textilePosition.x, textilePosition.y, textilePosition.w, textilePosition.h);
			}
		}

		gl.uniform2f(uniforms["u_player_res"], spriteData.position.w, spriteData.position.h);
	}

	getGLContext = () => {
		const canvas = this.canvasRef.current;
		if (canvas === null) return null;
		const gl = canvas.getContext("webgl");
		return gl;
	}

	onKeyDown = (ev: React.KeyboardEvent) => {
		const newState: any = {};
		if (ev.key === "w") {
			newState.direction = Direction.Front;
			newState.flipped = false;
		} else if (ev.key === "s") {
			newState.direction = Direction.Back;
			newState.flipped = false;
		} else if (ev.key === "a") {
			newState.direction = Direction.Side;
			newState.flipped = true;
		} else if (ev.key === "d") {
			newState.direction = Direction.Side;
			newState.flipped = false;
		}

		this.setState(newState);
	}

	onMouseDown = (ev: React.MouseEvent) => {
		this.setState({action: Action.Attack});
	}

	onMouseUp = (ev: React.MouseEvent) => {
		this.setState({action: Action.Walk});
	}

	getVerts(position: SpritePosition) {
		return !this.state.flipped ? [
			position.x, position.y,
			position.x + position.w, position.y,
			position.x + position.w, position.y + position.h,
			position.x, position.y + position.h
		] : [
			position.x + position.w, position.y,
			position.x, position.y,
			position.x, position.y + position.h,
			position.x + position.w, position.y + position.h,
		];
	}

	animate = (timestamp: DOMHighResTimeStamp) => {
		this.time = timestamp;

		const gl = this.getGLContext();
		if (this.sprites.length > 0 && gl !== null && this.state.data !== undefined) {
			const { program, attribs, uniforms } = this.state.data;

			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
			gl.clearColor(0.2, 0.2, 0.2, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.useProgram(program);

			gl.uniform2f(uniforms["u_resolution"], gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.uniform1i(uniforms["u_mask"], 1);
			gl.uniform1i(uniforms["u_textiles"], 2);


			//TODO: is there any real way to check which sprite is used? does the game just skip the first sprite if the skin has 3?
			let length = this.sprites.length;
			if (length > 2) length--;
			let index = Math.floor(this.time / 100) % length;
			if (this.sprites.length > 2) {
				index++;
			}

			const spriteData = this.sprites[index].getData();

			const attrib = attribs["a_tex_coord"];
			gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getVerts(spriteData.position)), gl.DYNAMIC_DRAW)
			gl.vertexAttribPointer(attrib.location, 2, gl.FLOAT, false, 0, 0)

			const maskCoord = attribs["a_mask_coord"];
			gl.bindBuffer(gl.ARRAY_BUFFER, maskCoord.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getVerts(spriteData.maskPosition)), gl.DYNAMIC_DRAW)
			gl.vertexAttribPointer(maskCoord.location, 2, gl.FLOAT, false, 0, 0)

			var primitiveType = gl.TRIANGLE_FAN;
			var offset = 0;
			var count = 4;
			gl.drawArrays(primitiveType, offset, count);
		}
		requestAnimationFrame(this.animate);
	}

	render() {
		return <canvas width={400} height={400} ref={this.canvasRef} onKeyDown={this.onKeyDown} onMouseDown={this.onMouseDown} onMouseUp={this.onMouseUp} tabIndex={1}></canvas>
	}
}