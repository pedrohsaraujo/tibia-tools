import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Google GenAI SDK
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Cache for Tibia Item Metadata (loads on demand, cached in memory)
let itemMetadataCache: any[] | null = null;
let metadataLoadingPromise: Promise<any[]> | null = null;

async function getItemMetadata(): Promise<any[]> {
  if (itemMetadataCache) {
    return itemMetadataCache;
  }
  if (metadataLoadingPromise) {
    return metadataLoadingPromise;
  }

  console.log('Loading Tibia item metadata from Tibia Market API...');
  metadataLoadingPromise = fetch('https://api.tibiamarket.top/item_metadata')
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch item metadata: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log(`Loaded ${data.length} items from Tibia Market API.`);
      itemMetadataCache = data;
      metadataLoadingPromise = null;
      return data;
    })
    .catch((err) => {
      console.error('Error fetching item metadata:', err);
      metadataLoadingPromise = null;
      throw err;
    });

  return metadataLoadingPromise;
}

// Famous Imbuement / Addon items that have higher Market value
const FAMOUS_MARKET_ITEMS = new Set([
  'rope belt',
  'protective charm',
  'sabretooth',
  'silencer claw',
  'vampire teeth',
  'piece of dead brain',
  'cultish mask',
  'thick fur',
  'bloody pincers',
  'flask of embalming fluid',
  'glooth bag',
  'snake skin',
  'turtle shell',
  'green dragon scale',
  'hardened bone',
  'holy orchid',
  'gland',
  'little bowl of myrrh',
  'damaged logbook',
  'mooh\'tah shell',
  'peat',
  'petrol',
  'piles of grave earth',
  'poisonous slime',
  'searing fire',
  'shadow herb',
  'slime',
  'winter wolf fur',
  'spider silk',
  'brimstone fangs',
  'broken shamanic staff',
  'orclops hair',
  'elven scouting glass',
  'demon horn',
  'metal spike',
  'strand of lich hair',
  'voodoo doll',
  'waspoid wing',
  'crawler head plating',
  'broken gladiator shield',
  'bunch of winterberries',
  'lion mane',
  'leech',
  'sombre eye',
  'vile grandmaster\'s ribbon',
  'broken drakinar'
]);

// Helper to check if a name is a pure coin
function getCoinValue(name: string): number | null {
  const n = name.toLowerCase();
  if (n.includes('crystal coin')) return 10000;
  if (n.includes('platinum coin')) return 100;
  if (n.includes('gold coin')) return 1;
  return null;
}

// 1. API: Get list of active Tibia worlds
let worldsCache: string[] | null = null;
let worldsCacheTime = 0;

app.get('/api/worlds', async (req, res) => {
  try {
    const now = Date.now();
    // Cache worlds list for 10 minutes
    if (worldsCache && now - worldsCacheTime < 10 * 60 * 1000) {
      return res.json({ worlds: worldsCache });
    }

    console.log('Fetching world list from Tibia Market API...');
    const response = await fetch('https://api.tibiamarket.top/world_data');
    if (!response.ok) {
      throw new Error(`Tibia Market API returned ${response.status}`);
    }
    const data: any[] = await response.json();
    const servers = data
      .map((item) => item.server)
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    
    // Deduplicate and sort
    const uniqueServers = Array.from(new Set(servers)).sort();
    
    // Fallback if empty
    if (uniqueServers.length === 0) {
      uniqueServers.push('Celebra', 'Antica', 'Secura', 'Gentebra');
    }

    worldsCache = uniqueServers;
    worldsCacheTime = now;
    res.json({ worlds: uniqueServers });
  } catch (err: any) {
    console.error('Error fetching worlds:', err.message);
    // Return standard fallback worlds if API is down
    res.json({
      worlds: ['Celebra', 'Antica', 'Secura', 'Gentebra', 'Bona', 'Belobra', 'Inabra', 'Luminera', 'Monza', 'Nefera', 'Pacera', 'Quelibra'],
      error: err.message
    });
  }
});

