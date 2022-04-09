import React from 'react';
import { Canvas } from './components/Canvas';
import { Dye, Skin } from 'rotmg-utils';
import { Manager, ManagerLoading } from './Assets';
import styles from "./App.module.css";
import { DyeDisplayList } from './components/DyeDisplayList';
import { SkinDisplayList } from './components/SkinDisplayList';

type AppState = {
	skin?: Skin;
	mainDye?: Dye;
	accessoryDye?: Dye;
	loaded: boolean;
}

export type DyeSetters = {
	main: DyeSetter;
	accessory: DyeSetter;
}

export type SkinSetter = (skin: Skin) => void;

export type DyeSetter = (dye?: Dye) => void

export class App extends React.Component<{}, AppState> {
	dyeSetters: DyeSetters;

	constructor(props: {}) {
		super(props)
		this.state = {
			loaded: false
		}

		this.dyeSetters = {
			main: (dye) => this.setState({mainDye: dye}),
			accessory: (dye) => this.setState({accessoryDye: dye})
		}
	}

	componentDidMount() {
		ManagerLoading.then(() => {
			this.setState({loaded: true});
			this.onLoaded();
		})
	}

	onLoaded() {
		this.setState({
			skin: Manager.get("skins", "Robin Hood")?.value as Skin | undefined
		});
	}

	setSkin = (skin: Skin) => this.setState({skin})

	render(): React.ReactNode {
		return (
			<div className={styles.app}>

				<Canvas skin={this.state.skin} mainDye={this.state.mainDye} accessoryDye={this.state.accessoryDye}/>
				<DyeDisplayList setters={this.dyeSetters} main={this.state.mainDye} accessory={this.state.accessoryDye} />
				<SkinDisplayList set={this.setSkin}/>
			</div>
		);
	}
}
	
export default App;
	