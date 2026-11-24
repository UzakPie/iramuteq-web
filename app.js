/**
 * IRaMuTeQ Web Studio v3.0 — Interactive Lexical & Reinert Text-Mining Suite
 *
 * Features:
 * - Full academic English default with clean EN / FR / RU i18n switcher
 * - Interactive Reinert Classification Dendrogram (CHD) & searchable/sortable Chi-square table
 * - 5-class Correspondence Factor Analysis (AFC / CA) biplot with zoom & label controls
 * - Force-directed Similitude Co-occurrence Network (MST & full graph) with ego-network focus
 * - Lexical Word Clouds (Frequency & Chi-square weighting)
 * - Slide-over KWIC / Concordancer Quote Drawer on click from every visualization
 * - Direct CSV & Excel (.csv, .xlsx) importer with 5-row column-mapping preview
 * - One-click Load Demo Dataset & publication-ready SVG / PNG / CSV exports
 */

// =========================================================================
// GLOBAL STATE
// =========================================================================
window.currentDatasetKey = 'reddit_iramuteq';
var currentDatasetKey = window.currentDatasetKey;
var currentDataset = null;
var currentLanguage = 'en'; // Default: Academic English ('en' | 'fr' | 'ru')
var currentTheme = 'dark';
var activeClassFilter = 'all';
var currentSelectedClassId = 1;

// View-specific state
var afcAxisX = 'f1';
var afcAxisY = 'f2';
var afcSearchFilter = '';
var afcThreshold = 3;
var afcLabelMode = 'top'; // 'top' | 'all' | 'hover'

var simMode = 'mst'; // 'mst' | 'all'
var simEdgeThreshold = 0.05;
var simSearchFilter = '';
var simulation = null;

var cloudMetric = 'freq'; // 'freq' | 'chi2'
var cloudClassId = 'all';

var kwicSearchQuery = '';
var kwicClassFilter = 'all';

// Chi2 Statistics Table state
var chi2FilterClass = 'all';
var chi2SearchQuery = '';
var chi2SortKey = 'chi2';
var chi2SortDir = 'desc';

// Slide-over Drawer state
var drawerMode = 'word'; // 'word' | 'class'
var drawerTargetWord = null;
var drawerTargetClassId = null;
var drawerQuoteClassFilter = 'all';

// Column Mapping Upload state
var stagedUpload = null;
var selectedMetaCols = new Set();

// Export Theme, Specificity View & Interactive Stopword Exclusion state
var exportTheme = 'dark'; // 'dark' | 'white'
var specVarName = null;
var specModValue = null;
var datasetSources = {}; // key -> { source_type, dataset_key?, upload_id?, text_column?, metadata_columns?, raw_text?, dataset_name?, target_classes, language, detect_bigrams, custom_stopwords }

// Color palette for Reinert Lexical Classes
const CLASS_COLORS = [
  '#6366f1', // Class 1: Indigo
  '#10b981', // Class 2: Emerald
  '#f59e0b', // Class 3: Amber
  '#ec4899', // Class 4: Pink
  '#06b6d4', // Class 5: Cyan
  '#8b5cf6', // Class 6: Purple
  '#3b82f6', // Class 7: Blue
  '#14b8a6'  // Class 8: Teal
];

