import other from './other'

const fn = (a: number, b: string): string => (
  `${a} ${b} ${other()}`
)

console.log('Cause a warning!')
