import React from "react";
import { Sprite } from "rotmg-utils";

export function getSpriteStyle(sprite: Sprite, size: number): React.CSSProperties {
	const style: React.CSSProperties = {};
	const data = sprite.getData();
	const scaling = size / data.position.w;
	style.backgroundImage = `url(${sprite.getAtlasSource()})`;
	style.backgroundPosition = `-${data.position.x * scaling}px -${data.position.y * scaling}px`;
	style.backgroundSize = `${4096 * scaling}px`
	style.imageRendering = "pixelated"
	return style;
}