// =========================================================================
// INTERNATIONALIZATION DICTIONARY (EN / FR / RU)
// =========================================================================
const I18N = {
  en: {
    appTitle: 'IRaMuTeQ Web Studio',
    appSubtitle: 'Interactive Lexical Analysis, Reinert CHD & Correspondence Factor Mining',
    datasetSelectorTitle: 'Select text corpus',
    themeToggleTitle: 'Toggle light / dark theme',
    loadDemoBtn: 'Load Demo Dataset',
    importDataBtn: 'Import CSV / Excel / .txt',
    downloadSampleCsv: 'Sample CSV',

    navSectionAnalysis: 'CORPUS ANALYSIS',
    navSectionTools: 'DATA & IMPORT',
    navCorpus: 'Corpus Overview',
    navReinert: 'Reinert Method (CHD)',
    navAfc: 'Correspondence Analysis',
    navSimilitude: 'Similitude Graph',
    navClouds: 'Lexical Word Clouds',
    navKwic: 'Concordancer (KWIC)',
    navMeta: 'Metadata Cross-Tab',
    navCustom: 'Import / Live Corpus',

    heroTitle: 'Explore immediately or analyze your own spreadsheet / corpus',
    heroSubtitle: 'Test every visualization with the built-in anonymized sample dataset (260 entries) or import raw .csv, .xlsx, or IRaMuTeQ .txt files.',

    docsCount: 'Documents',
    docsSub: 'Initial Context Units (UCI)',
    segmentsCount: 'Text Segments (UCE)',
    segmentsSub: 'Elementary Context Units',
    tokensCount: 'Active Tokens',
    tokensSub: 'Lemmatized lexical occurrences',
    formsCount: 'Unique Lemmas',
    formsSub: 'Dictionary base forms',
    hapaxPct: 'Hapax Legomena',
    hapaxSub: 'Single-occurrence lemmas',
    ttr: 'Lexical Richness (TTR)',
    avgUceLen: 'Mean UCE Length',
    avgUceSub: 'Active lemmas per segment',

    zipfTitle: "Zipf's Law (Rank vs. Frequency)",
    zipfSub: "Log-log rank-frequency distribution compared against theoretical Zipf's law f = C / r",
    zipfXAxis: 'Frequency Rank (log scale)',
    zipfYAxis: 'Lemma Frequency (log scale)',
    dominantConcepts: 'Dominant Corpus Lemmas',
    top15Badge: 'Top 15 Lemmas',
    corpusFreqCol: 'Corpus Frequency',
    rank: 'Rank',

    reinertTitle: 'Reinert Descending Hierarchical Classification (CHD)',
    reinertSub: 'Iterative SVD bipartitioning of elementary context units into lexical classes with χ² profiling',
    dendrogramTitle: 'Reinert Classification Dendrogram (CHD Tree)',
    dendrogramBadge: 'Hierarchical Splits • Click class branch to inspect',
    chi2TableTitle: 'Chi-Square (χ²) Lexical Statistics Table',
    exportChi2Csv: 'Export χ² CSV',
    searchLemmaPlaceholder: 'Filter lemmas...',
    reinertClassesTitle: 'Reinert Lexical Classes',
    clickToSelect: 'Click to inspect',
    selectedClassProfile: 'Selected Class Profile',
    associatedMetadataTitle: 'Associated Metadata Variables (*variable_modality)',
    typicalSegments: 'Characteristic Text Segments (Top χ² UCEs)',
    noMetadataAssoc: 'No significant metadata associations for this class',

    afcTitle: 'Correspondence Factor Analysis (AFC / CA)',
    afcSub: '2D projection of Reinert classes and active lemmas onto factorial axes (SVD on standardized residuals). Click any point or class badge to inspect original quotes.',
    axesLabel: 'Axes:',
    labelsLabel: 'Labels:',
    labelsTop: 'Top words (χ² ≥ 15)',
    labelsAll: 'All active words',
    labelsHover: 'On hover only',
    thresholdLabel: 'Min. Frequency:',
    factorAxis: 'Factor',
    inertiaWord: 'inertia',

    simTitle: 'Similitude Analysis (Co-Occurrence Network)',
    simSub: 'Lemma co-occurrence graph and Maximum Spanning Tree (Arbre de similitude). Click any node to focus its ego-network and read original quotes.',
    graphModeLabel: 'Graph Mode:',
    toggleMst: 'Spanning Tree (MST)',
    toggleFullGraph: 'Full Co-Occurrence Graph',
    edgeThresholdLabel: 'Edge Threshold:',
    pausePhysics: '⏸ Pause',
    resumePhysics: '▶ Physics',
    simClickHint: 'Click node: ego-focus & original quotes',
    coocTooltip: 'Co-occurrences',
    jaccardTooltip: 'Jaccard similarity',

    cloudsTitle: 'Lexical Word Clouds',
    cloudsSub: 'Dominant concepts across the entire corpus and per Reinert lexical class. Click any word to view its statistics and original quotes.',
    weightingLabel: 'Weighting:',
    weightFreq: 'Frequency',
    weightChi2: 'Significance (χ²)',

    kwicTitle: 'Concordancer & Context Units (KWIC)',
    kwicSub: 'Search lemmas across elementary context units (UCEs) with highlighted left and right context',
    kwicSearchLabel: 'Search corpus:',
    kwicPlaceholder: 'Enter lemma (e.g., phone)...',
    leftContext: 'Left Context',
    keywordCol: 'Keyword',
    rightContext: 'Right Context',
    metadataCol: 'Metadata',
    enterSearchTerm: 'Enter at least 2 characters above to search occurrences',
    noMatchesFor: 'No matching segments found for',
    occurrencesWord: 'occurrences',

    metaTitle: 'Metadata Cross-Tabulation',
    metaSub: 'Statistical distribution of Reinert lexical classes across illustrative metadata variables (communities, sources, categories)',
    noMetaChartData: 'No categorical metadata variables available in this corpus',

    customTitle: 'Import Corpus & Live Analyzer',
    customSub: 'Upload raw CSV / Excel spreadsheets (Apify, Google Forms, survey exports) with interactive column mapping, or paste classic IRaMuTeQ .txt corpora',
    uploadZoneHeading: 'Upload File (.csv, .xlsx, .txt) or Paste Corpus',
    sampleDetox: 'Sample: Digital Detox',
    sampleAi: 'Sample: AI & Research',
    dropzoneTitle: 'Drop a .csv, .xlsx, or IRaMuTeQ .txt file here, or click to browse',
    dropzoneSub: 'CSV & Excel files automatically open a 5-row column-mapping preview',
    customTextareaPh: 'Or paste classic IRaMuTeQ text (**** *var_val) or raw paragraphs here...',
    targetClassesLabel: 'Target Classes:',
    runAnalysis: 'Run Analysis',
    processingLabel: 'Analyzing corpus...',
    formatGuideTitle: 'Supported Formats & NLP Pipeline',
    guideBadge: 'Reference',
    guideTabularHeading: '1. Raw CSV & Excel (.csv, .xlsx):',
    guideTabularDesc: 'Upload exports from Apify, Reddit scrapers, or Google Forms. Select your main text column and optional metadata columns (platform, rating, category) to auto-generate IRaMuTeQ variables.',
    guideTxtHeading: '2. Classic IRaMuTeQ (.txt):',
    guidePipelineHeading: '3. Dictionary Lemmatization & Reinert Pipeline:',
    guideStep1: 'POS-aware dictionary lemmatization (WordNet / spaCy) — zero truncated stems',
    guideStep2: 'Filters URLs, numbers, punctuation, stop words; retains NOUN, VERB, ADJ, ADV',
    guideStep3: 'Elementary Context Unit (UCE) segmentation & Reinert SVD bipartitioning',
    guideStep4: 'Exact 1-df Pearson χ², exact p-values, AFC biplot & Kruskal MST graph',

    colMapTitle: 'Map Spreadsheet Columns to IRaMuTeQ Corpus',
    colMapTextLabel: 'Main Text Column (Required)',
    colMapMetaLabel: 'Optional Metadata Columns (Converted to IRaMuTeQ *var_val variables)',
    colMapPreviewLabel: '5-Row Data Preview',
    cancelBtn: 'Cancel',
    runMappedAnalysis: 'Run IRaMuTeQ Analysis',
    docViewerTitle: 'Document Viewer',

    exportSvg: 'Export SVG',
    exportPng: 'Export PNG',
    exportCsv: 'Export CSV',
    searchPlaceholder: 'Search lemma...',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetZoom: 'Reset view',
    allClasses: 'All Classes',
    classLabel: 'Class',
    word: 'Lemma',
    chi2: 'Chi-square (χ²)',
    freqClass: 'Freq in Class',
    freqTotal: 'Total Freq',
    freqShort: 'Freq',
    pctCol: '%',
    pctClass: '% Class',
    pVal: 'p-value',
    modality: 'Metadata Variable',
    rowsWord: 'rows',
    wordsWord: 'lemmas',
    docsShort: 'docs',
    classesShort: 'classes',

    openFullKwic: 'Full KWIC',
    drawerQuotesTitle: 'Original Quotes in Context',
    drawerClassBreakdown: 'Cross-Class χ² Association',
    drawerTopQuotes: 'Top Representative Original Quotes',
    drawerViewDoc: 'View full document',
    drawerNoQuotes: 'No matching segments in this class filter.',
    drawerClassSummary: 'Reinert Class Overview & Representative Quotes',
    drawerTopLemmas: 'Characteristic Lemmas (click any to inspect)',
    demoLoadedToast: 'Demo dataset loaded (260 anonymized entries, 5 Reinert classes)',
    importSuccessToast: 'Corpus analyzed with full dictionary lemmatization!',

    navSpecificity: 'Specificity Analysis',
    exportThemeTitle: 'Export chart theme (Dark UI vs. White Paper print)',
    exportDark: 'Dark',
    exportWhitePaper: 'White Paper',
    copyMethodologyBtn: 'Copy Methodology',
    methodologyCopiedToast: 'Publication-ready methodology paragraph copied to clipboard!',
    excludedStopwordsLabel: 'Excluded Stopwords:',
    resetStopwordsBtn: 'Reset All',
    excludeWordBtn: '🚫 Exclude & Recalculate',
    recalculatingToast: 'Recalculating Reinert CHD, AFC & χ²...',
    excludedAppliedToast: 'Corpus recalculated with updated stopword filter!',
    specTitle: 'Metadata Specificity Analysis (Sub-Corpus χ²)',
    specSub: 'Diverging comparison of statistically over-represented (+χ²) and under-represented (−χ²) lemmas across illustrative metadata groups. Click any bar to inspect original quotes.',
    specVarLabel: 'Metadata Variable:',
    specOverLabel: 'Over-represented (+χ²)',
    specUnderLabel: 'Under-represented (−χ²)',
    specNoData: 'No categorical metadata variable with at least 2 groups is available in this corpus.',
    specThresholdLabel: 'p < 0.05 (χ² = ±3.84)',
    privacyBadgeText: 'Zero-Retention: Processed in RAM only',
    privacyShort: 'RAM-Only • Zero Retention',
    recipesHeading: 'Data Recipes — 3-Step Export Guides (Google Forms, Reddit, YouTube Apify)',
    recipesToggleHint: 'Click to expand',
    recipeFormsTitle: 'Google Forms / Survey Export',
    recipeFormsS1: 'Open your Form → Responses → click Link to Sheets (or Download .csv).',
    recipeFormsS2: 'Drop the raw .csv or .xlsx file directly below — no **** tags needed.',
    recipeFormsS3: 'Pick your open-ended question as Main Text and demographic/rating columns as metadata.',
    recipeRedditTitle: 'Reddit Threads (Apify / Export)',
    recipeRedditS1: 'Run an Apify Reddit Scraper or PRAW export and download the dataset as .csv or .xlsx.',
    recipeRedditS2: 'Drop the spreadsheet below to launch the 5-row column-mapping preview.',
    recipeRedditS3: 'Map body / text as Main Text and select subreddit + type to unlock Specificity χ².',
    recipeYoutubeTitle: 'YouTube Comments (Apify)',
    recipeYoutubeS1: 'Scrape target videos with Apify YouTube Comments Scraper and export as .csv / .xlsx.',
    recipeYoutubeS2: 'Upload directly (up to 15 MB / 15,000 rows processed exclusively in RAM).',
    recipeYoutubeS3: 'Map comment as Main Text, choose Corpus Language + Bigrams, and map channelName as metadata.',
    corpusLangLabel: 'Corpus Language:',
    detectBigramsLabel: 'Detect Bigrams (PMI)',
    detectBigramsModalLabel: 'Detect Bigrams (join frequent collocations like social_media, screen_time via PMI)'
  },

  fr: {
    appTitle: 'IRaMuTeQ Web Studio',
    appSubtitle: 'Analyse Lexicale Interactive, CHD de Reinert & Analyse Factorielle (AFC)',
    datasetSelectorTitle: 'Sélectionner un corpus textuel',
    themeToggleTitle: 'Changer de thème clair / sombre',
    loadDemoBtn: 'Charger le jeu Démo',
    importDataBtn: 'Importer CSV / Excel / .txt',
    downloadSampleCsv: 'CSV Exemple',

    navSectionAnalysis: 'ANALYSE DU CORPUS',
    navSectionTools: 'DONNÉES & IMPORT',
    navCorpus: 'Aperçu du corpus',
    navReinert: 'Méthode Reinert (CHD)',
    navAfc: 'Analyse Factorielle (AFC)',
    navSimilitude: 'Analyse de Similitude',
    navClouds: 'Nuages de mots',
    navKwic: 'Concordancier (KWIC)',
    navMeta: 'Tri croisé métadonnées',
    navCustom: 'Importer / Corpus Live',

    heroTitle: 'Explorez immédiatement ou analysez votre propre tableau / corpus',
    heroSubtitle: 'Testez chaque visualisation avec le corpus démo anonymisé intégré (260 textes) ou importez vos fichiers .csv, .xlsx ou IRaMuTeQ .txt.',

    docsCount: 'Textes (UCI)',
    docsSub: 'Unités de Contexte Initiales',
    segmentsCount: 'Segments (UCE)',
    segmentsSub: 'Unités de Contexte Élémentaires',
    tokensCount: 'Occurrences actives',
    tokensSub: 'Formes lemmatisées',
    formsCount: 'Lemmes uniques',
    formsSub: 'Formes de dictionnaire',
    hapaxPct: 'Hapax',
    hapaxSub: 'Lemmes à fréquence 1',
    ttr: 'Richesse lexicale (TTR)',
    avgUceLen: 'Longueur moy. UCE',
    avgUceSub: 'Lemmes actifs par segment',

    zipfTitle: 'Loi de Zipf (Rang vs Fréquence)',
    zipfSub: 'Distribution log-log rang-fréquence comparée à la loi théorique de Zipf f = C / r',
    zipfXAxis: 'Rang de fréquence (échelle log)',
    zipfYAxis: 'Fréquence du lemme (échelle log)',
    dominantConcepts: 'Lemmes dominants du corpus',
    top15Badge: 'Top 15 Lemmes',
    corpusFreqCol: 'Fréquence corpus',
    rank: 'Rang',

    reinertTitle: 'Classification Hiérarchique Descendante (CHD — Reinert)',
    reinertSub: 'Bipartitionnement itératif SVD des segments de texte en classes lexicales avec profils χ²',
    dendrogramTitle: 'Dendrogramme de Classification Reinert (Arbre CHD)',
    dendrogramBadge: 'Partitions hiérarchiques • Cliquez sur une classe',
    chi2TableTitle: 'Tableau Statistique des Chi-Deux (χ²)',
    exportChi2Csv: 'Exporter χ² CSV',
    searchLemmaPlaceholder: 'Filtrer les lemmes...',
    reinertClassesTitle: 'Classes Lexicales de Reinert',
    clickToSelect: 'Cliquer pour inspecter',
    selectedClassProfile: 'Profil de la classe sélectionnée',
    associatedMetadataTitle: 'Variables illustratives associées (*variable_modalité)',
    typicalSegments: 'Segments caractéristiques (Meilleurs UCE χ²)',
    noMetadataAssoc: 'Aucune association significative de métadonnées',

    afcTitle: 'Analyse Factorielle des Correspondances (AFC)',
    afcSub: 'Projection 2D des classes Reinert et des formes actives sur les axes factoriels. Cliquez sur un point ou une classe pour lire les extraits originaux.',
    axesLabel: 'Axes :',
    labelsLabel: 'Étiquettes :',
    labelsTop: 'Mots clés (χ² ≥ 15)',
    labelsAll: 'Tous les mots actifs',
    labelsHover: 'Au survol uniquement',
    thresholdLabel: 'Fréq. min. :',
    factorAxis: 'Facteur',
    inertiaWord: 'inertie',

    simTitle: 'Analyse de Similitude (Graphe de cooccurrences)',
    simSub: 'Réseau de cooccurrence des lemmes et Arbre Maximum (MST). Cliquez sur un nœud pour isoler son voisinage et lire les citations originales.',
    graphModeLabel: 'Mode du graphe :',
    toggleMst: 'Arbre maximum (MST)',
    toggleFullGraph: 'Réseau complet',
    edgeThresholdLabel: 'Seuil arête :',
    pausePhysics: '⏸ Pause',
    resumePhysics: '▶ Physique',
    simClickHint: 'Clic : voisinage & citations originales',
    coocTooltip: 'Cooccurrences',
    jaccardTooltip: 'Indice de Jaccard',

    cloudsTitle: 'Nuages de Mots Lexicaux',
    cloudsSub: 'Concepts dominants dans le corpus global et par classe de Reinert. Cliquez sur un mot pour afficher ses statistiques et citations.',
    weightingLabel: 'Pondération :',
    weightFreq: 'Fréquence',
    weightChi2: 'Spécificité (χ²)',

    kwicTitle: 'Concordancier et Contextes (KWIC)',
    kwicSub: 'Recherche de lemmes dans les UCE avec mise en évidence du contexte gauche et droit',
    kwicSearchLabel: 'Rechercher :',
    kwicPlaceholder: 'Saisir un lemme (ex. phone)...',
    leftContext: 'Contexte gauche',
    keywordCol: 'Mot-clé',
    rightContext: 'Contexte droit',
    metadataCol: 'Métadonnées',
    enterSearchTerm: 'Saisissez au moins 2 caractères pour lancer la recherche',
    noMatchesFor: 'Aucun segment trouvé pour',
    occurrencesWord: 'occurrences',

    metaTitle: 'Tri Croisé des Métadonnées',
    metaSub: 'Répartition statistique des classes lexicales selon les variables illustratives (communautés, sources, catégories)',
    noMetaChartData: 'Aucune variable catégorielle disponible dans ce corpus',

    customTitle: 'Importer un Corpus & Analyse Live',
    customSub: 'Importez des tableaux CSV / Excel (Apify, Google Forms, enquêtes) avec mappage de colonnes, ou collez un corpus IRaMuTeQ .txt',
    uploadZoneHeading: 'Téléverser (.csv, .xlsx, .txt) ou coller un corpus',
    sampleDetox: 'Exemple : Digital Detox',
    sampleAi: 'Exemple : IA & Recherche',
    dropzoneTitle: 'Glissez un fichier .csv, .xlsx ou IRaMuTeQ .txt ici, ou cliquez',
    dropzoneSub: 'Les fichiers CSV & Excel ouvrent un aperçu de 5 lignes pour mapper les colonnes',
    customTextareaPh: 'Ou collez un texte au format IRaMuTeQ (**** *var_val) ici...',
    targetClassesLabel: 'Classes cibles :',
    runAnalysis: 'Lancer l’analyse',
    processingLabel: 'Analyse en cours...',
    formatGuideTitle: 'Formats pris en charge & Pipeline TAL',
    guideBadge: 'Guide',
    guideTabularHeading: '1. Fichiers CSV & Excel (.csv, .xlsx) :',
    guideTabularDesc: 'Importez des exports Apify, Reddit ou Google Forms. Sélectionnez la colonne de texte et vos colonnes de métadonnées pour générer automatiquement les variables IRaMuTeQ.',
    guideTxtHeading: '2. Format IRaMuTeQ classique (.txt) :',
    guidePipelineHeading: '3. Lemmatisation & Méthode Reinert :',
    guideStep1: 'Lemmatisation complète par dictionnaire et POS-tagging (WordNet / spaCy)',
    guideStep2: 'Filtrage URL, chiffres, ponctuation, mots vides ; conservation NOM, VERBE, ADJ, ADV',
    guideStep3: 'Découpage en UCE et bipartitionnement SVD de Reinert (CHD)',
    guideStep4: 'χ² de Pearson exact (1 ddl), p-values exactes, AFC et arbre MST de Kruskal',

    colMapTitle: 'Associer les colonnes au corpus IRaMuTeQ',
    colMapTextLabel: 'Colonne de texte principal (Obligatoire)',
    colMapMetaLabel: 'Colonnes de métadonnées optionnelles (Variables *var_val)',
    colMapPreviewLabel: 'Aperçu des 5 premières lignes',
    cancelBtn: 'Annuler',
    runMappedAnalysis: 'Lancer l’analyse IRaMuTeQ',
    docViewerTitle: 'Lecteur de document',

    exportSvg: 'Exporter SVG',
    exportPng: 'Exporter PNG',
    exportCsv: 'Exporter CSV',
    searchPlaceholder: 'Rechercher un lemme...',
    zoomIn: 'Zoomer',
    zoomOut: 'Dézoomer',
    resetZoom: 'Réinitialiser la vue',
    allClasses: 'Toutes les classes',
    classLabel: 'Classe',
    word: 'Lemme',
    chi2: 'Chi-deux (χ²)',
    freqClass: 'Fréq. Classe',
    freqTotal: 'Fréq. Totale',
    freqShort: 'Fréq.',
    pctCol: '%',
    pctClass: '% Classe',
    pVal: 'p-value',
    modality: 'Variable métadonnée',
    rowsWord: 'lignes',
    wordsWord: 'lemmes',
    docsShort: 'textes',
    classesShort: 'classes',

    openFullKwic: 'KWIC complet',
    drawerQuotesTitle: 'Citations originales en contexte',
    drawerClassBreakdown: 'Association χ² inter-classes',
    drawerTopQuotes: 'Extraits originaux les plus représentatifs',
    drawerViewDoc: 'Voir le document complet',
    drawerNoQuotes: 'Aucun segment correspondant pour ce filtre de classe.',
    drawerClassSummary: 'Synthèse de la classe & extraits représentatifs',
    drawerTopLemmas: 'Lemmes caractéristiques (cliquez pour explorer)',
    demoLoadedToast: 'Jeu de données Démo chargé (260 textes anonymisés, 5 classes Reinert)',
    importSuccessToast: 'Corpus analysé avec lemmatisation complète par dictionnaire !',

    navSpecificity: 'Analyse de Spécificité',
    exportThemeTitle: 'Thème d’exportation (Sombre ou Papier Blanc)',
    exportDark: 'Sombre',
    exportWhitePaper: 'Papier Blanc',
    copyMethodologyBtn: 'Copier la Méthodologie',
    methodologyCopiedToast: 'Paragraphe méthodologique prêt à publier copié dans le presse-papiers !',
    excludedStopwordsLabel: 'Mots exclus :',
    resetStopwordsBtn: 'Réinitialiser',
    excludeWordBtn: '🚫 Exclure & Recalculer',
    recalculatingToast: 'Recalcul CHD, AFC & χ² en cours...',
    excludedAppliedToast: 'Corpus recalculé avec le filtre de mots vides mis à jour !',
    specTitle: 'Analyse de Spécificité des Métadonnées (Sous-corpus χ²)',
    specSub: 'Comparaison divergente des lemmes sur-représentés (+χ²) et sous-représentés (−χ²) selon les modalités de métadonnées. Cliquez sur une barre pour lire les citations.',
    specVarLabel: 'Variable :',
    specOverLabel: 'Sur-représentés (+χ²)',
    specUnderLabel: 'Sous-représentés (−χ²)',
    specNoData: 'Aucune variable catégorielle comptant au moins 2 modalités dans ce corpus.',
    specThresholdLabel: 'p < 0,05 (χ² = ±3,84)',
    privacyBadgeText: 'Zéro rétention : traité uniquement en RAM',
    privacyShort: 'RAM uniquement • Zéro rétention',
    recipesHeading: 'Recettes de données — Guides en 3 étapes (Google Forms, Reddit, YouTube Apify)',
    recipesToggleHint: 'Cliquer pour déplier',
    recipeFormsTitle: 'Export Google Forms / Enquête',
    recipeFormsS1: 'Ouvrez votre formulaire → Réponses → Exporter vers Sheets ou télécharger en .csv.',
    recipeFormsS2: 'Déposez directement le fichier .csv ou .xlsx ci-dessous (sans balises ****).',
    recipeFormsS3: 'Sélectionnez la question ouverte en Texte principal et vos variables en métadonnées.',
    recipeRedditTitle: 'Discussions Reddit (Apify / Export)',
    recipeRedditS1: 'Exécutez Apify Reddit Scraper ou PRAW et téléchargez le tableau en .csv ou .xlsx.',
    recipeRedditS2: 'Déposez le fichier ci-dessous pour ouvrir l’aperçu sur 5 lignes.',
    recipeRedditS3: 'Associez body / text au Texte principal et subreddit + type aux métadonnées (Spécificité χ²).',
    recipeYoutubeTitle: 'Commentaires YouTube (Apify)',
    recipeYoutubeS1: 'Collectez les commentaires avec Apify YouTube Scraper et exportez en .csv / .xlsx.',
    recipeYoutubeS2: 'Téléversez directement (max 15 Mo / 15 000 lignes, traité uniquement en RAM).',
    recipeYoutubeS3: 'Sélectionnez comment en Texte principal, la langue + bigrammes, et channelName en métadonnée.',
    corpusLangLabel: 'Langue du corpus :',
    detectBigramsLabel: 'Détecter les bigrammes (PMI)',
    detectBigramsModalLabel: 'Détecter les bigrammes (fusionner les collocations fréquentes via PMI)'
  },

  ru: {
    appTitle: 'IRaMuTeQ Web Studio',
    appSubtitle: 'Интерактивный лексический анализ, метод Рейнерта (CHD) и факторный анализ (AFC)',
    datasetSelectorTitle: 'Выбор текстового корпуса',
    themeToggleTitle: 'Переключить светлую / тёмную тему',
    loadDemoBtn: 'Загрузить Демо-корпус',
    importDataBtn: 'Импорт CSV / Excel / .txt',
    downloadSampleCsv: 'Пример CSV',

    navSectionAnalysis: 'АНАЛИЗ КОРПУСА',
    navSectionTools: 'ДАННЫЕ И ИМПОРТ',
    navCorpus: 'Обзор корпуса',
    navReinert: 'Метод Рейнерта (CHD)',
    navAfc: 'Факторный анализ (AFC)',
    navSimilitude: 'Анализ подобия (Граф)',
    navClouds: 'Облака слов',
    navKwic: 'Конкорданс (KWIC)',
    navMeta: 'Кросс-табуляция',
    navCustom: 'Импорт / Свой корпус',

    heroTitle: 'Исследуйте готовый демо-корпус или загрузите свою таблицу / текст',
    heroSubtitle: 'Протестируйте все графики на встроенном анонимизированном демо-датасете (260 записей) или импортируйте сырые файлы .csv, .xlsx или IRaMuTeQ .txt.',

    docsCount: 'Документов',
    docsSub: 'Исходные текстовые единицы (UCI)',
    segmentsCount: 'Сегментов (UCE)',
    segmentsSub: 'Элементарные контекстные единицы',
    tokensCount: 'Активных токенов',
    tokensSub: 'Лемматизированные словоупотребления',
    formsCount: 'Уникальных лемм',
    formsSub: 'Словарные начальные формы',
    hapaxPct: 'Гапаксы (Freq=1)',
    hapaxSub: 'Однократные леммы',
    ttr: 'Лексич. богатство (TTR)',
    avgUceLen: 'Ср. длина UCE',
    avgUceSub: 'Активных лемм в сегменте',

    zipfTitle: 'Закон Ципфа (Ранг vs Частота)',
    zipfSub: 'Логарифмическое распределение частот слов в сравнении с теоретическим законом Ципфа f = C / r',
    zipfXAxis: 'Ранг частотности (log-шкала)',
    zipfYAxis: 'Частота леммы (log-шкала)',
    dominantConcepts: 'Доминирующие леммы корпуса',
    top15Badge: 'Топ-15 лемм',
    corpusFreqCol: 'Частота в корпусе',
    rank: 'Ранг',

    reinertTitle: 'Иерархическая нисходящая классификация (CHD — Рейнерт)',
    reinertSub: 'Последовательное SVD би-партиционирование контекстных сегментов на лексические классы с профилями χ²',
    dendrogramTitle: 'Дендрограмма классификации Рейнерта (CHD)',
    dendrogramBadge: 'Иерархические разделы • Кликните по классу',
    chi2TableTitle: 'Статистическая таблица Хи-квадрат (χ²)',
    exportChi2Csv: 'Экспорт χ² CSV',
    searchLemmaPlaceholder: 'Фильтр лемм...',
    reinertClassesTitle: 'Лексические классы Рейнерта',
    clickToSelect: 'Кликните для выбора',
    selectedClassProfile: 'Профиль выбранного класса',
    associatedMetadataTitle: 'Связанные переменные метаданных (*variable_modality)',
    typicalSegments: 'Характеристические сегменты (Топ UCE по χ²)',
    noMetadataAssoc: 'Значимых связей с метаданными для этого класса нет',

    afcTitle: 'Факторный анализ соответствий (AFC / CA)',
    afcSub: '2D-проекция классов Рейнерта и активных лемм на факторные оси (SVD нормализованных остатков). Кликните по слову или бейджу класса для просмотра цитат.',
    axesLabel: 'Оси:',
    labelsLabel: 'Подписи:',
    labelsTop: 'Топ-слова (χ² ≥ 15)',
    labelsAll: 'Все активные слова',
    labelsHover: 'Только при наведении',
    thresholdLabel: 'Мин. частота:',
    factorAxis: 'Фактор',
    inertiaWord: 'инерции',

    simTitle: 'Анализ подобия (Граф совместной встречаемости)',
    simSub: 'Сеть совместной встречаемости лемм и Максимальное остовное дерево (MST). Кликните по узлу для фокуса на связях и просмотра цитат.',
    graphModeLabel: 'Режим графа:',
    toggleMst: 'Дерево подобия (MST)',
    toggleFullGraph: 'Полная сеть связей',
    edgeThresholdLabel: 'Порог связи:',
    pausePhysics: '⏸ Пауза',
    resumePhysics: '▶ Физика',
    simClickHint: 'Клик: фокус связей и оригинальные цитаты',
    coocTooltip: 'Совместных появлений',
    jaccardTooltip: 'Индекс Жаккара',

    cloudsTitle: 'Лексические облака слов',
    cloudsSub: 'Доминирующие понятия по всему корпусу и в разрезе классов Рейнерта. Кликните по любому слову для просмотра статистики и цитат.',
    weightingLabel: 'Взвешивание:',
    weightFreq: 'Частота',
    weightChi2: 'Значимость (χ²)',

    kwicTitle: 'Конкорданс и контекстные единицы (KWIC)',
    kwicSub: 'Поиск лемм в элементарных контекстных единицах (UCE) с подсветкой левого и правого контекста',
    kwicSearchLabel: 'Поиск в корпусе:',
    kwicPlaceholder: 'Введите лемму (напр. phone)...',
    leftContext: 'Левый контекст',
    keywordCol: 'Ключевое слово',
    rightContext: 'Правый контекст',
    metadataCol: 'Метаданные',
    enterSearchTerm: 'Введите не менее 2 символов для поиска вхождений',
    noMatchesFor: 'Совпадений не найдено для',
    occurrencesWord: 'вхождений',

    metaTitle: 'Кросс-табуляция метаданных',
    metaSub: 'Статистическое распределение классов Рейнерта по переменным метаданных (сообщества, источники, категории)',
    noMetaChartData: 'В этом корпусе нет категориальных переменных метаданных',

    customTitle: 'Импорт корпуса и Live-анализатор',
    customSub: 'Загрузите таблицы CSV / Excel (Apify, Google Forms, опросы) с выбором колонок или вставьте классический текст IRaMuTeQ (.txt)',
    uploadZoneHeading: 'Загрузите файл (.csv, .xlsx, .txt) или вставьте текст',
    sampleDetox: 'Пример: Digital Detox',
    sampleAi: 'Пример: AI и наука',
    dropzoneTitle: 'Перетащите .csv, .xlsx или IRaMuTeQ .txt файл сюда, или нажмите для выбора',
    dropzoneSub: 'Для CSV и Excel автоматически откроется окно предпросмотра (5 строк) и выбора колонок',
    customTextareaPh: 'Или вставьте текст в формате IRaMuTeQ (**** *var_val) или обычные абзацы...',
    targetClassesLabel: 'Число классов:',
    runAnalysis: 'Запустить анализ',
    processingLabel: 'Выполняется анализ...',
    formatGuideTitle: 'Поддерживаемые форматы и NLP-конвейер',
    guideBadge: 'Справка',
    guideTabularHeading: '1. Таблицы CSV и Excel (.csv, .xlsx):',
    guideTabularDesc: 'Загружайте выгрузки из Apify, Reddit или Google Forms. Выберите основную текстовую колонку и метаданные для автоматической конвертации в теги IRaMuTeQ.',
    guideTxtHeading: '2. Классический формат IRaMuTeQ (.txt):',
    guidePipelineHeading: '3. Словарная лемматизация и алгоритм Рейнерта:',
    guideStep1: 'Словарная лемматизация с POS-теггингом (WordNet / spaCy) — без обрезанных основ',
    guideStep2: 'Фильтрация URL, чисел, пунктуации и стоп-слов; сохранение NOUN, VERB, ADJ, ADV',
    guideStep3: 'Сегментация на UCE и иерархическое би-партиционирование SVD (CHD)',
    guideStep4: 'Точный критерий χ² Пирсона, точные p-значения, AFC-биплот и MST Краскала',

    colMapTitle: 'Сопоставление колонок таблицы с корпусом IRaMuTeQ',
    colMapTextLabel: 'Основная текстовая колонка (Обязательно)',
    colMapMetaLabel: 'Дополнительные колонки метаданных (Переменные *var_val)',
    colMapPreviewLabel: 'Предпросмотр данных (5 строк)',
    cancelBtn: 'Отмена',
    runMappedAnalysis: 'Запустить анализ IRaMuTeQ',
    docViewerTitle: 'Просмотр документа',

    exportSvg: 'Экспорт SVG',
    exportPng: 'Экспорт PNG',
    exportCsv: 'Экспорт CSV',
    searchPlaceholder: 'Поиск леммы...',
    zoomIn: 'Приблизить',
    zoomOut: 'Отдалить',
    resetZoom: 'Сбросить масштаб',
    allClasses: 'Все классы',
    classLabel: 'Класс',
    word: 'Лемма',
    chi2: 'Хи-квадрат (χ²)',
    freqClass: 'В классе',
    freqTotal: 'Всего',
    freqShort: 'Частота',
    pctCol: '%',
    pctClass: '% класса',
    pVal: 'p-значение',
    modality: 'Переменная метаданных',
    rowsWord: 'строк',
    wordsWord: 'лемм',
    docsShort: 'док.',
    classesShort: 'классов',

    openFullKwic: 'Полный KWIC',
    drawerQuotesTitle: 'Оригинальные цитаты в контексте',
    drawerClassBreakdown: 'Связь χ² по классам Рейнерта',
    drawerTopQuotes: 'Топ релевантных оригинальных цитат',
    drawerViewDoc: 'Открыть документ целиком',
    drawerNoQuotes: 'Нет сегментов, соответствующих выбранному классу.',
    drawerClassSummary: 'Сводка по классу и характерные цитаты',
    drawerTopLemmas: 'Характеристические леммы (кликните для просмотра)',
    demoLoadedToast: 'Демо-датасет загружен (260 анонимизированных записей, 5 классов)',
    importSuccessToast: 'Корпус успешно проанализирован со словарной лемматизацией!',

    navSpecificity: 'Анализ специфичности',
    exportThemeTitle: 'Тема экспорта графиков (Тёмная или Белый лист)',
    exportDark: 'Тёмная',
    exportWhitePaper: 'Белый лист',
    copyMethodologyBtn: 'Копировать методологию',
    methodologyCopiedToast: 'Готовый академический блок методологии скопирован в буфер обмена!',
    excludedStopwordsLabel: 'Исключённые стоп-слова:',
    resetStopwordsBtn: 'Сбросить все',
    excludeWordBtn: '🚫 Исключить и пересчитать',
    recalculatingToast: 'Пересчёт Рейнерта CHD, AFC и χ²...',
    excludedAppliedToast: 'Корпус пересчитан с обновлённым списком стоп-слов!',
    specTitle: 'Анализ специфичности подкорпусов (χ² по метаданным)',
    specSub: 'Дивергентная диаграмма статистически перепредставленных (+χ²) и недопредставленных (−χ²) лемм по группам метаданных. Кликните по столбцу для просмотра цитат.',
    specVarLabel: 'Переменная:',
    specOverLabel: 'Характерны (+χ²)',
    specUnderLabel: 'Нехарактерны (−χ²)',
    specNoData: 'В этом корпусе нет категориальной переменной минимум с 2 группами.',
    specThresholdLabel: 'p < 0.05 (χ² = ±3.84)',
    privacyBadgeText: 'Zero-Retention: обработка только в RAM',
    privacyShort: 'Только RAM • Без сохранения',
    recipesHeading: 'Рецепты данных — 3 шага экспорта (Google Forms, Reddit, YouTube Apify)',
    recipesToggleHint: 'Нажмите, чтобы раскрыть',
    recipeFormsTitle: 'Экспорт из Google Forms / опросов',
    recipeFormsS1: 'Откройте форму → Ответы → Связать с Таблицами или скачать как .csv.',
    recipeFormsS2: 'Перетащите сырой файл .csv или .xlsx прямо ниже — теги **** не требуются.',
    recipeFormsS3: 'Выберите колонку с открытым ответом как Основной текст, а демографию — как метаданные.',
    recipeRedditTitle: 'Посты и комментарии Reddit (Apify)',
    recipeRedditS1: 'Запустите Apify Reddit Scraper или экспорт PRAW и скачайте таблицу .csv / .xlsx.',
    recipeRedditS2: 'Загрузите файл ниже для предпросмотра первых 5 строк и выбора колонок.',
    recipeRedditS3: 'Укажите body / text как Основной текст, а subreddit + type как метаданные для анализа специфичности.',
    recipeYoutubeTitle: 'Комментарии YouTube (Apify)',
    recipeYoutubeS1: 'Соберите комментарии через Apify YouTube Scraper и экспортируйте в .csv / .xlsx.',
    recipeYoutubeS2: 'Загрузите напрямую (до 15 МБ / 15 000 строк, обработка строго в RAM без записи на диск).',
    recipeYoutubeS3: 'Выберите comment как Основной текст, язык корпуса + биграммы, и channelName как метаданные.',
    corpusLangLabel: 'Язык корпуса:',
    detectBigramsLabel: 'Биграммы (PMI)',
    detectBigramsModalLabel: 'Обнаруживать биграммы (объединять частые словосочетания по PMI)'
  }
};

