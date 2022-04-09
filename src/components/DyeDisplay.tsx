import { Dye, Sprite } from "rotmg-utils";
import { DyeSetters } from "../App";
import { Manager } from "../Assets";
import styles from "./DyeDisplay.module.css";
import cx from "classnames";
import { getSpriteStyle } from "../helper";

type DyeDisplayProps = {
	dye?: Dye;
	setters: DyeSetters;
	main?: Dye;
	accessory?: Dye;
}

export function DyeDisplay(props: DyeDisplayProps) {
	let style: React.CSSProperties = {};
	
	if (props.dye !== undefined) {
		if (props.dye.isColor()) {
			style.backgroundColor = props.dye.getColor();
		} else {
			const sprite = Manager.get<Sprite>("sprites", {
				texture: props.dye.getTextileTexture()
			})?.value;
	
			if (sprite !== undefined) {
				style = getSpriteStyle(sprite, 64);
			}
		}
	} 
	
	return <div className={styles.dyeDisplay} style={style}>
		{props.dye === undefined && 
			(<div className={styles.remove}>
				❌
			</div>)
		}
		<div className={cx(styles.dyeDisplaySelector, {[styles.dyeDisplaySelectorSelected]: props.dye !== undefined && props.dye === props.main})} onClick={() => props.setters.main(props.dye)} />
		<div className={cx(styles.dyeDisplaySelector, {[styles.dyeDisplaySelectorSelected]: props.dye !== undefined && props.dye === props.accessory})} onClick={() => props.setters.accessory(props.dye)}/>
	</div>
} 