// ============================================================
//  🎨 MIDJOURNEY SCRAPER — CONFIGURATION v5
// ============================================================
//
//  STRATEGY: "Scrape everything, classify after"
//
//  1. Collect ALL images from MJ Explore (no pre-filtering)
//  2. Extract prompt text for each image
//  3. Classify using SMART CLASSIFIER v4:
//     - Subject extraction (first clause of prompt)
//     - Weighted keywords (specific terms > generic)
//     - Exclusion keywords (prevent cross-contamination)
//     - Priority system (subject themes > style themes)
//  4. Keep images matching at least one theme, discard the rest
//
//  KEYWORDS USE COMMON WORDS — not technical jargon.
//  Each theme has "minScore" and optional "exclude" / "priority".
// ============================================================

export const CONFIG = {
    baseUrl: 'https://www.midjourney.com/explore',
    tab: 'top',

    outputDir: './downloads',
    saveCatalog: true,
    catalogFile: './catalog.json',

    // ── Limits ────────────────────────────────────────────────
    maxImages: 200,        // images to collect from Explore
    maxDownloads: 10,      // downloads per theme
    maxScrolls: 80,

    // ── Speed ─────────────────────────────────────────────────
    scrollDelay: 1500,
    detailDelay: 1200,

    // ── Quality ───────────────────────────────────────────────
    resolution: 'high',

    // ══════════════════════════════════════════════════════════
    //  🎨 THEMES — Organized by user intent
    // ══════════════════════════════════════════════════════════
    //
    //  keywords: common words found in MJ prompts
    //            Can be strings or { word, weight } objects
    //  minScore: minimum keyword hits to classify (default 1)
    //  exclude:  keywords that disqualify this theme
    //  priority: 'subject' (concrete thing) or 'style' (aesthetic)
    //            Subject themes take precedence over style themes
    //
    // ──────────────────────────────────────────────────────────

    themes: {

        // ═══════════════════════════════════════════════════════
        //  👤 PEOPLE
        // ═══════════════════════════════════════════════════════

        portraits: {
            keywords: [

                'saudi', 'saudi model', 'saudi arabian', 'model',
                // Person descriptions (EN)
                'portrait', 'portraits', 'portraiture',
                'woman', 'girl', 'boy',
                'beautiful woman', 'young woman', 'old woman',
                'handsome man', 'young man', 'old man', 'elderly man',
                'gorgeous', 'stunning',
                'year old',
                'looking at camera', 'posing',
                'she stands', 'he stands', 'she sits', 'he sits',
                'she looks', 'he looks', 'she wears', 'he wears',
                // Portrait composition terms (EN)
                'headshot', 'close-up face', 'face close-up',
                'beauty shot', 'fashion model', 'editorial model',
                'studio portrait', 'cinematic portrait',
                'full body shot', 'model posing',
                'half body', 'upper body', 'bust shot',
                'profile view', 'side profile',
                'selfie', 'candid portrait',
                // Person descriptions (FR)
                'femme', 'homme', 'fille', 'garçon',
                'visage', 'belle femme', 'jeune femme', 'vieille femme',
                'portrait de', 'portrait d\'une', 'portrait d\'un homme',
                'bouddha', 'buddha',
                'modèle',
                'femme seule', 'homme seul',
                'couple', 'duo', 'lovers', 'septuagénaire', 'amoureux',
                // Ethnicities/ages often used in MJ prompts
                'caucasian', 'african', 'asian woman', 'asian man',
                'teenager', 'toddler', 'baby', 'child',
                'elderly', 'senior',
            
                // ➕ AI Audit Additions (EN)
                'attractive', 'detailed face', 'intricate face', 'hyper-realistic face', 'facial features', 'portrait photography', 'character portrait', 'fashion photography', 'environmental portrait', 'three-quarter view', 'close up portrait',
            ],
            exclude: ['cat portrait', 'dog portrait', 'animal portrait', 'pet portrait'],
            priority: 'subject',
            minScore: 1,
            folder: 'people/portraits'
        },

        characters: {
            keywords: [
                'character design', 'character concept',
                'character art', 'character illustration',
                'character sheet', 'character turnaround',
                'hero character', 'villain character',
                'fantasy character', 'sci-fi character',
                'anime character', 'game character',
                'rpg character', 'dnd character', 'd&d character',
                'warrior', 'knight', 'samurai', 'wizard', 'witch',
                'astronaut', 'cyborg', 'robot', 'android',
                'elf', 'dwarf', 'orc', 'goblin', 'fairy',
                'pirate', 'viking', 'gladiator', 'assassin',
                'sorcerer', 'mage', 'necromancer', 'paladin',
                'superhero', 'supervillain',
                // FR
                'personnage', 'guerrier', 'chevalier', 'sorcier', 'sorcière',
            
                // ➕ AI Audit Additions (EN)
                'character design sheet', 'concept art character', 'character turnaround sheet', 'full body character', 'ttrpg character', 'protagonist',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'people/characters'
        },

        // ═══════════════════════════════════════════════════════
        //  🌄 SCENES & ENVIRONMENTS
        // ═══════════════════════════════════════════════════════

        landscapes: {
            keywords: [
                'landscape', 'panorama', 'scenic', 'scenery',
                'mountain', 'valley', 'canyon', 'cliff', 'peak',
                'ocean', 'beach', 'coastline', 'shore', 'seaside',
                'forest', 'jungle', 'meadow', 'woods', 'woodland',
                'sunset', 'sunrise', 'golden hour', 'blue hour',
                'desert', 'tundra', 'glacier', 'arctic',
                'waterfall', 'lake', 'river', 'stream', 'creek',
                'aerial view', 'drone shot', 'birds eye view',
                'open field', 'flower field', 'grass field', 'wheat field',
                'mountain landscape', 'ocean view', 'sea view',
                'countryside', 'rural', 'pastoral',
                'horizon', 'vast', 'rolling hills',
                'volcanic', 'volcano', 'hot spring',
                'fjord', 'ravine', 'gorge', 'garden', 'gardens',
                // FR
                'paysage', 'montagne', 'sommet', 'vallée', 'forêt',
                'plage', 'cascade', 'rivière', 'prairie',
                'coucher de soleil', 'lever de soleil',
            
                // ➕ AI Audit Additions (EN)
                'landscape photography', 'epic landscape', 'nature photography', 'mountainscape', 'seascape', 'cityscape', 'cinematic landscape', 'breathtaking view', 'aerial photography',
            ],
            exclude: ['mountain bike', 'mountain dew'],
            priority: 'subject',
            minScore: 1,
            folder: 'scenes/landscapes'
        },

        architecture: {
            keywords: [
                'architecture', 'skyscraper', 'building',
                'interior design', 'interior', 'living room', 'bedroom', 'bathroom',
                'kitchen design', 'dining room', 'office space',
                'brutalist', 'modern house', 'apartment', 'penthouse',
                'temple', 'church', 'castle', 'mosque', 'cathedral', 'monastery',
                'palace', 'mansion', 'villa', 'cottage',
                'cityscape', 'urban', 'street scene', 'alleyway',
                'tower', 'bridge', 'staircase', 'spiral staircase',
                'futuristic city', 'sci-fi city', 'cyberpunk city',
                'modern building', 'office building', 'residential building',
                'facade', 'archway', 'colonnade', 'dome',
                'warehouse', 'factory', 'industrial building',
                'ruins', 'abandoned building', 'post-apocalyptic city',
                'rooftop', 'balcony', 'terrace', 'courtyard', 'arch', 'greenhouse',
                // FR
                'immeuble', 'maison', 'château', 'église', 'cathédrale',
                'escalier', 'intérieur', 'salon', 'chambre',
                'cour', 'propriété', 'domaine', 'manoir', 'arche', 'serre',
            
                // ➕ AI Audit Additions (EN)
                'interior architecture', 'exterior architecture', 'architectural design', 'building interior', 'building exterior', 'modern interior', 'architectural photography', 'room design', 'house design',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'scenes/architecture'
        },

        underwater: {
            keywords: [
                'underwater', 'deep sea', 'ocean floor', 'sea floor',
                'coral reef', 'aquatic', 'marine life',
                'submarine', 'diving', 'scuba', 'snorkeling',
                'jellyfish', 'seahorse', 'octopus', 'squid',
                'abyss', 'deep ocean', 'underwater cave',
                'underwater photography', 'underwater scene',
                'bioluminescent', 'deep water',
                'kelp forest', 'seaweed', 'sea anemone',
                // FR
                'sous l\'eau', 'sous-marin', 'sous-marine',
                'récif', 'plongée', 'fond marin',
                'méduse', 'pieuvre', 'poulpe',
            
                // ➕ AI Audit Additions (EN)
                'underwater photography', 'submerged', 'ocean depths', 'coral reef ecosystem', 'marine biology',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'scenes/underwater'
        },

        space: {
            keywords: [
                'outer space', 'galaxy', 'nebula',
                'planet', 'cosmos', 'asteroid', 'comet',
                'starfield', 'milky way', 'supernova',
                'space station', 'orbital',
                'black hole', 'wormhole',
                'saturn rings', 'jupiter', 'mars surface', 'moon surface',
                'interstellar', 'deep space', 'cosmic',
                'aurora borealis', 'northern lights',
                'constellation', 'shooting star', 'meteor',
                // FR — avoid generic 'espace' (means both 'space' and 'gap' in FR)
                'espace intersidéral', 'espace profond', 'galaxie', 'nébuleuse', 'planète',
                'étoiles', 'étoile', 'trou noir', 'aurore boréale', 'voie lactée',
                'faille cosmique', 'poussière d\'étoiles',
            
                // ➕ AI Audit Additions (EN)
                'deep space photography', 'astrophotography', 'space exploration', 'scientifically accurate space', 'hubble telescope', 'james webb telescope',
            ],
            exclude: ['space age', 'negative space', 'open space', 'office space',
                'espace dégagé', 'espace vide', 'espace nocturne', 'espace autour'],
            priority: 'subject',
            minScore: 1,
            folder: 'scenes/space'
        },

        // ═══════════════════════════════════════════════════════
        //  🚗 VEHICLES (split into distinct categories)
        // ═══════════════════════════════════════════════════════

        cars: {
            keywords: [
                // Generic car terms
                'car', 'sports car', 'supercar', 'race car', 'racing car',
                'sedan', 'coupe', 'convertible', 'hatchback', 'suv',
                'vintage car', 'classic car', 'muscle car', 'hot rod',
                'drift car', 'rally car', 'formula 1', 'f1 car',
                'electric car', 'concept car', 'luxury car',
                'off-road', 'pickup truck', 'truck',
                // Brands
                'ferrari', 'porsche', 'lamborghini', 'bmw', 'mercedes',
                'audi', 'maserati', 'bugatti', 'mclaren', 'aston martin',
                'corvette', 'mustang', 'camaro', 'dodge', 'challenger',
                'tesla', 'rolls royce', 'bentley', 'pagani', 'koenigsegg',
                'toyota', 'honda', 'nissan gtr', 'skyline', 'supra',
                'shelby', 'ford gt', 'gt40',
                // Context
                'driving', 'racing', 'car photography', 'automotive',
                'car design', 'car concept', 'car commercial',
                'garage', 'showroom', 'car show',
                // FR
                'voiture', 'voiture de sport', 'voiture ancienne',
                'automobile', 'véhicule',
            
                // ➕ AI Audit Additions (EN)
                'automotive photography', 'car render', 'automotive design', 'vehicle design', 'car commercial',
            ],
            exclude: [
                'airplane', 'aircraft', 'plane', 'jet', 'helicopter',
                'boat', 'ship', 'yacht', 'sailboat', 'vessel',
                'train', 'locomotive', 'railway',
                'spaceship', 'starship', 'spacecraft',
                'motorcycle', 'motorbike', 'bicycle', 'bike', 'vélo', 'bicyclette',
                'cable car', 'trolley car', 'box car', 'rail car',
                'shoe', 'shoes', 'chaussure', 'chaussures', 'sneaker', 'sneakers', 'flower', 'flowers', 'fleur', 'fleurs', 'tulip', 'tulips', 'tulipe', 'tulipes', 'rose', 'roses',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/cars'
        },

        aviation: {
            keywords: [
                // Generic
                'airplane', 'aircraft', 'plane', 'jet',
                'helicopter', 'chopper', 'rotorcraft',
                'fighter jet', 'fighter plane', 'military aircraft',
                'biplane', 'seaplane', 'float plane',
                'commercial airplane', 'passenger plane', 'airliner',
                'private jet', 'business jet',
                'propeller plane', 'turboprop',
                'stealth bomber', 'stealth fighter', 'bomber',
                'drone', 'uav', 'quadcopter',
                'glider', 'hang glider', 'paraglider',
                'hot air balloon', 'airship', 'zeppelin', 'blimp',
                // Brands & models
                'boeing', 'airbus', 'cessna', 'lockheed',
                'f-16', 'f-22', 'f-35', 'sr-71', 'concorde',
                'p-51 mustang', 'spitfire', 'b-52',
                // Context
                'cockpit', 'runway', 'takeoff', 'landing',
                'airport', 'aviation', 'aeronautics',
                'flying', 'in flight', 'air force',
                'aerial combat', 'dogfight',
                // FR
                'avion', 'hélicoptère', 'aéroport',
                'avion de chasse', 'avion de ligne',
                'décollage', 'atterrissage',
                'montgolfière', 'ballon dirigeable',
            
                // ➕ AI Audit Additions (EN)
                'aviation photography', 'aerospace', 'aircraft design', 'flight photography',
            ],
            exclude: [
                'car', 'ferrari', 'porsche', 'lamborghini',
                'boat', 'ship', 'yacht',
                'train', 'locomotive',
                'spaceship', 'starship',
                'drone shot', 'drone photography', 'drone view', 'drone 3d', 'drone render', 'vue de drone',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/aviation'
        },

        boats: {
            keywords: [
                // Generic
                'boat', 'ship', 'vessel', 'watercraft',
                'yacht', 'luxury yacht', 'mega yacht', 'super yacht',
                'sailboat', 'sailing boat', 'sailing ship',
                'speedboat', 'motorboat', 'powerboat',
                'fishing boat', 'trawler',
                'cruise ship', 'cruise liner', 'ocean liner',
                'cargo ship', 'container ship', 'freighter',
                'catamaran', 'trimaran',
                'kayak', 'canoe', 'rowboat', 'gondola',
                'houseboat', 'pontoon',
                'battleship', 'warship', 'destroyer', 'frigate',
                'aircraft carrier', 'submarine',
                'pirate ship', 'galleon', 'schooner', 'clipper',
                'tugboat', 'barge', 'ferry',
                'raft', 'dinghy', 'lifeboat',
                // Context
                'harbor', 'harbour', 'marina', 'port', 'dock',
                'nautical', 'maritime', 'naval',
                'sailing', 'at sea', 'on the water', 'on the ocean',
                'anchored', 'moored',
                // FR
                'bateau', 'navire', 'voilier', 'yacht',
                'paquebot', 'cargo', 'chalutier',
                'port', 'marina', 'quai',
                'barque', 'pirogue', 'catamaran',
            
                // ➕ AI Audit Additions (EN)
                'naval architecture', 'yacht design', 'marine vessel', 'maritime photography',
            ],
            exclude: [
                'car', 'ferrari', 'porsche', 'lamborghini',
                'airplane', 'aircraft', 'plane', 'jet',
                'train', 'locomotive',
                'spaceship', 'starship', 'vaisseau spatial', 'vaisseaux spatiaux', 'spacecraft', 'ovni',
                'boathouse', 'houseboat',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/boats'
        },

        trains: {
            keywords: [
                // Generic
                'train', 'locomotive', 'steam train', 'steam locomotive',
                'railway', 'railroad', 'rail',
                'bullet train', 'high speed train', 'shinkansen',
                'subway', 'metro', 'underground train',
                'tram', 'tramway', 'streetcar', 'trolley',
                'freight train', 'cargo train', 'goods train',
                'passenger train', 'express train',
                'diesel locomotive', 'electric train',
                'monorail', 'maglev',
                'vintage train', 'steam engine',
                'coal train', 'mining train',
                'model train', 'toy train',
                // Context
                'train station', 'railway station', 'platform',
                'train tracks', 'railway tracks', 'rail tracks',
                'train bridge', 'railway bridge', 'viaduct',
                'tunnel', 'train tunnel',
                'depot', 'roundhouse',
                'caboose', 'boxcar', 'rail car',
                'crossing', 'level crossing',
                // Brands
                'orient express', 'trans-siberian', 'eurostar',
                'tgv',
                // FR
                'locomotive', 'chemin de fer',
                'gare', 'quai de gare', 'voie ferrée',
                'métro', 'tramway',
                'train à vapeur', 'train à grande vitesse',
            
                // ➕ AI Audit Additions (EN)
                'railway photography', 'locomotive design',
            ],
            exclude: [
                'car', 'ferrari', 'porsche',
                'airplane', 'aircraft', 'plane',
                'boat', 'ship', 'yacht',
                'spaceship', 'starship',
                'training', 'train of thought', 'train station wagon',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/trains'
        },

        spacecraft: {
            keywords: [
                // Generic
                'spaceship', 'starship', 'spacecraft', 'space vessel',
                'space shuttle', 'rocket', 'rocket ship',
                'star destroyer', 'battle cruiser', 'space cruiser',
                'mothership', 'generation ship',
                'escape pod', 'landing craft',
                'space fighter', 'starfighter',
                'flying saucer', 'ufo',
                'space probe', 'satellite',
                'lunar module', 'lunar lander',
                'space capsule', 'command module',
                // Sci-fi brands/universes
                'millennium falcon', 'x-wing', 'tie fighter',
                'enterprise', 'uss enterprise',
                'normandy', 'serenity', 'nostromo',
                'battlestar', 'galactica',
                // Context
                'in orbit', 'orbiting', 'docking',
                'warp drive', 'hyperdrive', 'hyperspace',
                'space dock', 'space port', 'spaceport',
                'launch pad', 'launch', 'liftoff',
                're-entry', 'atmospheric entry',
                // FR
                'vaisseau spatial', 'vaisseaux spatiaux', 'vaisseau', 'vaisseaux', 'fusée', 'fusées',
                'navette spatiale', 'station spatiale',
                'soucoupe volante', 'ovni', 'ovnis',
            
                // ➕ AI Audit Additions (EN)
                'spaceship design', 'sci-fi spacecraft', 'starship design', 'spaceship exterior',
            ],
            exclude: [
                'car', 'ferrari', 'porsche',
                'airplane', 'aircraft',
                'boat', 'ship', 'yacht',
                'train', 'locomotive',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'scenes/spacecraft'
        },

        motorcycles: {
            keywords: [
                // Generic
                'motorcycle', 'motorbike', 'bike', 'chopper',
                'scooter', 'moped', 'vespa',
                'sport bike', 'sportbike', 'superbike',
                'cruiser motorcycle', 'touring motorcycle',
                'dirt bike', 'motocross', 'enduro',
                'cafe racer', 'bobber', 'scrambler',
                'custom motorcycle', 'custom bike',
                'electric motorcycle', 'e-bike',
                'sidecar', 'trike',
                'vintage motorcycle', 'classic motorcycle',
                // Brands
                'harley davidson', 'harley', 'ducati', 'yamaha',
                'kawasaki', 'honda cb', 'suzuki', 'triumph',
                'ktm', 'bmw motorrad', 'indian motorcycle',
                'royal enfield', 'aprilia', 'mv agusta',
                // Context
                'biker', 'rider', 'motorcyclist',
                'wheelie', 'stunt',
                // FR
                'moto', 'motocyclette', 'scooter',
                'motard', 'motocross',
            
                // ➕ AI Audit Additions (EN)
                'motorcycle photography', 'motorcycle design', 'custom motorcycle build',
            ],
            exclude: [
                'car', 'ferrari', 'porsche',
                'airplane', 'aircraft',
                'boat', 'ship',
                'train', 'locomotive',
                'bicycle', 'mountain bike', 'cycling', 'vélo', 'bicyclette', 'vtt',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/motorcycles'
        },

        // ═══════════════════════════════════════════════════════
        //  🍔 OBJECTS & PRODUCTS
        // ═══════════════════════════════════════════════════════

        food_drink: {
            keywords: [
                'food', 'dish', 'meal', 'recipe', 'platter',
                'coffee', 'tea', 'cocktail', 'wine', 'beer', 'whiskey',
                'cake', 'bread', 'chocolate', 'ice cream', 'dessert', 'pastry',
                'sushi', 'ramen', 'pizza', 'burger', 'pasta', 'steak',
                'fruit', 'restaurant', 'cuisine', 'gourmet', 'culinary',
                'food photography', 'food styling', 'food editorial',
                'breakfast', 'brunch', 'lunch', 'dinner',
                'cheese', 'salad', 'sandwich', 'wrap', 'taco',
                'donut', 'croissant', 'macaron', 'muffin', 'cookie',
                'smoothie', 'milkshake', 'latte', 'cappuccino', 'espresso',
                'wine glass', 'champagne', 'cocktail glass',
                // FR
                'nourriture', 'gastronomie', 'pâtisserie',
                'boulangerie', 'fromage',
            
                // ➕ AI Audit Additions (EN)
                'food styling', 'culinary photography', 'gourmet photography', 'food editorial', 'mouth-watering', 'appetizing', 'food porn',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/food'
        },

        products: {
            keywords: [
                'product photography', 'product shot', 'product design',
                'packaging design', 'bottle design', 'can design',
                'cosmetics', 'perfume bottle', 'skincare', 'makeup',
                'luxury watch', 'wristwatch',
                'tech product', 'headphones', 'gadget', 'earbuds',
                'jewelry photography', 'jewelry design', 'jewellery',
                'ring design', 'necklace design', 'bracelet design',
                'advertisement', 'commercial shot', 'ad campaign',
                'sunglasses', 'eyewear', 'fashion accessory',
                'handbag', 'purse', 'wallet', 'leather goods',
                'luxury product', 'premium product',
                'smartphone', 'laptop', 'tablet',
                'furniture design', 'lamp design', 'chair design',
                // FR
                'produit', 'publicité', 'bijou', 'montre',
                'parfum', 'cosmétique',
            
                // ➕ AI Audit Additions (EN)
                'product photography', 'commercial product photography', 'product mockup', 'product render', 'industrial design', 'studio lighting for product', 'macro product shot',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/products'
        },

        shoes: {
            keywords: [
                'shoe', 'sneaker', 'boots', 'footwear', 'high heels', 'sandals',
                'running shoes', 'athletic shoes', 'cleats', 'loafers', 'shoe design',
                // FR
                'chaussure', 'baskets', 'bottes', 'talons', 'chaussures', 'sneakers',
            
                // ➕ AI Audit Additions (EN)
                'footwear design', 'shoe photography', 'sneakerhead',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/shoes'
        },

        bicycles: {
            keywords: [
                'bicycle', 'bike', 'cycling', 'mountain bike', 'bmx',
                'ebike', 'e-bike', 'electric bicycle', 'tricycle',
                // FR
                'vélo', 'bicyclette', 'vtt', 'cyclisme',
            
                // ➕ AI Audit Additions (EN)
                'bicycle design', 'cycling photography',
            ],
            exclude: [
                'motorcycle', 'motorbike', 'dirt bike', 'motor',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'objects/bicycles'
        },

        // ═══════════════════════════════════════════════════════
        //  🐾 NATURE & ANIMALS
        // ═══════════════════════════════════════════════════════

        animals: {
            keywords: [
                // EN — Mammals
                'cat', 'dog', 'horse', 'wolf', 'fox',
                'lion', 'tiger', 'bear', 'deer', 'elk', 'moose',
                'leopard', 'cheetah', 'panther', 'jaguar',
                'elephant', 'giraffe', 'zebra', 'rhino', 'hippo',
                'monkey', 'gorilla', 'orangutan', 'chimpanzee',
                'rabbit', 'hare', 'hamster', 'guinea pig',
                'raccoon', 'squirrel', 'hedgehog', 'otter',
                'panda', 'koala', 'kangaroo', 'platypus',
                'bat', 'mole', 'weasel', 'ferret', 'badger',
                'bison', 'buffalo', 'ram', 'goat', 'sheep',
                // EN — Birds
                'bird', 'eagle', 'owl', 'hawk', 'falcon',
                'kingfisher', 'hummingbird', 'parrot', 'toucan',
                'peacock', 'flamingo', 'crane', 'heron',
                'robin', 'sparrow', 'woodpecker', 'crow', 'raven',
                'penguin', 'puffin', 'pelican', 'albatross',
                // EN — Reptiles & Amphibians
                'snake', 'lizard', 'chameleon', 'iguana', 'gecko',
                'turtle', 'tortoise', 'crocodile', 'alligator',
                'frog', 'toad', 'salamander', 'axolotl',
                'komodo dragon',
                // EN — Marine (not underwater scenes)
                'whale', 'dolphin', 'fish', 'shark',
                'sea turtle', 'starfish', 'stingray', 'manta ray',
                'seal', 'sea lion', 'walrus', 'manatee',
                'clownfish', 'koi', 'goldfish', 'betta fish',
                // EN — Insects & Arachnids
                'butterfly', 'moth', 'dragonfly', 'ladybug',
                'bee', 'wasp', 'ant', 'beetle', 'grasshopper',
                'spider', 'scorpion', 'praying mantis',
                'caterpillar', 'firefly', 'cicada',
                // EN — Mythical/Fantasy Animals
                'dragon', 'mythical creature', 'phoenix',
                'unicorn', 'griffin', 'pegasus', 'hydra',
                'cerberus', 'chimera', 'basilisk',
                // EN — General
                'wildlife', 'animal', 'puppy', 'kitten',
                'cub', 'pup', 'foal', 'calf', 'fawn',
                'pet', 'domestic animal', 'wild animal',
                'insect', 'arachnid', 'crustacean',
                'butterfly wings', 'monarch butterfly',
                // FR
                'chat', 'chien', 'oiseau', 'cheval', 'loup',
                'cerf', 'renard', 'aigle', 'hibou', 'papillon',
                'tortue', 'baleine', 'dauphin', 'requin',
                'martin-pêcheur', 'perroquet', 'colibri',
                'serpent', 'grenouille', 'araignée',
                'lapin', 'écureuil', 'hérisson', 'loutre',
                'singe', 'éléphant', 'girafe', 'zèbre',
            
                // ➕ AI Audit Additions (EN)
                'wildlife photography', 'animal portrait', 'animal photography', 'nature documentary', 'national geographic photography', 'macro insect photography',
            ],
            priority: 'subject',
            minScore: 1,
            folder: 'nature/animals'
        },

        flora: {
            keywords: [
                'flower', 'flowers', 'floral', 'bouquet',
                'rose', 'roses', 'tulip', 'tulips', 'orchid', 'orchids', 'lotus', 'sunflower', 'sunflowers',
                'botanical', 'botanical illustration', 'botanical art',
                'cherry blossom', 'sakura', 'lavender',
                'mushroom', 'wildflower', 'daisy', 'peony',
                'lily', 'dahlia', 'carnation', 'jasmine', 'magnolia',
                'hibiscus', 'iris', 'poppy', 'chrysanthemum',
                'succulent', 'cactus', 'bonsai', 'fern',
                'floral arrangement',
                'wreath', 'garland', 'flower arrangement',
                'dried flowers', 'pressed flowers', 'flower crown',
                'vine', 'ivy', 'moss', 'lichen',
                'tree', 'oak tree', 'willow tree', 'baobab',
                'autumn leaves', 'falling leaves', 'maple leaf',
                // FR
                'fleur', 'fleurs', 'bouquet',
                'rose', 'roses', 'tulipe', 'tulipes', 'orchidée', 'orchidées', 'tournesol', 'tournesols',
                'champignon', 'champignons', 'coquelicot', 'coquelicots', 'pivoine', 'pivoines',
                'cerisier', 'cerisiers', 'arbre', 'arbres', 'feuilles', 'feuille', 'plante', 'plantes',
            
                // ➕ AI Audit Additions (EN)
                'macro flower photography', 'floral design', 'botanical garden', 'plant photography', 'houseplant',
            ],
            exclude: ['motif', 'motifs', 'motif floral', 'motifs floraux', 'floral print', 'floral pattern', 'floral dress', 'robe à fleurs', 'fleurs imprimées', 'rose poudré', 'rose pâle', 'rose tendre', 'tons rose', 'teinte rose', 'les couleurs roses', 'pearl, rose', 'rose, teal', 'pink and lavender', 'lavender hair', 'rose gold', 'dusty rose'],
            priority: 'subject',
            minScore: 1,
            folder: 'nature/flora'
        },

        // ═══════════════════════════════════════════════════════
        //  🎨 STYLES & AESTHETICS
        // ═══════════════════════════════════════════════════════

        dark_moody: {
            keywords: [
                'dark moody', 'noir', 'gothic', 'dark gothic',
                'dark fantasy', 'dark art', 'sinister',
                'ominous', 'gloomy', 'horror', 'macabre',
                'chiaroscuro', 'low key lighting', 'low key',
                'dark cinematic', 'dark atmosphere', 'dark tone',
                'eerie', 'haunting', 'creepy', 'spooky',
                'shadows', 'shadowy', 'tenebrous',
                'grim', 'foreboding', 'menacing',
                'dark academia', 'gothic architecture',
                'skull', 'skeleton', 'death',
                // FR
                'sombre', 'gothique', 'horreur', 'macabre',
                'ténébreux', 'lugubre',
            
                // ➕ AI Audit Additions (EN)
                'grimdark', 'eldritch', 'lovecraftian', 'dark aesthetic', 'gothic aesthetic', 'moody lighting', 'melancholic',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/dark-moody'
        },

        neon_cyberpunk: {
            keywords: [
                'neon', 'cyberpunk', 'neon lights',
                'neon sign', 'neon glow', 'neon city',
                'blade runner', 'synthwave', 'vaporwave',
                'retrowave', 'outrun', 'tron',
                'hologram', 'holographic',
                'neon colors', 'neon pink', 'neon blue',
                'night city', 'rain neon', 'wet street neon',
                'tech noir', 'neo tokyo',
                'glitch art', 'digital glitch',
                'led lights', 'rgb lighting',
                // FR
                'néon', 'néons',
            
                // ➕ AI Audit Additions (EN)
                'cyberpunk aesthetic', 'neon lights reflection', 'futuristic city street', 'synthwave aesthetic', 'cyberpunk character',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/neon-cyberpunk'
        },

        vintage_retro: {
            keywords: [
                'vintage', 'retro', 'nostalgic', 'nostalgia',
                '1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s',
                'old-school', 'antique', 'classic film',
                'film grain', 'kodak', 'polaroid', 'analog',
                'art deco', 'mid century', 'mid-century modern', 'victorian',
                'retro futurism', 'atomic age',
                'old photograph', 'sepia', 'daguerreotype',
                'pin-up', 'diner', 'jukebox', 'vinyl record',
                'typewriter', 'rotary phone',
                'belle epoque', 'edwardian', 'roaring twenties',
                // FR
                'rétro', 'ancien', 'vintage',
            
                // ➕ AI Audit Additions (EN)
                'vintage aesthetic', 'retro aesthetic', '70s aesthetic', '80s aesthetic', '90s aesthetic', 'nostalgic vibe', 'polaroid aesthetic',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/vintage-retro'
        },

        surreal_fantasy: {
            keywords: [
                'surreal', 'surrealism', 'dreamlike', 'dreamscape',
                'ethereal', 'otherworldly', 'magical',
                'fantasy', 'enchanted', 'mystical',
                'psychedelic', 'trippy', 'visionary',
                'fairy tale', 'mythological', 'legendary',
                'impossible architecture', 'impossible geometry',
                'floating islands', 'floating objects',
                'dream world', 'fantasy world',
                'magical realism', 'whimsical', 'fantastical',
                'enchanted forest', 'magical forest',
                'portal', 'dimension', 'multiverse',
                'dali', 'magritte', 'escher',
                // FR
                'surréaliste', 'onirique', 'féerique', 'magique',
                'fantastique', 'merveilleux',
            
                // ➕ AI Audit Additions (EN)
                'surrealism', 'bizarre', 'dreamcore', 'fantasy concept art', 'mythological scene', 'ethereal atmosphere', 'magical realism',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/surreal-fantasy'
        },

        minimalist: {
            keywords: [
                'minimalist design', 'minimalist composition',
                'minimalist art', 'minimalist poster',
                'minimalist illustration', 'minimalist photography',
                'minimalist style', 'minimalist aesthetic',
                'minimal composition', 'negative space',
                'clean composition', 'simple composition',
                'white space', 'blank space',
                'minimal', 'sparse', 'understated',
                'less is more', 'simplicity',
                'flat design', 'flat illustration',
                // FR
                'minimaliste', 'épuré', 'sobre',
            
                // ➕ AI Audit Additions (EN)
                'minimalist aesthetic', 'clean lines', 'uncluttered', 'minimalist architecture', 'minimalist photography',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/minimalist'
        },

        cinematic: {
            keywords: [
                'cinematic', 'ultra-realistic', 'cinematic close-up', 'cinematic lighting', 'movie still',
                'film still', 'cinematic shot', 'blockbuster',
                'dramatic lighting', 'dso', 'anamorphic', 'anamorphic lens',
                'volumetric lighting', 'cinematography',
                'epic composition', 'hollywood',
                'cinematic color grading', 'cinematic tone',
                'widescreen', 'letterbox', '2.39:1',
                'film noir', 'neo noir',
                'movie poster', 'film poster',
                'behind the scenes', 'on set',
                'roger deakins', 'denis villeneuve',
                // FR
                'cinématique', 'cinématographique', 'ultra-réaliste', "digne d'un film",
            
                // ➕ AI Audit Additions (EN)
                'cinematic composition', 'epic cinematography', 'color grading', 'screengrab from a movie', 'dramatic scene', 'cinematic lighting setup', 'movie director style', 'film grain',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/cinematic'
        },

        futuristic: {
            keywords: [
                'futuristic', 'sci-fi', 'science fiction', 'future',
                'hi-tech', 'high tech', 'cyber', 'mech', 'mecha',
                'advanced technology', 'space age', 'futurism',
                'utopian', 'dystopian', 'post-apocalyptic',
                'cybernetic', 'biomechanical', 'techno-organic',
                'nano technology', 'quantum',
                'ai robot', 'artificial intelligence',
                'holographic display', 'heads up display',
                'power armor', 'exosuit', 'exoskeleton',
                'megastructure', 'dyson sphere',
                // FR
                'futuriste', 'science-fiction',
                'post-apocalyptique', 'dystopique',
            
                // ➕ AI Audit Additions (EN)
                'futuristic design', 'sci-fi concept art', 'futuristic architecture', 'post-apocalyptic scene', 'cybernetics',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/futuristic'
        },

        japanese: {
            keywords: [
                'japanese', 'japan', 'tokyo', 'kyoto', 'osaka',
                'samurai', 'ninja', 'geisha', 'shogun', 'ronin',
                'shinto', 'torii gate', 'sakura', 'cherry blossom',
                'anime style', 'manga style', 'ukiyo-e',
                'japanese architecture', 'japanese ink', 'sumi-e',
                'japanese garden', 'zen garden', 'rock garden',
                'kimono', 'yukata', 'hakama',
                'katana', 'tanto', 'wakizashi',
                'noh mask', 'kabuki', 'oni',
                'ramen shop', 'izakaya', 'bento',
                'mount fuji', 'bamboo forest',
                'koi pond', 'wabi-sabi',
                'shoji screen', 'tatami',
                // FR
                'japonais', 'japon',
            
                // ➕ AI Audit Additions (EN)
                'japanese aesthetic', 'neo-tokyo', 'japanese culture', 'kawaii', 'traditional japanese',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/japanese'
        },

        abstract: {
            keywords: [
                'abstract art', 'abstract painting',
                'abstract composition', 'geometric abstract',
                'abstract', 'geometric',
                'color field', 'expressionism', 'abstract expressionism',
                'generative art', 'mathematical art', 'algorithmic art',
                'fractal', 'kaleidoscope', 'mandala',
                'pattern', 'shapes', 'geometric shapes',
                'fluid art', 'liquid art', 'marble art',
                'splatter', 'paint splash', 'ink splash',
                'mondrian', 'kandinsky', 'pollock',
                'op art', 'kinetic art',
                'color theory', 'complementary colors',
                // FR
                'abstrait', 'géométrique', 'fractale',
            
                // ➕ AI Audit Additions (EN)
                'abstract expressionism', 'generative algorithm', 'fluid dynamics', 'abstract painting',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'styles/abstract'
        },

        // ═══════════════════════════════════════════════════════
        //  🖌️ MEDIUMS & TECHNIQUES
        // ═══════════════════════════════════════════════════════

        illustration: {
            keywords: [
                'illustration', 'illustrated',
                'sketch', 'ink drawing', 'pencil drawing', 'pen drawing',
                'watercolor painting', 'watercolour', 'oil painting', 'acrylic painting',
                'digital painting', 'digital art', 'concept art',
                'anime', 'manga', 'comic', 'cartoon',
                'childrens book', 'storybook', 'picture book',
                'hand drawn', 'line art', 'woodcut', 'linocut',
                'engraving', 'etching', 'lithograph',
                'gouache', 'tempera', 'pastel',
                'ink wash', 'charcoal drawing', 'graphite',
                'stained glass style', 'mosaic style',
                'book illustration', 'editorial illustration',
                'vector illustration', 'flat illustration',
                // FR
                'illustration', 'dessin', 'aquarelle',
                'peinture', 'bande dessinée',
            
                // ➕ AI Audit Additions (EN)
                'digital illustration', 'vector art', '2d art', 'flat coloring', 'childrens book illustration', 'concept art illustration', 'comic book style',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'mediums/illustration'
        },

        render_3d: {
            keywords: [
                '3d render', '3d rendering', 'cinema 4d', 'c4d',
                'blender', 'octane render', 'unreal engine',
                '3d art', '3d illustration', '3d model', '3d scene',
                'clay render', 'isometric', 'voxel',
                'low poly', 'cgi', 'pixar style',
                'redshift', 'v-ray', 'arnold render',
                'substance painter', 'zbrush',
                'wireframe', 'polygonal', 'mesh',
                '3d character', '3d environment',
                'motion graphics', 'motion design',
                'product render', 'architectural render',
                // FR
                'rendu 3d', 'modélisation 3d',
            
                // ➕ AI Audit Additions (EN)
                'unreal engine 5', 'ue5', 'ray tracing', 'path tracing', 'global illumination', 'cgi render', 'octane render 3d', 'zbrush sculpt',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'mediums/3d-render'
        },

        graphic_design: {
            keywords: [
                'poster design', 'poster', 'graphic design',
                'typography', 'lettering', 'calligraphy', 'typeface',
                'logo design', 'branding', 'icon design', 'brand identity',
                'album cover', 'book cover', 'magazine cover', 'cd cover',
                'infographic', 'stamp design', 'postage stamp',
                'bauhaus', 'swiss design', 'international typographic style',
                'packaging', 'label design', 'sticker design',
                'business card', 'flyer design', 'brochure',
                'ui design', 'web design', 'app design',
                'motion poster', 'animated poster',
                't-shirt design', 'merch design',
                // FR
                'affiche', 'typographie', 'graphisme',
                'design graphique', 'identité visuelle',
            
                // ➕ AI Audit Additions (EN)
                'vector graphic', 'typographic design', 'visual identity', 'brand guideline',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'mediums/graphic-design'
        },

        photography: {
            keywords: [
                'photograph', 'photography', 'photo', 'shot on',
                '35mm', 'medium format', 'large format',
                'kodak portra', 'fujifilm', 'cinestill',
                'leica', 'nikon', 'canon', 'sony', 'hasselblad',
                'film photography', 'analog photography',
                'street photography', 'documentary photography',
                'editorial photography', 'commercial photography',
                'bokeh', 'shallow depth of field', 'aperture',
                'wide aperture', 'low key lighting',
                'macro photography', 'close-up photography',
                'long exposure', 'double exposure', 'multiple exposure',
                'tilt-shift', 'fisheye', 'wide angle',
                'black and white photography', 'monochrome',
                'golden ratio', 'rule of thirds',
                'high contrast', 'high dynamic range', 'hdr',
                'f/1.4', 'f/1.8', 'f/2.8', '85mm', '50mm', '24mm',
                'dslr', 'mirrorless',
                // FR
                'photographie', 'photographe',
                'appareil photo', 'objectif', 'profondeur de champ',
            
                // ➕ AI Audit Additions (EN)
                'telephoto lens', 'macro lens', 'wide angle lens', 'f/1.4', 'shutter speed', 'iso 800', 'cinestill 800t', 'kodak gold', 'fujifilm superia', 'film grain', 'disposable camera effect', 'polaroid style', 'flash photography', 'studio lighting',
            ],
            priority: 'style',
            minScore: 1,
            folder: 'mediums/photography'
        },
    },

    // ── Browser Settings ──────────────────────────────────────
    headless: false,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};