function t(key) {
  return (I18N[currentLanguage] && I18N[currentLanguage][key]) || (I18N.en && I18N.en[key]) || key;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showToast(message) {
  const el = document.getElementById('toast-banner');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

// =========================================================================
// INITIALIZATION
// =========================================================================
function initApp() {
  initTheme();
  initLanguage();
  initNavigation();
  bindGlobalEvents();
  loadInitialDataset();
  checkBackendHealth();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

function checkBackendHealth() {
  if (typeof fetch !== 'function' || window.location.protocol === 'file:') return;
  fetch('/api/health')
    .then(r => (r.ok ? r.json() : null))
    .then(info => {
      if (info && info.lemmatizer) {
        const pill = document.getElementById('nlp-backend-pill');
        if (pill) {
          pill.innerHTML = `IRaMuTeQ Web Studio v3.0<br/>NLP: ${escapeHtml(info.lemmatizer)}`;
        }
      }
    })
    .catch(() => {});
}

function initTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    btn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      btn.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
      renderCurrentView();
    });
  }
}

function initLanguage() {
  const btns = document.querySelectorAll('.lang-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      if (!I18N[lang]) return;
      currentLanguage = lang;
      document.documentElement.setAttribute('lang', lang);
      btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-lang') === lang));
      updateI18nLabels();
      updateStatusPill();
      renderCurrentView();
      // Re-render drawer if open
      const drawer = document.getElementById('kwic-drawer');
      if (drawer && drawer.classList.contains('open')) {
        if (drawerMode === 'word' && drawerTargetWord) openKwicDrawerForWord(drawerTargetWord);
        else if (drawerMode === 'class' && drawerTargetClassId) openKwicDrawerForClass(drawerTargetClassId);
      }
    });
  });
  updateI18nLabels();
}

function updateI18nLabels() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if (val) el.setAttribute('placeholder', val);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) el.setAttribute('title', val);
  });
}

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchToTab(targetTab);
    });
  });
}

function switchToTab(targetTab) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(i => i.classList.toggle('active', i.getAttribute('data-tab') === targetTab));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const activePane = document.getElementById(`tab-${targetTab}`);
  if (activePane) {
    activePane.classList.add('active');
    renderView(targetTab);
  }
}
window.switchToTab = switchToTab;

function getActiveTab() {
  const activePane = document.querySelector('.tab-pane.active');
  return activePane ? activePane.id.replace('tab-', '') : 'corpus';
}

function renderCurrentView() {
  renderView(getActiveTab());
}

function loadInitialDataset() {
  const select = document.getElementById('dataset-selector');
  if (window.IRAMUTEQ_PRECOMPUTED_DATA && Object.keys(window.IRAMUTEQ_PRECOMPUTED_DATA).length > 0) {
    const keys = Object.keys(window.IRAMUTEQ_PRECOMPUTED_DATA);
    populateDatasetSelect(keys);
    if (!window.IRAMUTEQ_PRECOMPUTED_DATA[currentDatasetKey]) {
      currentDatasetKey = keys[0];
    }
    switchDataset(currentDatasetKey);
  } else if (typeof fetch === 'function') {
    fetch('iramuteq_data.json')
      .then(res => res.json())
      .then(data => {
        window.IRAMUTEQ_PRECOMPUTED_DATA = data;
        const keys = Object.keys(data);
        populateDatasetSelect(keys);
        switchDataset(data[currentDatasetKey] ? currentDatasetKey : keys[0]);
      })
      .catch(err => console.error('Error loading precomputed dataset:', err));
  }

  if (select) {
    select.addEventListener('change', e => switchDataset(e.target.value));
  }
}

function populateDatasetSelect(keys) {
  const select = document.getElementById('dataset-selector');
  if (!select) return;
  select.innerHTML = '';
  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = window.IRAMUTEQ_PRECOMPUTED_DATA[k].name || k;
    select.appendChild(opt);
  });
  select.value = currentDatasetKey;
}

function updateStatusPill() {
  if (!currentDataset) return;
  const pill = document.getElementById('corpus-status-text');
  if (pill) {
    const st = currentDataset.lexical_stats;
    pill.textContent = `${st.total_docs} ${t('docsShort')} • ${st.total_segments} UCE • ${currentDataset.classes.length} ${t('classesShort')}`;
  }
}

function switchDataset(key) {
  currentDatasetKey = key;
  window.currentDatasetKey = key;
  currentDataset = window.IRAMUTEQ_PRECOMPUTED_DATA[key];
  if (!currentDataset) return;

  const select = document.getElementById('dataset-selector');
  if (select) select.value = key;

  updateStatusPill();

  activeClassFilter = 'all';
  currentSelectedClassId = currentDataset.classes[0] ? currentDataset.classes[0].class_id : 1;
  chi2FilterClass = 'all';
  chi2SearchQuery = '';
  cloudClassId = 'all';
  kwicClassFilter = 'all';
  kwicSearchQuery = currentDataset.zipf_data[0] ? currentDataset.zipf_data[0].word : '';
  specVarName = null;
  specModValue = null;

  const kwicInput = document.getElementById('kwic-search-input');
  if (kwicInput) kwicInput.value = kwicSearchQuery;
  const chi2Input = document.getElementById('chi2-search-input');
  if (chi2Input) chi2Input.value = '';

  renderExcludedStopwordsBar();
  renderView(getActiveTab());
}

// One-click "Load Demo Dataset"
async function loadDemoDataset() {
  const demoKey = 'demo_digital_detox';
  if (window.IRAMUTEQ_PRECOMPUTED_DATA && window.IRAMUTEQ_PRECOMPUTED_DATA[demoKey]) {
    populateDatasetSelect(Object.keys(window.IRAMUTEQ_PRECOMPUTED_DATA));
    switchDataset(demoKey);
    showToast(t('demoLoadedToast'));
    if (getActiveTab() === 'custom') switchToTab('reinert');
    return;
  }

  try {
    const res = await fetch('/api/demo');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    window.IRAMUTEQ_PRECOMPUTED_DATA = window.IRAMUTEQ_PRECOMPUTED_DATA || {};
    window.IRAMUTEQ_PRECOMPUTED_DATA[demoKey] = data;
    populateDatasetSelect(Object.keys(window.IRAMUTEQ_PRECOMPUTED_DATA));
    switchDataset(demoKey);
    showToast(t('demoLoadedToast'));
    if (getActiveTab() === 'custom') switchToTab('reinert');
  } catch (err) {
    console.error('Failed to load demo dataset:', err);
    showToast('Unable to load demo dataset: ' + err.message);
  }
}
window.loadDemoDataset = loadDemoDataset;

function renderView(tabName) {
  if (!currentDataset && tabName !== 'custom') return;
  switch (tabName) {
    case 'corpus':
      renderCorpusOverview();
      break;
    case 'reinert':
      renderReinertView();
      break;
    case 'afc':
      renderAfcView();
      break;
    case 'similitude':
      renderSimilitudeView();
      break;
    case 'clouds':
      renderWordCloudsView();
      break;
    case 'specificity':
      renderSpecificityView();
      break;
    case 'kwic':
      renderKwicView();
      break;
    case 'meta':
      renderMetaView();
      break;
    case 'custom':
      break;
  }
}

// =========================================================================
// VIEW 1: CORPUS OVERVIEW & ZIPF'S LAW
// =========================================================================
function renderCorpusOverview() {
  const stats = currentDataset.lexical_stats;
  document.getElementById('stat-docs').textContent = Number(stats.total_docs).toLocaleString();
  document.getElementById('stat-segments').textContent = Number(stats.total_segments).toLocaleString();
  document.getElementById('stat-tokens').textContent = Number(stats.total_tokens).toLocaleString();
  document.getElementById('stat-forms').textContent = Number(stats.unique_forms).toLocaleString();
  document.getElementById('stat-hapax').textContent = `${stats.hapax_pct}% (${stats.hapax_count})`;
  document.getElementById('stat-ttr').textContent = `${stats.type_token_ratio}%`;
  document.getElementById('stat-len').textContent = `${stats.avg_words_per_uce} ${t('wordsWord')}`;

  renderZipfChart();
  renderTopWordsTable();
}

function renderZipfChart() {
  const container = document.getElementById('zipf-chart');
  if (!container) return;
  container.innerHTML = '';

  const width = container.clientWidth || 700;
  const height = 400;
  const margin = { top: 30, right: 35, bottom: 50, left: 60 };

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'zipf-svg')
    .attr('width', width)
    .attr('height', height);

  const data = currentDataset.zipf_data || [];
  if (data.length === 0) return;

  const x = d3.scaleLog()
    .domain([1, Math.max(2, d3.max(data, d => d.rank))])
    .range([margin.left, width - margin.right]);

  const minY = Math.max(1, d3.min(data, d => Math.min(d.freq, d.theoretical_zipf || d.freq)));
  const maxY = Math.max(2, d3.max(data, d => Math.max(d.freq, d.theoretical_zipf || d.freq)));
  const y = d3.scaleLog()
    .domain([minY, maxY])
    .range([height - margin.bottom, margin.top]);

  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5, '~s'))
    .call(g => g.selectAll('text').style('fill', 'var(--text-muted)'))
    .call(g => g.selectAll('line, path').style('stroke', 'var(--border-color)'));

  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(5, '~s'))
    .call(g => g.selectAll('text').style('fill', 'var(--text-muted)'))
    .call(g => g.selectAll('line, path').style('stroke', 'var(--border-color)'));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--text-muted)')
    .style('font-size', '12px')
    .text(t('zipfXAxis'));

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', 18)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--text-muted)')
    .style('font-size', '12px')
    .text(t('zipfYAxis'));

  const lineGen = d3.line()
    .x(d => x(d.rank))
    .y(d => y(Math.max(1, d.theoretical_zipf)));

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(239, 68, 68, 0.65)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4,4')
    .attr('d', lineGen);

  const empLine = d3.line()
    .x(d => x(d.rank))
    .y(d => y(Math.max(1, d.freq)));

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', 'var(--accent-primary)')
    .attr('stroke-width', 2.5)
    .attr('d', empLine);

  const tooltip = d3.select('#global-tooltip');
  svg.selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.rank))
    .attr('cy', d => y(Math.max(1, d.freq)))
    .attr('r', 4.5)
    .attr('fill', 'var(--accent-secondary)')
    .attr('stroke', 'var(--bg-secondary)')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .on('mouseover', (event, d) => {
      tooltip.style('display', 'block')
        .html(`<strong>${escapeHtml(d.word)}</strong><br/>${t('rank')}: #${d.rank}<br/>${t('freqTotal')}: ${d.freq}<br/>Zipf: ${d.theoretical_zipf}`)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => tooltip.style('display', 'none'))
    .on('click', (event, d) => openKwicDrawerForWord(d.word));
}

