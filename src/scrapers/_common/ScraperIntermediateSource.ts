import type { IDestroyable } from "destroyable";
import { string_filename } from "../../types/typeAliases";

/**
 * @@@
 */
export type ScraperIntermediateSource = IDestroyable & {
  readonly filename: string_filename;
};