import styles from "./TopBar.module.css";
import cx from "classnames";
import { Popup } from "./Popup";
import { SettingsMenu } from "./SettingsMenu";
import { Settings } from "../App";

export function TopBar(props: {settings: Settings}) {
	return <div className={styles.topBar}>
		<Popup button={
			<span className={styles.settings}>⚙️</span>
		}>
			<SettingsMenu settings={props.settings} />
		</Popup>
		
		<a href="https://discord.com/invite/HFfu6sZ" target="_blank" rel="noreferrer">
			<img className={styles.icon} src="discord_logo.svg" alt="Discord link" />
		</a>
		
		<a href="https://github.com/Haizor/rotmg-skin-viewer" target="_blank" rel="noreferrer">
			<img className={cx(styles.icon, styles.github)} src="github_icon.svg" alt="Github link" />
		</a>
		<div className={styles.title}>
			Haizor.net
		</div>
	</div>
}