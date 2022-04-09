import { CSSProperties } from "react";
import { Skin, Sprite } from "rotmg-utils"
import { Setter } from "../App";
import { Manager } from "../Assets";
import { getSpriteStyle } from "../helper";
import styles from "./SkinDisplay.module.css";

type Props = {
	skin: Skin;
	set: Setter<Skin>;
}

export function SkinDisplay(props: Props) {
	let style: CSSProperties = {};

	const sprite = Manager.get<Sprite>("sprites", {
		texture: props.skin.texture
	})?.value;

	if (sprite !== undefined) {
		style = getSpriteStyle(sprite, 64);
		style.width = 64;
		style.height = 64;
	}

	return <div className={styles.skin} style={style} onClick={() => props.set(props.skin)}>
		
	</div>
}