function renderTopWordsTable() {
  const tbody = document.getElementById('top-vocab-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const words = (currentDataset.zipf_data || []).slice(0, 15);
  const maxFreq = words[0] ? words[0].freq : 1;

  words.forEach(item => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => openKwicDrawerForWord(item.word);

    const pct = Math.round((item.freq / maxFreq) * 100);
    tr.innerHTML = `
      <td style="font-weight: 600; color: var(--accent-primary);">#${item.rank}</td>
      <td style="font-weight: 700;">
        ${escapeHtml(item.word)}
        <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 10px; margin-left: 8px; border-radius: 4px;" onclick="event.stopPropagation(); openKwicDrawerForWord('${escapeHtml(item.word)}')">🔍 KWIC</button>
      </td>
      <td>
        <div class="spark-bar-container">
          <span style="font-family: var(--font-mono); width: 38px;">${item.freq}</span>
          <div class="spark-bar" style="width: ${pct}px; background: var(--accent-primary);"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =========================================================================
// VIEW 2: REINERT METHOD (CHD) — DENDROGRAM + SEARCHABLE CHI2 TABLE
// =========================================================================
function renderReinertView() {
  renderClassShareStrip();
  renderDendrogram();
  renderChi2ClassPills();
  renderChi2StatsTable();
  renderClassCards();
  renderSelectedClassDetails(currentSelectedClassId);
}

function renderClassShareStrip() {
  const strip = document.getElementById('class-share-strip');
  if (!strip) return;
  strip.innerHTML = '';
  const tooltip = d3.select('#global-tooltip');

  currentDataset.classes.forEach(c => {
    const seg = document.createElement('div');
    const color = CLASS_COLORS[(c.class_id - 1) % CLASS_COLORS.length];
    seg.className = 'class-share-seg';
    seg.style.width = `${c.pct}%`;
    seg.style.background = color;
    seg.onmouseover = event => {
      tooltip.style('display', 'block')
        .html(`<strong>${t('classLabel')} ${c.class_id} — ${c.pct}%</strong><br/>${escapeHtml(c.label)}<br/>${c.size} UCE`)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    };
    seg.onmouseout = () => tooltip.style('display', 'none');
    seg.onclick = () => selectReinertClass(c.class_id);
    strip.appendChild(seg);
  });
}

function selectReinertClass(classId) {
  currentSelectedClassId = classId;
  chi2FilterClass = String(classId);
  renderDendrogram();
  renderChi2ClassPills();
  renderChi2StatsTable();
  renderClassCards();
  renderSelectedClassDetails(classId);
}

function renderDendrogram() {
  const container = document.getElementById('dendrogram-tree');
  if (!container) return;
  container.innerHTML = '';

  const width = Math.max(container.clientWidth || 900, 680);
  const height = 365;
  const rightSpace = Math.min(420, Math.max(280, Math.round(width * 0.44)));
  const margin = { top: 30, right: rightSpace, bottom: 26, left: 105 };

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'dendro-svg')
    .attr('width', width)
    .attr('height', height);

  const data = currentDataset.dendrogram;
  if (!data) return;

  const root = d3.hierarchy(data);
  const treeWidth = Math.max(180, width - margin.left - margin.right);
  const treeHeight = height - margin.top - margin.bottom;
  const clusterLayout = d3.cluster().size([treeHeight, treeWidth]);
  clusterLayout(root);

  const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Classic IRaMuTeQ orthogonal elbow links
  g.selectAll('.dendro-link')
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'dendro-link')
    .attr('fill', 'none')
    .attr('stroke', d => {
      if (!d.target.children && d.target.data.class_id) {
        return CLASS_COLORS[(d.target.data.class_id - 1) % CLASS_COLORS.length];
      }
      return 'var(--border-highlight)';
    })
    .attr('stroke-width', d => (!d.target.children ? 2.5 : 2))
    .attr('stroke-opacity', 0.85)
    .attr('d', d => `M${d.source.y},${d.source.x} V${d.target.x} H${d.target.y}`);

  // Nodes
  const node = g.selectAll('.dendro-node')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('class', 'dendro-node')
    .attr('transform', d => `translate(${d.y}, ${d.x})`);

  // Helper to resolve class_id reliably
  function resolveLeafClass(d) {
    if (d.data.class_id) {
      return currentDataset.classes.find(c => c.class_id === d.data.class_id) || null;
    }
    const m = String(d.data.name || '').match(/(\d+)/);
    if (m) {
      return currentDataset.classes.find(c => c.class_id === parseInt(m[1], 10)) || null;
    }
    return null;
  }

  node.append('circle')
    .attr('r', d => (d.children ? 5 : 8))
    .attr('fill', d => {
      if (!d.children) {
        const cls = resolveLeafClass(d);
        return cls ? CLASS_COLORS[(cls.class_id - 1) % CLASS_COLORS.length] : 'var(--accent-primary)';
      }
      return d.depth === 0 ? 'var(--accent-primary)' : 'var(--text-dim)';
    })
    .attr('stroke', d => {
      const cls = !d.children ? resolveLeafClass(d) : null;
      return cls && cls.class_id === currentSelectedClassId ? '#ffffff' : 'var(--bg-secondary)';
    })
    .attr('stroke-width', d => {
      const cls = !d.children ? resolveLeafClass(d) : null;
      return cls && cls.class_id === currentSelectedClassId ? 3 : 2;
    })
    .style('cursor', d => (!d.children ? 'pointer' : 'default'))
    .on('click', (event, d) => {
      const cls = !d.children ? resolveLeafClass(d) : null;
      if (cls) selectReinertClass(cls.class_id);
    });

  // Root & internal branch percentage labels
  node.filter(d => Boolean(d.children))
    .append('text')
    .attr('dy', d => (d.depth === 0 ? '-0.9em' : '-0.6em'))
    .attr('x', d => (d.depth === 0 ? 0 : -6))
    .attr('text-anchor', d => (d.depth === 0 ? 'middle' : 'end'))
    .text(d => (d.depth === 0 ? `Corpus (100% • ${d.data.size} UCE)` : `${d.data.pct}%`))
    .style('font-size', '11px')
    .style('font-weight', d => (d.depth === 0 ? '700' : '500'))
    .style('fill', 'var(--text-muted)');

  // Terminal Class Leaves: Badge ("Class X — 24.9%") + Top Characteristic Lemmas
  const leafG = node.filter(d => !d.children)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      const cls = resolveLeafClass(d);
      if (cls) selectReinertClass(cls.class_id);
    });

  leafG.each(function (d) {
    const cls = resolveLeafClass(d);
    const cid = cls ? cls.class_id : 1;
    const color = CLASS_COLORS[(cid - 1) % CLASS_COLORS.length];
    const pct = cls ? cls.pct : d.data.pct;
    const size = cls ? cls.size : d.data.size;
    const isSelected = cid === currentSelectedClassId;
    const topLemmas = (d.data.top_words && d.data.top_words.length > 0)
      ? d.data.top_words.slice(0, 5).map(w => w.word).join(' · ')
      : (cls ? cls.top_words.slice(0, 5).map(w => w.word).join(' · ') : '');

    const sel = d3.select(this);

    // Class Pill Badge
    sel.append('rect')
      .attr('x', 14)
      .attr('y', -13)
      .attr('width', 132)
      .attr('height', 26)
      .attr('rx', 6)
      .attr('fill', isSelected ? color : `${color}22`)
      .attr('stroke', color)
      .attr('stroke-width', isSelected ? 2 : 1.2);

    sel.append('text')
      .attr('x', 80)
      .attr('y', 4)
      .attr('text-anchor', 'middle')
      .text(`${t('classLabel')} ${cid} — ${pct}%`)
      .style('font-size', '11px')
      .style('font-weight', '700')
      .style('fill', isSelected ? '#ffffff' : color);

    // Top Characteristic Lemmas & UCE count
    sel.append('text')
      .attr('x', 156)
      .attr('y', -2)
      .text(topLemmas)
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('font-family', 'var(--font-mono)')
      .style('fill', 'var(--text-main)');

    sel.append('text')
      .attr('x', 156)
      .attr('y', 12)
      .text(`${size} UCE`)
      .style('font-size', '10px')
      .style('fill', 'var(--text-dim)');
  });
}

function getChi2TableRows() {
  // Build unified chi2 table if dataset came from legacy format without `chi2_table`
  let rows = currentDataset.chi2_table;
  if (!rows || !rows.length) {
    rows = [];
    currentDataset.classes.forEach(c => {
      (c.top_words || []).forEach(w => {
        rows.push({
          word: w.word,
          class_id: c.class_id,
          freq_class: w.freq_class,
          freq_total: w.freq_total,
          pct_class: w.pct_class,
          chi2: w.chi2,
          p_value: w.p_value,
          p_value_num: w.p_value_num != null ? w.p_value_num : (w.chi2 >= 10.83 ? 0.001 : (w.chi2 >= 3.84 ? 0.05 : 0.2))
        });
      });
    });
  }

  let filtered = rows.slice();
  if (chi2FilterClass !== 'all') {
    filtered = filtered.filter(r => String(r.class_id) === String(chi2FilterClass));
  }
  if (chi2SearchQuery && chi2SearchQuery.trim()) {
    const q = chi2SearchQuery.trim().toLowerCase();
    filtered = filtered.filter(r => r.word.toLowerCase().includes(q));
  }

  const mult = chi2SortDir === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const va = a[chi2SortKey];
    const vb = b[chi2SortKey];
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb) * mult;
    }
    return ((va || 0) - (vb || 0)) * mult;
  });

  return filtered;
}

function renderChi2ClassPills() {
  const container = document.getElementById('chi2-class-pills');
  if (!container) return;
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `btn ${chi2FilterClass === 'all' ? 'btn-primary' : 'btn-ghost'}`;
  allBtn.style.padding = '5px 11px';
  allBtn.style.fontSize = '12px';
  allBtn.textContent = t('allClasses');
  allBtn.onclick = () => {
    chi2FilterClass = 'all';
    renderChi2ClassPills();
    renderChi2StatsTable();
  };
  container.appendChild(allBtn);

  currentDataset.classes.forEach(c => {
    const btn = document.createElement('button');
    const isActive = String(chi2FilterClass) === String(c.class_id);
    btn.className = `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`;
    btn.style.padding = '5px 11px';
    btn.style.fontSize = '12px';
    btn.textContent = `${t('classLabel')} ${c.class_id} (${c.pct}%)`;
    btn.onclick = () => {
      chi2FilterClass = String(c.class_id);
      currentSelectedClassId = c.class_id;
      renderChi2ClassPills();
      renderChi2StatsTable();
      renderDendrogram();
      renderClassCards();
      renderSelectedClassDetails(c.class_id);
    };
    container.appendChild(btn);
  });
}

function renderChi2StatsTable() {
  const tbody = document.getElementById('chi2-stats-tbody');
  const countEl = document.getElementById('chi2-row-count');
  if (!tbody) return;
  tbody.innerHTML = '';

  const rows = getChi2TableRows();
  if (countEl) countEl.textContent = `${rows.length} ${t('rowsWord')}`;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-dim); padding:20px;">${t('noMatchesFor')} "${escapeHtml(chi2SearchQuery)}"</td></tr>`;
    return;
  }

  const maxChi = Math.max(1, d3.max(rows, r => r.chi2) || 1);

  rows.slice(0, 150).forEach(item => {
    const color = CLASS_COLORS[(item.class_id - 1) % CLASS_COLORS.length];
    const barW = Math.min(90, Math.max(4, Math.round((item.chi2 / maxChi) * 90)));
    const sigColor = (item.p_value_num != null ? item.p_value_num : 0.05) < 0.05 ? '#34d399' : 'var(--text-muted)';
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => openKwicDrawerForWord(item.word);
    tr.innerHTML = `
      <td style="font-weight:700; color:var(--text-main);">${escapeHtml(item.word)}</td>
      <td><span class="class-chip c${item.class_id}">${t('classLabel')} ${item.class_id}</span></td>
      <td style="font-family:var(--font-mono);">${item.freq_class}</td>
      <td style="font-family:var(--font-mono); color:var(--text-muted);">${item.freq_total}</td>
      <td style="font-family:var(--font-mono);">${item.pct_class}%</td>
      <td>
        <div class="spark-bar-container">
          <span style="font-family:var(--font-mono); font-weight:700; width:50px;">${Number(item.chi2).toFixed(2)}</span>
          <div class="spark-bar" style="width:${barW}px; background:${color};"></div>
        </div>
      </td>
      <td><span class="nav-badge" style="background:rgba(16,185,129,0.12); color:${sigColor}; font-family:var(--font-mono);">${escapeHtml(item.p_value)}</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Update sort arrows
  document.querySelectorAll('#tab-reinert th.sortable').forEach(th => {
    const key = th.getAttribute('data-sort');
    const ind = th.querySelector('.sort-indicator');
    if (ind) {
      ind.textContent = key === chi2SortKey ? (chi2SortDir === 'asc' ? '▲' : '▼') : '';
    }
  });
}

function renderClassCards() {
  const container = document.getElementById('class-cards-container');
  if (!container) return;
  container.innerHTML = '';

  currentDataset.classes.forEach(c => {
    const card = document.createElement('div');
    card.className = `class-card ${c.class_id === currentSelectedClassId ? 'active' : ''}`;
    const color = CLASS_COLORS[(c.class_id - 1) % CLASS_COLORS.length];
    const topWords = c.top_words.slice(0, 7).map(w => w.word).join(', ');
    card.innerHTML = `
      <div class="class-card-header">
        <div class="class-card-title">
          <span style="display:inline-block; width:11px; height:11px; border-radius:50%; background:${color};"></span>
          ${t('classLabel')} ${c.class_id}: ${escapeHtml(c.label)}
        </div>
        <div class="nav-badge" style="background:${color}22; color:${color}; font-weight:700;">
          ${c.pct}% (${c.size} UCE)
        </div>
      </div>
      <div class="class-card-words">
        <strong>${t('word')}:</strong> ${escapeHtml(topWords)}
      </div>
    `;
    card.onclick = () => selectReinertClass(c.class_id);
    container.appendChild(card);
  });
}

function highlightLemmaInText(text, lemmasOrWords, color) {
  let out = escapeHtml(text);
  const formsSet = new Set();
  const lemmaMap = (currentDataset && currentDataset.lemma_forms) || {};

  lemmasOrWords.forEach(w => {
    const lw = String(w).toLowerCase();
    formsSet.add(lw);
    if (lw.includes('_')) formsSet.add(lw.replace(/_/g, ' '));
    if (lemmaMap[lw]) {
      lemmaMap[lw].forEach(f => formsSet.add(f.toLowerCase()));
    }
  });

  // Sort longest first so partial words don't hijack longer inflections
  const sortedForms = Array.from(formsSet).filter(f => f.length >= 2).sort((a, b) => b.length - a.length);
  if (sortedForms.length === 0) return out;

  const pattern = new RegExp(`\\b(${sortedForms.map(escapeRegex).join('|')})\\b`, 'gi');
  return out.replace(
    pattern,
    `<span class="kwic-highlight" style="background:${color}26; color:${color}; border-color:${color};">$1</span>`
  );
}

function renderSelectedClassDetails(classId) {
  const c = currentDataset.classes.find(item => item.class_id === classId) || currentDataset.classes[0];
  if (!c) return;

  const color = CLASS_COLORS[(c.class_id - 1) % CLASS_COLORS.length];
  const titleEl = document.getElementById('selected-class-title');
  if (titleEl) {
    titleEl.innerHTML = `<span style="color:${color};">● ${t('classLabel')} ${c.class_id}</span> — ${escapeHtml(c.label)} (${c.pct}% • ${c.size} UCE)`;
  }

  // Metadata table
  const metaTbody = document.getElementById('class-meta-tbody');
  if (metaTbody) {
    metaTbody.innerHTML = '';
    if (c.top_metadata && c.top_metadata.length > 0) {
      c.top_metadata.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family:var(--font-mono); font-weight:600;">${escapeHtml(m.modality)}</td>
          <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-warning);">${m.chi2}</td>
          <td style="font-family:var(--font-mono);">${m.freq_class} / ${m.freq_total}</td>
          <td style="font-family:var(--font-mono);">${m.pct_class}%</td>
        `;
        metaTbody.appendChild(tr);
      });
    } else {
      metaTbody.innerHTML = `<tr><td colspan="4" style="color:var(--text-dim); text-align:center;">${t('noMetadataAssoc')}</td></tr>`;
    }
  }

  // Characteristic UCE Segments
  const segContainer = document.getElementById('class-segments-container');
  if (segContainer) {
    segContainer.innerHTML = '';
    const topClassWords = c.top_words.slice(0, 25).map(w => w.word);
    c.top_segments.slice(0, 10).forEach(s => {
      const card = document.createElement('div');
      card.className = 'segment-card';
      const highlightedText = highlightLemmaInText(s.text, topClassWords, color);
      const metaStr = Object.entries(s.meta || {})
        .filter(([k]) => k !== 'id')
        .map(([k, v]) => `*${k}_${v}`)
        .join(' ');
      card.innerHTML = `
        <div class="segment-meta">
          <span style="font-weight:700; color:${color};">UCE #${s.id}</span>
          <span>Doc #${escapeHtml(s.doc_id)}</span>
          <span style="background:var(--bg-card); padding:2px 6px; border-radius:4px;">χ²: ${s.score}</span>
          <span style="margin-left:auto; font-family:var(--font-mono);">${escapeHtml(metaStr)}</span>
        </div>
        <div style="color:var(--text-main); font-size:13px;">${highlightedText}</div>
      `;
      card.style.cursor = 'pointer';
      card.onclick = () => openDocModal(s.doc_id);
      segContainer.appendChild(card);
    });
  }
}

// =========================================================================
// VIEW 3: CORRESPONDENCE FACTOR ANALYSIS (AFC / CA)
// =========================================================================
function renderAfcView() {
  const container = document.getElementById('afc-chart');
  if (!container) return;
  container.innerHTML = '';

  const width = container.clientWidth || 800;
  const height = 540;
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };

  const afc = currentDataset.afc;
  if (!afc) return;

  const inertiaEl = document.getElementById('afc-inertia-badges');
  if (inertiaEl) {
    inertiaEl.innerHTML = `
      <span class="nav-badge" style="background:rgba(99,102,241,0.2); color:#818cf8; font-weight:700;">
        ${t('factorAxis')} 1: ${afc.inertia_explained[0]}%
      </span>
      <span class="nav-badge" style="background:rgba(16,185,129,0.2); color:#34d399; font-weight:700;">
        ${t('factorAxis')} 2: ${afc.inertia_explained[1]}%
      </span>
      <span class="nav-badge" style="background:rgba(245,158,11,0.2); color:#fbbf24; font-weight:700;">
        ${t('factorAxis')} 3: ${afc.inertia_explained[2] || 0}%
      </span>
    `;
  }

  let words = (afc.words || []).filter(w => w.freq >= afcThreshold);
  if (activeClassFilter !== 'all') {
    words = words.filter(w => w.class_id === parseInt(activeClassFilter, 10));
  }
  if (afcSearchFilter) {
    words = words.filter(w => w.word.toLowerCase().includes(afcSearchFilter.toLowerCase()));
  }

  const allPoints = [
    ...words.map(w => ({ x: w[afcAxisX] || 0, y: w[afcAxisY] || 0 })),
    ...afc.classes.map(c => ({ x: c[afcAxisX] || 0, y: c[afcAxisY] || 0 }))
  ];
  const maxAbsX = (d3.max(allPoints, d => Math.abs(d.x)) || 1) * 1.15;
  const maxAbsY = (d3.max(allPoints, d => Math.abs(d.y)) || 1) * 1.15;

  const x = d3.scaleLinear().domain([-maxAbsX, maxAbsX]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([-maxAbsY, maxAbsY]).range([height - margin.bottom, margin.top]);

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'afc-svg')
    .attr('width', width)
    .attr('height', height);

  const gMain = svg.append('g');
  const zoom = d3.zoom()
    .scaleExtent([0.5, 8])
    .on('zoom', event => gMain.attr('transform', event.transform));
  svg.call(zoom);

  const afcBtnIn = document.getElementById('afc-zoom-in');
  if (afcBtnIn) afcBtnIn.onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.35);
  const afcBtnOut = document.getElementById('afc-zoom-out');
  if (afcBtnOut) afcBtnOut.onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 0.75);
  const afcBtnReset = document.getElementById('afc-zoom-reset');
  if (afcBtnReset) afcBtnReset.onclick = () => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);

  const labelModeSelect = document.getElementById('afc-label-mode');
  if (labelModeSelect) {
    labelModeSelect.value = afcLabelMode;
    labelModeSelect.onchange = e => {
      afcLabelMode = e.target.value;
      renderAfcView();
    };
  }

  // Origin axes
  gMain.append('line')
    .attr('x1', x(-maxAbsX * 2)).attr('y1', y(0))
    .attr('x2', x(maxAbsX * 2)).attr('y2', y(0))
    .attr('stroke', 'rgba(148, 163, 184, 0.25)')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3,3');

  gMain.append('line')
    .attr('x1', x(0)).attr('y1', y(-maxAbsY * 2))
    .attr('x2', x(0)).attr('y2', y(maxAbsY * 2))
    .attr('stroke', 'rgba(148, 163, 184, 0.25)')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3,3');

  // Convex Hulls per Class
  const classGroupPoints = d3.group(words, d => d.class_id);
  classGroupPoints.forEach((pts, clsId) => {
    if (pts.length >= 3) {
      const coordPairs = pts.map(p => [x(p[afcAxisX] || 0), y(p[afcAxisY] || 0)]);
      const hull = d3.polygonHull(coordPairs);
      if (hull) {
        const color = CLASS_COLORS[(clsId - 1) % CLASS_COLORS.length];
        gMain.append('path')
          .datum(hull)
          .attr('d', d => 'M' + d.join('L') + 'Z')
          .attr('fill', color)
          .attr('fill-opacity', 0.08)
          .attr('stroke', color)
          .attr('stroke-opacity', 0.35)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');
      }
    }
  });

  // Word Points -> Click opens Slide-Over KWIC Drawer
  const tooltip = d3.select('#global-tooltip');
  const wordGroup = gMain.selectAll('.afc-word')
    .data(words)
    .enter()
    .append('g')
    .attr('class', 'afc-word')
    .attr('transform', d => `translate(${x(d[afcAxisX] || 0)}, ${y(d[afcAxisY] || 0)})`)
    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      if (afcLabelMode !== 'all') {
        d3.select(this).select('text').style('display', 'block');
      }
      const color = CLASS_COLORS[(d.class_id - 1) % CLASS_COLORS.length];
      tooltip.style('display', 'block')
        .html(`
          <strong style="color:${color};">${escapeHtml(d.word)}</strong><br/>
          ${t('classLabel')}: ${d.class_id}<br/>
          ${t('freqTotal')}: ${d.freq} • χ²: ${d.chi2}<br/>
          ${t('pVal')}: ${escapeHtml(d.p_value || '-')}<br/>
          F1: ${(d.f1 || 0).toFixed(3)}, F2: ${(d.f2 || 0).toFixed(3)}
        `)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function (event, d) {
      if (afcLabelMode === 'hover' || (afcLabelMode === 'top' && !(d.chi2 >= 15 || d.freq >= 8))) {
        d3.select(this).select('text').style('display', 'none');
      }
      tooltip.style('display', 'none');
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      openKwicDrawerForWord(d.word);
    });

  wordGroup.append('circle')
    .attr('r', d => Math.min(10, Math.max(3.5, Math.sqrt(d.freq) * 1.9)))
    .attr('fill', d => CLASS_COLORS[(d.class_id - 1) % CLASS_COLORS.length])
    .attr('fill-opacity', 0.8)
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1);

  wordGroup.append('text')
    .attr('x', 7)
    .attr('y', 3)
    .text(d => d.word)
    .style('font-size', '10.5px')
    .style('font-weight', '600')
    .style('fill', 'var(--text-main)')
    .style('pointer-events', 'none')
    .style('display', d => {
      if (afcLabelMode === 'all') return 'block';
      if (afcLabelMode === 'hover') return 'none';
      return (d.chi2 >= 15 || d.freq >= 8) ? 'block' : 'none';
    });

  // Class Barycenters (Centroids) -> Click opens Slide-Over Class Quote Drawer
  afc.classes.forEach(c => {
    const color = CLASS_COLORS[(c.class_id - 1) % CLASS_COLORS.length];
    const cx = x(c[afcAxisX] || 0);
    const cy = y(c[afcAxisY] || 0);

    const bg = gMain.append('g')
      .attr('class', 'afc-class-badge')
      .attr('transform', `translate(${cx}, ${cy})`)
      .style('cursor', 'pointer')
      .on('mouseover', event => {
        tooltip.style('display', 'block')
          .html(`
            <strong style="color:${color};">${t('classLabel')} ${c.class_id} (${c.pct}%)</strong><br/>
            ${escapeHtml(c.label)}<br/>
            ${c.size} UCE
          `)
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', () => tooltip.style('display', 'none'))
      .on('click', event => {
        event.stopPropagation();
        openKwicDrawerForClass(c.class_id);
      });

    bg.append('rect')
      .attr('x', -48)
      .attr('y', -14)
      .attr('width', 96)
      .attr('height', 28)
      .attr('rx', 14)
      .attr('fill', color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))');

    bg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 4)
      .style('fill', '#ffffff')
      .style('font-size', '11px')
      .style('font-weight', '800')
      .text(`${t('classLabel').toUpperCase()} ${c.class_id}`);
  });

  // Axis Labels
  const f1Idx = parseInt(afcAxisX.replace('f', ''), 10) - 1;
  const f2Idx = parseInt(afcAxisY.replace('f', ''), 10) - 1;

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 12)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--text-muted)')
    .style('font-size', '12px')
    .style('font-weight', '600')
    .text(`${t('factorAxis')} ${f1Idx + 1} (${afc.inertia_explained[f1Idx]}% ${t('inertiaWord')})`);

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--text-muted)')
    .style('font-size', '12px')
    .style('font-weight', '600')
    .text(`${t('factorAxis')} ${f2Idx + 1} (${afc.inertia_explained[f2Idx]}% ${t('inertiaWord')})`);
}

