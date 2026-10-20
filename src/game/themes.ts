export type DecoKind =
  | 'tree' | 'bush' | 'flower' | 'rock' | 'pine' | 'snowball' | 'coral' | 'kelp' | 'shell' | 'cactus'
  | 'mesa' | 'lollipop' | 'gumdrop' | 'mushroom' | 'crystal' | 'corn' | 'hay' | 'pumpkin' | 'fence'
  | 'house' | 'tent' | 'cone' | 'barrel' | 'crate' | 'lamp' | 'building' | 'cloud' | 'planet' | 'palm'
  | 'umbrella' | 'carrot' | 'pyramid' | 'column' | 'flag' | 'balloon' | 'bone' | 'gear' | 'books';

export type CritterKind = 'butterfly' | 'bee' | 'bird' | 'fish' | 'bubble' | 'snow' | 'leaf' | 'bat' | 'firefly' | 'cloud' | 'star' | 'rain' | 'spark';

export interface Theme {
  /** Clear colour around the ground. */
  background: string;
  ground: string;
  patch: string;
  path: string;
  pathEdge: string;
  stone: string;
  stoneSide: string;
  /** Question boxes and label borders. */
  accent: string;
  /** Weighted decoration mix. */
  decos: [DecoKind, number][];
  /** Colours decorations pick from (foliage first, then petals/candy/details). */
  palette: string[];
  critters: CritterKind[];
  night?: boolean;
}

type Partial2 = Partial<Theme> & Pick<Theme, 'ground' | 'decos' | 'palette' | 'critters'>;

const make = (t: Partial2): Theme => ({
  background: t.ground,
  patch: t.ground,
  path: '#fbefcf',
  pathEdge: '#e2cf9e',
  stone: '#ffffff',
  stoneSide: '#d7cfc0',
  accent: '#ff7a59',
  ...t,
});

const GREEN = ['#4fae4a', '#3f9c43', '#66c25a', '#ff8fb1', '#ffd447', '#ffffff', '#9a6b4b'];
const AUTUMN = ['#e8892c', '#d4622b', '#f2b33d', '#c94f3d', '#ffd447', '#ffffff', '#8a5a3c'];

/**
 * One original theme per level, each inspired by the setting of the matching
 * book page (park, ski slope, seabed, cornfield…), drawn in our own style.
 */
