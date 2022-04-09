import { useEffect, useState } from "react";
import { ObjectClass, Skin, XMLObject } from "rotmg-utils";
import { SkinSetter } from "../App";
import { Manager, ManagerLoading } from "../Assets";
import { SkinDisplay } from "./SkinDisplay";
import styles from "./SkinDisplayList.module.css";

type Props = {
	set: SkinSetter;
}

export function SkinDisplayList(props: Props) {
	const [ state, setState ] = useState<Skin[]>([]);

	useEffect(() => {
		if (state.length === 0) {
			ManagerLoading.then(() => {
				setState(Manager.getAll<XMLObject>("rotmg").filter((obj) => obj.class === ObjectClass.Skin && (obj as Skin).playerClassType === 0x0307) as Skin[]);
			})
		}
	})

	return <div className={styles.list}>
		{state.map((skin => {
			return <SkinDisplay key={skin.id} skin={skin} set={props.set}/>
		}))}
	</div>
}