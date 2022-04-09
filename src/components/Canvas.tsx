import React from "react";
import { Action, Direction, Dye, Skin, Sprite, SpriteData, SpritePosition } from "rotmg-utils";
import { Manager } from "../Assets";
import styles from "./Canvas.module.css";

export type CanvasState = {
	data?: GLData;
	direction: Direction;
	action: Action;
	flipped: boolean;
	animationHandle?: number

	size: [number, number]
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

	vec4 textile(in vec4 coords) {
		float x = mod(coords.z * v_relative_coords.x * u_player_res.x, coords.z);
		float y = mod(coords.w * v_relative_coords.y * u_player_res.y, coords.w);
		return(texture2D(u_textiles, (coords.xy + vec2(x, y)) / u_textiles_res));
	}

	void main() {
		vec4 mask = texture2D(u_mask, v_mask_coord / u_mask_res);
		if (mask.a > 0.003) {
			if (mask.g > 0.006) {
				if (u_accessory_color.a > 0.0) {
					gl_FragColor = vec4(mask.g, mask.g, mask.g, 1) * u_accessory_color;
					return;
				}
				if (u_accessory_textile_coords.x != 0.0) {
					gl_FragColor = vec4(mask.g, mask.g, mask.g, 1) * textile(u_accessory_textile_coords);
					return;
				}
			} else if (mask.r > 0.003) {
				if (u_main_color.a > 0.0) {
					gl_FragColor = vec4(mask.r, mask.r, mask.r, 1) * u_main_color;
					return;
				}
				if (u_main_textile_coords.x != 0.0) {
					gl_FragColor = vec4(mask.r, mask.r, mask.r, 1) * textile(u_main_textile_coords) ;
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
	lastUpdateTime: number = 0;
	set: number = 0;
	setCount: number = 1;

	moving: boolean = false;
	attacking: boolean = false;
	
	move: {
		[direction: string]: boolean
	} = {}

	constructor(props: CanvasProps) {
		super(props)
		this.canvasRef = React.createRef();
		this.state = {
			direction: Direction.Side,
			action: Action.None,
			flipped: false,
			size: [768, 256]
		}
	}

	componentDidMount() {
		window.addEventListener("resize", this.onResize);

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

			const size = Math.min(gl.drawingBufferWidth, gl.drawingBufferHeight);

			data.attribs["a_position"] = createAttrib(data.program, "a_position", [
				16, 16,
				size - 16, 16,
				size - 16, size - 16,
				16, size - 16
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
			data.uniforms["u_main_textile_anim"] = gl.getUniformLocation(data.program, "u_main_textile_anim");
			data.uniforms["u_accessory_textile_anim"] = gl.getUniformLocation(data.program, "u_accessory_textile_anim");
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
		window.removeEventListener("resize", this.onResize);
	}

	onResize = () => {
		const canvas = this.canvasRef.current;
		if (canvas === null || canvas.parentElement === null) return;
		const parentSize = canvas.parentElement.getBoundingClientRect();
		const width = Math.min(768, parentSize.width);
		// const height = Math.min(256, parentSize.height);
		this.setState({size: [width, width / 3]})
	}

	updateSprites() {
		const skin = this.props.skin as Skin;
		const gl = this.getGLContext();
		if (gl === null) return;
		if (this.state.data === undefined) return;
		const sprites = Manager.get("sprites", {
			texture: skin.texture,
			animated: true,
			multiple: true,
			direction: this.state.direction,
			action: this.state.action
		})?.value as Sprite[]

		const sets: number[] = [];

		for (const sprite of sprites) {
			const set = sprite.getAnimatedData().set;
			if (!sets.includes(set)) sets.push(set);
		}

		const set = sets[Math.floor(Math.random() * sets.length)];
		this.sprites = sprites.filter(sprite => sprite.getAnimatedData().set === set);

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
				gl.uniform4f(uniforms["u_main_color"], 0, 0, 0, 0);
			}
		} else {
			gl.uniform4f(uniforms["u_main_textile_coords"], 0, 0, 0, 0);
			gl.uniform4f(uniforms["u_main_color"], 0, 0, 0, 0);
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
				gl.uniform4f(uniforms["u_accessory_color"], 0, 0, 0, 0);
			}
		} else {
			gl.uniform4f(uniforms["u_accessory_textile_coords"], 0, 0, 0, 0);
			gl.uniform4f(uniforms["u_accessory_color"], 0, 0, 0, 0);
		}

		gl.uniform2f(uniforms["u_player_res"], spriteData.position.w, spriteData.position.h);
		this.lastUpdateTime = this.time;
	}

	getGLContext = () => {
		const canvas = this.canvasRef.current;
		if (canvas === null) return null;
		const gl = canvas.getContext("webgl");
		return gl;
	}

	getRenderVerts(gl: WebGLRenderingContext, data: SpriteData) {
		let startX = gl.drawingBufferWidth / 3;
		const widthScale = data.position.w / data.position.h;
		const padding = 16;
		const size = gl.drawingBufferWidth / 3;

		if (this.state.flipped && widthScale > 1) {
			startX -= size;
		}

		//TODO: this is dumb
		return [
			startX + padding, padding,
			startX + (size * widthScale) - (widthScale > 1 ? padding  : 0), padding,
			startX + (size * widthScale) - (widthScale > 1 ? padding  : 0), size - padding,
			startX + padding, size - padding
		]

	}

	getRelativeVerts(data: SpriteData) {
		const widthScale = data.position.w / data.position.h;

		return [
			0, 0,
			widthScale, 0,
			widthScale, 1,
			0, 1
		]
	}

	keyToDirection(key: string): string | undefined {
		switch(key) {
			case "w":
				return "up";
			case "s": 
				return "down";
			case "a":
				return "left";
			case "d":
				return "right";
		}
	}

	isMoving(): boolean {
		for (const value of Object.values(this.move)) {
			if (value) return value;
		}
		return false;
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

		const dir = this.keyToDirection(ev.key);
		if (dir !== undefined) {
			this.move[dir] = true;
			if (!this.attacking) newState.action = Action.Walk;
		}

		this.setState(newState);
	}

	onKeyUp = (ev: React.KeyboardEvent) => {
		const dir = this.keyToDirection(ev.key);
		if (dir !== undefined) {
			this.move[dir] = false;
			if (!this.attacking && !this.isMoving()) {
				this.setState({action: Action.None});
			}
		}
	}

	onMouseUp = (ev: React.MouseEvent) => {
		this.attacking = false;
		this.setState({action: this.moving ? Action.Walk : Action.None});
	}

	onMouseDown = (ev: React.MouseEvent) => {
		this.attacking = true;
		this.setState({action: Action.Attack});
	}

	onTouchStart = (ev: React.TouchEvent) => {
		this.attacking = true;
	}

	onTouchEnd = (ev: React.TouchEvent) => {
		this.attacking = false;
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
			let index = Math.floor((this.time - this.lastUpdateTime) / 100) % length;
			if (this.sprites.length > 2) {
				index++;
			}

			const spriteData = this.sprites[index].getData();

			const pos = attribs["a_position"];
			gl.bindBuffer(gl.ARRAY_BUFFER, pos.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getRenderVerts(gl, spriteData)), gl.DYNAMIC_DRAW)
			gl.vertexAttribPointer(pos.location, 2, gl.FLOAT, false, 0, 0)

			const attrib = attribs["a_tex_coord"];
			gl.bindBuffer(gl.ARRAY_BUFFER, attrib.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getVerts(spriteData.position)), gl.DYNAMIC_DRAW)
			gl.vertexAttribPointer(attrib.location, 2, gl.FLOAT, false, 0, 0)

			const maskCoord = attribs["a_mask_coord"];
			gl.bindBuffer(gl.ARRAY_BUFFER, maskCoord.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getVerts(spriteData.maskPosition)), gl.DYNAMIC_DRAW)
			gl.vertexAttribPointer(maskCoord.location, 2, gl.FLOAT, false, 0, 0)

			const relative = attribs["a_relative_coords"];
			gl.bindBuffer(gl.ARRAY_BUFFER, relative.buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getRelativeVerts(spriteData)), gl.DYNAMIC_DRAW)
			gl.vertexAttribPointer(relative.location, 2, gl.FLOAT, false, 0, 0)

			var primitiveType = gl.TRIANGLE_FAN;
			var offset = 0;
			var count = 4;
			gl.drawArrays(primitiveType, offset, count);
		}
		requestAnimationFrame(this.animate);
	}

	render() {
		return <div className={styles.container} style={{height: this.state.size[1]}}>
			<canvas 
				width={this.state.size[0]} 
				height={this.state.size[1]} 
				ref={this.canvasRef} 
				onKeyDown={this.onKeyDown} 
				onKeyUp={this.onKeyUp}
				onMouseDown={this.onMouseDown} 
				onMouseUp={this.onMouseUp} 
				onTouchStart={this.onTouchStart}
				onTouchEnd={this.onTouchEnd}
				tabIndex={1} 
				className={styles.canvas}>
					
			</canvas>
		</div>

	}
}