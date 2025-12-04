/** Two groups <imports> and <module> - matches import and export statements that reference external modules */
export const TYPESCRIPT_IMPORT_REGEX =
  /(?:import|export)\s+(?:(?:(?<imports>[\w*\s{},]+?)\s+from\s+)|(?=(?:type\s+)?['{"])(?:type\s+)?|(?:\*\s+as\s+\w+\s+from\s+))['"](?<module>[^'"]+)['"];?/gm

export const JS_EXTENSION = /\.m?js$/
