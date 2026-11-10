import { toDisplay, toMetres } from "../domain/geometry";
import { Unit } from "../domain/types";
/** Display rounding must never alter canonical geometry when a field is untouched. */
export function enteredMetres(
  text: string,
  original: number,
  unit: Unit,
  digits = 3,
) {
  return text === toDisplay(original, unit).toFixed(digits)
    ? original
    : toMetres(Number(text), unit);
}
