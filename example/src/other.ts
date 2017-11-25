import another from './another'

export default () => {
  const a: number = 'String is not assignable to type number'

  return a + another()
}
