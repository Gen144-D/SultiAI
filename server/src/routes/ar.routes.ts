import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { isGroqConfigured, groqVision } from '../utils/groq';

const router = Router();

const AR_SCENARIOS = [
  {
    id: 'market',
    title: 'Public Market',
    subtitle: 'Learn Bisaya words for things you see at the market',
    icon: 'cart',
    gradient: ['#10B981', '#059669'],
    objects: [
      {
        id: 'rice',
        label: 'Rice',
        bisaya: 'Bugas',
        pronunciation: 'BOO-gahs',
        usage: '"Palit ko og bugas" (I will buy rice)',
        category: 'food',
      },
      {
        id: 'fish',
        label: 'Fish',
        bisaya: 'Isda',
        pronunciation: 'is-DAH',
        usage: '"Tagpila ang isda?" (How much is the fish?)',
        category: 'food',
      },
      {
        id: 'chicken',
        label: 'Chicken',
        bisaya: 'Manok',
        pronunciation: 'mah-NOK',
        usage: '"Lutoa ang manok" (Cook the chicken)',
        category: 'food',
      },
      {
        id: 'pork',
        label: 'Pork',
        bisaya: 'Baboy',
        pronunciation: 'BAH-boy',
        usage: '"Pila kilo sa baboy?" (How much per kilo of pork?)',
        category: 'food',
      },
      {
        id: 'vegetable',
        label: 'Vegetables',
        bisaya: 'Utanon',
        pronunciation: 'oo-tah-NON',
        usage: '"Asa ang mga utanon?" (Where are the vegetables?)',
        category: 'food',
      },
      {
        id: 'fruit',
        label: 'Fruit',
        bisaya: 'Prutas',
        pronunciation: 'PROO-tahs',
        usage: '"Lami kaayo ang prutas" (The fruit is very delicious)',
        category: 'food',
      },
      {
        id: 'banana',
        label: 'Banana',
        bisaya: 'Saging',
        pronunciation: 'SAH-ging',
        usage: '"Pila ka buok saging?" (How many bananas?)',
        category: 'food',
      },
      {
        id: 'mango',
        label: 'Mango',
        bisaya: 'Mangga',
        pronunciation: 'mang-GAH',
        usage: '"Asa ang tam-is nga mangga?" (Where are the sweet mangoes?)',
        category: 'food',
      },
      {
        id: 'water',
        label: 'Water',
        bisaya: 'Tubig',
        pronunciation: 'TOO-big',
        usage: '"Palit ko og tubig" (I will buy water)',
        category: 'drink',
      },
      {
        id: 'money',
        label: 'Money',
        bisaya: 'Kwarta',
        pronunciation: 'KWAR-tah',
        usage: '"Pila imong kwarta?" (How much money do you have?)',
        category: 'general',
      },
      {
        id: 'basket',
        label: 'Basket',
        bisaya: 'Bukag',
        pronunciation: 'BOO-kag',
        usage: '"Dala og bukag" (Bring a basket)',
        category: 'general',
      },
      {
        id: 'scale',
        label: 'Scale',
        bisaya: 'Timbangan',
        pronunciation: 'tim-BANG-an',
        usage: '"Gamita ang timbangan" (Use the scale)',
        category: 'general',
      },
      {
        id: 'price',
        label: 'Price',
        bisaya: 'Presyo',
        pronunciation: 'PREH-syo',
        usage: '"Barato ra ang presyo" (The price is cheap)',
        category: 'general',
      },
      {
        id: 'discount',
        label: 'Discount',
        bisaya: 'Diskwento',
        pronunciation: 'dis-KWEN-to',
        usage: '"Naay diskwento?" (Is there a discount?)',
        category: 'general',
      },
      {
        id: 'market',
        label: 'Market',
        bisaya: 'Merkado',
        pronunciation: 'mer-KAH-do',
        usage: '"Moadto ko sa merkado" (I will go to the market)',
        category: 'place',
      },
    ],
  },
  {
    id: 'restaurant',
    title: 'Restaurant',
    subtitle: 'Bisaya phrases for dining out',
    icon: 'restaurant',
    gradient: ['#F59E0B', '#D97706'],
    objects: [
      {
        id: 'menu',
        label: 'Menu',
        bisaya: 'Menu',
        pronunciation: 'MEH-noo',
        usage: '"Pakit-a ko ang menu" (Show me the menu)',
        category: 'general',
      },
      {
        id: 'food',
        label: 'Food',
        bisaya: 'Pagkaon',
        pronunciation: 'pag-KA-on',
        usage: '"Lami ang pagkaon" (The food is delicious)',
        category: 'food',
      },
      {
        id: 'water',
        label: 'Drinking Water',
        bisaya: 'Tubig',
        pronunciation: 'TOO-big',
        usage: '"Hatagi ko og tubig" (Give me water)',
        category: 'drink',
      },
      {
        id: 'rice',
        label: 'Rice',
        bisaya: 'Kan-on',
        pronunciation: 'KAN-on',
        usage: '"Pila ka kan-on?" (How much rice?)',
        category: 'food',
      },
      {
        id: 'soup',
        label: 'Soup',
        bisaya: 'Sabaw',
        pronunciation: 'SAH-baw',
        usage: '"Init ang sabaw" (The soup is hot)',
        category: 'food',
      },
      {
        id: 'coffee',
        label: 'Coffee',
        bisaya: 'Kape',
        pronunciation: 'KAH-peh',
        usage: '"Usa ka tasa nga kape" (One cup of coffee)',
        category: 'drink',
      },
      {
        id: 'bill',
        label: 'Bill',
        bisaya: 'Bayronon',
        pronunciation: 'bay-RO-non',
        usage: '"Palihog ang bayronon" (Please, the bill)',
        category: 'general',
      },
      {
        id: 'table',
        label: 'Table',
        bisaya: 'Lamesa',
        pronunciation: 'lah-MEH-sah',
        usage: '"Pila ka lamesa?" (How many tables?)',
        category: 'general',
      },
      {
        id: 'spoon',
        label: 'Spoon',
        bisaya: 'Kutsara',
        pronunciation: 'koot-SAH-rah',
        usage: '"Hatag og kutsara" (Give a spoon)',
        category: 'general',
      },
      {
        id: 'fork',
        label: 'Fork',
        bisaya: 'Tinidor',
        pronunciation: 'tee-NEE-dor',
        usage: '"Gamit og tinidor" (Use a fork)',
        category: 'general',
      },
    ],
  },
  {
    id: 'street',
    title: 'Street & Directions',
    subtitle: 'Navigate Cebu streets with Bisaya',
    icon: 'compass',
    gradient: ['#8B5CF6', '#7C3AED'],
    objects: [
      {
        id: 'street',
        label: 'Street',
        bisaya: 'Dalan',
        pronunciation: 'DAH-lan',
        usage: '"Asa ning dalana?" (Where is this street?)',
        category: 'place',
      },
      {
        id: 'church',
        label: 'Church',
        bisaya: 'Simbahan',
        pronunciation: 'sim-BAH-han',
        usage: '"Asa ang simbahan?" (Where is the church?)',
        category: 'place',
      },
      {
        id: 'school',
        label: 'School',
        bisaya: 'Eskwelahan',
        pronunciation: 'es-kweh-LAH-han',
        usage: '"Duol ra ang eskwelahan" (The school is near)',
        category: 'place',
      },
      {
        id: 'hospital',
        label: 'Hospital',
        bisaya: 'Ospital',
        pronunciation: 'os-pee-TAL',
        usage: '"Dad-a ko sa ospital" (Bring me to the hospital)',
        category: 'place',
      },
      {
        id: 'store',
        label: 'Store',
        bisaya: 'Tindahan',
        pronunciation: 'tin-DAH-han',
        usage: '"Aga ang tindahan?" (Where is the store?)',
        category: 'place',
      },
      {
        id: 'jeepney',
        label: 'Jeepney',
        bisaya: 'Dyip',
        pronunciation: 'JEEP',
        usage: '"Musta ang dyip pa-sm?" (How to ride a jeepney to?)',
        category: 'transport',
      },
      {
        id: 'tricycle',
        label: 'Tricycle',
        bisaya: 'Traysikol',
        pronunciation: 'TRY-see-kol',
        usage: '"Pila plete sa traysikol?" (How much is the tricycle fare?)',
        category: 'transport',
      },
      {
        id: 'bus',
        label: 'Bus',
        bisaya: 'Bus',
        pronunciation: 'BOOS',
        usage: '"Asa ang bus stop?" (Where is the bus stop?)',
        category: 'transport',
      },
      {
        id: 'taxi',
        label: 'Taxi',
        bisaya: 'Taksi',
        pronunciation: 'TAHK-see',
        usage: '"Tawag og taksi" (Call a taxi)',
        category: 'transport',
      },
    ],
  },
];

