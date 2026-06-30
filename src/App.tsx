import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Coins, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  MapPin, 
  HelpCircle,
  Sparkles,
  Info,
  ChevronRight,
  BookOpen,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Predefined examples to let the user test instantly
const SAMPLE_LOOTS = [
  {
    title: 'Hunt de Cults (Yalahar)',
    text: `Looted items:
  12x rope belt
  3x cultish mask
  5x mystical feather
  2x platinum coin
  120x gold coin
  1x giant sword`
  },
  {
    title: 'Hunt Avançada (Behemoths & Vampires)',
    text: `Loot: 15 Crystal Coins, 22 Platinum Coins, 5 Giant Swords, 15 Vampire Teeth, 8 Peat, 12 Sabretooth, 1500 gold coins, 2 Demonic Claw`
  },
  {
    title: 'Hunting Analyzer (Copiado Completo)',
    text: `Session data: From 2026-06-25, 20:15:20 to 2026-06-25, 21:15:20
Session: 01:00h
Loot Type: Market
Loot: 350,420
Supplies: 85,210
Balance: 265,210
Damage: 920,400
Healing: 320,150
Killed Monsters:
  45x Vampire Bride
  80x Silencer
Looted items:
  24x vampire teeth
  12x silencer claw
  4x protective charm
  15x platinum coin
  2x crystal coin
  1x steel boots
  1x mastermind shield`
  }
];

// Local cache of metadata to avoid refetching on every client-side analyze call
let clientItemMetadataCache: any[] | null = null;

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

// Static Fallback Database of common Tibia hunt loot items (if API is unreachable / CORS blocked)
const STATIC_FALLBACK_ITEMS: any[] = [
  { id: 3043, name: 'crystal coin', wiki_name: 'Crystal Coin', category: 'Others', npc_buy: [] },
  { id: 3010, name: 'platinum coin', wiki_name: 'Platinum Coin', category: 'Others', npc_buy: [] },
  { id: 3012, name: 'gold coin', wiki_name: 'Gold Coin', category: 'Others', npc_buy: [] },
  { id: 11447, name: 'rope belt', wiki_name: 'Rope Belt', category: 'Creature Products', npc_buy: [] },
  { id: 10454, name: 'cultish mask', wiki_name: 'Cultish Mask', category: 'Creature Products', npc_buy: [] },
  { id: 11452, name: 'mystical feather', wiki_name: 'Mystical Feather', category: 'Creature Products', npc_buy: [] },
  { id: 3407, name: 'giant sword', wiki_name: 'Giant Sword', category: 'Weapons', npc_buy: [{ name: 'Haroun', price: 17000, location: 'Blue Djinn Fortress' }] },
  { id: 10438, name: 'vampire teeth', wiki_name: 'Vampire Teeth', category: 'Creature Products', npc_buy: [] },
  { id: 10431, name: 'sabretooth', wiki_name: 'Sabretooth', category: 'Creature Products', npc_buy: [] },
  { id: 11443, name: 'protective charm', wiki_name: 'Protective Charm', category: 'Creature Products', npc_buy: [] },
  { id: 20112, name: 'silencer claw', wiki_name: 'Silencer Claw', category: 'Creature Products', npc_buy: [] },
  { id: 3432, name: 'mastermind shield', wiki_name: 'Mastermind Shield', category: 'Shields', npc_buy: [{ name: 'Blue Djinn', price: 25000, location: 'Blue Djinn Fortress' }, { name: 'Nah\'Bob', price: 25000, location: 'Blue Djinn Fortress' }] },
  { id: 3554, name: 'steel boots', wiki_name: 'Steel Boots', category: 'Armor', npc_buy: [{ name: 'Green Djinn', price: 30000, location: 'Green Djinn Fortress' }, { name: 'Haroun', price: 30000, location: 'Green Djinn Fortress' }] },
  { id: 3392, name: 'royal helmet', wiki_name: 'Royal Helmet', category: 'Armor', npc_buy: [{ name: 'Rashid', price: 30000, location: 'Travelling NPC' }] },
  { id: 3079, name: 'boots of haste', wiki_name: 'Boots of Haste', category: 'Armor', npc_buy: [{ name: 'Rashid', price: 30000, location: 'Travelling NPC' }] },
  { id: 3381, name: 'crown armor', wiki_name: 'Crown Armor', category: 'Armor', npc_buy: [{ name: 'Blue Djinn', price: 12000, location: 'Blue Djinn Fortress' }] },
  { id: 3419, name: 'crown shield', wiki_name: 'Crown Shield', category: 'Shields', npc_buy: [{ name: 'Blue Djinn', price: 8000, location: 'Blue Djinn Fortress' }] },
  { id: 3421, name: 'medusa shield', wiki_name: 'Medusa Shield', category: 'Shields', npc_buy: [{ name: 'Blue Djinn', price: 9000, location: 'Blue Djinn Fortress' }] },
  { id: 3416, name: 'dragon shield', wiki_name: 'Dragon Shield', category: 'Shields', npc_buy: [{ name: 'Haroun', price: 4000, location: 'Blue Djinn Fortress' }] },
  { id: 11446, name: 'thick fur', wiki_name: 'Thick Fur', category: 'Creature Products', npc_buy: [] },
  { id: 11451, name: 'holy orchid', wiki_name: 'Holy Orchid', category: 'Creature Products', npc_buy: [] },
  { id: 11454, name: 'shadow herb', wiki_name: 'Shadow Herb', category: 'Creature Products', npc_buy: [] },
  { id: 21183, name: 'peat', wiki_name: 'Peat', category: 'Creature Products', npc_buy: [] },
  { id: 11445, name: 'demonic claw', wiki_name: 'Demonic Claw', category: 'Creature Products', npc_buy: [] }
];

