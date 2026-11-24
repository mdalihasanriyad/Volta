export default {
  hash: async (p) => `hash:${p}`, hashSync: (p) => `hash:${p}`, compare: async (p, h) => h === `hash:${p}`,
}