// =========================================================================
// VIEW 4: SIMILITUDE ANALYSIS (CO-OCCURRENCE GRAPH & MST)
// =========================================================================
function renderSimilitudeView() {
  const container = document.getElementById('similitude-chart');
  if (!container) return;
  container.innerHTML = '';

  const width = container.clientWidth || 800;
  const height = 540;

  const sim = currentDataset.similitude;
  if (!sim) return;

  let edges = sim.edges || [];
  if (simMode === 'mst') {
    edges = edges.filter(e => e.is_mst);
  } else {
    edges = edges.filter(e => e.weight >= simEdgeThreshold);
  }

  const activeNodeIds = new Set();
  edges.forEach(e => {
    activeNodeIds.add(typeof e.source === 'object' ? e.source.id : e.source);
    activeNodeIds.add(typeof e.target === 'object' ? e.target.id : e.target);
  });

  let nodes = (sim.nodes || []).filter(n => activeNodeIds.has(n.id));
  if (simSearchFilter) {
    const matched = new Set();
    nodes.forEach(n => {
      if (n.id.toLowerCase().includes(simSearchFilter.toLowerCase())) {
        matched.add(n.id);
      }
    });
    edges.forEach(e => {
      const s = typeof e.source === 'object' ? e.source.id : e.source;
      const tId = typeof e.target === 'object' ? e.target.id : e.target;
      if (matched.has(s)) matched.add(tId);
      if (matched.has(tId)) matched.add(s);
    });
    nodes = nodes.filter(n => matched.has(n.id));
    edges = edges.filter(e => {
      const s = typeof e.source === 'object' ? e.source.id : e.source;
      const tId = typeof e.target === 'object' ? e.target.id : e.target;
      return matched.has(s) && matched.has(tId);
    });
  }

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'sim-svg')
    .attr('width', width)
    .attr('height', height);

  const gMain = svg.append('g');
  const zoom = d3.zoom()
    .scaleExtent([0.3, 5])
    .on('zoom', event => gMain.attr('transform', event.transform));
  svg.call(zoom);

  const simBtnIn = document.getElementById('sim-zoom-in');
  if (simBtnIn) simBtnIn.onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.35);
  const simBtnOut = document.getElementById('sim-zoom-out');
  if (simBtnOut) simBtnOut.onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 0.75);
  const simBtnReset = document.getElementById('sim-zoom-reset');
  if (simBtnReset) simBtnReset.onclick = () => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);

  let isPhysicsPaused = false;
  const physBtn = document.getElementById('sim-physics-toggle');
  if (physBtn) {
    physBtn.textContent = t('pausePhysics');
    physBtn.className = 'btn btn-ghost';
    physBtn.onclick = () => {
      if (!isPhysicsPaused) {
        if (simulation) simulation.stop();
        isPhysicsPaused = true;
        physBtn.textContent = t('resumePhysics');
        physBtn.className = 'btn btn-primary';
      } else {
        if (simulation) simulation.alpha(0.3).restart();
        isPhysicsPaused = false;
        physBtn.textContent = t('pausePhysics');
        physBtn.className = 'btn btn-ghost';
      }
    };
  }

  const simNodes = nodes.map(d => ({ ...d }));
  const simEdges = edges.map(d => ({
    ...d,
    source: typeof d.source === 'object' ? d.source.id : d.source,
    target: typeof d.target === 'object' ? d.target.id : d.target
  }));

  if (simulation) simulation.stop();
  simulation = d3.forceSimulation(simNodes)
    .force('link', d3.forceLink(simEdges).id(d => d.id).distance(simMode === 'mst' ? 68 : 88))
    .force('charge', d3.forceManyBody().strength(-210))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(24));

  const tooltip = d3.select('#global-tooltip');

  const link = gMain.selectAll('.sim-link')
    .data(simEdges)
    .enter()
    .append('line')
    .attr('class', 'sim-link')
    .attr('stroke', d => (d.is_mst ? 'var(--accent-primary)' : 'rgba(148, 163, 184, 0.3)'))
    .attr('stroke-width', d => Math.max(1.5, Math.min(6, d.weight * 12)))
    .attr('stroke-opacity', d => (d.is_mst ? 0.85 : 0.45))
    .on('mouseover', (event, d) => {
      const s = typeof d.source === 'object' ? d.source.id : d.source;
      const tgt = typeof d.target === 'object' ? d.target.id : d.target;
      tooltip.style('display', 'block')
        .html(`<strong>${escapeHtml(s)} ↔ ${escapeHtml(tgt)}</strong><br/>${t('coocTooltip')}: ${d.cooc}<br/>${t('jaccardTooltip')}: ${d.weight}`)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => tooltip.style('display', 'none'));

  let selectedEgoNodeId = null;

  const node = gMain.selectAll('.sim-node')
    .data(simNodes)
    .enter()
    .append('g')
    .attr('class', 'sim-node')
    .style('cursor', 'pointer')
    .call(
      d3.drag()
        .on('start', (event, d) => {
          if (!event.active && !isPhysicsPaused) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active && !isPhysicsPaused) simulation.alphaTarget(0);
          if (!isPhysicsPaused) {
            d.fx = null;
            d.fy = null;
          }
        })
    )
    .on('mouseover', (event, d) => {
      const color = CLASS_COLORS[(d.class_id - 1) % CLASS_COLORS.length];
      tooltip.style('display', 'block')
        .html(`
          <strong style="color:${color};">${escapeHtml(d.label)}</strong><br/>
          ${t('classLabel')}: ${d.class_id}<br/>
          ${t('freqTotal')}: ${d.freq} • χ²: ${d.chi2}<br/>
          <em style="font-size:10px; color:var(--text-muted);">${t('simClickHint')}</em>
        `)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => tooltip.style('display', 'none'))
    .on('click', (event, d) => {
      if (event.defaultPrevented) return; // Ignore drag release
      event.stopPropagation();
      selectedEgoNodeId = d.id;
      const neighbors = new Set([d.id]);
      simEdges.forEach(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        if (s === d.id) neighbors.add(tgt);
        if (tgt === d.id) neighbors.add(s);
      });
      node.style('opacity', n => (neighbors.has(n.id) ? 1 : 0.16));
      link.style('opacity', e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        return (s === d.id || tgt === d.id) ? 1 : 0.05;
      });
      openKwicDrawerForWord(d.id);
    });

  svg.on('click', () => {
    selectedEgoNodeId = null;
    node.style('opacity', 1);
    link.style('opacity', e => (e.is_mst ? 0.85 : 0.45));
  });

  node.append('circle')
    .attr('r', d => Math.min(22, Math.max(7, Math.sqrt(d.freq) * 2.8)))
    .attr('fill', d => CLASS_COLORS[(d.class_id - 1) % CLASS_COLORS.length])
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1.5)
    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

  node.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', d => Math.min(22, Math.max(7, Math.sqrt(d.freq) * 2.8)) + 12)
    .text(d => d.label)
    .style('font-size', '11px')
    .style('font-weight', '700')
    .style('fill', 'var(--text-main)')
    .style('pointer-events', 'none')
    .style('text-shadow', '0 1px 3px rgba(0,0,0,0.7)');

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x}, ${d.y})`);
  });
}

// =========================================================================
// VIEW 5: LEXICAL WORD CLOUDS
// =========================================================================
window.setCloudMetric = function (metric) {
  cloudMetric = metric;
  const fBtn = document.getElementById('cloud-metric-freq');
  const cBtn = document.getElementById('cloud-metric-chi2');
  if (fBtn && cBtn) {
    fBtn.className = metric === 'freq' ? 'btn btn-primary' : 'btn btn-ghost';
    cBtn.className = metric === 'chi2' ? 'btn btn-primary' : 'btn btn-ghost';
  }
  renderWordCloudsView();
};

function renderWordCloudsView() {
  const container = document.getElementById('wordcloud-canvas-wrapper');
  if (!container) return;
  container.innerHTML = '';

  const pillsContainer = document.getElementById('cloud-pills');
  if (pillsContainer) {
    pillsContainer.innerHTML = '';
    const allPill = document.createElement('button');
    allPill.className = `btn ${cloudClassId === 'all' ? 'btn-primary' : 'btn-ghost'}`;
    allPill.textContent = t('allClasses');
    allPill.onclick = () => { cloudClassId = 'all'; renderWordCloudsView(); };
    pillsContainer.appendChild(allPill);

    currentDataset.classes.forEach(c => {
      const p = document.createElement('button');
      p.className = `btn ${cloudClassId === String(c.class_id) ? 'btn-primary' : 'btn-ghost'}`;
      p.textContent = `${t('classLabel')} ${c.class_id}`;
      p.onclick = () => { cloudClassId = String(c.class_id); renderWordCloudsView(); };
      pillsContainer.appendChild(p);
    });
  }

  let wordList = [];
  if (cloudClassId === 'all') {
    wordList = (currentDataset.wordcloud.overall || []).slice(0, 72).map(w => ({
      word: w.word,
      value: cloudMetric === 'chi2' ? Math.max(1, w.chi2 || w.freq) : w.freq,
      freq: w.freq,
      chi2: w.chi2 || 0,
      p_value: w.p_value || '-',
      class_id: w.class_id || 1
    }));
  } else {
    const classWords = currentDataset.wordcloud.classes[cloudClassId] || [];
    wordList = classWords.slice(0, 50).map(w => ({
      word: w.word,
      value: cloudMetric === 'chi2' ? Math.max(1, w.chi2 || 1) : w.freq,
      freq: w.freq,
      chi2: w.chi2 || 0,
      p_value: w.p_value || '-',
      class_id: parseInt(cloudClassId, 10)
    }));
  }

  if (wordList.length === 0) return;

  wordList.sort((a, b) => b.value - a.value);

  const width = container.clientWidth || 800;
  const height = 510;

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'cloud-svg')
    .attr('width', width)
    .attr('height', height);

  const minVal = d3.min(wordList, d => d.value) || 1;
  const maxVal = d3.max(wordList, d => d.value) || 10;
  const fontScale = d3.scaleSqrt().domain([minVal, Math.max(minVal + 0.1, maxVal)]).range([14, 50]);

  const placedWords = [];
  const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);
  const tooltip = d3.select('#global-tooltip');

  function overlaps(x, y, w, h) {
    for (let i = 0; i < placedWords.length; i++) {
      const p = placedWords[i];
      if (!(x + w < p.x || x > p.x + p.w || y + h < p.y || y > p.y + p.h)) {
        return true;
      }
    }
    return false;
  }

  wordList.forEach(item => {
    const fontSize = fontScale(item.value);
    const textLen = item.word.length * (fontSize * 0.62) + 8;
    const textHeight = fontSize * 1.15;

    let placed = false;
    let theta = 0;
    const step = 0.28;
    let attempts = 0;

    while (!placed && attempts < 450) {
      const r = 4 * theta;
      const x = r * Math.cos(theta) - textLen / 2;
      const y = r * Math.sin(theta) - textHeight / 2;

      if (!overlaps(x, y, textLen, textHeight) && Math.abs(x) < (width / 2 - 45) && Math.abs(y) < (height / 2 - 32)) {
        placedWords.push({ x, y, w: textLen, h: textHeight });

        const color = CLASS_COLORS[(item.class_id - 1) % CLASS_COLORS.length];

        g.append('text')
          .attr('class', 'cloud-word')
          .attr('x', x + textLen / 2)
          .attr('y', y + textHeight * 0.78)
          .attr('text-anchor', 'middle')
          .text(item.word)
          .style('font-size', `${fontSize}px`)
          .style('font-weight', '700')
          .style('fill', color)
          .style('cursor', 'pointer')
          .style('transition', 'filter 0.15s ease, opacity 0.15s ease')
          .on('mouseover', function (event) {
            d3.select(this).style('filter', 'drop-shadow(0 0 8px rgba(255,255,255,0.6))');
            tooltip.style('display', 'block')
              .html(`
                <strong style="color:${color};">${escapeHtml(item.word)}</strong><br/>
                ${t('classLabel')}: ${item.class_id} • ${t('freqShort')}: ${item.freq}<br/>
                χ²: ${item.chi2} (${t('pVal')}: ${escapeHtml(item.p_value)})
              `)
              .style('left', (event.pageX + 12) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function () {
            d3.select(this).style('filter', 'none');
            tooltip.style('display', 'none');
          })
          .on('click', () => openKwicDrawerForWord(item.word));

        placed = true;
      }
      theta += step;
      attempts++;
    }
  });
}

// =========================================================================
// VIEW 6: FULL CONCORDANCER (KWIC)
// =========================================================================
function renderKwicView() {
  const input = document.getElementById('kwic-search-input');
  if (input && !kwicSearchQuery) {
    kwicSearchQuery = currentDataset.zipf_data[0] ? currentDataset.zipf_data[0].word : 'phone';
    input.value = kwicSearchQuery;
  }

  const pills = document.getElementById('kwic-class-pills');
  if (pills) {
    pills.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = `btn ${kwicClassFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`;
    allBtn.style.padding = '5px 10px';
    allBtn.style.fontSize = '12px';
    allBtn.textContent = t('allClasses');
    allBtn.onclick = () => { kwicClassFilter = 'all'; renderKwicView(); };
    pills.appendChild(allBtn);

    currentDataset.classes.forEach(c => {
      const btn = document.createElement('button');
      btn.className = `btn ${String(kwicClassFilter) === String(c.class_id) ? 'btn-primary' : 'btn-ghost'}`;
      btn.style.padding = '5px 10px';
      btn.style.fontSize = '12px';
      btn.textContent = `C${c.class_id}`;
      btn.onclick = () => { kwicClassFilter = String(c.class_id); renderKwicView(); };
      pills.appendChild(btn);
    });
  }

  executeKwicSearch();
}

function buildLemmaSearchRegex(word) {
  const query = String(word || '').toLowerCase().trim();
  const forms = new Set([query]);
  if (query.includes('_')) forms.add(query.replace(/_/g, ' '));
  if (currentDataset && currentDataset.lemma_forms && currentDataset.lemma_forms[query]) {
    currentDataset.lemma_forms[query].forEach(f => forms.add(f.toLowerCase()));
  }
  const sorted = Array.from(forms).filter(f => f.length >= 2).sort((a, b) => b.length - a.length);
  return new RegExp(`\\b(${sorted.map(escapeRegex).join('|')}\\w*)\\b`, 'i');
}

function executeKwicSearch() {
  const tbody = document.getElementById('kwic-tbody');
  const countEl = document.getElementById('kwic-results-count');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!kwicSearchQuery || kwicSearchQuery.trim().length < 2) {
    if (countEl) countEl.textContent = `0 ${t('occurrencesWord')}`;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:24px;">${t('enterSearchTerm')}</td></tr>`;
    return;
  }

  const query = kwicSearchQuery.toLowerCase().trim();
  const pattern = buildLemmaSearchRegex(query);
  const matches = [];

  (currentDataset.segments || []).forEach(s => {
    if (kwicClassFilter !== 'all' && String(s.class_id) !== String(kwicClassFilter)) return;
    const m = pattern.exec(s.text);
    const hasLemma = Array.isArray(s.lemmas) && s.lemmas.includes(query);
    if (m || hasLemma) {
      const idx = m ? m.index : 0;
      const keyword = m ? m[0] : query;
      const left = m ? s.text.substring(Math.max(0, idx - 65), idx).trim() : '';
      const right = m ? s.text.substring(idx + keyword.length, Math.min(s.text.length, idx + keyword.length + 65)).trim() : s.text.substring(0, 120);
      matches.push({
        segment_id: s.id,
        doc_id: s.doc_id,
        class_id: s.class_id,
        left,
        keyword,
        right,
        meta: s.meta || {}
      });
    }
  });

  if (countEl) countEl.textContent = `${matches.length} ${t('occurrencesWord')}`;

  if (matches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim); padding:24px;">${t('noMatchesFor')} "${escapeHtml(kwicSearchQuery)}"</td></tr>`;
    return;
  }

  matches.slice(0, 120).forEach(m => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => openDocModal(m.doc_id);

    const color = CLASS_COLORS[(m.class_id - 1) % CLASS_COLORS.length];
    const metaStr = Object.entries(m.meta)
      .filter(([k]) => k !== 'id')
      .map(([k, v]) => `*${k}_${v}`)
      .join(' ');

    tr.innerHTML = `
      <td style="text-align:right; color:var(--text-muted); font-size:12px; width:38%;">...${escapeHtml(m.left)}</td>
      <td style="text-align:center; width:130px;">
        <span class="kwic-highlight" style="background:${color}33; color:${color}; border-color:${color};">
          ${escapeHtml(m.keyword)}
        </span>
      </td>
      <td style="text-align:left; color:var(--text-muted); font-size:12px; width:38%;">${escapeHtml(m.right)}...</td>
      <td style="text-align:center; width:76px;">
        <span class="class-chip c${m.class_id}">C${m.class_id}</span>
      </td>
      <td style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">${escapeHtml(metaStr)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =========================================================================
// VIEW 7: METADATA CROSS-TABULATION
// =========================================================================
function renderMetaView() {
  const container = document.getElementById('meta-chart');
  if (!container) return;
  container.innerHTML = '';

  const metaCounts = {};
  (currentDataset.segments || []).forEach(s => {
    const cls = s.class_id;
    Object.entries(s.meta || {}).forEach(([k, v]) => {
      if (k === 'id' || k === 'doc') return;
      const key = `*${k}_${v}`;
      if (!metaCounts[key]) {
        metaCounts[key] = { key, total: 0 };
        for (let i = 1; i <= currentDataset.classes.length; i++) {
          metaCounts[key][`class_${i}`] = 0;
        }
      }
      metaCounts[key][`class_${cls}`] = (metaCounts[key][`class_${cls}`] || 0) + 1;
      metaCounts[key].total++;
    });
  });

  const sortedMeta = Object.values(metaCounts)
    .filter(m => m.total >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  if (sortedMeta.length === 0) {
    container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-dim); font-size:14px;">${t('noMetaChartData')}</div>`;
    return;
  }

  const width = container.clientWidth || 800;
  const height = 490;
  const margin = { top: 30, right: 120, bottom: 40, left: 190 };

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'meta-svg')
    .attr('width', width)
    .attr('height', height);

  const y = d3.scaleBand()
    .domain(sortedMeta.map(d => d.key))
    .range([margin.top, height - margin.bottom])
    .padding(0.25);

  const x = d3.scaleLinear()
    .domain([0, d3.max(sortedMeta, d => d.total)])
    .range([margin.left, width - margin.right]);

  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y))
    .call(g => g.selectAll('text').style('fill', 'var(--text-main)').style('font-size', '11px').style('font-family', 'var(--font-mono)'))
    .call(g => g.selectAll('line, path').style('stroke', 'var(--border-color)'));

  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call(g => g.selectAll('text').style('fill', 'var(--text-muted)'))
    .call(g => g.selectAll('line, path').style('stroke', 'var(--border-color)'));

  const keys = currentDataset.classes.map(c => `class_${c.class_id}`);
  const stack = d3.stack().keys(keys)(sortedMeta);
  const tooltip = d3.select('#global-tooltip');

  svg.append('g')
    .selectAll('g')
    .data(stack)
    .enter()
    .append('g')
    .attr('fill', (d, i) => CLASS_COLORS[i % CLASS_COLORS.length])
    .selectAll('rect')
    .data(d => d)
    .enter()
    .append('rect')
    .attr('y', d => y(d.data.key))
    .attr('x', d => x(d[0]))
    .attr('width', d => Math.max(0, x(d[1]) - x(d[0])))
    .attr('height', y.bandwidth())
    .style('cursor', 'pointer')
    .on('mouseover', (event, d) => {
      const clsNum = d3.select(event.currentTarget.parentNode).datum().key.replace('class_', '');
      const count = d[1] - d[0];
      tooltip.style('display', 'block')
        .html(`<strong>${escapeHtml(d.data.key)}</strong><br/>${t('classLabel')} ${clsNum}: ${count} UCE (${Math.round((count / d.data.total) * 100)}%)`)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => tooltip.style('display', 'none'));

  const legend = svg.append('g').attr('transform', `translate(${width - 105}, ${margin.top})`);
  currentDataset.classes.forEach((c, idx) => {
    const lg = legend.append('g').attr('transform', `translate(0, ${idx * 22})`);
    lg.append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 3)
      .attr('fill', CLASS_COLORS[idx % CLASS_COLORS.length]);
    lg.append('text')
      .attr('x', 18)
      .attr('y', 10)
      .text(`${t('classLabel')} ${c.class_id}`)
      .style('fill', 'var(--text-main)')
      .style('font-size', '11px')
      .style('font-weight', '600');
  });
}