router.get('/scenarios', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const summaries = AR_SCENARIOS.map(({ id, title, subtitle, icon, gradient, objects }) => ({
      id,
      title,
      subtitle,
      icon,
      gradient,
      objectCount: objects.length,
    }));
    res.json({ scenarios: summaries });
  } catch (err) {
    console.error('Get AR scenarios error:', err);
    res.status(500).json({ error: 'Failed to get AR scenarios' });
  }
});

router.get('/scenarios/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const scenario = AR_SCENARIOS.find((s) => s.id === req.params.id);
    if (!scenario) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }
    res.json({ scenario });
  } catch (err) {
    console.error('Get AR scenario error:', err);
    res.status(500).json({ error: 'Failed to get AR scenario' });
  }
});

router.get('/scenarios/:id/objects', authMiddleware, async (req: Request, res: Response) => {
  try {
    const scenario = AR_SCENARIOS.find((s) => s.id === req.params.id);
    if (!scenario) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }
    const category = req.query.category as string | undefined;
    let objects = scenario.objects;
    if (category) {
      objects = objects.filter((o) => o.category === category);
    }
    res.json({ objects, scenario: { id: scenario.id, title: scenario.title } });
  } catch (err) {
    console.error('Get AR objects error:', err);
    res.status(500).json({ error: 'Failed to get AR objects' });
  }
});

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const OBJECT_LABEL_INDEX = AR_SCENARIOS.reduce<Record<string, any>>((acc, s) => {
  for (const obj of s.objects) {
    const key = normalizeLabel(obj.label);
    if (!acc[key]) acc[key] = obj;
    const bisayaKey = normalizeLabel(obj.bisaya);
    if (!acc[bisayaKey]) acc[bisayaKey] = obj;
  }
  return acc;
}, {});