function parseLootTextClientSide(text: string): { name: string; quantity: number }[] {
  const items: { name: string; quantity: number }[] = [];
  
  // Clean text and split by newlines or commas
  const lines = text.split(/\r?\n|,/);
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Remove prefixes or headers
    let cleanChunk = line.replace(/^(loot|looted items|loot of [^:]+|killed monsters):\s*/i, '').trim();
    const lowerLine = cleanChunk.toLowerCase();
    
    if (
      lowerLine.startsWith('session data') ||
      lowerLine.startsWith('session:') ||
      lowerLine.startsWith('loot type:') ||
      lowerLine.startsWith('loot:') ||
      lowerLine.startsWith('supplies:') ||
      lowerLine.startsWith('balance:') ||
      lowerLine.startsWith('damage:') ||
      lowerLine.startsWith('healing:') ||
      lowerLine.startsWith('killed monsters:') ||
      lowerLine.startsWith('looted items:')
    ) {
      continue;
    }
    
    // Regex 1: "12x rope belt" or "12 rope belt"
    const matchQty = cleanChunk.match(/^[\s\-\*]*(\d+)\s*x?\s+([a-zA-Z'\s\-]+)$/);
    if (matchQty) {
      const qty = parseInt(matchQty[1], 10);
      let name = matchQty[2].trim().toLowerCase();
      name = name.replace(/^(a|an|some)\s+/, '');
      items.push({ name, quantity: qty });
      continue;
    }
    
    // Regex 2: "rope belt" (no explicit quantity, default to 1)
    const matchSingle = cleanChunk.match(/^[\s\-\*]*([a-zA-Z'\s\-]+)$/);
    if (matchSingle) {
      let name = matchSingle[1].trim().toLowerCase();
      name = name.replace(/^(a|an|some)\s+/, '');
      if (name && name !== 'loot' && name !== 'looted items') {
        items.push({ name, quantity: 1 });
      }
    }
  }
  
  return items;
}

async function runClientSideAnalysis(lootText: string, world: string) {
  const parsedItems = parseLootTextClientSide(lootText);
  if (parsedItems.length === 0) {
    return {
      npcSales: [],
      marketItems: [],
      coins: [],
      unresolved: [],
      totalNpcGold: 0,
      totalMarketGold: 0,
      totalPureCoinsGold: 0,
      grandTotal: 0,
    };
  }

  let metadata = clientItemMetadataCache;
  if (!metadata) {
    try {
      console.log('Client-side Fallback: Loading Tibia metadata from public API...');
      const response = await fetch('https://api.tibiamarket.top/item_metadata');
      if (response.ok) {
        metadata = await response.json();
        clientItemMetadataCache = metadata;
      }
    } catch (e) {
      console.warn('Client-side Fallback: Failed to fetch metadata from public API (CORS/Network). Using static fallback.');
    }
  }

  if (!metadata) {
    metadata = STATIC_FALLBACK_ITEMS;
  }

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

    const cleanName = item.name.toLowerCase().trim();
    let match = metadata.find((m: any) => m.name && m.name.toLowerCase() === cleanName);
    
    // Fallbacks
    if (!match && cleanName.endsWith('s')) {
      const sing = cleanName.slice(0, -1);
      match = metadata.find((m: any) => m.name && m.name.toLowerCase() === sing);
    }
    if (!match) {
      match = metadata.find((m: any) => m.name && m.name.toLowerCase() === cleanName + 's');
    }
    if (!match) {
      match = metadata.find((m: any) => m.name && m.name.toLowerCase().includes(cleanName));
    }
    if (!match) {
      match = metadata.find((m: any) => m.wiki_name && m.wiki_name.toLowerCase().includes(cleanName));
    }

    if (match) {
      let npcPrice = 0;
      let npcName = 'Nenhum';
      let npcLocation = '';

      if (Array.isArray(match.npc_buy) && match.npc_buy.length > 0) {
        const sortedNpcs = [...match.npc_buy].sort((a: any, b: any) => b.price - a.price);
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

  const matchedIds = mappedItems.map((item) => item.id);
  const marketMap = new Map<number, any>();

  if (matchedIds.length > 0) {
    try {
      const marketUrl = `https://api.tibiamarket.top/market_values?server=${encodeURIComponent(world)}&item_ids=${matchedIds.join(',')}`;
      console.log(`Client-side Fallback: Fetching market prices for server ${world}...`);
      const mRes = await fetch(marketUrl);
      if (mRes.ok) {
        const mData = await mRes.json();
        if (Array.isArray(mData)) {
          mData.forEach((val: any) => {
            marketMap.set(val.id, val);
          });
        }
      }
    } catch (err) {
      console.warn('Client-side Fallback: Failed to fetch market values from API.');
    }
  }

  const npcSales: { [npcName: string]: { npc: string; items: any[]; total: number } } = {};
  const marketItems: any[] = [];

  let totalNpcGold = 0;
  let totalMarketGold = 0;

  for (const item of mappedItems) {
    const marketData = marketMap.get(item.id);
    const hasFamousImbuementName = FAMOUS_MARKET_ITEMS.has(item.name.toLowerCase().trim()) || FAMOUS_MARKET_ITEMS.has(item.wikiName.toLowerCase().trim());
    
    let buyOffer = -1;
    let sellOffer = -1;
    let monthAverage = -1;

    if (marketData) {
      buyOffer = marketData.buy_offer;
      sellOffer = marketData.sell_offer;
      monthAverage = marketData.month_average_sell;
    }

    let marketPrice = buyOffer > 0 ? buyOffer : (monthAverage > 0 ? monthAverage : 0);

    if (marketPrice === 0 && hasFamousImbuementName) {
      marketPrice = item.npcPrice > 0 ? item.npcPrice * 3 : 2500;
    }

    const isFamous = hasFamousImbuementName;
    const isMarketPreferable = marketPrice > item.npcPrice && marketPrice > 0;
    const npcPriceIsZeroButMarketExists = item.npcPrice === 0 && marketPrice > 0;

    const belongsToMarket = isFamous || isMarketPreferable || npcPriceIsZeroButMarketExists;

    if (belongsToMarket) {
      const itemVal = marketPrice > 0 ? marketPrice : item.npcPrice;
      const totalVal = item.quantity * itemVal;
      totalMarketGold += totalVal;

      marketItems.push({
        ...item,
        buyOffer,
        sellOffer,
        monthAverage,
        suggestedMarketPrice: marketPrice || item.npcPrice,
        isFamous,
        totalValue: totalVal,
      });
    } else {
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
    }
  }

  const totalPureCoinsGold = coinsList.reduce((sum, c) => sum + c.totalValue, 0);

  return {
    npcSales: Object.values(npcSales).sort((a: any, b: any) => b.total - a.total),
    marketItems: marketItems.sort((a: any, b: any) => b.totalValue - a.totalValue),
    coins: coinsList,
    unresolved,
    totalNpcGold,
    totalMarketGold,
    totalPureCoinsGold,
    grandTotal: totalNpcGold + totalMarketGold + totalPureCoinsGold,
  };
}

export default function App() {
  const [worlds, setWorlds] = useState<string[]>([]);
  const [selectedWorld, setSelectedWorld] = useState('Celebra');
  const [lootText, setLootText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual');
  const [isClientSideParsed, setIsClientSideParsed] = useState(false);

  // Load Tibia Worlds on mount
  useEffect(() => {
    fetch('/api/worlds')
      .then((res) => {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }
        return res.json();
      })
      .then((data) => {
        if (data.worlds && Array.isArray(data.worlds)) {
          setWorlds(data.worlds);
          if (data.worlds.includes('Celebra')) {
            setSelectedWorld('Celebra');
          } else if (data.worlds.length > 0) {
            setSelectedWorld(data.worlds[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend worlds API unavailable. Trying direct public world list fetch...', err);
        fetch('https://api.tibiamarket.top/world_data')
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              const servers = data
                .map((item) => item.server)
                .filter((s): s is string => typeof s === 'string' && s.length > 0);
              const uniqueServers = Array.from(new Set(servers)).sort();
              if (uniqueServers.length > 0) {
                setWorlds(uniqueServers);
                if (uniqueServers.includes('Celebra')) {
                  setSelectedWorld('Celebra');
                } else {
                  setSelectedWorld(uniqueServers[0]);
                }
                return;
              }
            }
            throw new Error('Invalid public world format');
          })
          .catch((publicErr) => {
            console.error('All world lists failed. Using hardcoded backup:', publicErr);
            setWorlds(['Celebra', 'Antica', 'Secura', 'Gentebra', 'Bona', 'Belobra', 'Inabra', 'Luminera', 'Monza', 'Nefera', 'Pacera', 'Quelibra']);
          });
      });
  }, []);

  const handleAnalyze = async (overrideWorld?: string | unknown) => {
    const targetWorld = typeof overrideWorld === 'string' ? overrideWorld : selectedWorld;
    if (!lootText.trim()) {
      setError('Por favor, insira o texto de loot antes de analisar.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setIsClientSideParsed(false);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lootText,
          world: targetWorld,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Backend returned non-JSON response. Activating client-side fallback engine...');
        const clientResult = await runClientSideAnalysis(lootText, targetWorld);
        setResult(clientResult);
        setIsClientSideParsed(true);
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro ao processar o loot.');
      }

      setResult(data.summary);
    } catch (err: any) {
      console.warn('Backend query failed. Activating client-side fallback engine...', err);
      try {
        const clientResult = await runClientSideAnalysis(lootText, targetWorld);
        setResult(clientResult);
        setIsClientSideParsed(true);
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Erro de conexão com o servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample = (sampleText: string) => {
    setLootText(sampleText);
    setError(null);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const getNpcColorClass = (npcName: string) => {
    const name = npcName.toLowerCase();
    if (name.includes('rashid')) return 'border-[#EAB308] text-[#EAB308]';
    if (name.includes('blue djinn') || name.includes('nah\'bob')) return 'border-[#3B82F6] text-[#3B82F6]';
    if (name.includes('green djinn') || name.includes('haroun')) return 'border-[#10B981] text-[#10B981]';
    if (name.includes('yasir')) return 'border-[#10B981] text-[#10B981]';
    return 'border-white/30 text-white/90';
  };

  // Generate the formatted Markdown required by the user
  const generateMarkdown = () => {
    if (!result) return '';

    let md = '';
    md += `### 1. ITENS PARA VENDA EM NPC (Agrupado por NPC)\n`;
    
    if (result.npcSales && result.npcSales.length > 0) {
      result.npcSales.forEach((group: any) => {
        md += `* **${group.npc}**\n`;
        group.items.forEach((item: any) => {
          md += `  - ${item.quantity}x ${item.wikiName} (Preço Unitário NPC: ${formatNumber(item.npcPrice)} gp) -> Total: ${formatNumber(item.totalValue)} gp\n`;
        });
        md += `  *Total no NPC ${group.npc}: ${formatNumber(group.total)} gp*\n\n`;
      });
    } else {
      md += `*(Nenhum item classificado para venda direta em NPC)*\n\n`;
    }

    md += `### 2. ITENS COM POTENCIAL DE MARKET (Creature Products de Imbuement/Addon)\n`;
    md += `*[Sugerido Market - Verificar preço atual no seu mundo - ${selectedWorld}]*\n\n`;

    if (result.marketItems && result.marketItems.length > 0) {
      result.marketItems.forEach((item: any) => {
        md += `- ${item.quantity}x ${item.wikiName} (Sugerido Market: ${formatNumber(item.suggestedMarketPrice)} gp | Unitário NPC: ${formatNumber(item.npcPrice)} gp)\n`;
        if (item.buyOffer > 0 || item.sellOffer > 0) {
          md += `  * [Compra Instantânea: ${item.buyOffer > 0 ? formatNumber(item.buyOffer) + ' gp' : '---'}`;
          md += ` | Venda Anunciada: ${item.sellOffer > 0 ? formatNumber(item.sellOffer) + ' gp' : '---'}`;
          md += ` | Média Mensal: ${item.monthAverage > 0 ? formatNumber(item.monthAverage) + ' gp' : '---'}]\n`;
        }
        md += `  *Total Estimado no Market: ${formatNumber(item.totalValue)} gp*\n`;
      });
    } else {
      md += `*(Nenhum item com potencial de market identificado)*\n\n`;
    }

    if (result.coins && result.coins.length > 0) {
      md += `\n### 3. MOEDAS E DINHEIRO PURO (Isolados do cálculo)\n`;
      result.coins.forEach((coin: any) => {
        md += `- ${coin.quantity}x ${coin.name} -> Valor: ${formatNumber(coin.totalValue)} gp\n`;
      });
      md += `*Total em Moedas Puras: ${formatNumber(result.totalPureCoinsGold)} gp*\n`;
    }

    md += `\n---\n`;
    md += `**RESUMO DOS GANHOS:**\n`;
    md += `- Total NPC: ${formatNumber(result.totalNpcGold)} gp\n`;
    md += `- Total Market: ${formatNumber(result.totalMarketGold)} gp\n`;
    md += `- Total Moedas Puras: ${formatNumber(result.totalPureCoinsGold)} gp\n`;
    md += `**TOTAL GERAL ESTIMADO: ${formatNumber(result.grandTotal)} gp**\n`;

    return md;
  };

  const copyToClipboard = () => {
    const mdText = generateMarkdown();
    navigator.clipboard.writeText(mdText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased selection:bg-white selection:text-black" id="tibia-loot-app">
      {/* Decorative clean line accents to add design depth */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        {/* TOP NAV & SESSION DATA (Bold Typography Header block) */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-12 border-b border-white/10 pb-6" id="header">
          <div className="flex flex-col">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none m-0 uppercase flex items-center gap-3">
              LOOT ENGINE
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-bold tracking-[0.2em] text-white/40 uppercase font-mono">
              <span>Tibia Assistant</span>
              <span>•</span>
              <span>World: <strong className="text-white/80">{selectedWorld}</strong></span>
              <span>•</span>
              <span>AI Parser</span>
            </div>
          </div>
          {result ? (
            <div className="text-left sm:text-right mt-6 sm:mt-0">
              <div className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase mb-1 font-mono">Market Profit Estimate</div>
              <div className="text-5xl font-black tracking-tighter text-[#00FF41]">
                +{formatNumber(result.grandTotal)} <span className="text-xl">GP</span>
              </div>
            </div>
          ) : (
            <div className="text-left sm:text-right mt-6 sm:mt-0 opacity-40">
              <div className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase mb-1 font-mono">System Status</div>
              <div className="text-xl font-bold tracking-tight uppercase">Ready for Analysis</div>
            </div>
          )}
        </header>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Input Form */}
          <div className="lg:col-span-5 space-y-8" id="input-column">
            
            {/* Input Card */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <h2 className="text-xs font-black uppercase tracking-widest mb-6 py-1 px-3 bg-white text-black inline-block">
                INPUT PARAMETERS
              </h2>

              {/* Server Selector */}
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-2 font-mono">
                  Select Game World (Servidor)
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-white font-black tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer transition text-sm"
                    value={selectedWorld}
                    onChange={(e) => {
                      const newWorld = e.target.value;
                      setSelectedWorld(newWorld);
                      if (lootText.trim()) {
                        handleAnalyze(newWorld);
                      }
                    }}
                  >
                    {worlds.length === 0 ? (
                      <option>Loading worlds...</option>
                    ) : (
                      worlds.map((w) => (
                        <option key={w} value={w}>
                          {w.toUpperCase()}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-xs font-mono">
                    ▼
                  </div>
                </div>
              </div>

              {/* Loot text container */}
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-2 font-mono flex justify-between items-center">
                  <span>Loot Logs / Hunting Analyzer Text</span>
                  <button
                    onClick={() => setLootText('')}
                    className="text-[10px] text-white/40 hover:text-white underline transition lowercase tracking-normal font-sans"
                    title="Clean"
                  >
                    [clear]
                  </button>
                </label>
                <textarea
                  className="w-full h-64 bg-black/80 border border-white/10 rounded-xl p-4 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-white/20 resize-y leading-relaxed"
                  placeholder="Paste your hunting analyzer loot log here...&#10;Example:&#10;12x rope belt&#10;5x giant sword&#10;15x vampire teeth"
                  value={lootText}
                  onChange={(e) => {
                    setLootText(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className={`w-full py-4 px-6 rounded-xl font-black tracking-widest uppercase transition duration-300 flex items-center justify-center gap-2 border ${
                  isLoading 
                    ? 'bg-white/10 text-white/40 border-white/5 cursor-not-allowed' 
                    : 'bg-white hover:bg-white/90 text-black border-transparent hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    ANALYZING WITH AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    ANALYZE & SEGREGATE
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-950/40 border border-red-900/40 rounded-xl text-red-400 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Quick Templates */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 font-mono flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                DEMO TEMPLATES
              </h3>
              <div className="space-y-2">
                {SAMPLE_LOOTS.map((sample, index) => (
                  <button
                    key={index}
                    onClick={() => loadSample(sample.text)}
                    className="w-full text-left p-3.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 hover:border-white/20 text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider transition flex justify-between items-center group cursor-pointer"
                  >
                    <span className="truncate">{sample.title}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-white shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Output Analysis */}
          <div className="lg:col-span-7 space-y-6" id="output-column">
            
            {!result && !isLoading && (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 text-center h-[520px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white/40 mb-4">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Awaiting Analysis</h3>
                <p className="text-white/50 max-w-sm text-xs leading-relaxed font-medium">
                  Paste the Tibia loot data on the left panel to trigger the classification engine.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center h-[520px] flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-2 border-white/10 rounded-full absolute" />
                  <div className="w-16 h-16 border-t-2 border-r-2 border-white rounded-full animate-spin" />
                  <div className="w-16 h-16 flex items-center justify-center absolute top-0">
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Classifying loot...</h3>
                <p className="text-white/50 max-w-sm text-xs leading-relaxed font-mono">
                  Loading real-time prices for world <strong className="text-white">{selectedWorld.toUpperCase()}</strong>.
                </p>
              </div>
            )}

            {result && !isLoading && (
              <div className="space-y-6">
                
                {isClientSideParsed && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-yellow-400">
                      <strong className="font-bold uppercase tracking-wider block mb-0.5">Motor de Backup Client-Side Ativo</strong>
                      Este loot foi processado localmente no seu navegador porque o servidor de IA retornou uma resposta não-JSON ou está indisponível. Preços e NPCs foram sincronizados com base na API direta do Tibia Market!
                    </div>
                  </div>
                )}
                
                {/* 1. Totals Dashboard */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="dashboard">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 font-mono">Total NPC</span>
                    <span className="text-2xl font-black tracking-tighter text-white">{formatNumber(result.totalNpcGold)}<span className="text-xs font-normal text-white/50 ml-1">GP</span></span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 font-mono">Total Market</span>
                    <span className="text-2xl font-black tracking-tighter text-[#FF4D00]">{formatNumber(result.totalMarketGold)}<span className="text-xs font-normal text-[#FF4D00]/60 ml-1">GP</span></span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 font-mono">Pure Coins</span>
                    <span className="text-2xl font-black tracking-tighter text-[#3B82F6]">{formatNumber(result.totalPureCoinsGold)}<span className="text-xs font-normal text-[#3B82F6]/60 ml-1">GP</span></span>
                  </div>
                  <div className="bg-[#00FF41] p-4 rounded-xl text-black shadow-lg shadow-[#00FF41]/10">
                    <span className="block text-[10px] font-black uppercase tracking-wider mb-1 font-mono">GRAND TOTAL</span>
                    <span className="text-2xl font-black tracking-tighter">{formatNumber(result.grandTotal)}<span className="text-xs font-normal text-black/60 ml-1">GP</span></span>
                  </div>
                </div>

                {/* Tabs to toggle visual vs raw markdown */}
                <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center">
                  <button
                    onClick={() => setActiveTab('visual')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-black text-xs uppercase tracking-wider transition cursor-pointer ${
                      activeTab === 'visual' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Visual Segregation
                  </button>
                  <button
                    onClick={() => setActiveTab('markdown')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-black text-xs uppercase tracking-wider transition cursor-pointer ${
                      activeTab === 'markdown' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Copiable Markdown
                  </button>
                </div>

                {/* 2. Visual Breakdown Tab */}
                {activeTab === 'visual' && (
                  <div className="space-y-8" id="visual-breakdown">
                    
                    {/* Section 1: NPC Sales */}
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-6 shadow-xl space-y-6">
                      <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                        <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                          <Coins className="w-5 h-5 text-white" />
                          NPC SALES LIQUIDATION
                        </h2>
                        <span className="text-xs font-mono text-white/50">
                          Total: {formatNumber(result.totalNpcGold)} GP
                        </span>
                      </div>

                      {result.npcSales && result.npcSales.length > 0 ? (
                        <div className="space-y-8">
                          {result.npcSales.map((group: any) => (
                            <div key={group.npc} className={`border-l-4 ${getNpcColorClass(group.npc).split(' ')[0]} pl-4 py-1`}>
                              <div className="flex justify-between items-end mb-2">
                                <h3 className={`text-2xl font-black uppercase ${getNpcColorClass(group.npc).split(' ')[1]}`}>
                                  {group.npc}
                                </h3>
                                {group.items[0]?.npcLocation && (
                                  <span className="text-[10px] font-mono font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                    {group.items[0].npcLocation}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-medium border-t border-white/5 pt-2 space-y-1">
                                {group.items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between py-1 border-b border-white/[0.02] last:border-b-0">
                                    <div className="text-white/80">
                                      <span className="font-bold text-white mr-1.5">{item.quantity}x</span>
                                      <span>{item.wikiName}</span>
                                      <span className="text-white/30 text-xs font-mono ml-2">({formatNumber(item.npcPrice)} GP / ea)</span>
                                    </div>
                                    <span className="font-mono text-white/90">{formatNumber(item.totalValue)} GP</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-right text-xs text-white/40 mt-1.5 font-mono">
                                Subtotal {group.npc}: <strong className="text-white">{formatNumber(group.total)} GP</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/40 py-3 text-center font-mono">No items classified for direct NPC sale.</p>
                      )}
                    </div>

                    {/* Section 2: Market Potential */}
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col">
                      <div className="flex justify-between items-baseline border-b border-white/10 pb-4 mb-6">
                        <h2 className="text-xl font-black uppercase tracking-widest text-[#FF4D00] flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-[#FF4D00]" />
                          HIGH VALUE MARKET
                        </h2>
                        <span className="text-xs font-mono text-white/50">
                          Total: {formatNumber(result.totalMarketGold)} GP
                        </span>
                      </div>

                      {result.marketItems && result.marketItems.length > 0 ? (
                        <div className="space-y-4">
                          {result.marketItems.map((item: any, idx: number) => (
                            <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/5">
                              <div className="flex justify-between items-baseline">
                                <span className="font-black uppercase text-base tracking-tight leading-tight">{item.wikiName}</span>
                                <span className="text-[#FF4D00] font-black text-lg">x{item.quantity}</span>
                              </div>
                              {item.isFamous && (
                                <div className="text-[10px] text-white/40 mt-1 uppercase font-bold tracking-wider italic">Imbuement / Addon Item</div>
                              )}
                              <div className="flex flex-wrap justify-between items-baseline mt-3 border-t border-white/10 pt-2 text-xs text-white/50 gap-2">
                                <span>Est. Value: <strong className="font-mono text-[#00FF41]">{formatNumber(item.suggestedMarketPrice)} GP / ea</strong></span>
                                <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono">NPC Value: {formatNumber(item.npcPrice)} GP</span>
                              </div>
                              {(item.buyOffer > 0 || item.sellOffer > 0 || item.monthAverage > 0) && (
                                <div className="mt-2 text-[10px] text-white/40 font-mono flex flex-wrap gap-x-3 gap-y-1">
                                  {item.buyOffer > 0 && <span>Instant Buy: {formatNumber(item.buyOffer)} GP</span>}
                                  {item.sellOffer > 0 && <span>Sell Offer: {formatNumber(item.sellOffer)} GP</span>}
                                  {item.monthAverage > 0 && <span>Month Avg: {formatNumber(item.monthAverage)} GP</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/40 py-3 text-center font-mono">No items with market premium potential identified.</p>
                      )}

                      <div className="p-4 bg-[#FF4D00] text-black rounded-xl mt-6">
                        <div className="text-[10px] font-black uppercase tracking-widest mb-1">Market Disclaimer</div>
                        <p className="text-[11px] leading-tight font-bold">
                          Sugerido Market - Verificar preço atual no mundo {selectedWorld.toUpperCase()}. Valores baseados em APIs de mercado em tempo real.
                        </p>
                      </div>
                    </div>

                    {/* Section 3: Coins & Gold */}
                    {result.coins && result.coins.length > 0 && (
                      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 shadow-xl space-y-4">
                        <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                          <h2 className="text-xl font-black uppercase tracking-widest text-[#3B82F6] flex items-center gap-2">
                            <Coins className="w-5 h-5 text-[#3B82F6]" />
                            PURE COINS & COLD CASH
                          </h2>
                          <span className="text-xs font-mono text-white/50">
                            Total: {formatNumber(result.totalPureCoinsGold)} GP
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {result.coins.map((coin: any, idx: number) => (
                            <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                              <div className="text-sm">
                                <span className="font-black text-[#3B82F6] mr-2">{coin.quantity}x</span>
                                <span className="text-white font-black uppercase tracking-tight text-xs">{coin.name}</span>
                              </div>
                              <span className="font-mono text-white/80 text-xs font-semibold">{formatNumber(coin.totalValue)} GP</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unresolved List if exists */}
                    {result.unresolved && result.unresolved.length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2 text-white/40 text-xs font-black uppercase tracking-[0.2em]">
                          <HelpCircle className="w-4 h-4" />
                          UNRECOGNIZED / DISCARDABLE ITEMS
                        </div>
                        <p className="text-[10px] text-white/40 -mt-2 leading-relaxed font-mono">
                          Items not listed in TibiaMarket databases or without any relevant NPC buy value.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.unresolved.map((item: any, idx: number) => (
                            <span key={idx} className="bg-black text-white/60 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-1.5">
                              <span className="font-mono text-white/30">{item.quantity}x</span>
                              {item.name.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* 3. Copiable Markdown Tab */}
                {activeTab === 'markdown' && (
                  <div className="bg-white/5 rounded-2xl border border-white/10 p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                        <Copy className="w-4 h-4 text-white" />
                        MARKDOWN FORMAT OUTPUT
                      </h3>
                      <button
                        onClick={copyToClipboard}
                        className="bg-white hover:bg-white/90 text-black font-black px-4 py-2 rounded-lg text-xs transition duration-200 flex items-center gap-1.5 shadow-md uppercase tracking-wider cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copied ? 'COPIED!' : 'COPY MARKDOWN'}
                      </button>
                    </div>

                    <pre className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-mono text-xs overflow-x-auto text-left leading-relaxed whitespace-pre-wrap select-all">
                      {generateMarkdown()}
                    </pre>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

