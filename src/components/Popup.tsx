import { Fragment, ReactNode, useState } from "react"
import { createPortal } from "react-dom";
import styles from "./Popup.module.css";
import cx from "classnames"

type Props = {
	button: ReactNode
	children: ReactNode
}

export function Popup(props: Props) {
	const [ toggled, setToggled ] = useState<boolean>(false);
	const portalElement = document.getElementById("portal");

	
	const popup = (
		<div className={cx(styles["popup-back"], {[styles.toggled]: toggled})} onClick={() => setToggled(!toggled)}>
			{toggled && (
				<div onClick={(e) => e.stopPropagation()}>
					{props.children}
				</div>
			)}
		</div>
	)

	let portal = portalElement !== null ? createPortal(popup, portalElement) : null;

	return (
		<Fragment>
			<div onClick={() => setToggled(!toggled)}>
				{props.button}
			</div>

			{portal}

		</Fragment>
	)
}