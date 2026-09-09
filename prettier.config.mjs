export default {
	printWidth: 100,
	useTabs: true,
	semi: true,
	singleQuote: false,
	trailingComma: "all",
	plugins: ["prettier-plugin-astro"],
	overrides: [
		{
			files: "*.astro",
			options: {
				parser: "astro",
			},
		},
	],
};
