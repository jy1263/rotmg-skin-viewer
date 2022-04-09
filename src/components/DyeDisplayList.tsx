import React, { useEffect, useState } from "react";
import { XMLObject, ObjectClass, Dye } from "rotmg-utils";
import { DyeSetters } from "../App";
import { Manager, ManagerLoading } from "../Assets";
import { DyeDisplay } from "./DyeDisplay";
import styles from "./DyeDisplayList.module.css"

type Props = {
	setters: DyeSetters;
	main?: Dye;
	accessory?: Dye;
}

type State = {
	dyes: Dye[];
	searchInput: string;
}

let globalDyes: Dye[] = [];

export function DyeDisplayList(props: Props) {
	const [ dyes, setDyes ] = useState<Dye[]>([]);
	const [ searchInput, setSearchInput ] = useState<string>("");

	const updateDyesFromFilter = () => {
		setDyes(globalDyes.filter(dye => dye.getDisplayName().toLowerCase().includes(searchInput.toLowerCase())));
	}

	const onSearchInput = (ev: React.FormEvent<HTMLInputElement>) => {
		setSearchInput((ev.target as HTMLInputElement).value);
	}

	useEffect(updateDyesFromFilter, [ searchInput ])
	useEffect(() => {
		if (dyes.length === 0) {
			ManagerLoading.then(() => {
				const dyes = Manager.getAll<XMLObject>("dyes").filter((obj) => obj.class === ObjectClass.Dye && (obj as Dye).isClothing()) as Dye[]
				if (globalDyes.length === 0) globalDyes = dyes;
				updateDyesFromFilter()
			})
		}
	})

	return <div className={styles.container}>
		<input type="text" className={styles.searchInput} onInput={onSearchInput}></input>
		<div className={styles.list}>
			{dyes.length !== 0 && (
				<DyeDisplay setters={props.setters} dye={undefined}/>
			)}
			
			{dyes.map((dye => {
				return <DyeDisplay setters={props.setters} key={dye.id} dye={dye} main={props.main} accessory={props.accessory} />
			}))}
		</div>
		
	</div>
}