import { useEffect, useState } from "react";
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

export function DyeDisplayList(props: Props) {
	const [ state, setState ] = useState<Dye[]>([]);

	useEffect(() => {
		if (state.length === 0) {
			ManagerLoading.then(() => {
				setState(Manager.getAll<XMLObject>("rotmg").filter((obj) => obj.class === ObjectClass.Dye && (obj as Dye).isClothing()) as Dye[]);
			})
		}
	})

	return <div className={styles.list}>
		<DyeDisplay setters={props.setters} dye={undefined}/>
		{state.map((dye => {
			return <DyeDisplay setters={props.setters} key={dye.id} dye={dye} main={props.main} accessory={props.accessory} />
		}))}
	</div>
}