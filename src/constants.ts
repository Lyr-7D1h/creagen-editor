/** Two groups <imports> and <module> */
export const TYPESCRIPT_IMPORT_REGEX =
  /import\s+(?:(?:(?<imports>[\w*\s{},]+?)\s+from\s+)|(?=['"]))['"](?<module>[^'"]+)['"];?/gm