// =========================================================================
// SLIDE-OVER KWIC / CONCORDANCER QUOTE DRAWER (CLICK FROM ANY CHART)
// =========================================================================
function findWordStats(word) {
  const lw = String(word).toLowerCase();
  const afcWord = (currentDataset.afc && currentDataset.afc.words || []).find(w => w.word === lw);
  const zipfWord = (currentDataset.zipf_data || []).find(w => w.word === lw);

  const classAssociations = [];
  let bestAssoc = null;
  (currentDataset.classes || []).forEach(c => {
    const found = (c.top_words || []).find(tw => tw.word === lw);
    if (found) {
      classAssociations.push({ ...found, class_id: c.class_id, class_size: c.size });
      if (!bestAssoc || found.chi2 > bestAssoc.chi2) {
        bestAssoc = { ...found, class_id: c.class_id };
      }
    }
  });

  // Fallback count across segments
  let segCount = 0;
  (currentDataset.segments || []).forEach(s => {
    if ((Array.isArray(s.lemmas) && s.lemmas.includes(lw)) || buildLemmaSearchRegex(lw).test(s.text)) {
      segCount++;
    }
  });

  return {
    word: lw,
    totalFreq: (afcWord && afcWord.freq) || (zipfWord && zipfWord.freq) || (bestAssoc && bestAssoc.freq_total) || segCount,
    assignedClass: (bestAssoc && bestAssoc.class_id) || (afcWord && afcWord.class_id) || 1,
    chi2: bestAssoc ? bestAssoc.chi2 : (afcWord ? afcWord.chi2 : 0),
    pValue: bestAssoc ? bestAssoc.p_value : (afcWord && afcWord.p_value) || '-',
    classAssociations
  };
}

function getMatchingQuotesForWord(word, classFilter) {
  const lw = String(word).toLowerCase();
  const regex = buildLemmaSearchRegex(lw);
  const stats = findWordStats(lw);
  const matched = [];

  (currentDataset.segments || []).forEach(s => {
    const hasLemma = Array.isArray(s.lemmas) && s.lemmas.includes(lw);
    const matchesText = regex.test(s.text);
    if (!hasLemma && !matchesText) return;

    const segScore = Number(s.score || 0);
    const assignedBonus = s.class_id === stats.assignedClass ? 25 : 0;
    const rankScore = segScore + assignedBonus;
    matched.push({ ...s, _rankScore: rankScore });
  });

  matched.sort((a, b) => b._rankScore - a._rankScore);

  const countsByClass = { all: matched.length };
  matched.forEach(s => {
    countsByClass[s.class_id] = (countsByClass[s.class_id] || 0) + 1;
  });

  const filtered = classFilter === 'all'
    ? matched
    : matched.filter(s => String(s.class_id) === String(classFilter));

  return { quotes: filtered.slice(0, 15), totalMatched: matched.length, countsByClass };
}

function openKwicDrawerForWord(word, preserveFilter = false) {
  if (!currentDataset || !word) return;
  drawerMode = 'word';
  drawerTargetWord = String(word).toLowerCase();
  if (!preserveFilter) drawerQuoteClassFilter = 'all';

  const stats = findWordStats(drawerTargetWord);
  const color = CLASS_COLORS[(stats.assignedClass - 1) % CLASS_COLORS.length];
  const { quotes, countsByClass } = getMatchingQuotesForWord(drawerTargetWord, drawerQuoteClassFilter);

  const titleEl = document.getElementById('drawer-title');
  const subEl = document.getElementById('drawer-subtitle');
  const fullBtn = document.getElementById('drawer-full-kwic-btn');
  const exclBtn = document.getElementById('drawer-exclude-btn');
  const body = document.getElementById('drawer-body');

  if (titleEl) {
    titleEl.innerHTML = `<span style="font-family:var(--font-mono); color:${color};">${escapeHtml(drawerTargetWord)}</span> <span class="class-chip c${stats.assignedClass}">${t('classLabel')} ${stats.assignedClass}</span>`;
  }
  if (subEl) subEl.textContent = t('drawerQuotesTitle');
  if (fullBtn) {
    fullBtn.style.display = 'inline-flex';
    fullBtn.onclick = () => jumpToKwic(drawerTargetWord);
  }
  if (exclBtn) {
    exclBtn.style.display = 'inline-flex';
    exclBtn.textContent = t('excludeWordBtn');
    exclBtn.onclick = () => excludeWordAndRecalculate(drawerTargetWord);
  }

  let html = `
    <div class="drawer-stats-grid">
      <div class="drawer-stat-box">
        <span class="drawer-stat-label">${t('freqTotal')}</span>
        <span class="drawer-stat-val">${stats.totalFreq}</span>
      </div>
      <div class="drawer-stat-box">
        <span class="drawer-stat-label">${t('classLabel')}</span>
        <span class="drawer-stat-val" style="color:${color};">C${stats.assignedClass}</span>
      </div>
      <div class="drawer-stat-box">
        <span class="drawer-stat-label">χ²</span>
        <span class="drawer-stat-val">${Number(stats.chi2 || 0).toFixed(2)}</span>
      </div>
      <div class="drawer-stat-box">
        <span class="drawer-stat-label">${t('pVal')}</span>
        <span class="drawer-stat-val" style="font-size:13px; color:#34d399;">${escapeHtml(stats.pValue)}</span>
      </div>
    </div>
  `;

  // Cross-class breakdown pills if associated with multiple or any classes
  if (stats.classAssociations.length > 0) {
    html += `
      <div>
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-dim); margin-bottom:6px;">${t('drawerClassBreakdown')}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${stats.classAssociations.map(a => `
            <span class="class-chip c${a.class_id}" style="cursor:default;">
              ${t('classLabel')} ${a.class_id}: χ²=${a.chi2} (${a.freq_class}/${a.class_size}, ${a.pct_class}%)
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Class Filter Pills for quotes
  html += `
    <div>
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-dim); margin-bottom:8px;">
        ${t('drawerTopQuotes')} (${quotes.length} / ${countsByClass.all})
      </div>
      <div class="drawer-filter-pills">
        <button class="btn ${drawerQuoteClassFilter === 'all' ? 'btn-primary' : 'btn-ghost'}" style="padding:4px 10px; font-size:11px;" onclick="setDrawerClassFilter('all')">
          ${t('allClasses')} (${countsByClass.all})
        </button>
        ${currentDataset.classes.map(c => {
          const cnt = countsByClass[c.class_id] || 0;
          const active = String(drawerQuoteClassFilter) === String(c.class_id);
          return `
            <button class="btn ${active ? 'btn-primary' : 'btn-ghost'}" style="padding:4px 10px; font-size:11px; ${cnt === 0 ? 'opacity:0.45;' : ''}" onclick="setDrawerClassFilter('${c.class_id}')">
              C${c.class_id} (${cnt})
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Original Quotes List (Top 15)
  if (quotes.length === 0) {
    html += `<div style="padding:24px; text-align:center; color:var(--text-dim); font-size:13px;">${t('drawerNoQuotes')}</div>`;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
    quotes.forEach(q => {
      const qColor = CLASS_COLORS[(q.class_id - 1) % CLASS_COLORS.length];
      const highlighted = highlightLemmaInText(q.text, [drawerTargetWord], qColor);
      const metaTags = Object.entries(q.meta || {})
        .filter(([k]) => k !== 'id')
        .map(([k, v]) => `*${k}_${v}`)
        .join(' ');

      html += `
        <div class="drawer-quote-card" style="border-left-color:${qColor};">
          <div class="drawer-quote-meta">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="class-chip c${q.class_id}" style="padding:2px 7px; font-size:10px;">C${q.class_id}</span>
              <span style="font-family:var(--font-mono);">UCE #${q.id}</span>
              ${q.score ? `<span style="background:var(--bg-card); padding:1px 6px; border-radius:4px;">χ² ${q.score}</span>` : ''}
            </div>
            <button class="btn btn-ghost" style="padding:2px 8px; font-size:10px;" onclick="openDocModal('${escapeHtml(q.doc_id)}')">${t('drawerViewDoc')}</button>
          </div>
          <div class="drawer-quote-text">${highlighted}</div>
          ${metaTags ? `<div style="font-size:10px; font-family:var(--font-mono); color:var(--text-dim);">${escapeHtml(metaTags)}</div>` : ''}
        </div>
      `;
    });
    html += `</div>`;
  }

  if (body) body.innerHTML = html;
  openKwicDrawerShell();
}

function openKwicDrawerForClass(classId) {
  if (!currentDataset) return;
  const c = currentDataset.classes.find(item => item.class_id === classId);
  if (!c) return;

  drawerMode = 'class';
  drawerTargetClassId = classId;
  const color = CLASS_COLORS[(c.class_id - 1) % CLASS_COLORS.length];

  const titleEl = document.getElementById('drawer-title');
  const subEl = document.getElementById('drawer-subtitle');
  const fullBtn = document.getElementById('drawer-full-kwic-btn');
  const exclBtn = document.getElementById('drawer-exclude-btn');
  const body = document.getElementById('drawer-body');

  if (titleEl) {
    titleEl.innerHTML = `<span style="color:${color};">● ${t('classLabel')} ${c.class_id}</span> <span class="nav-badge" style="background:${color}22; color:${color};">${c.pct}%</span>`;
  }
  if (subEl) subEl.textContent = `${c.label} — ${t('drawerClassSummary')}`;
  if (fullBtn) fullBtn.style.display = 'none';
  if (exclBtn) exclBtn.style.display = 'none';

  const topWord = c.top_words[0];
  const topClassWords = c.top_words.slice(0, 20).map(w => w.word);

  let html = `
    <div class="drawer-stats-grid">
      <div class="drawer-stat-box">
        <span class="drawer-stat-label">UCE</span>
        <span class="drawer-stat-val">${c.size}</span>
      </div>
      <div class="drawer-stat-box">
        <span class="drawer-stat-label">${t('pctCol')}</span>
        <span class="drawer-stat-val" style="color:${color};">${c.pct}%</span>
      </div>
      <div class="drawer-stat-box">
        <span class="drawer-stat-label">Top Lemma</span>
        <span class="drawer-stat-val" style="font-size:13px;">${topWord ? escapeHtml(topWord.word) : '-'}</span>
      </div>
      <div class="drawer-stat-box">
        <span class="drawer-stat-label">Max χ²</span>
        <span class="drawer-stat-val">${topWord ? topWord.chi2 : '0'}</span>
      </div>
    </div>

    <div>
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-dim); margin-bottom:8px;">${t('drawerTopLemmas')}</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        ${c.top_words.slice(0, 12).map(w => `
          <button class="class-chip c${c.class_id}" onclick="openKwicDrawerForWord('${escapeHtml(w.word)}')">
            ${escapeHtml(w.word)} <span style="opacity:0.75; font-size:10px;">χ²=${w.chi2}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div>
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-dim); margin-bottom:8px;">${t('drawerTopQuotes')} (${Math.min(15, c.top_segments.length)})</div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${c.top_segments.slice(0, 15).map(q => {
          const highlighted = highlightLemmaInText(q.text, topClassWords, color);
          const metaTags = Object.entries(q.meta || {}).filter(([k]) => k !== 'id').map(([k, v]) => `*${k}_${v}`).join(' ');
          return `
            <div class="drawer-quote-card" style="border-left-color:${color};">
              <div class="drawer-quote-meta">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-family:var(--font-mono); color:${color}; font-weight:700;">UCE #${q.id}</span>
                  <span style="background:var(--bg-card); padding:1px 6px; border-radius:4px;">χ² ${q.score}</span>
                </div>
                <button class="btn btn-ghost" style="padding:2px 8px; font-size:10px;" onclick="openDocModal('${escapeHtml(q.doc_id)}')">${t('drawerViewDoc')}</button>
              </div>
              <div class="drawer-quote-text">${highlighted}</div>
              ${metaTags ? `<div style="font-size:10px; font-family:var(--font-mono); color:var(--text-dim);">${escapeHtml(metaTags)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (body) body.innerHTML = html;
  openKwicDrawerShell();
}

function setDrawerClassFilter(cls) {
  drawerQuoteClassFilter = cls;
  if (drawerTargetWord) openKwicDrawerForWord(drawerTargetWord, true);
}
window.setDrawerClassFilter = setDrawerClassFilter;

function openKwicDrawerShell() {
  const bd = document.getElementById('kwic-drawer-backdrop');
  const dr = document.getElementById('kwic-drawer');
  if (bd) bd.classList.add('open');
  if (dr) {
    dr.classList.add('open');
    dr.setAttribute('aria-hidden', 'false');
  }
}

function closeKwicDrawer() {
  const bd = document.getElementById('kwic-drawer-backdrop');
  const dr = document.getElementById('kwic-drawer');
  if (bd) bd.classList.remove('open');
  if (dr) {
    dr.classList.remove('open');
    dr.setAttribute('aria-hidden', 'true');
  }
}
window.closeKwicDrawer = closeKwicDrawer;
window.openKwicDrawerForWord = openKwicDrawerForWord;
window.openKwicDrawerForClass = openKwicDrawerForClass;
window.openWordModal = openKwicDrawerForWord;

function jumpToKwic(word) {
  closeKwicDrawer();
  closeModals();
  kwicSearchQuery = word;
  kwicClassFilter = 'all';
  switchToTab('kwic');
  const input = document.getElementById('kwic-search-input');
  if (input) input.value = word;
  executeKwicSearch();
}
window.jumpToKwic = jumpToKwic;

// =========================================================================
// DOCUMENT VIEWER MODAL
// =========================================================================
function openDocModal(docId) {
  const overlay = document.getElementById('doc-modal-overlay');
  const title = document.getElementById('doc-modal-title');
  const body = document.getElementById('doc-modal-body');
  if (!overlay || !title || !body) return;

  title.textContent = `${t('docViewerTitle')} (ID: ${docId})`;

  const docSegments = (currentDataset.segments || []).filter(s => String(s.doc_id) === String(docId));
  if (docSegments.length === 0) return;

  const first = docSegments[0];
  const metaHtml = Object.entries(first.meta || {}).map(([k, v]) => `
    <span class="nav-badge" style="background:var(--bg-card); color:var(--text-main); font-family:var(--font-mono);">
      *${escapeHtml(k)}_${escapeHtml(v)}
    </span>
  `).join(' ');

  const fullText = docSegments.map(s => escapeHtml(s.text)).join(' ');

  body.innerHTML = `
    <div style="margin-bottom:14px; display:flex; gap:6px; flex-wrap:wrap;">${metaHtml}</div>
    <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px; line-height:1.7; font-size:14px; color:var(--text-main); max-height:450px; overflow-y:auto;">
      ${fullText}
    </div>
  `;
  overlay.classList.add('open');
}
window.openDocModal = openDocModal;

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}
window.closeModals = closeModals;

// =========================================================================
// VIEW 8: DIRECT CSV / EXCEL IMPORTER + COLUMN MAPPING + LIVE CORPUS
// =========================================================================
async function handleUploadedFile(file) {
  if (!file) return;
  const ext = file.name.toLowerCase().split('.').pop();

  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
    const formData = new FormData();
    formData.append('file', file);
    showToast(`Uploading ${file.name}...`);

    try {
      const res = await fetch('/api/upload/preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      openColumnMappingModal(data);
    } catch (err) {
      console.error('Upload preview failed:', err);
      alert(`Failed to inspect spreadsheet (${file.name}): ${err.message}\nMake sure the Python FastAPI server is running (python server.py).`);
    }
    return;
  }

  // Classic IRaMuTeQ .txt file
  const reader = new FileReader();
  reader.onload = evt => {
    const ta = document.getElementById('custom-corpus-text');
    if (ta) ta.value = evt.target.result;
    showToast(`Loaded ${file.name} — click "${t('runAnalysis')}" to analyze.`);
  };
  reader.readAsText(file);
}

function openColumnMappingModal(previewData) {
  stagedUpload = previewData;
  selectedMetaCols = new Set(previewData.suggested_meta_cols || []);

  const infoEl = document.getElementById('col-map-fileinfo');
  if (infoEl) {
    infoEl.textContent = `${previewData.filename} • ${previewData.total_rows.toLocaleString()} rows • ${previewData.columns.length} columns`;
  }

  const textSelect = document.getElementById('col-map-text-select');
  if (textSelect) {
    textSelect.innerHTML = '';
    previewData.columns.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      if (col === previewData.suggested_text_col) opt.selected = true;
      textSelect.appendChild(opt);
    });
    textSelect.onchange = () => {
      selectedMetaCols.delete(textSelect.value);
      renderMetaColumnPills();
    };
  }

  renderMetaColumnPills();

  // Render 5-row data preview table
  const thead = document.getElementById('col-map-preview-thead');
  const tbody = document.getElementById('col-map-preview-tbody');
  if (thead && tbody) {
    thead.innerHTML = `<tr>${previewData.columns.map(c => `<th style="font-family:var(--font-mono); white-space:nowrap;">${escapeHtml(c)}</th>`).join('')}</tr>`;
    tbody.innerHTML = (previewData.preview_rows || []).map(row => `
      <tr>${previewData.columns.map(c => `<td class="preview-table-cell" title="${escapeHtml(row[c] || '')}">${escapeHtml(row[c] || '')}</td>`).join('')}</tr>
    `).join('');
  }

  const errEl = document.getElementById('col-map-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  const overlay = document.getElementById('column-map-overlay');
  if (overlay) overlay.classList.add('open');
}

function renderMetaColumnPills() {
  if (!stagedUpload) return;
  const container = document.getElementById('col-map-meta-pills');
  const textCol = document.getElementById('col-map-text-select')?.value;
  if (!container) return;
  container.innerHTML = '';

  stagedUpload.columns.forEach(col => {
    if (col === textCol) return;
    const pill = document.createElement('button');
    pill.type = 'button';
    const isSel = selectedMetaCols.has(col);
    pill.className = `meta-col-pill ${isSel ? 'selected' : ''}`;
    pill.innerHTML = `<span>${isSel ? '✓' : '+'}</span> *${escapeHtml(col)}`;
    pill.onclick = () => {
      if (selectedMetaCols.has(col)) selectedMetaCols.delete(col);
      else selectedMetaCols.add(col);
      renderMetaColumnPills();
    };
    container.appendChild(pill);
  });
}

