import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Canvas } from './Canvas';
import { Skin } from 'rotmg-utils';
import { Manager, ManagerLoading } from './Assets';

type AppState = {
	skin?: Skin;
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
		this.setState({skin: Manager.get("rotmg", "Robin Hood")?.value as Skin | undefined});
	}

	render(): React.ReactNode {
		return (
			<div className="App">
				<Canvas skin={this.state.skin}/>
			</div>
		);
	}
}
	
export default App;
	