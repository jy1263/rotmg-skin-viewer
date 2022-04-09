import React, { CSSProperties, ReactNode, useEffect, useState } from "react";
import { Dye, ObjectClass, Player, Skin, Sprite, XMLObject } from "rotmg-utils";
import { Setter } from "../App";
import { Manager, ManagerLoading } from "../Assets";
import { SkinDisplay } from "./SkinDisplay";
import styles from "./SideBar.module.css";
import cx from "classnames"
import { getSpriteStyle } from "../helper";

type Props = {
	set: Setter<Skin>;
	skin?: Skin;
	main?: Dye;
	accessory?: Dye;
}

let globalSkins: Skin[] = [];
let globalClasses: Player[] = [];

export function SideBar(props: Props) {
	const [ skins, setSkins ] = useState<Skin[]>(globalSkins);
	const [ classes, setClasses ] = useState<Player[]>(globalClasses);
	const [ toggled, setToggled ] = useState<boolean>(true);
	const [ searchInput, setSearchInput ] = useState<string>("");
	const [ classType, setClassType ] = useState<number>(0x0300);

	function toggle() {
		setToggled(!toggled);
	}

	const updateSkins = () => {
		setSkins(globalSkins.filter(skin => skin.playerClassType === classType && skin.getDisplayName().toLowerCase().includes(searchInput.toLowerCase())));
	}

	const updateSearchFilter = (ev: React.FormEvent<HTMLInputElement>) => {
		setSearchInput((ev.target as HTMLFormElement).value);
	}

	const updateClassType = (ev: React.FormEvent<HTMLSelectElement>) => {
		setClassType(parseInt((ev.target as HTMLSelectElement).value))
	}

	useEffect(() => {
		if (skins.length === 0) {
			ManagerLoading.then(() => {
				const skins = Manager.getAll<XMLObject>("skins").filter((obj) => obj.class === ObjectClass.Skin) as Skin[];
				if (globalSkins.length === 0) globalSkins = skins;
				updateSkins();
			})
		}
		if (globalClasses.length === 0) {
			ManagerLoading.then(() => {
				const classes = Manager.getAll<XMLObject>("classes").filter((obj) => obj.class === ObjectClass.Player) as Player[];
				if (globalClasses.length === 0) globalClasses = classes;
				setClasses(classes);
			})
		}
	})

	function getStyleFor(object: Dye | Skin | undefined): CSSProperties {
		if (object === undefined) return {};

		if (object instanceof Dye) {
			if (object.isColor()) {
				return {
					borderRadius: "4px",
					backgroundColor: object.getColor()
				}
			} else {
				let sprite = Manager.get<Sprite>("sprites", {
					texture: object.getTextileTexture()
				})?.value;
				if (sprite !== undefined) {
					return { ...getSpriteStyle(sprite, 32), borderRadius: "4px" }
				}
			}
		} else {
			let sprite = Manager.get<Sprite>("sprites", {
				texture: object.texture
			})?.value;
			if (sprite !== undefined) {
				return  getSpriteStyle(sprite, 32);
			}
		}
		return {};
	}

	useEffect(() => {
		updateSkins()
	}, [ searchInput, classType ])

	return <div className={cx(styles.container, {[styles.hidden]: !toggled})}>
		<select onChange={updateClassType} className={styles.classInput}>
			{classes.map(clazz => (
				<option key={clazz.type} value={clazz.type}>{clazz.getDisplayName()}</option>
			))}
		</select>
		<input type="text" className={styles.searchInput} onInput={updateSearchFilter}/>
		<div className={styles.currentSelectedBar}>

			<div className={styles.currentSelected} title={props.skin?.getDisplayName() ?? "No skin selected!"}>
				<div style={getStyleFor(props.skin)} />
			</div>
			<div className={styles.currentSelected} title={props.main?.getDisplayName() ?? "No dye selected!"}>
				<div style={getStyleFor(props.main)} />
			</div>
			<div className={styles.currentSelected} title={props.accessory?.getDisplayName() ?? "No dye selected!"}>
				<div style={getStyleFor(props.accessory)} />
			</div>
		</div>
		<div className={styles.list}>
			{skins.map((skin => {
				return <SkinDisplay key={skin.id} skin={skin} set={props.set}/>
			}))}
		</div>
	</div>
}