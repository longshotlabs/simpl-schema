/**
 * Given a Date instance, returns a date string of the format YYYY-MM-DD
 */
export default function dateToDateString (date: Date) {
  let month: number | string = date.getUTCMonth() + 1
  if (month < 10) month = `0${month}`
  let day: number | string = date.getUTCDate()
  if (day < 10) day = `0${day}`
  return `${date.getUTCFullYear()}-${month}-${day}`
}
