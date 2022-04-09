import React, { useEffect, useState } from "react";
import { ObjectClass, Player, Skin, XMLObject } from "rotmg-utils";
import { Setter } from "../App";
import { Manager, ManagerLoading } from "../Assets";
import { SkinDisplay } from "./SkinDisplay";
import styles from "./SkinDisplayList.module.css";
import cx from "classnames"

type Props = {
	set: Setter<Skin>;
}

let globalSkins: Skin[] = [];
let globalClasses: Player[] = [];

export function SkinDisplayList(props: Props) {
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
		<div className={styles.list}>
			{skins.map((skin => {
				return <SkinDisplay key={skin.id} skin={skin} set={props.set}/>
			}))}
		</div>
	</div>
}