// 2. API: Parse loot text and compute values
app.post('/api/analyze', async (req, res) => {
  const { lootText, world = 'Celebra' } = req.body;

  if (!lootText || typeof lootText !== 'string' || lootText.trim().length === 0) {
    return res.status(400).json({ error: 'Texto de loot vazio ou inválido.' });
  }

  try {
    console.log(`Starting parsing using Gemini with model gemini-3.5-flash...`);
    const prompt = `Você é um motor especializado em analisar loot do MMORPG Tibia.
Extraia os itens e suas quantidades do texto fornecido. Esse texto pode ser copiado do "Hunting Analyzer", "Loot" ou do "Server Log".
Regras de extração:
- Retorne apenas itens válidos.
- Remova prefixos comuns como "a ", "an ", "some ", etc.
- Converta o nome do item para inglês, no singular e formato limpo, por exemplo: "giant swords" deve virar "giant sword", "vampire teeth" deve permanecer "vampire teeth" (pois o singular/plural no Tibia é vampire teeth), "rope belts" deve virar "rope belt".
- Mantenha moedas puras ("gold coin", "platinum coin", "crystal coin") na extração para que o sistema as catalogue separadamente.

O texto de loot recebido é:
"""
${lootText}
"""`;

    // We request structured JSON array output
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Você é um analisador e parser de logs de loot do Tibia. Retorne estritamente um array JSON de objetos contendo "name" (string, nome do item em inglês, limpo, singular) e "quantity" (inteiro).',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'Nome em inglês do item (ex: giant sword, rope belt, gold coin)',
              },
              quantity: {
                type: Type.INTEGER,
                description: 'Quantidade extraída',
              },
            },
            required: ['name', 'quantity'],
          },
        },
      },
    });

    const parsedText = geminiResponse.text?.trim() || '[]';
    console.log('Gemini Parsed Results:', parsedText);
    const parsedItems: { name: string; quantity: number }[] = JSON.parse(parsedText);

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.json({
        success: true,
        summary: {
          npcSales: {},
          marketItems: [],
          coins: [],
          unresolved: [],
          totalNpcGold: 0,
          totalMarketGold: 0,
          totalPureCoinsGold: 0,
        },
      });
    }

    // Load entire metadata
    const metadata = await getItemMetadata();

    // Map parsed items to their metadata
    const mappedItems: any[] = [];
    const coinsList: any[] = [];
    const unresolved: any[] = [];

    for (const item of parsedItems) {
      const coinValue = getCoinValue(item.name);
      if (coinValue !== null) {
        coinsList.push({
          name: item.name,
          quantity: item.quantity,
          valueEach: coinValue,
          totalValue: item.quantity * coinValue,
        });
        continue;
      }

      // Find match in metadata
      const cleanName = item.name.toLowerCase().trim();
      let match = metadata.find((m) => m.name && m.name.toLowerCase() === cleanName);
      
      // Fallback 1: singularization
      if (!match && cleanName.endsWith('s')) {
        const sing = cleanName.slice(0, -1);
        match = metadata.find((m) => m.name && m.name.toLowerCase() === sing);
      }
      
      // Fallback 2: partial includes
      if (!match) {
        match = metadata.find((m) => m.name && m.name.toLowerCase().includes(cleanName));
      }
      if (!match) {
        match = metadata.find((m) => m.wiki_name && m.wiki_name.toLowerCase().includes(cleanName));
      }

      if (match) {
        // Find best NPC buy price (where player sells to NPC)
        let npcPrice = 0;
        let npcName = 'Nenhum';
        let npcLocation = '';

        if (Array.isArray(match.npc_buy) && match.npc_buy.length > 0) {
          // Sort to find maximum price
          const sortedNpcs = [...match.npc_buy].sort((a, b) => b.price - a.price);
          npcPrice = sortedNpcs[0].price;
          npcName = sortedNpcs[0].name;
          npcLocation = sortedNpcs[0].location || '';
        }

        mappedItems.push({
          id: match.id,
          name: match.name || item.name,
          wikiName: match.wiki_name || match.name || item.name,
          category: match.category || 'Others',
          quantity: item.quantity,
          npcPrice,
          npcName,
          npcLocation,
        });
      } else {
        unresolved.push({
          name: item.name,
          quantity: item.quantity,
        });
      }
    }

    // Now, fetch Market values in a single batch query for all matched IDs
    const matchedIds = mappedItems.map((item) => item.id);
    let marketMap = new Map<number, any>();

    if (matchedIds.length > 0) {
      try {
        const marketUrl = `https://api.tibiamarket.top/market_values?server=${encodeURIComponent(world)}&item_ids=${matchedIds.join(',')}`;
        console.log(`Fetching market prices for batch of items: ${marketUrl}`);
        const mRes = await fetch(marketUrl);
        if (mRes.ok) {
          const mData: any[] = await mRes.json();
          if (Array.isArray(mData)) {
            mData.forEach((val) => {
              marketMap.set(val.id, val);
            });
          }
        }
      } catch (err: any) {
        console.error('Error fetching batch market values:', err.message);
      }
    }

    // Grouping into NPC Sales vs Market Potential
    const npcSales: { [npcName: string]: { npc: string; items: any[]; total: number } } = {};
    const marketItems: any[] = [];

    let totalNpcGold = 0;
    let totalMarketGold = 0;

    for (const item of mappedItems) {
      const marketData = marketMap.get(item.id);
      
      const hasFamousImbuementName = FAMOUS_MARKET_ITEMS.has(item.name.toLowerCase().trim()) || FAMOUS_MARKET_ITEMS.has(item.wikiName.toLowerCase().trim());
      const isCreatureProductCategory = item.category === 'Creature Products';
      const isQuestOrAddonCategory = item.category === 'Valuable' || item.category === 'Quests' || item.category === 'Addons';
      
      let buyOffer = -1;
      let sellOffer = -1;
      let monthAverage = -1;
      
      if (marketData) {
        buyOffer = marketData.buy_offer;
        sellOffer = marketData.sell_offer;
        monthAverage = marketData.month_average_sell;
      }

      // Establish "marketPrice" for comparison: we prefer the lowest active sell offer (sellOffer) as it represents the current active market price to list, 
      // followed by monthAverage (historical average sales), and finally buyOffer (instant buy).
      let marketPrice = 0;
      if (sellOffer > 0) {
        marketPrice = sellOffer;
      } else if (monthAverage > 0) {
        marketPrice = monthAverage;
      } else if (buyOffer > 0) {
        marketPrice = buyOffer;
      }

      // Famous fallback
      if (marketPrice === 0 && hasFamousImbuementName) {
        marketPrice = item.npcPrice > 0 ? item.npcPrice * 3 : 2500;
      }

      const isFamous = hasFamousImbuementName;
      const npcTotalValue = item.quantity * item.npcPrice;
      const grossMarketValue = item.quantity * marketPrice;

      // Tibia Market Fee: 2% of total value, min 20 gp, max 1000 gp
      let marketFee = 0;
      let netMarketValue = 0;
      if (marketPrice > 0) {
        marketFee = Math.min(1000, Math.max(20, Math.floor(grossMarketValue * 0.02)));
        netMarketValue = grossMarketValue - marketFee;
      }

      // To be profitable, net market value must exceed the guaranteed NPC sell value
      const belongsToMarket = (marketPrice > 0) && (netMarketValue > npcTotalValue);

      if (belongsToMarket) {
        totalMarketGold += netMarketValue;

        marketItems.push({
          ...item,
          buyOffer,
          sellOffer,
          monthAverage,
          suggestedMarketPrice: marketPrice,
          isFamous,
          grossValue: grossMarketValue,
          marketFee,
          totalValue: netMarketValue, // Use net value for the total
        });
      } else if (item.npcPrice > 0) {
        // Belongs to NPC Sales because NPC value is better or equal, or market is not viable
        const npcName = item.npcName || 'NPC Comum/Geral';
        const totalVal = item.quantity * item.npcPrice;
        totalNpcGold += totalVal;

        if (!npcSales[npcName]) {
          npcSales[npcName] = {
            npc: npcName,
            items: [],
            total: 0,
          };
        }
        
        npcSales[npcName].items.push({
          ...item,
          totalValue: totalVal,
          buyOffer,
          sellOffer,
          monthAverage,
        });
        npcSales[npcName].total += totalVal;
      } else {
        // npcPrice is 0 and market is not profitable (or net value is negative/zero)
        unresolved.push({
          name: item.wikiName || item.name,
          quantity: item.quantity,
          reason: `Não compensa vender no Market devido à taxa mínima de 20 gp (Valor bruto: ${grossMarketValue} gp)`,
        });
      }
    }

    // Compute total gold of pure coins
    const totalPureCoinsGold = coinsList.reduce((sum, c) => sum + c.totalValue, 0);

    res.json({
      success: true,
      summary: {
        npcSales: Object.values(npcSales).sort((a, b) => b.total - a.total),
        marketItems: marketItems.sort((a, b) => b.totalValue - a.totalValue),
        coins: coinsList,
        unresolved,
        totalNpcGold,
        totalMarketGold,
        totalPureCoinsGold,
        grandTotal: totalNpcGold + totalMarketGold + totalPureCoinsGold,
      },
    });
  } catch (err: any) {
    console.error('Error during loot analysis:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor ao processar loot.' });
  }
});

// Serve frontend assets
if (process.env.NODE_ENV !== 'production') {
  // Setup Vite dev server middleware
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Development server running on http://localhost:${PORT}`);
    });
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Production server running on port ${PORT}`);
  });
}