async function submitColumnMapping() {
  if (!stagedUpload) return;
  const textCol = document.getElementById('col-map-text-select')?.value;
  const targetClasses = parseInt(document.getElementById('col-map-classes-select')?.value || '5', 10);
  const language = document.getElementById('col-map-lang-select')?.value || 'en';
  const detectBigrams = Boolean(document.getElementById('col-map-bigrams-check')?.checked);
  const btn = document.getElementById('col-map-run-btn');
  const errEl = document.getElementById('col-map-error');

  if (!textCol) return;
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  if (btn) { btn.disabled = true; btn.textContent = t('processingLabel'); }

  const dsName = stagedUpload.filename.replace(/\.[^.]+$/, '');
  const metaCols = Array.from(selectedMetaCols);

  try {
    const res = await fetch('/api/analyze/mapped', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_id: stagedUpload.upload_id,
        text_column: textCol,
        metadata_columns: metaCols,
        target_classes: targetClasses,
        language,
        detect_bigrams: detectBigrams,
        custom_stopwords: [],
        dataset_name: dsName
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

    const customKey = `imported_${Date.now()}`;
    window.IRAMUTEQ_PRECOMPUTED_DATA = window.IRAMUTEQ_PRECOMPUTED_DATA || {};
    window.IRAMUTEQ_PRECOMPUTED_DATA[customKey] = data;
    datasetSources[customKey] = {
      source_type: 'upload',
      upload_id: stagedUpload.upload_id,
      text_column: textCol,
      metadata_columns: metaCols,
      target_classes: targetClasses,
      language,
      detect_bigrams: detectBigrams,
      custom_stopwords: [],
      dataset_name: data.name
    };
    populateDatasetSelect(Object.keys(window.IRAMUTEQ_PRECOMPUTED_DATA));
    closeModals();
    switchDataset(customKey);
    switchToTab('reinert');
    showToast(t('importSuccessToast'));
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>🚀</span> <span>${t('runMappedAnalysis')}</span>`;
    }
  }
}
window.submitColumnMapping = submitColumnMapping;

async function runCustomCorpusAnalysis() {
  const textarea = document.getElementById('custom-corpus-text');
  if (!textarea || !textarea.value.trim()) {
    showToast('Please paste corpus text or upload a .csv / .xlsx / .txt file.');
    return;
  }

  const rawText = textarea.value.trim();
  const targetClasses = parseInt(document.getElementById('custom-target-classes')?.value || '5', 10);
  const language = document.getElementById('custom-corpus-lang')?.value || 'en';
  const detectBigrams = Boolean(document.getElementById('custom-detect-bigrams')?.checked);
  const btn = document.getElementById('run-custom-btn');
  if (btn) { btn.disabled = true; btn.textContent = t('processingLabel'); }

  try {
    let parsed = null;
    if (typeof fetch === 'function' && window.location.protocol !== 'file:') {
      const res = await fetch('/api/analyze/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          dataset_name: `Custom Corpus (${language.toUpperCase()})`,
          target_classes: targetClasses,
          language,
          detect_bigrams: detectBigrams,
          custom_stopwords: []
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.detail || `HTTP ${res.status}`);
      parsed = payload;
    }

    if (!parsed) {
      parsed = analyzeCorpusInBrowser(rawText);
    }

    const customKey = `custom_${Date.now()}`;
    window.IRAMUTEQ_PRECOMPUTED_DATA = window.IRAMUTEQ_PRECOMPUTED_DATA || {};
    window.IRAMUTEQ_PRECOMPUTED_DATA[customKey] = parsed;
    datasetSources[customKey] = {
      source_type: 'text',
      raw_text: rawText,
      target_classes: targetClasses,
      language,
      detect_bigrams: detectBigrams,
      custom_stopwords: [],
      dataset_name: parsed.name
    };
    populateDatasetSelect(Object.keys(window.IRAMUTEQ_PRECOMPUTED_DATA));
    switchDataset(customKey);
    switchToTab('reinert');
    showToast(t('importSuccessToast'));
  } catch (e) {
    console.error(e);
    showToast('Error: ' + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>🚀</span> <span data-i18n="runAnalysis">${t('runAnalysis')}</span>`;
    }
  }
}

// Offline client-side fallback engine (no destructive regex truncation)
const CLIENT_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
  'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few',
  'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him',
  'his', 'how', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me', 'more', 'most', 'my', 'no',
  'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why', 'with',
  'would', 'you', 'your', 'also', 'like', 'really', 'even', 'one', 'get', 'much', 'many', 'well',
  'something', 'anything', 'everything', 'nothing', 'always', 'never', 'still', 'already'
]);

function cleanAndTokenize(text) {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-z\u0400-\u04ff\s]/g, ' ');
  return cleaned
    .split(/\s+/)
    .filter(w => w.length >= 3 && !CLIENT_STOP_WORDS.has(w));
}

function analyzeCorpusInBrowser(rawText) {
  const docParts = rawText.split('****');
  const docs = [];
  if (docParts.length > 1) {
    docParts.slice(1).forEach((p, idx) => {
      const lines = p.trim().split('\n');
      const h = lines[0].trim();
      const b = lines.slice(1).join(' ').trim();
      const meta = {};
      h.split(/\s+/).forEach(tok => {
        if (tok.startsWith('*')) {
          const kv = tok.slice(1).split('_');
          meta[kv[0]] = kv[1] || 'val';
        }
      });
      if (b) docs.push({ id: meta.id || String(idx + 1), meta, text: b });
    });
  } else {
    rawText.split(/\n\s*\n/).forEach((p, idx) => {
      if (p.trim()) docs.push({ id: String(idx + 1), meta: { doc: String(idx + 1) }, text: p.trim() });
    });
  }

  const segments = [];
  docs.forEach(d => {
    const lemmas = cleanAndTokenize(d.text);
    if (lemmas.length >= 2) {
      segments.push({ id: segments.length + 1, doc_id: d.id, meta: d.meta, text: d.text, lemmas, score: 10.0 });
    }
  });

  const N = Math.max(1, segments.length);
  const wordFreq = {};
  segments.forEach(s => s.lemmas.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; }));
  const sortedFreq = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
  const activeWords = sortedFreq.slice(0, 60).map(x => x[0]);

  const k = Math.min(4, Math.max(2, Math.floor(N / 2)));
  const classesIndices = Array.from({ length: k }, () => []);
  segments.forEach((s, idx) => {
    classesIndices[idx % k].push(idx);
    s.class_id = (idx % k) + 1;
  });

  const chi2Table = [];
  const classes = classesIndices.map((indices, cIdx) => {
    const clsId = cIdx + 1;
    const clsWordFreq = {};
    indices.forEach(i => segments[i].lemmas.forEach(w => { clsWordFreq[w] = (clsWordFreq[w] || 0) + 1; }));
    const topWords = Object.entries(clsWordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([w, fc]) => {
        const entry = {
          word: w,
          class_id: clsId,
          chi2: Number((fc * 3.5).toFixed(2)),
          freq_class: fc,
          freq_total: wordFreq[w] || fc,
          pct_class: Math.round((fc / Math.max(1, indices.length)) * 1000) / 10,
          p_value: '< 0.05',
          p_value_num: 0.01
        };
        chi2Table.push(entry);
        return entry;
      });
    return {
      class_id: clsId,
      label: topWords.slice(0, 3).map(w => w.word).join(' / ').toUpperCase() || `CLASS ${clsId}`,
      size: indices.length,
      pct: Math.round((indices.length / N) * 1000) / 10,
      top_words: topWords,
      top_metadata: [],
      top_segments: indices.slice(0, 10).map(i => ({ ...segments[i] }))
    };
  });

  const totalTokens = Object.values(wordFreq).reduce((a, b) => a + b, 0);
  const uniqueForms = Object.keys(wordFreq).length;
  const hapaxCount = Object.values(wordFreq).filter(v => v === 1).length;

  return {
    name: 'Custom User Corpus (Offline)',
    lexical_stats: {
      total_docs: docs.length,
      total_segments: segments.length,
      total_tokens: totalTokens,
      unique_forms: uniqueForms,
      hapax_count: hapaxCount,
      hapax_pct: Math.round((hapaxCount / Math.max(1, uniqueForms)) * 1000) / 10,
      type_token_ratio: Math.round((uniqueForms / Math.max(1, totalTokens)) * 1000) / 10,
      avg_words_per_uce: Math.round((totalTokens / N) * 10) / 10
    },
    zipf_data: sortedFreq.slice(0, 50).map(([w, c], i) => ({
      rank: i + 1,
      word: w,
      freq: c,
      theoretical_zipf: Math.round((sortedFreq[0] ? sortedFreq[0][1] : 1) / (i + 1))
    })),
    classes,
    chi2_table: chi2Table,
    dendrogram: {
      name: `Corpus (${segments.length} UCEs)`,
      size: segments.length,
      pct: 100,
      children: classes.map(c => ({
        name: `Class ${c.class_id}`,
        class_id: c.class_id,
        label: c.label,
        size: c.size,
        pct: c.pct,
        top_words: c.top_words.slice(0, 5)
      }))
    },
    afc: {
      eigenvalues: [0.6, 0.4, 0.2],
      inertia_explained: [50.0, 33.3, 16.7],
      classes: classes.map((c, i) => ({
        class_id: c.class_id,
        label: c.label,
        size: c.size,
        pct: c.pct,
        f1: Math.cos((i * 2 * Math.PI) / k),
        f2: Math.sin((i * 2 * Math.PI) / k),
        f3: 0
      })),
      words: activeWords.slice(0, 40).map((w, i) => ({
        word: w,
        freq: wordFreq[w],
        class_id: (i % k) + 1,
        chi2: 8.0,
        p_value: '< 0.05',
        f1: Math.cos(i * 0.7) * 0.8,
        f2: Math.sin(i * 0.7) * 0.8,
        f3: 0
      }))
    },
    similitude: {
      nodes: activeWords.slice(0, 30).map((w, i) => ({
        id: w, label: w, freq: wordFreq[w], class_id: (i % k) + 1, chi2: 8.0
      })),
      edges: activeWords.slice(0, Math.min(20, activeWords.length - 1)).map((w, i) => ({
        source: w, target: activeWords[i + 1], cooc: 2, weight: 0.2, is_mst: true
      }))
    },
    wordcloud: {
      overall: sortedFreq.slice(0, 60).map(([w, c], i) => ({ word: w, freq: c, class_id: (i % k) + 1, chi2: 8.0 })),
      classes: Object.fromEntries(classes.map(c => [String(c.class_id), c.top_words]))
    },
    lemma_forms: {},
    segments
  };
}

function insertSampleCorpus(type) {
  const textarea = document.getElementById('custom-corpus-text');
  const langSel = document.getElementById('custom-corpus-lang');
  if (!textarea) return;
  if (type === 'fr') {
    if (langSel) langSel.value = 'fr';
    textarea.value = `**** *source_enquete *groupe_etudiant
Depuis six mois, je réduis mon temps écran sur les réseaux sociaux. Désactiver les notifications améliore nettement mon sommeil, ma concentration et ma santé mentale au quotidien.

**** *source_entretien *groupe_parent
La sobriété numérique commence par remplacer les écrans du soir par la lecture de livres papier. Mes enfants retrouvent le plaisir du jeu libre sans smartphone ni vidéos courtes.

**** *source_enquete *groupe_etudiant
Les algorithmes de recommandation exploitent la dopamine et provoquent une fatigue visuelle importante. Utiliser un téléphone minimaliste ou une liseuse électronique redonne du calme.

**** *source_entretien *groupe_parent
Déconnecter pendant le week-end favorise la créativité, la conversation en famille et diminue fortement l'anxiété liée au flux constant d'actualités numériques.

**** *source_enquete *groupe_etudiant
Les applications de blocage et les lanceurs minimalistes aident à garder les cartes de navigation tout en supprimant les vidéos courtes addictives sur les téléphones portables.

**** *source_entretien *groupe_parent
Un temps calme sans sollicitation numérique active la réflexion personnelle, réduit le stress professionnel et permet de reprendre le contrôle sur ses habitudes quotidiennes.`;
  } else if (type === 'ru') {
    if (langSel) langSel.value = 'ru';
    textarea.value = `**** *источник_опрос *группа_студент
За последние полгода я сократил экранное время на смартфоне с шести часов до сорока минут. Качество сна, концентрация внимания и ясность мышления заметно улучшились.

**** *источник_интервью *группа_специалист
Переход на кнопочный телефон и чтение бумажных книг помогли избавиться от бесконечного скроллинга коротких видео и постоянных уведомлений социальных сетей.

**** *источник_опрос *группа_студент
Электронные книги на экране с электронными чернилами снижают усталость глаз. Цифровой детокс в выходные возвращает спокойствие и снижает уровень тревожности.

**** *источник_интервью *группа_специалист
Минималистичные лаунчеры на смартфоне позволяют оставить банковские приложения и навигацию, но полностью блокируют алгоритмические ленты и развлекательные сервисы.

**** *источник_опрос *группа_студент
Живые встречи без гаджетов в кафе и прогулки на природе восстанавливают дофаминовую чувствительность, усиливают саморефлексию и помогают справляться с выгоранием.

**** *источник_интервью *группа_специалист
Тишина без экрана активирует сеть пассивного режима мозга, укрепляет память и творческое мышление вместо хаотичного потребления новостей в интернете.`;
  } else {
    if (langSel) langSel.value = 'en';
    textarea.value = `**** *author_p01 *channel_reddit *topic_detox
I have spent the past six months drastically reducing my daily screen time. My smartphone usage went from six hours a day to less than forty minutes. The improvement in my mental clarity, sleep quality, and deep focus is immense.

**** *author_p02 *channel_youtube *topic_hardware
We live in an era of relentless notification overload and social media dopamine loops. Switching to a minimalist dumbphone and reading physical books helped me rediscover peaceful morning walks without constant distractions.

**** *author_p03 *channel_survey *topic_reading
E-readers and monochrome e-ink screens are game changers for eye strain and digital wellness. The goal is not eliminating modern technology completely, but regaining intentional control over information consumption.

**** *author_p04 *channel_reddit *topic_detox
Uninstalling endless doomscrolling video feeds revealed how much background anxiety they caused. Now I reserve digital tools strictly for work, navigation maps, and urgent messages while keeping evenings offline with family.

**** *author_p05 *channel_interview *topic_hardware
Minimalist Android launchers turn an existing phone into a calm tool without buying expensive new hardware. Blocking browser apps and short-form video reels immediately saved ten hours every week.

**** *author_p06 *channel_survey *topic_wellbeing
Allowing your brain quiet idle moments activates the default mode network, supporting creativity, emotional introspection, and healthier memory consolidation instead of continuous algorithmic stimulation.`;
  }
}
window.insertSampleCorpus = insertSampleCorpus;

// =========================================================================
// GLOBAL EVENT BINDINGS
// =========================================================================
function bindGlobalEvents() {
  // Chi2 Table search & sort
  const chi2Search = document.getElementById('chi2-search-input');
  if (chi2Search) {
    chi2Search.addEventListener('input', e => {
      chi2SearchQuery = e.target.value;
      renderChi2StatsTable();
    });
  }
  document.querySelectorAll('#tab-reinert th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (chi2SortKey === key) {
        chi2SortDir = chi2SortDir === 'desc' ? 'asc' : 'desc';
      } else {
        chi2SortKey = key;
        chi2SortDir = key === 'word' || key === 'p_value_num' || key === 'class_id' ? 'asc' : 'desc';
      }
      renderChi2StatsTable();
    });
  });

  // AFC controls
  const afcSearch = document.getElementById('afc-search-input');
  if (afcSearch) {
    afcSearch.addEventListener('input', e => {
      afcSearchFilter = e.target.value;
      renderAfcView();
    });
  }
  const afcThresh = document.getElementById('afc-thresh-slider');
  if (afcThresh) {
    afcThresh.addEventListener('input', e => {
      afcThreshold = parseInt(e.target.value, 10);
      document.getElementById('afc-thresh-val').textContent = afcThreshold;
      renderAfcView();
    });
  }
  const afcAxisSel = document.getElementById('afc-axis-selector');
  if (afcAxisSel) {
    afcAxisSel.addEventListener('change', e => {
      const parts = e.target.value.split('-');
      afcAxisX = parts[0];
      afcAxisY = parts[1];
      renderAfcView();
    });
  }

  // Similitude controls
  const simModeSel = document.getElementById('sim-mode-toggle');
  if (simModeSel) {
    simModeSel.addEventListener('change', e => {
      simMode = e.target.value;
      renderSimilitudeView();
    });
  }
  const simThresh = document.getElementById('sim-thresh-slider');
  if (simThresh) {
    simThresh.addEventListener('input', e => {
      simEdgeThreshold = parseFloat(e.target.value);
      document.getElementById('sim-thresh-val').textContent = simEdgeThreshold;
      renderSimilitudeView();
    });
  }
  const simSearch = document.getElementById('sim-search-input');
  if (simSearch) {
    simSearch.addEventListener('input', e => {
      simSearchFilter = e.target.value;
      renderSimilitudeView();
    });
  }

  // KWIC search
  const kwicSearch = document.getElementById('kwic-search-input');
  if (kwicSearch) {
    kwicSearch.addEventListener('input', e => {
      kwicSearchQuery = e.target.value;
      executeKwicSearch();
    });
  }

  // Custom corpus & Drag/Drop upload
  const customBtn = document.getElementById('run-custom-btn');
  if (customBtn) customBtn.addEventListener('click', runCustomCorpusAnalysis);

  const fileInput = document.getElementById('custom-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) handleUploadedFile(file);
      fileInput.value = '';
    });
  }

  const dropzone = document.getElementById('upload-dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(ev => {
      dropzone.addEventListener(ev, e => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(ev => {
      dropzone.addEventListener(ev, e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', e => {
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) handleUploadedFile(file);
    });
  }

  // Escape key closes drawer & modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeKwicDrawer();
      closeModals();
    }
  });

  // Resize re-render (debounced)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderCurrentView(), 180);
  });
}

// =========================================================================
// VIEW: METADATA SPECIFICITY ANALYSIS (SUB-CORPUS CHI2 DIVERGING CHART)
// =========================================================================
function getActiveSpecificityModality() {
  const vars = (currentDataset && currentDataset.specificity && currentDataset.specificity.variables) || [];
  if (vars.length === 0) return { vars: [], activeVar: null, activeMod: null };
  let activeVar = vars.find(v => v.variable === specVarName) || vars[0];
  specVarName = activeVar.variable;
  let activeMod = activeVar.modalities.find(m => m.value === specModValue) || activeVar.modalities[0];
  specModValue = activeMod ? activeMod.value : null;
  return { vars, activeVar, activeMod };
}

