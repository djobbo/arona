import { Project } from "ts-morph"

const project = new Project()
const file = project.createSourceFile("src/commands/command-builder.ts", "", {
	overwrite: true,
})

const optionTypes = (
	[
		"String",
		"Integer",
		"Boolean",
		"User",
		"Channel",
		"Role",
		"Mentionable",
		"Number",
		"Attachment",
	] as const
).map((type) => {
	const optionClass = `SlashCommand${type}Option`
	const method = `get${type}`
	const djsOptionClass = `DJS${optionClass}`

	return {
		type,
		optionClass,
		djsOptionClass,
		method,
	}
})

file.addStatements((writer) => {
	writer.writeLine(
		"// This file is generated by `src/commands/generators/command-builder.ts`. Do not edit it manually.",
	)
	writer.writeLine("")
	writer.writeLine(
		`import { ApplicationCommandOptionType, SlashCommandBuilder as DJSSlashCommandBuilder  } from "discord.js"`,
	)
	writer.writeLine(
		`import { 
      ${optionTypes.map(({ optionClass, djsOptionClass }) => `${optionClass} as ${djsOptionClass}`).join(", ")}
    } from "discord.js"`,
	)
	writer.writeLine(
		`import type { ChatInputCommandInteraction} from "discord.js"`,
	)
	writer.writeLine("")
})

for (const { optionClass, djsOptionClass } of optionTypes) {
	file.addClass({
		name: optionClass,
		extends: djsOptionClass,
		isExported: true,
		typeParameters: [
			{ name: "Name", constraint: "string", default: "never" },
			{ name: "Required", constraint: "boolean", default: "false" },
		],
		methods: [
			{
				name: "setName",
				leadingTrivia:
					"// @ts-expect-error - Type inference issues with discord.js",
				typeParameters: [
					{
						name: "N",
						constraint: "string",
					},
				],
				parameters: [
					{
						name: "name",
						type: "N",
					},
				],
				statements: `return super.setName(name) as ${optionClass}<N, Required>`,
			},
			{
				name: "setRequired",
				leadingTrivia:
					"// @ts-expect-error - Type inference issues with discord.js",
				typeParameters: [
					{
						name: "Req",
						constraint: "boolean",
					},
				],
				parameters: [
					{
						name: "required",
						type: "Req",
					},
				],
				statements: `return super.setRequired(required) as ${optionClass}<Name, Req>`,
			},
		],
	})
}

file.addClass({
	name: "SlashCommandBuilder",
	extends: "DJSSlashCommandBuilder",
	isExported: true,
	typeParameters: [{ name: "Params" }],
	properties: [
		{
			name: "params",
			type: "{ name: string; type: ApplicationCommandOptionType }[]",
			initializer: "[]",
		},
	],
	methods: optionTypes.flatMap(
		({ type, method, optionClass, djsOptionClass }) => {
			return [
				{
					name: `addTyped${type}Option`,
					isGeneric: true,
					typeParameters: [
						{
							name: "Name",
							constraint: "string",
						},
						{
							name: "Required",
							constraint: "boolean",
						},
						{
							name: "OptionType",
							constraint: `Exclude<ReturnType<ChatInputCommandInteraction["options"]["${method}"]>, null | undefined>`,
						},
					],
					parameters: [
						{
							name: "options",
							type: `SlashCommand${type}Option<Name, Required> | ((option: ${optionClass}) => SlashCommand${type}Option<Name, Required>)`,
						},
					],
					returnType: `
            SlashCommandBuilder<
              Params & (Required extends true ? {
                [K in Name]: OptionType
              } :
              {
                [K in Name]?: OptionType
              })>
          `,
					statements: `
        const typeSafeOption =
          options instanceof ${djsOptionClass}
            ? options
            : options(new ${optionClass}<Name, Required>())
        
        super.add${type}Option(typeSafeOption)
        this.params.push({ name: typeSafeOption.name, type: ApplicationCommandOptionType.${type} })
        return this
      `,
				},
				{
					name: `add${type}Option`,
					parameters: [
						{
							name: "...args",
							type: `Parameters<DJSSlashCommandBuilder["add${type}Option"]>`,
						},
					],
					statements: `
        super.add${type}Option(...args);
        return this;
      `,
					docs: [
						{
							tags: [
								{
									tagName: "depreacted",
									text: `Use \`addTyped${type}Option\` instead`,
								},
							],
						},
					],
				},
			]
		},
	),
})

file.addInterface({
	name: "SlashCommandInteraction",
	isExported: true,
	typeParameters: [{ name: "Params" }],
	extends: ["ChatInputCommandInteraction"],
	properties: [
		{
			name: "params",
			type: "Params",
		},
	],
})

file.addFunction({
	name: "getTypedInteraction",
	isExported: true,
	typeParameters: [{ name: "Params" }],
	parameters: [
		{
			name: "command",
			type: "SlashCommandBuilder<Params>",
		},
		{
			name: "interaction",
			type: "ChatInputCommandInteraction",
		},
	],
	returnType: "SlashCommandInteraction<Params>",
	statements: `
    const params = command.params.reduce(
      (acc, { name, type }) => {
        let value = null;
        switch (type) {
          ${optionTypes
						.map(({ type, method }) => {
							return `case ApplicationCommandOptionType.${type}:
                  value = interaction.options.${method}(name)
                  break`
						})
						.join("\n")}
          default:
            value = interaction.options.get(name)?.value;
            break;
        }
        acc[name] = value
        return acc
      },
      {} as Record<string, unknown>,
    )
  
    ;(interaction as SlashCommandInteraction<Params>).params = params as Params
    return interaction as SlashCommandInteraction<Params>
  `,
})

file.saveSync()
