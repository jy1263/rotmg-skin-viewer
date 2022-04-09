import React from 'react';
import { Canvas } from './components/Canvas';
import { Dye, Skin } from 'rotmg-utils';
import { Manager, ManagerLoading } from './Assets';
import styles from "./App.module.css";
import { DyeDisplayList } from './components/DyeDisplayList';
import { SkinDisplayList } from './components/SkinDisplayList';
import { TopBar } from './components/TopBar';

type AppState = {
	skin?: Skin;
	mainDye?: Dye;
	accessoryDye?: Dye;
	settings: Settings
	loaded: boolean;
}

export type DyeSetters = {
	main: Setter<Dye | undefined>;
	accessory: Setter<Dye | undefined>;
}

export type Setter<T> = (value: T) => void;

export type Settings = {
	animationSpeed: number;
	animationSpeedSetter: Setter<number>
}

export class App extends React.Component<{}, AppState> {
	dyeSetters: DyeSetters;

	constructor(props: {}) {
		super(props)
		this.state = {
			loaded: false,
			settings: {
				animationSpeed: 2,
				animationSpeedSetter: this.setAnimationSpeed
			}
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
	setAnimationSpeed = (animationSpeed: number) => this.setState((state) => ({...state, settings: {...state.settings, animationSpeed: animationSpeed}}));

	render(): React.ReactNode {
		return (
			<React.Fragment>
				<div className={styles.main}>
					<TopBar settings={this.state.settings}/>
					<div className={styles.app}>
						<Canvas skin={this.state.skin} mainDye={this.state.mainDye} accessoryDye={this.state.accessoryDye} settings={this.state.settings}/>
						<DyeDisplayList setters={this.dyeSetters} main={this.state.mainDye} accessory={this.state.accessoryDye} />
						<SkinDisplayList set={this.setSkin}/>
					</div>
				</div>
				<div id="portal" />
			</React.Fragment>

			
		);
	}
}
	
export default App;
	