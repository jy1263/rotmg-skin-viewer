import { AssetManager, RotMGAssetLoader, RotMGSpritesheetLoader } from "rotmg-utils";

const config = {
	name: "main",
	default: true,
	containers: [
		{
			loader: "rotmg-asset",
			type: "rotmg-loader",
			sourceLoader: "url-to-text",
			settings: {
				readOnly: true,
				type: "object"
			},
			
			sources: [
				"https://www.haizor.net/rotmg/assets/production/xml/skins.xml"
			]
		},
		{
			type: "sprites",
			loader: "sprite-loader",
			sourceLoader: "url-to-text",
			sources: [
				"https://www.haizor.net/rotmg/assets/production/atlases/spritesheet.json"
			]
		}
	]
}

export const Manager = new AssetManager();
Manager.registerLoader("rotmg-loader", new RotMGAssetLoader());
Manager.registerLoader("sprite-loader", new RotMGSpritesheetLoader());

export const ManagerLoading = Manager.load(config);