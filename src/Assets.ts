import { AssetManager, RotMGAssetLoader, RotMGSpritesheetLoader } from "rotmg-utils";

const config = {
	name: "main",
	default: true,
	containers: [
		{
			loader: "rotmg-loader",
			type: "classes",
			sourceLoader: "url-to-text",
			settings: {
				readOnly: true,
				type: "object"
			},
			
			sources: [
				"https://rotmg-mirror.github.io/rotmg-metadata/production/xml/players.xml",
			]
		},
		{
			loader: "rotmg-loader",
			type: "skins",
			sourceLoader: "url-to-text",
			settings: {
				readOnly: true,
				type: "object"
			},
			
			sources: [
				"https://rotmg-mirror.github.io/rotmg-metadata/production/xml/players.xml",
				"https://rotmg-mirror.github.io/rotmg-metadata/production/xml/skins.xml"
			]
		},
		{
			loader: "rotmg-loader",
			type: "dyes",
			sourceLoader: "url-to-text",
			settings: {
				readOnly: true,
				type: "object"
			},
			
			sources: [
				"https://rotmg-mirror.github.io/rotmg-metadata/production/xml/dyes.xml",
				"https://rotmg-mirror.github.io/rotmg-metadata/production/xml/textiles.xml"
			]
		},
		{
			type: "sprites",
			loader: "sprite-loader",
			sourceLoader: "url-to-text",
			settings: {
				atlasRoot: "https://rotmg-mirror.github.io/rotmg-metadata/production/atlases/"
			},
			sources: [
				"https://rotmg-mirror.github.io/rotmg-metadata/production/atlases/spritesheet.json"
			]
		}
	]
}

export const Manager = new AssetManager();
Manager.registerLoader("rotmg-loader", new RotMGAssetLoader());
Manager.registerLoader("sprite-loader", new RotMGSpritesheetLoader());

export const ManagerLoading = Manager.load(config);