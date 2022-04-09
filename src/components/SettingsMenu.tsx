import styles from "./SettingsMenu.module.css"
import { Settings } from "../App"

type Props = {
	settings: Settings
}

export function SettingsMenu(props: Props) {
	return (
		<div className={styles.container}>
			<div className={styles.label}>Animation Speed: </div>
			<input type="number"  min="0.1" max="10" step="0.1" value={props.settings.animationSpeed} onChange={(e) => props.settings.animationSpeedSetter((e.target as any).value)}></input>
		</div>
	)
}