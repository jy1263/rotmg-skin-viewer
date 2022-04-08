import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Canvas } from './Canvas';
import { Dye, Skin } from 'rotmg-utils';
import { Manager, ManagerLoading } from './Assets';

type AppState = {
	skin?: Skin;
	mainDye?: Dye;
	accessoryDye?: Dye;
	loaded: boolean;
}

export class App extends React.Component<{}, AppState> {
	constructor(props: {}) {
		super(props)
		this.state = {
			loaded: false
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
			skin: Manager.get("rotmg", "Robin Hood")?.value as Skin | undefined, 
			mainDye: Manager.get("rotmg", "Blue Clothing Dye")?.value as Dye | undefined,
			accessoryDye: Manager.get("rotmg", "Large Crown Cloth")?.value as Dye | undefined,
		});
	}

	render(): React.ReactNode {
		return (
			<div className="App">
				<Canvas skin={this.state.skin} mainDye={this.state.mainDye} accessoryDye={this.state.accessoryDye}/>
			</div>
		);
	}
}
	
export default App;
	