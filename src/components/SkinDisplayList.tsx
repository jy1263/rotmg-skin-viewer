import { useEffect, useState } from "react";
import { ObjectClass, Skin, XMLObject } from "rotmg-utils";
import { SkinSetter } from "../App";
import { Manager, ManagerLoading } from "../Assets";
import { SkinDisplay } from "./SkinDisplay";
import styles from "./SkinDisplayList.module.css";
import cx from "classnames"

type Props = {
	set: SkinSetter;
}

type State = {
	toggled: boolean;
	skins: Skin[];
}

export function SkinDisplayList(props: Props) {
	const [ state, setState ] = useState<State>({
		toggled: true,
		skins: []
	});

	useEffect(() => {
		if (state.skins.length === 0) {
			ManagerLoading.then(() => {
				setState((state) => ({
					...state, skins: Manager.getAll<XMLObject>("rotmg").filter((obj) => obj.class === ObjectClass.Skin && (obj as Skin).playerClassType === 0x0307) as Skin[]
				}))
			})
		}
	})

	function toggle() {
		setState(state => ({
			...state, toggled: !state.toggled
		}))
	}

	return <div className={cx(styles.list, {[styles.hidden]: !state.toggled})}>
		{state.skins.map((skin => {
			return <SkinDisplay key={skin.id} skin={skin} set={props.set}/>
		}))}
	</div>
}