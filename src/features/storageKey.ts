import { DEMO_MODE } from "../api/environment";
export const storageKey = (name: string) =>
  `${DEMO_MODE ? "catalog:demo:" : "catalog:"}${name}`;