function matchObjects(groqLabels: string[], scenarioObjects: any[]): any[] {
  const matched: any[] = [];
  const usedKeys = new Set<string>();

  for (const gl of groqLabels) {
    const normalized = normalizeLabel(gl);
    let best: any = null;
    let bestScore = 0;

    for (const obj of scenarioObjects) {
      const key = normalizeLabel(obj.label);
      if (usedKeys.has(key)) continue;

      let score = 0;
      if (key === normalized) score = 1;
      else if (key.includes(normalized) || normalized.includes(key)) score = 0.8;
      else {
        const labelWords = key.split(/\s+/);
        const inputWords = normalized.split(/\s+/);
        const common = labelWords.filter((w: string) => inputWords.includes(w));
        if (common.length > 0)
          score = common.length / Math.max(labelWords.length, inputWords.length);
      }

      if (score > bestScore) {
        bestScore = score;
        best = obj;
      }

      const bisayaKey = normalizeLabel(obj.bisaya);
      if (
        !usedKeys.has(bisayaKey) &&
        (bisayaKey === normalized ||
          normalized.includes(bisayaKey) ||
          bisayaKey.includes(normalized))
      ) {
        if (0.9 > bestScore) {
          bestScore = 0.9;
          best = obj;
        }
      }
    }

    if (best && bestScore >= 0.7) {
      matched.push({ ...best, confidence: Math.round(bestScore * 100) });
      usedKeys.add(normalizeLabel(best.label));
    }
  }

  return matched;
}

router.post('/analyze', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { image, scenario_id, mime_type } = req.body || {};
    if (!image) {
      res.status(400).json({ error: 'Image (base64) is required' });
      return;
    }

    if (!isGroqConfigured()) {
      const scenario = AR_SCENARIOS.find((s) => s.id === (scenario_id || 'market'));
      res.json({ objects: (scenario?.objects || []).slice(0, 5), source: 'fallback' });
      return;
    }

    const scenarioId = scenario_id || 'market';
    const scenario = AR_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }

    const scenarioContext = `${scenario.title}: ${scenario.subtitle}`;
    const raw = await groqVision(image, scenarioContext, mime_type || 'image/jpeg');

    let identifiedLabels: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      identifiedLabels = Array.isArray(parsed) ? parsed : [];
    } catch {
      const matches = raw.match(/"([^"]+)"/g);
      if (matches) {
        identifiedLabels = matches.map((m: string) => m.replace(/"/g, ''));
      }
    }

    const matched = matchObjects(identifiedLabels, scenario.objects);

    res.json({
      objects: matched.slice(0, 10),
      raw_detection: identifiedLabels,
      source: 'vision',
      scenario: { id: scenario.id, title: scenario.title },
    });
  } catch (err) {
    console.error('AR analyze error:', err);
    const scenario = AR_SCENARIOS.find((s) => s.id === (req.body?.scenario_id || 'market'));
    res.json({ objects: (scenario?.objects || []).slice(0, 5), source: 'fallback' });
  }
});

export default router;