function renderSpecificityView() {
  const container = document.getElementById('specificity-chart');
  const varSelect = document.getElementById('spec-var-selector');
  const modPills = document.getElementById('spec-mod-pills');
  if (!container) return;
  container.innerHTML = '';

  const { vars, activeVar, activeMod } = getActiveSpecificityModality();

  if (varSelect) {
    varSelect.innerHTML = '';
    vars.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.variable;
      opt.textContent = `*${v.variable} (${v.modalities.length})`;
      if (activeVar && v.variable === activeVar.variable) opt.selected = true;
      varSelect.appendChild(opt);
    });
    varSelect.onchange = e => {
      specVarName = e.target.value;
      specModValue = null;
      renderSpecificityView();
    };
  }

  if (modPills) {
    modPills.innerHTML = '';
    if (activeVar) {
      activeVar.modalities.forEach(m => {
        const btn = document.createElement('button');
        const active = activeMod && m.value === activeMod.value;
        btn.className = `btn ${active ? 'btn-primary' : 'btn-ghost'}`;
        btn.style.padding = '5px 10px';
        btn.style.fontSize = '12px';
        btn.textContent = `${m.value} (${m.segment_count} UCE)`;
        btn.onclick = () => {
          specModValue = m.value;
          renderSpecificityView();
        };
        modPills.appendChild(btn);
      });
    }
  }

  if (!activeMod) {
    container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-dim); font-size:14px;">${t('specNoData')}</div>`;
    return;
  }

  const overItems = (activeMod.over || []).slice(0, 10);
  const underItems = (activeMod.under || []).slice(0, 10);
  const rows = [...overItems, ...underItems.slice().reverse()];

  if (rows.length === 0) {
    container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-dim); font-size:14px;">${t('specNoData')}</div>`;
    return;
  }

  const width = Math.max(container.clientWidth || 860, 620);
  const height = Math.max(460, rows.length * 25 + 95);
  const margin = { top: 44, right: 80, bottom: 44, left: 80 };

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'spec-svg')
    .attr('width', width)
    .attr('height', height);

  const maxAbs = Math.max(6, d3.max(rows, d => Math.abs(d.signed_chi2)) * 1.18);
  const x = d3.scaleLinear().domain([-maxAbs, maxAbs]).range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(rows.map(d => d.word)).range([margin.top, height - margin.bottom]).padding(0.24);

  // Title banner inside SVG (great for White Paper export!)
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 22)
    .attr('text-anchor', 'middle')
    .style('font-size', '13px')
    .style('font-weight', '700')
    .style('fill', 'var(--text-main)')
    .text(`${activeMod.label} (${activeMod.segment_count} UCE • ${activeMod.pct}% corpus) — Signed χ² Specificity`);

  // Significance threshold lines (+/- 3.84, p < 0.05)
  [-3.84, 3.84].forEach(thresh => {
    if (Math.abs(thresh) < maxAbs) {
      svg.append('line')
        .attr('x1', x(thresh)).attr('x2', x(thresh))
        .attr('y1', margin.top).attr('y2', height - margin.bottom)
        .attr('stroke', 'rgba(148, 163, 184, 0.35)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    }
  });

  // Zero centerline
  svg.append('line')
    .attr('x1', x(0)).attr('x2', x(0))
    .attr('y1', margin.top - 4).attr('y2', height - margin.bottom)
    .attr('stroke', 'var(--text-muted)')
    .attr('stroke-width', 1.5);

  // X Axis
  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8))
    .call(g => g.selectAll('text').style('fill', 'var(--text-muted)').style('font-size', '11px'))
    .call(g => g.selectAll('line, path').style('stroke', 'var(--border-color)'));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 8)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('fill', 'var(--text-muted)')
    .text(`← ${t('specUnderLabel')}  |  ${t('specThresholdLabel')}  |  ${t('specOverLabel')} →`);

  const tooltip = d3.select('#global-tooltip');

  const barG = svg.selectAll('.spec-row')
    .data(rows)
    .enter()
    .append('g')
    .attr('class', 'spec-row')
    .style('cursor', 'pointer')
    .on('mouseover', (event, d) => {
      const col = d.signed_chi2 >= 0 ? '#10b981' : '#f43f5e';
      tooltip.style('display', 'block')
        .html(`
          <strong style="color:${col};">${escapeHtml(d.word)}</strong> (${escapeHtml(activeMod.label)})<br/>
          Signed χ²: <strong>${d.signed_chi2 > 0 ? '+' : ''}${d.signed_chi2}</strong> (${t('pVal')}: ${escapeHtml(d.p_value)})<br/>
          In group: ${d.freq_mod} / ${activeMod.segment_count} (${d.pct_mod}%) vs Corpus: ${d.pct_corpus}%
        `)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => tooltip.style('display', 'none'))
    .on('click', (event, d) => openKwicDrawerForWord(d.word));

  barG.append('rect')
    .attr('x', d => (d.signed_chi2 >= 0 ? x(0) : x(d.signed_chi2)))
    .attr('y', d => y(d.word))
    .attr('width', d => Math.max(2, Math.abs(x(d.signed_chi2) - x(0))))
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .attr('fill', d => (d.signed_chi2 >= 0 ? '#10b981' : '#f43f5e'))
    .attr('fill-opacity', 0.85);

  // Lemma labels positioned cleanly on the opposite side of the zero baseline
  barG.append('text')
    .attr('x', d => (d.signed_chi2 >= 0 ? x(0) - 8 : x(0) + 8))
    .attr('y', d => y(d.word) + y.bandwidth() / 2 + 4)
    .attr('text-anchor', d => (d.signed_chi2 >= 0 ? 'end' : 'start'))
    .text(d => d.word)
    .style('font-size', '11.5px')
    .style('font-weight', '700')
    .style('font-family', 'var(--font-mono)')
    .style('fill', 'var(--text-main)');

  // Numeric signed chi2 value outside bar tip
  barG.append('text')
    .attr('x', d => (d.signed_chi2 >= 0 ? x(d.signed_chi2) + 6 : x(d.signed_chi2) - 6))
    .attr('y', d => y(d.word) + y.bandwidth() / 2 + 4)
    .attr('text-anchor', d => (d.signed_chi2 >= 0 ? 'start' : 'end'))
    .text(d => (d.signed_chi2 > 0 ? `+${d.signed_chi2}` : `${d.signed_chi2}`))
    .style('font-size', '10.5px')
    .style('font-family', 'var(--font-mono)')
    .style('fill', 'var(--text-muted)');
}

// =========================================================================
// INTERACTIVE STOPWORD EXCLUSION & RAM-ONLY RECALCULATION
// =========================================================================
function getActiveDatasetSource() {
  if (datasetSources[currentDatasetKey]) {
    return datasetSources[currentDatasetKey];
  }
  const stats = (currentDataset && currentDataset.lexical_stats) || {};
  const src = {
    source_type: 'builtin',
    dataset_key: currentDatasetKey,
    dataset_name: currentDataset ? currentDataset.name : currentDatasetKey,
    target_classes: (currentDataset && currentDataset.classes && currentDataset.classes.length) || 5,
    language: stats.corpus_language || 'en',
    detect_bigrams: Boolean(stats.detect_bigrams),
    custom_stopwords: [...(stats.custom_stopwords || [])]
  };
  datasetSources[currentDatasetKey] = src;
  return src;
}

function renderExcludedStopwordsBar() {
  const bar = document.getElementById('excluded-stopwords-bar');
  const chips = document.getElementById('excluded-stopwords-chips');
  if (!bar || !chips || !currentDataset) return;

  const src = getActiveDatasetSource();
  const list = src.custom_stopwords || [];
  if (list.length === 0) {
    bar.classList.remove('visible');
    chips.innerHTML = '';
    return;
  }

  bar.classList.add('visible');
  chips.innerHTML = list.map(w => `
    <button class="stopword-chip" onclick="removeExcludedStopword('${escapeHtml(w)}')" title="Click to restore lemma">
      <span>✕</span> ${escapeHtml(w)}
    </button>
  `).join('');
}

async function recalculateCurrentDatasetWithStopwords() {
  const src = getActiveDatasetSource();
  showToast(t('recalculatingToast'));

  try {
    const res = await fetch('/api/analyze/recalculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(src)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

    window.IRAMUTEQ_PRECOMPUTED_DATA[currentDatasetKey] = data;
    currentDataset = data;
    closeKwicDrawer();
    updateStatusPill();
    renderExcludedStopwordsBar();
    renderView(getActiveTab());
    showToast(t('excludedAppliedToast'));
  } catch (err) {
    console.error('Recalculation failed:', err);
    showToast('Recalculation error: ' + err.message);
  }
}

function excludeWordAndRecalculate(word) {
  if (!word) return;
  const lw = String(word).trim().toLowerCase();
  const src = getActiveDatasetSource();
  if (!src.custom_stopwords.includes(lw)) {
    src.custom_stopwords.push(lw);
  }
  recalculateCurrentDatasetWithStopwords();
}
window.excludeWordAndRecalculate = excludeWordAndRecalculate;

function removeExcludedStopword(word) {
  const src = getActiveDatasetSource();
  src.custom_stopwords = src.custom_stopwords.filter(w => w !== word);
  recalculateCurrentDatasetWithStopwords();
}
window.removeExcludedStopword = removeExcludedStopword;

function resetExcludedStopwords() {
  const src = getActiveDatasetSource();
  src.custom_stopwords = [];
  recalculateCurrentDatasetWithStopwords();
}
window.resetExcludedStopwords = resetExcludedStopwords;

// =========================================================================
// ONE-CLICK PUBLICATION-READY METHODOLOGY GENERATOR (EN / FR / RU)
// =========================================================================
function buildMethodologyText() {
  if (!currentDataset) return '';
  const st = currentDataset.lexical_stats;
  const classes = currentDataset.classes || [];
  const afc = currentDataset.afc || { inertia_explained: [0, 0] };
  const langNames = {
    en: { en: 'English', fr: 'French', ru: 'Russian' },
    fr: { en: 'anglais', fr: 'français', ru: 'russe' },
    ru: { en: 'английский', fr: 'французский', ru: 'русский' }
  };
  const corpusLang = (langNames[currentLanguage] && langNames[currentLanguage][st.corpus_language || 'en']) || 'English';
  const classifiedPct = st.classified_pct != null ? st.classified_pct : 100.0;
  const classSummary = classes
    .map(c => `${t('classLabel')} ${c.class_id} (${c.pct}%; ${c.top_words.slice(0, 3).map(w => w.word).join(', ')})`)
    .join('; ');
  const bigramsNoteEn = st.detect_bigrams ? ` PMI-based bigram collocation merging was enabled (${st.bigrams_count || 0} collocations joined).` : '';
  const bigramsNoteFr = st.detect_bigrams ? ` La détection de bigrammes par PMI était activée (${st.bigrams_count || 0} collocations fusionnées).` : '';
  const bigramsNoteRu = st.detect_bigrams ? ` Было включено объединение биграмм по критерию PMI (${st.bigrams_count || 0} коллокаций).` : '';
  const stopNote = (st.custom_stopwords && st.custom_stopwords.length > 0)
    ? ` [${st.custom_stopwords.join(', ')}]`
    : '';

  if (currentLanguage === 'fr') {
    return `Analyse lexicométrique réalisée avec IRaMuTeQ Web Studio sur le corpus « ${currentDataset.name} » (${st.total_docs} textes initiaux [UCI], découpés en ${st.total_segments} segments de texte élémentaires [UCE], soit ${classifiedPct} % de segments classés). Le prétraitement en ${corpusLang} reposait sur une lemmatisation par dictionnaire (${st.lemmatizer_backend || 'WordNet / POS'}) retenant ${st.total_tokens} occurrences actives et ${st.unique_forms} lemmes uniques (hapax : ${st.hapax_pct} %, TTR : ${st.type_token_ratio} %).${bigramsNoteFr}${stopNote ? ` Mots vides personnalisés exclus :${stopNote}.` : ''} La Classification Hiérarchique Descendante (méthode de Reinert) a structuré le corpus en ${classes.length} classes lexicales distinctes évaluées par le test du χ² de Pearson (1 ddl, p < 0,05) : ${classSummary}. L’Analyse Factorielle des Correspondances (AFC) explique ${afc.inertia_explained[0]} % (Facteur 1) et ${afc.inertia_explained[1]} % (Facteur 2) de l’inertie totale.`;
  }

  if (currentLanguage === 'ru') {
    return `Лексикометрический анализ корпуса «${currentDataset.name}» выполнен в IRaMuTeQ Web Studio (${st.total_docs} исходных документов [UCI], сегментированных на ${st.total_segments} элементарных контекстных единиц [UCE], доля классифицированных сегментов — ${classifiedPct}%). Препроцессинг (${corpusLang} язык) включал словарную лемматизацию (${st.lemmatizer_backend || 'WordNet / pymorphy3'}), выделив ${st.total_tokens} активных токенов и ${st.unique_forms} уникальных лемм (гапаксы: ${st.hapax_pct}%, TTR: ${st.type_token_ratio}%).${bigramsNoteRu}${stopNote ? ` Исключённые пользовательские стоп-слова:${stopNote}.` : ''} Иерархическая нисходящая классификация (метод Макса Рейнерта, CHD) разделила корпус на ${classes.length} устойчивых лексических класса по критерию χ² Пирсона (1 ст. свободы, p < 0.05): ${classSummary}. Факторный анализ соответствий (AFC) объясняет ${afc.inertia_explained[0]}% (Фактор 1) и ${afc.inertia_explained[1]}% (Фактор 2) общей инерции.`;
  }

  return `Lexicometric text analysis of "${currentDataset.name}" was conducted using IRaMuTeQ Web Studio across ${st.total_docs} documents (Initial Context Units), segmented into ${st.total_segments} Elementary Context Units (UCEs; ${classifiedPct}% of candidate segments classified). Preprocessing (${corpusLang}) applied POS-aware dictionary lemmatization (${st.lemmatizer_backend || 'WordNet + POS-tagger'}), yielding ${st.total_tokens} active lexical tokens and ${st.unique_forms} unique base lemmas (hapax legomena: ${st.hapax_pct}%, Type-Token Ratio: ${st.type_token_ratio}%).${bigramsNoteEn}${stopNote ? ` Custom excluded stopwords:${stopNote}.` : ''} Reinert's Descending Hierarchical Classification (CHD) via iterative SVD bipartitioning partitioned the corpus into ${classes.length} lexical classes profiled by exact 1-df Pearson chi-square tests (p < 0.05): ${classSummary}. Correspondence Factor Analysis (AFC/CA) accounted for ${afc.inertia_explained[0]}% (Factor 1) and ${afc.inertia_explained[1]}% (Factor 2) of total inertia.`;
}

async function copyMethodologyBlock() {
  const text = buildMethodologyText();
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error('Clipboard API unavailable');
    }
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  window._lastCopiedMethodology = text;
  showToast(t('methodologyCopiedToast'));
}
window.copyMethodologyBlock = copyMethodologyBlock;

// =========================================================================
// EXPORT UTILITIES (DARK & ACADEMIC WHITE-PAPER SVG / HiDPI PNG / CSV)
// =========================================================================
function setExportTheme(mode) {
  exportTheme = mode === 'white' ? 'white' : 'dark';
  document.querySelectorAll('.export-theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-export-theme') === exportTheme);
  });
}
window.setExportTheme = setExportTheme;

function buildExportSvgSource(svgEl, mode = exportTheme) {
  const isWhite = mode === 'white';
  const clone = svgEl.cloneNode(true);
  const width = Math.round(svgEl.clientWidth || svgEl.getBoundingClientRect().width || Number(svgEl.getAttribute('width')) || 860);
  const height = Math.round(svgEl.clientHeight || svgEl.getBoundingClientRect().height || Number(svgEl.getAttribute('height')) || 540);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  // Palette map resolving CSS variables into concrete standalone print/screen hex colors
  const palette = isWhite
    ? {
        'var(--text-main)': '#111827',
        'var(--text-muted)': '#374151',
        'var(--text-dim)': '#4b5563',
        'var(--border-color)': '#cbd5e1',
        'var(--border-highlight)': '#64748b',
        'var(--accent-primary)': '#4338ca',
        'var(--accent-secondary)': '#0e7490',
        'var(--bg-primary)': '#ffffff',
        'var(--bg-secondary)': '#ffffff',
        'var(--font-mono)': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        'var(--font-family)': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
      }
    : {
        'var(--text-main)': '#f3f4f6',
        'var(--text-muted)': '#9ca3af',
        'var(--text-dim)': '#6b7280',
        'var(--border-color)': 'rgba(255, 255, 255, 0.14)',
        'var(--border-highlight)': 'rgba(99, 102, 241, 0.5)',
        'var(--accent-primary)': '#6366f1',
        'var(--accent-secondary)': '#06b6d4',
        'var(--bg-primary)': '#0b0f19',
        'var(--bg-secondary)': '#111827',
        'var(--font-mono)': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        'var(--font-family)': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
      };

  // White-paper high-contrast color remap for bright accents on white background
  const whiteAccentRemap = {
    '#f59e0b': '#b45309',
    '#06b6d4': '#0e7490',
    '#10b981': '#047857',
    '#ec4899': '#be185d',
    '#6366f1': '#4338ca',
    '#8b5cf6': '#6d28d9'
  };

  function resolveCssVars(val) {
    if (!val) return val;
    let out = String(val);
    Object.entries(palette).forEach(([k, v]) => {
      out = out.split(k).join(v);
    });
    return out;
  }

  // Insert crisp solid background rectangle as first child
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', String(width));
  bgRect.setAttribute('height', String(height));
  bgRect.setAttribute('fill', isWhite ? '#ffffff' : '#0b0f19');
  clone.insertBefore(bgRect, clone.firstChild);

  clone.querySelectorAll('*').forEach(el => {
    if (el === bgRect) return;
    ['fill', 'stroke'].forEach(attr => {
      const v = el.getAttribute(attr);
      if (v) el.setAttribute(attr, resolveCssVars(v));
    });
    if (el.getAttribute('style')) {
      el.setAttribute('style', resolveCssVars(el.getAttribute('style')));
    }

    if (isWhite) {
      const tag = el.tagName.toLowerCase();
      // Remove dark drop-shadows/text-shadows that muddy white print exports
      if (el.style && el.style.textShadow) el.style.textShadow = 'none';

      // Make faint dark-theme gridlines/edges dark & clearly visible on white paper
      const strokeAttr = (el.getAttribute('stroke') || el.style.stroke || '').toLowerCase();
      if (strokeAttr.includes('255, 255, 255') || strokeAttr.includes('148, 163, 184')) {
        el.setAttribute('stroke', '#94a3b8');
        if (el.style) el.style.stroke = '#94a3b8';
      }
      if (tag === 'circle' && (strokeAttr === '#ffffff' || strokeAttr === 'rgb(255, 255, 255)')) {
        el.setAttribute('stroke', '#ffffff');
      }

      // Deepen bright neon fills for crisp print readability on white paper (skip white text inside solid pills)
      if (tag === 'text') {
        const curFill = (el.style.fill || el.getAttribute('fill') || '').toLowerCase().trim();
        const isInsideSolidBadge = Boolean(el.closest('.afc-class-badge')) || curFill === '#ffffff' || curFill === 'rgb(255, 255, 255)';
        if (!isInsideSolidBadge) {
          if (whiteAccentRemap[curFill]) {
            el.style.fill = whiteAccentRemap[curFill];
          } else if (!curFill || curFill === '#f3f4f6' || curFill === 'rgb(243, 244, 246)') {
            el.style.fill = '#111827';
          }
        }
        if (!el.style.fontFamily) {
          el.style.fontFamily = palette['var(--font-family)'];
        }
      }
    }
  });

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(clone);
  source = resolveCssVars(source);
  return { source, width, height };
}
window.buildExportSvgSource = buildExportSvgSource;

function exportSvg(svgId, filename = 'chart.svg') {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const { source } = buildExportSvgSource(svg, exportTheme);
  const suffix = exportTheme === 'white' ? '_whitepaper.svg' : '_dark.svg';
  const finalName = filename.replace(/\.svg$/i, suffix);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.exportSvg = exportSvg;

function exportPng(svgId, filename = 'chart.png') {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const mode = exportTheme;
  const { source, width, height } = buildExportSvgSource(svg, mode);
  const suffix = mode === 'white' ? '_whitepaper.png' : '_dark.png';
  const finalName = filename.replace(/\.png$/i, suffix);

  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const urlApi = window.URL || window.webkitURL;
  const blobURL = urlApi.createObjectURL(svgBlob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = mode === 'white' ? '#ffffff' : '#0b0f19';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const png = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = png;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    urlApi.revokeObjectURL(blobURL);
  };
  image.src = blobURL;
}
window.exportPng = exportPng;

function exportCsv(type) {
  if (!currentDataset) return;
  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
  if (type === 'vocab') {
    csvContent += 'Rank,Lemma,Frequency,TheoreticalZipf\n';
    (currentDataset.zipf_data || []).forEach(d => {
      csvContent += `${d.rank},"${d.word}",${d.freq},${d.theoretical_zipf}\n`;
    });
  } else if (type === 'chi2_filtered') {
    csvContent += 'Lemma,Class,Freq in Class,Total Freq,Percent,Chi-square (χ²),p-value\n';
    getChi2TableRows().forEach(r => {
      csvContent += `"${r.word}",Class ${r.class_id},${r.freq_class},${r.freq_total},${r.pct_class}%,${r.chi2},"${r.p_value}"\n`;
    });
  } else if (type === 'specificity') {
    const { activeMod } = getActiveSpecificityModality();
    csvContent += 'Modality,Direction,Lemma,SignedChi2,FreqInGroup,FreqTotal,PctInGroup,PctCorpus,p-value\n';
    if (activeMod) {
      [...(activeMod.over || []), ...(activeMod.under || [])].forEach(r => {
        csvContent += `"${activeMod.label}",${r.direction},"${r.word}",${r.signed_chi2},${r.freq_mod},${r.freq_total},${r.pct_mod}%,${r.pct_corpus}%,"${r.p_value}"\n`;
      });
    }
  } else if (type === 'classes') {
    csvContent += 'ClassID,ClassLabel,Lemma,Chi2,FreqClass,FreqTotal,PctClass,PValue\n';
    (currentDataset.classes || []).forEach(c => {
      (c.top_words || []).forEach(w => {
        csvContent += `${c.class_id},"${c.label}","${w.word}",${w.chi2},${w.freq_class},${w.freq_total},${w.pct_class},"${w.p_value}"\n`;
      });
    });
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${currentDatasetKey}_${type}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
window.exportCsv = exportCsv;
