import type { HintKey } from './level/curriculum';

type Lang = 'tr' | 'en';

const strings = {
  tr: {
    play: 'Oyna',
    level: 'Bölüm',
    next: 'Sonraki',
    replay: 'Tekrar',
    map: 'Harita',
    findPath: 'Doğru sayıyı seç, yolu bul!',
    findTarget: 'Sonucu {n} olan yolu seç!',
    worlds: ["10'a Kadar", '10 ve 20', "20'ye Kadar", 'İki Basamaklı Toplama', 'İki Basamaklı Çıkarma', 'Usta Kâşif'],
    great: ['Harika!', 'Süper!', 'Bravo!'],
    topics: {
      pairs: 'Sayı İkilileri', add: 'Toplama', doubles: 'Kendisiyle Toplama', missingAdd: 'Verilmeyen Sayılar', sub: 'Çıkarma',
      subFrom: 'Çıkarma', missingSub: 'Verilmeyen Sayılar', mixed: 'Toplama ve Çıkarma', plusOne: '1 ile Topla',
      carry: 'Toplama', tens: "10'lar", borrow: 'Çıkarma', three: 'Üç Sayıyı Toplama',
    } satisfies Record<HintKey, string>,
    start: 'Başla',
    listen: 'Dinle',
    retry: 'Tekrar dene!',
    rules: {
      a: 'Toplamı {n} olan işlemlerin yazdığı yolları takip ederek bitişe ulaş!',
      b: 'Kutudaki işlemi yap ve doğru sonucun yazdığı yoldan ilerle!',
      c: 'Kutudaki eksik sayıyı bul ve o sayının yazdığı yoldan ilerle!',
    },
    flavor: [
      'Pıtır parkta koşu yarışında! Engelleri aşıp bitiş çizgisine ulaşmasına yardım et.',
      'Pıtır karlı dağdan kayarak kulübeye inmek istiyor.',
      'Pıtır deniz dibinde, batık gemiye doğru yüzüyor.',
      'Pıtır mısır tarlası labirentinde çıkışı arıyor.',
      'Pıtır sonbahar ormanındaki kulübeye gidiyor.',
      'Pıtır kalenin mutfağına ulaşmaya çalışıyor.',
      'Pıtır Ay üssünde roketine geri dönüyor.',
      'Pıtır çiçekli çayırda arı kovanını arıyor.',
      'Pıtır tavşan yuvalarının arasından geçiyor.',
      'Pıtır bisikletiyle parkuru tamamlamak istiyor.',
      'Pıtır kanosuyla nehirden kampa gidiyor.',
      'Pıtır kayalara tırmanıp zirveye çıkıyor.',
      'Pıtır çiftlikte ahıra ulaşmak istiyor.',
      'Pıtır çölde piramidin girişini arıyor.',
      'Pıtır şehirde mektupları dağıtıyor.',
      'Pıtır çiftlik göletindeki ördeklere gidiyor.',
      'Pıtır sirkte gösteriye yetişmeye çalışıyor.',
      'Pıtır bulutların arasında uçuyor.',
      'Pıtır tepelerdeki keçileri ziyaret ediyor.',
      'Pıtır ormanda kirpi arkadaşını arıyor.',
      'Pıtır inşaat alanında yolunu buluyor.',
      'Pıtır havalimanında uçağına yetişmek istiyor.',
      'Pıtır plajda sörf tahtasına koşuyor.',
      'Pıtır mağarada ayının evini arıyor.',
      'Pıtır kaykay parkında rampaya gidiyor.',
      'Pıtır uzak bir gezegende uzaylı dostunu buluyor.',
      'Pıtır perili bahçeden geçmeye cesaret ediyor.',
      'Pıtır balta girmemiş ormanda keşfe çıkıyor.',
      'Pıtır yağmurda su birikintilerinin arasından geçiyor.',
      'Pıtır çiftlikte ineklerin yanına gidiyor.',
      'Pıtır korsan adasında defineyi arıyor.',
      'Pıtır savanda arkadaşlarına ulaşıyor.',
      'Pıtır bir süper kahraman gibi gökyüzünde uçuyor.',
      'Pıtır mercan resifinde denizatını arıyor.',
      'Pıtır çalılıkların arasından kaleye gidiyor.',
      'Pıtır plajda kaplumbağalara yardım ediyor.',
      'Pıtır bostanda salyangozla yarışıyor.',
      'Pıtır robot laboratuvarında çıkışı arıyor.',
      'Pıtır dinozor vadisinde keşfe çıkıyor.',
      'Pıtır köstebeğin yer altı tünellerinde dolaşıyor.',
      'Pıtır evin içinde fareye yardım ediyor.',
      'Pıtır büyücünün kalesinde ejderhaya ulaşıyor.',
      'Pıtır gece yarasaların arasından evine dönüyor.',
    ],
    hints: {
      pairs: 'Hangi iki sayı birlikte hedefi yapar? Parmaklarınla say!',
      add: 'Büyük sayıdan başla, üstüne say.',
      doubles: 'Aynı sayıyı iki kere topla: 3 + 3 = 6.',
      missingAdd: 'Tersten düşün: sonuçtan bildiğin sayıyı çıkar.',
      sub: 'Büyük sayıdan geriye doğru say.',
      subFrom: '10 parmağın var; bazılarını kapat, kalanları say.',
      missingSub: 'Tersten düşün: toplama yaparak bul.',
      mixed: 'İşarete dikkat et: + mı, − mi?',
      plusOne: 'Bir fazlası: sayıdan sonra gelen sayı.',
      carry: 'Birler 10’u geçerse onlara bir ekle.',
      tens: 'Onlar basamağı değişir, birler aynı kalır.',
      borrow: 'Birler yetmezse onlardan bir onluk al.',
      three: 'Önce iki sayıyı topla, sonra üçüncüyü ekle.',
    } satisfies Record<HintKey, string>,
  },
  en: {
    play: 'Play',
    level: 'Level',
    next: 'Next',
    replay: 'Again',
    map: 'Map',
    findPath: 'Pick the right number, find the way!',
    findTarget: 'Pick the path that makes {n}!',
    worlds: ['Up to 10', '10 and 20', 'Up to 20', 'Adding Big Numbers', 'Taking Away Big Numbers', 'Master Explorer'],
    great: ['Great!', 'Super!', 'Well done!'],
    start: 'Start',
    listen: 'Listen',
    retry: 'Try again!',
    rules: {
      a: 'Follow the paths whose sums make {n} to reach the finish!',
      b: 'Work out the box and follow the path with the right answer!',
      c: 'Find the missing number in the box and follow the path with that number!',
    },
    flavor: [
      'Pıtır is in a race in the park! Help them jump the hurdles and reach the finish line.',
      'Pıtır wants to ski down the snowy mountain to the cabin.',
      'Pıtır is swimming on the seabed towards the old shipwreck.',
      'Pıtır is looking for the way out of the cornfield maze.',
      'Pıtır is walking to the cabin in the autumn forest.',
      'Pıtır is trying to reach the castle kitchen.',
      'Pıtır is heading back to the rocket on the Moon base.',
      'Pıtır is looking for the beehive in the flower meadow.',
      'Pıtır is hopping between the rabbit burrows.',
      'Pıtır wants to finish the bike track.',
      'Pıtır is paddling down the river to the camp.',
      'Pıtır is climbing the rocks to the top.',
      'Pıtır wants to get to the barn on the farm.',
      'Pıtır is looking for the pyramid entrance in the desert.',
      'Pıtır is delivering letters in the city.',
      'Pıtır is visiting the ducks at the farm pond.',
      'Pıtır is hurrying to the circus show.',
      'Pıtır is flying among the clouds.',
      'Pıtır is visiting the goats in the hills.',
      'Pıtır is looking for a hedgehog friend in the woods.',
      'Pıtır is finding the way through the building site.',
      'Pıtır wants to catch a plane at the airport.',
      'Pıtır is running to the surfboard on the beach.',
      'Pıtır is looking for the bear’s home in the cave.',
      'Pıtır is heading to the ramp at the skate park.',
      'Pıtır is meeting an alien friend on a faraway planet.',
      'Pıtır is brave enough to cross the haunted garden.',
      'Pıtır is exploring the jungle.',
      'Pıtır is crossing the puddles on a rainy day.',
      'Pıtır is visiting the cows on the farm.',
      'Pıtır is looking for treasure on pirate island.',
      'Pıtır is joining friends on the savanna.',
      'Pıtır is flying over the city like a superhero.',
      'Pıtır is looking for a seahorse on the coral reef.',
      'Pıtır is walking through the brambles to the castle.',
      'Pıtır is helping the turtles on the beach.',
      'Pıtır is racing a snail in the vegetable garden.',
      'Pıtır is looking for the way out of the robot lab.',
      'Pıtır is exploring the dinosaur valley.',
      'Pıtır is wandering the mole’s tunnels.',
      'Pıtır is helping a little mouse inside the house.',
      'Pıtır is reaching the dragon in the wizard’s castle.',
      'Pıtır is flying home among the bats at night.',
    ],
    topics: {
      pairs: 'Number Pairs', add: 'Addition', doubles: 'Doubles', missingAdd: 'Missing Numbers', sub: 'Subtraction',
      subFrom: 'Taking Away', missingSub: 'Missing Numbers', mixed: 'Adding and Subtracting', plusOne: 'Add One',
      carry: 'Adding Big Numbers', tens: 'Tens', borrow: 'Subtracting Big Numbers', three: 'Adding Three Numbers',
    } satisfies Record<HintKey, string>,
    hints: {
      pairs: 'Which two numbers make the target together? Count on your fingers!',
      add: 'Start from the bigger number and count on.',
      doubles: 'Add the same number twice: 3 + 3 = 6.',
      missingAdd: 'Think backwards: take the known number away from the result.',
      sub: 'Count back from the bigger number.',
      subFrom: 'You have 10 fingers; fold some, count the rest.',
      missingSub: 'Think backwards: use addition to find it.',
      mixed: 'Watch the sign: is it + or −?',
      plusOne: 'One more: the number that comes next.',
      carry: 'If the ones go past 10, add one to the tens.',
      tens: 'The tens change, the ones stay the same.',
      borrow: 'Not enough ones? Borrow a ten.',
      three: 'Add two numbers first, then add the third.',
    } satisfies Record<HintKey, string>,
  },
};

function detect(): Lang {
  try {
    const saved = localStorage.getItem('ml.lang');
    if (saved === 'tr' || saved === 'en') return saved;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export let lang: Lang = detect();
export let t = strings[lang];

export function setLang(next: Lang) {
  lang = next;
  t = strings[next];
  try {
    localStorage.setItem('ml.lang', next);
  } catch {
    /* storage unavailable */
  }
}