export const LEVEL_THEMES: Theme[] = [
  // 1 · park run
  make({ ground: '#8fd36b', patch: '#7fc55d', decos: [['tree', 4], ['bush', 4], ['flower', 6], ['cone', 2], ['flag', 1]], palette: GREEN, critters: ['butterfly'] }),
  // 2 · ski slope
  make({ ground: '#f3f8fd', patch: '#e2edf7', path: '#bfe0f5', pathEdge: '#9ccbe9', stoneSide: '#c9d7e6', accent: '#ff6f91', decos: [['pine', 6], ['snowball', 2], ['rock', 2]], palette: ['#2f8f6a', '#3aa57a', '#ffffff', '#b6a6e0', '#8b6a55'], critters: ['snow'] }),
  // 3 · shipwreck seabed
  make({ ground: '#3fa9c4', patch: '#3597b3', path: '#fbefd2', pathEdge: '#e9d4a6', stone: '#fff8ec', stoneSide: '#e0cfb0', accent: '#ff7f6e', decos: [['coral', 5], ['kelp', 4], ['shell', 3], ['barrel', 1], ['rock', 2]], palette: ['#ff7f6e', '#ffb347', '#ff6fa8', '#9b7bff', '#3ccf8e', '#ffe36e'], critters: ['fish', 'bubble'] }),
  // 4 · cornfield
  make({ ground: '#a8c95a', patch: '#98ba4c', path: '#e9cf8a', pathEdge: '#cfb06a', accent: '#e8892c', decos: [['corn', 8], ['hay', 2], ['pumpkin', 2]], palette: ['#6aa83f', '#7fbf4a', '#f2c94c', '#e8892c', '#ffd447', '#ffffff', '#8a5a3c'], critters: ['bird'] }),
  // 5 · autumn forest
  make({ ground: '#c9a36a', patch: '#b8915a', path: '#f4e2bf', pathEdge: '#dcc296', accent: '#d4622b', decos: [['tree', 5], ['mushroom', 3], ['pumpkin', 1], ['house', 1], ['bush', 2]], palette: AUTUMN, critters: ['leaf'] }),
  // 6 · castle kitchen
  make({ ground: '#b9b2c6', patch: '#aaa2b8', path: '#efe6d6', pathEdge: '#d2c6b0', stoneSide: '#cfc6d6', accent: '#b5487a', decos: [['column', 3], ['barrel', 3], ['crate', 2], ['flag', 2]], palette: ['#8a6fb0', '#b5487a', '#ffd447', '#e8892c', '#ffffff', '#ffffff', '#8a5a3c'], critters: ['spark'] }),
  // 7 · moon base
  make({ ground: '#3b3f6e', patch: '#33376a', path: '#d9dcef', pathEdge: '#b3b8d8', stoneSide: '#c5c7de', accent: '#ffb347', decos: [['rock', 5], ['crystal', 2], ['planet', 1]], palette: ['#7ef0ff', '#c58cff', '#ff8fd8', '#9dff9a', '#ffd447'], critters: ['star'], night: true }),
  // 8 · bee meadow
  make({ ground: '#9ad86a', patch: '#8ccb5c', path: '#fff3c4', pathEdge: '#f1d98a', accent: '#f2a51a', decos: [['flower', 9], ['bush', 3], ['tree', 1]], palette: ['#4fae4a', '#3f9c43', '#66c25a', '#ff8fb1', '#ffd447', '#c58cff', '#9a6b4b'], critters: ['bee'] }),
  // 9 · rabbit hills
  make({ ground: '#86c968', patch: '#78bb5a', path: '#f2e1c2', pathEdge: '#d9c299', accent: '#ff7aa8', decos: [['carrot', 3], ['bush', 4], ['flower', 4], ['rock', 1]], palette: GREEN, critters: ['butterfly'] }),
  // 10 · bike track
  make({ ground: '#7ccf8a', patch: '#6dc17c', path: '#e86f5c', pathEdge: '#c9533f', stone: '#ffffff', accent: '#3b82f6', decos: [['cone', 3], ['flag', 2], ['tree', 3], ['bush', 2]], palette: GREEN, critters: ['bird'] }),
  // 11 · river camp (the path is the river)
  make({ ground: '#7cc46a', patch: '#6db55c', path: '#5fc3e8', pathEdge: '#3e9fc6', stone: '#fffdf5', stoneSide: '#cfe6ef', accent: '#f08a24', decos: [['pine', 4], ['tent', 1], ['rock', 3], ['tree', 2]], palette: ['#2f8f6a', '#3aa57a', '#66c25a', '#f08a24', '#ffd447', '#ffffff', '#8a5a3c'], critters: ['fish', 'bird'] }),
  // 12 · climbing rocks
  make({ ground: '#d7b48a', patch: '#c9a57a', path: '#f6e7cc', pathEdge: '#dfc9a3', accent: '#e85d75', decos: [['rock', 6], ['mesa', 2], ['pine', 2]], palette: ['#4caf6a', '#3d9a5b', '#c98a5a', '#b8764a', '#ffd166', '#ffffff'], critters: ['bird'] }),
  // 13 · horse farm
  make({ ground: '#93cf6b', patch: '#84c15d', path: '#ead2a2', pathEdge: '#cfb27c', accent: '#c94f3d', decos: [['fence', 3], ['hay', 3], ['house', 1], ['tree', 2]], palette: GREEN, critters: ['butterfly'] }),
  // 14 · pyramid desert
  make({ ground: '#f0cf8a', patch: '#e6c27a', path: '#fff1cf', pathEdge: '#e8cf98', stoneSide: '#e8d2a8', accent: '#2a9d8f', decos: [['pyramid', 2], ['palm', 3], ['cactus', 2], ['rock', 2]], palette: ['#3d9a5b', '#4caf6a', '#e0a94f', '#c98a3a', '#ffd166', '#ffffff', '#8a5a3c'], critters: ['spark'] }),
  // 15 · city streets (asphalt)
  make({ ground: '#9fd18a', patch: '#91c57c', path: '#7b8494', pathEdge: '#5f6776', stone: '#ffffff', stoneSide: '#d5d9e0', accent: '#ff7a59', decos: [['building', 5], ['lamp', 2], ['tree', 2], ['cone', 1]], palette: ['#4fae4a', '#3f9c43', '#ffb3a7', '#9fd3ff', '#ffd447', '#c58cff', '#8a5a3c'], critters: ['bird'] }),
  // 16 · duck pond farm
  make({ ground: '#8ed373', patch: '#5fc3e8', path: '#f5e6c4', pathEdge: '#dcc79a', accent: '#f2a51a', decos: [['fence', 2], ['flower', 4], ['bush', 3], ['house', 1]], palette: GREEN, critters: ['bird', 'butterfly'] }),
  // 17 · circus
  make({ ground: '#f4d06f', patch: '#ecc35c', path: '#ffffff', pathEdge: '#f0d8d8', accent: '#e63946', decos: [['tent', 2], ['balloon', 3], ['flag', 3], ['barrel', 1]], palette: ['#e63946', '#3b82f6', '#ffd447', '#2ec4b6', '#ff8fb1', '#ffffff', '#8a5a3c'], critters: ['spark'] }),
  // 18 · cloud sky
  make({ ground: '#9fd8ff', patch: '#8ccdfa', path: '#ffffff', pathEdge: '#d7ecfb', stoneSide: '#d9e9f5', accent: '#7c5cff', decos: [['cloud', 6], ['balloon', 2]], palette: ['#ffffff', '#ffffff', '#ffe066', '#ff8fb1', '#7c5cff', '#69db7c'], critters: ['bird', 'cloud'] }),
  // 19 · goat hills
  make({ ground: '#a7d17a', patch: '#98c46c', path: '#efe0c0', pathEdge: '#d4c19a', accent: '#8a6fb0', decos: [['rock', 4], ['tree', 2], ['bush', 3], ['fence', 1]], palette: GREEN, critters: ['butterfly'] }),
  // 20 · hedgehog woods
  make({ ground: '#c5a46d', patch: '#b6955f', path: '#f1dfbd', pathEdge: '#d9c398', accent: '#c94f3d', decos: [['tree', 4], ['mushroom', 4], ['pumpkin', 1], ['bush', 2]], palette: AUTUMN, critters: ['leaf'] }),
  // 21 · building site
  make({ ground: '#d9c08f', patch: '#cdb27f', path: '#f2e8d2', pathEdge: '#d6c7a4', accent: '#f59e0b', decos: [['cone', 4], ['crate', 3], ['barrel', 2], ['building', 1]], palette: ['#f59e0b', '#3b82f6', '#ffd447', '#e85d75', '#ffffff', '#ffffff', '#8a5a3c'], critters: ['spark'] }),
  // 22 · airport (runways)
  make({ ground: '#9bd08a', patch: '#8dc47c', path: '#6f7888', pathEdge: '#545c6a', stoneSide: '#d5d9e0', accent: '#3b82f6', decos: [['lamp', 3], ['cone', 2], ['building', 2], ['flag', 1]], palette: ['#4fae4a', '#3f9c43', '#9fd3ff', '#ffffff', '#ffd447', '#e85d75', '#8a5a3c'], critters: ['bird', 'cloud'] }),
  // 23 · surf beach
  make({ ground: '#f6dfa3', patch: '#5fc3e8', path: '#ffffff', pathEdge: '#e8d6aa', accent: '#ff7a59', decos: [['palm', 4], ['umbrella', 2], ['shell', 3]], palette: ['#3d9a5b', '#4caf6a', '#ff7a59', '#3b82f6', '#ffd447', '#ffffff', '#8a5a3c'], critters: ['bird'] }),
  // 24 · bear cave
  make({ ground: '#7a6250', patch: '#6c5545', path: '#d9c6ad', pathEdge: '#b9a38a', stoneSide: '#c9b8a2', accent: '#f2a51a', decos: [['rock', 6], ['crystal', 2], ['mushroom', 2]], palette: ['#7ef0ff', '#c58cff', '#ffd447', '#ff8fd8', '#9dff9a'], critters: ['firefly'], night: true }),
  // 25 · skate park
  make({ ground: '#a2d48f', patch: '#93c780', path: '#c9ced8', pathEdge: '#a7adba', accent: '#e63946', decos: [['cone', 2], ['crate', 2], ['tree', 3], ['bush', 2]], palette: GREEN, critters: ['bird'] }),
  // 26 · alien planet
  make({ ground: '#6b4fa8', patch: '#5f449c', path: '#c8f1e4', pathEdge: '#94d9c3', stoneSide: '#d8cdea', accent: '#3ccf8e', decos: [['crystal', 4], ['planet', 1], ['mushroom', 3], ['rock', 2]], palette: ['#7ef0ff', '#9dff9a', '#ff8fd8', '#ffd447', '#c58cff'], critters: ['star'], night: true }),
  // 27 · haunted garden
  make({ ground: '#4f5d6e', patch: '#46536a', path: '#d6d0e3', pathEdge: '#aea6c4', stoneSide: '#c8c2d8', accent: '#9b5de5', decos: [['tree', 3], ['pumpkin', 3], ['lamp', 2], ['mushroom', 2]], palette: ['#4c6b5a', '#3f5c4c', '#e8892c', '#9b5de5', '#ffd447', '#ffffff', '#5a4636'], critters: ['bat', 'firefly'], night: true }),
  // 28 · jungle
  make({ ground: '#4fae5a', patch: '#43a04e', path: '#e8d6a6', pathEdge: '#c9b47e', accent: '#f15bb5', decos: [['palm', 4], ['bush', 5], ['flower', 3]], palette: ['#2f8f4a', '#3aa55a', '#66c25a', '#f15bb5', '#ffd447', '#ffffff', '#8a5a3c'], critters: ['butterfly', 'bird'] }),
  // 29 · rainy day
  make({ ground: '#8cc07a', patch: '#79b0d8', path: '#f2e4bf', pathEdge: '#d6c494', accent: '#3b82f6', decos: [['umbrella', 2], ['tree', 3], ['bush', 3], ['flower', 2]], palette: GREEN, critters: ['rain'] }),
  // 30 · cow farm
  make({ ground: '#8fd16f', patch: '#80c362', path: '#efdcb2', pathEdge: '#d4bd8a', accent: '#c94f3d', decos: [['fence', 3], ['hay', 2], ['house', 1], ['tree', 2], ['flower', 2]], palette: GREEN, critters: ['butterfly'] }),
  // 31 · pirate island
  make({ ground: '#f3d79b', patch: '#4fb8d8', path: '#fff5dc', pathEdge: '#e6cf9c', accent: '#2b2d42', decos: [['palm', 4], ['barrel', 2], ['crate', 2], ['flag', 1]], palette: ['#3d9a5b', '#4caf6a', '#2b2d42', '#e63946', '#ffd447', '#ffffff', '#8a5a3c'], critters: ['bird'] }),
  // 32 · savanna
  make({ ground: '#e2c66e', patch: '#d6b85f', path: '#f7ebc8', pathEdge: '#dfcb94', accent: '#c94f3d', decos: [['tree', 3], ['rock', 3], ['bush', 2]], palette: ['#7a9a3a', '#8aab45', '#c98a3a', '#e85d75', '#ffd447', '#ffffff', '#7a5232'], critters: ['bird'] }),
  // 33 · hero skyline
  make({ ground: '#a6d9ff', patch: '#95cdfa', path: '#ffffff', pathEdge: '#d4e9f9', accent: '#e63946', decos: [['building', 5], ['cloud', 3]], palette: ['#ffffff', '#e63946', '#3b82f6', '#ffd447', '#9b5de5', '#2ec4b6'], critters: ['cloud', 'bird'] }),
  // 34 · coral reef
  make({ ground: '#45b6c8', patch: '#3aa4b8', path: '#fbefd2', pathEdge: '#e9d4a6', stone: '#fff8ec', stoneSide: '#e0cfb0', accent: '#ff6fa8', decos: [['coral', 7], ['kelp', 3], ['shell', 2]], palette: ['#ff7f6e', '#ffb347', '#ff6fa8', '#9b7bff', '#3ccf8e', '#ffe36e'], critters: ['fish', 'bubble'] }),
  // 35 · bramble garden
  make({ ground: '#6fbf5e', patch: '#62b052', path: '#f1e3c4', pathEdge: '#d7c497', accent: '#9b5de5', decos: [['bush', 8], ['flower', 3], ['rock', 1]], palette: ['#3f9c43', '#2f8a3a', '#4fae4a', '#9b5de5', '#ff8fb1', '#ffffff', '#8a5a3c'], critters: ['butterfly'] }),
  // 36 · turtle beach
  make({ ground: '#f7e2a8', patch: '#f0d690', path: '#5fc3e8', pathEdge: '#3e9fc6', stone: '#fffdf5', stoneSide: '#cfe6ef', accent: '#2a9d8f', decos: [['palm', 3], ['shell', 4], ['umbrella', 1], ['rock', 1]], palette: ['#3d9a5b', '#4caf6a', '#ff7a59', '#2a9d8f', '#ffd447', '#ffffff', '#8a5a3c'], critters: ['bird'] }),
  // 37 · veggie garden
  make({ ground: '#9a7a55', patch: '#8b6c49', path: '#efdfbd', pathEdge: '#d3bf93', accent: '#3ccf8e', decos: [['carrot', 4], ['pumpkin', 3], ['fence', 2], ['bush', 2]], palette: ['#4fae4a', '#3f9c43', '#f08a24', '#e85d75', '#ffd447', '#ffffff', '#6b4a2c'], critters: ['butterfly'] }),
  // 38 · robot lab
  make({ ground: '#8fa3b8', patch: '#8297ad', path: '#e7eef5', pathEdge: '#c3cfdc', stoneSide: '#cdd7e2', accent: '#06b6d4', decos: [['gear', 3], ['crate', 3], ['lamp', 2], ['barrel', 1]], palette: ['#06b6d4', '#f59e0b', '#e85d75', '#9b5de5', '#ffffff', '#ffffff', '#5a6a7a'], critters: ['spark'] }),
  // 39 · dinosaur valley
  make({ ground: '#8cc95f', patch: '#7dbb52', path: '#e9d4a3', pathEdge: '#cbb27a', accent: '#e76f51', decos: [['palm', 3], ['rock', 3], ['bone', 2], ['bush', 2]], palette: ['#3d9a5b', '#4caf6a', '#e76f51', '#f4a261', '#ffd447', '#fff8ec', '#8a5a3c'], critters: ['bird'] }),
  // 40 · mole tunnels
  make({ ground: '#8a6a4f', patch: '#7c5d44', path: '#e2cfb1', pathEdge: '#c2ab88', stoneSide: '#d0bea4', accent: '#f2a51a', decos: [['rock', 5], ['carrot', 2], ['mushroom', 2], ['crystal', 1]], palette: ['#4fae4a', '#3f9c43', '#f08a24', '#c58cff', '#ffd447', '#ffffff', '#5a4030'], critters: ['firefly'] }),
  // 41 · cosy house (wooden floor)
  make({ ground: '#d9a873', patch: '#cc9a66', path: '#fbe9cf', pathEdge: '#e2c9a3', accent: '#e85d75', decos: [['books', 3], ['crate', 2], ['barrel', 1], ['flower', 1]], palette: ['#e85d75', '#3b82f6', '#ffd447', '#3ccf8e', '#9b5de5', '#ffffff', '#8a5a3c'], critters: ['spark'] }),
  // 42 · wizard castle
  make({ ground: '#5b4b8a', patch: '#51427e', path: '#e6dcf5', pathEdge: '#c1b2de', stoneSide: '#d4c9e8', accent: '#ffb703', decos: [['column', 3], ['crystal', 3], ['flag', 2]], palette: ['#c58cff', '#7ef0ff', '#ffb703', '#ff8fd8', '#ffffff'], critters: ['spark', 'star'], night: true }),
  // 43 · bat night
  make({ ground: '#2f3b5c', patch: '#283352', path: '#f2e6b8', pathEdge: '#d4c48a', stoneSide: '#c9c4dc', accent: '#ffd447', decos: [['tree', 3], ['pumpkin', 2], ['lamp', 2], ['house', 1]], palette: ['#3e5a6e', '#34505f', '#e8892c', '#ffd447', '#ffd447', '#ffffff', '#4a3a2c'], critters: ['bat', 'star'], night: true }),
];

export function themeFor(levelId: number): Theme {
  return LEVEL_THEMES[(levelId - 1) % LEVEL_THEMES.length];
}
