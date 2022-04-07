import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { AssetManager, RotMGAssetLoader } from "rotmg-utils"

const manager = new AssetManager();
manager.registerLoader("rotmg-asset", new RotMGAssetLoader());
	manager.load({
		name: "test",
		default: true,
		containers: [
			{
				loader: "rotmg-asset",
				type: "rotmg",
				sourceLoader: "url-to-text",
				settings: {
					readOnly: true,
					type: "object"
				},
				
				sources: [
					"https://www.haizor.net/rotmg/assets/production/xml/skins.xml"
				]
			}
		]
	}).then((a) => {
    console.log( manager.get("rotmg", "Iceman")?.value);
  });

  
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
