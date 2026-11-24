"""
IRaMuTeQ Web Studio — Core Multi-Language NLP & Statistical Text-Mining Engine.

Implements:
- Multi-language POS-aware dictionary lemmatization (`en`, `fr`, `ru`):
  * English: spaCy `en_core_web_sm` -> fallback NLTK `WordNetLemmatizer` + POS tagger.
  * French: spaCy `fr_core_news_sm` -> fallback French elision & morphological lemmatizer + NLTK French stopwords.
  * Russian: `pymorphy3` dictionary morphological analyzer (or spaCy `ru_core_news_sm`) + NLTK Russian stopwords.
- Optional PMI-based Bigram Collocation detection (e.g., `social_media`, `screen_time`, `digital_detox`).
- Interactive custom stopword exclusion support.
- Elementary Context Unit (UCE) segmentation.
- Reinert Descending Hierarchical Classification (CHD) via iterative SVD bipartitions.
- Exact 1-df Pearson Chi-square (χ²) and exact p-values via math.erfc.
- Correspondence Factor Analysis (AFC / CA) via SVD on standardized residuals.
- Similitude Co-occurrence Graph with Kruskal's Maximum Spanning Tree (MST).
- Metadata Sub-Corpus Specificity Analysis (signed +/- χ² over/under-representation).
"""

from __future__ import annotations

import html
import math
import re
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# Contractions, Elisions & Compound / Domain Normalization Maps
# ---------------------------------------------------------------------------
EN_CONTRACTIONS = [
    (re.compile(r"\bwon['’]t\b", re.IGNORECASE), "will not"),
    (re.compile(r"\bcan['’]t\b", re.IGNORECASE), "cannot"),
    (re.compile(r"\bshan['’]t\b", re.IGNORECASE), "shall not"),
    (re.compile(r"\bain['’]t\b", re.IGNORECASE), "is not"),
    (re.compile(r"n['’]t\b", re.IGNORECASE), " not"),
    (re.compile(r"['’]re\b", re.IGNORECASE), " are"),
    (re.compile(r"['’]ve\b", re.IGNORECASE), " have"),
    (re.compile(r"['’]ll\b", re.IGNORECASE), " will"),
    (re.compile(r"['’]d\b", re.IGNORECASE), " would"),
    (re.compile(r"['’]m\b", re.IGNORECASE), " am"),
    (re.compile(r"['’]s\b", re.IGNORECASE), ""),
]

# French elision prefixes (l', d', qu', s', n', j', c', m', t', jusqu', lorsqu', puisqu')
FR_ELISIONS = re.compile(
    r"\b(?:jusqu|lorsqu|puisqu|quoiqu|quelqu|qu|l|d|s|n|j|c|m|t)['’](?=[A-Za-zÀ-ÿ])",
    re.IGNORECASE,
)

# Hyphenated / domain compounds normalized prior to tokenization (EN)
COMPOUND_PATTERNS = [
    (re.compile(r"\be-?books?\b", re.IGNORECASE), "ebook"),
    (re.compile(r"\be-?readers?\b", re.IGNORECASE), "ereader"),
    (re.compile(r"\be-?ink\b", re.IGNORECASE), "eink"),
    (re.compile(r"\bdumb-?phones?\b", re.IGNORECASE), "dumbphone"),
    (re.compile(r"\bsmart-?phones?\b", re.IGNORECASE), "smartphone"),
    (re.compile(r"\bflip-?phones?\b", re.IGNORECASE), "flipphone"),
    (re.compile(r"\bjio\s*-?\s*phone\b", re.IGNORECASE), "jiophone"),
    (re.compile(r"\bscreen-?time\b", re.IGNORECASE), "screentime"),
    (re.compile(r"\bdoom-?scroll(?:ing|ed|s)?\b", re.IGNORECASE), "doomscroll"),
    (re.compile(r"\bwell-?being\b", re.IGNORECASE), "wellbeing"),
    (re.compile(r"\bburn-?out\b", re.IGNORECASE), "burnout"),
    (re.compile(r"\baudio-?books?\b", re.IGNORECASE), "audiobook"),
    (re.compile(r"\bnon-?stop\b", re.IGNORECASE), "nonstop"),
    (re.compile(r"\boff-?line\b", re.IGNORECASE), "offline"),
    (re.compile(r"\bon-?line\b", re.IGNORECASE), "online"),
    (re.compile(r"\bwi-?fi\b", re.IGNORECASE), "wifi"),
    (re.compile(r"\bwhats\s*app\b", re.IGNORECASE), "whatsapp"),
    (re.compile(r"\byou\s*tube\b", re.IGNORECASE), "youtube"),
    (re.compile(r"\btik\s*tok\b", re.IGNORECASE), "tiktok"),
    (re.compile(r"\bi\s*phone\b", re.IGNORECASE), "iphone"),
    (re.compile(r"\bi\s*pad\b", re.IGNORECASE), "ipad"),
    (re.compile(r"\bkai\s*os\b", re.IGNORECASE), "kaios"),
]

# Explicit English domain canonical lemmas
DOMAIN_LEMMA_MAP = {
    "apps": "app", "app": "app",
    "ebooks": "ebook", "ebook": "ebook",
    "ereaders": "ereader", "ereader": "ereader",
    "audiobooks": "audiobook", "audiobook": "audiobook",
    "dumbphones": "dumbphone", "dumbphone": "dumbphone",
    "smartphones": "smartphone", "smartphone": "smartphone",
    "flipphones": "flipphone", "flipphone": "flipphone",
    "jiophones": "jiophone", "jiophone": "jiophone",
    "iphones": "iphone", "iphone": "iphone",
    "ipads": "ipad", "ipad": "ipad",
    "pocketbooks": "pocketbook", "pocketbook": "pocketbook",
    "kindles": "kindle", "kindle": "kindle",
    "launchers": "launcher", "launcher": "launcher",
    "meetups": "meetup", "meetup": "meetup",
    "subreddits": "subreddit", "subreddit": "subreddit",
    "notifications": "notification", "notification": "notification",
    "algorithms": "algorithm", "algorithm": "algorithm",
    "podcasts": "podcast", "podcast": "podcast",
    "headphones": "headphone", "headphone": "headphone",
    "screentime": "screentime",
    "doomscroll": "doomscroll", "doomscrolling": "doomscroll",
    "doomscrolled": "doomscroll", "doomscrolls": "doomscroll",
    "scrolling": "scroll", "scrolled": "scroll", "scrolls": "scroll", "scroll": "scroll",
    "reels": "reel", "shorts": "short",
    "videos": "video", "video": "video",
    "devices": "device", "device": "device",
    "phones": "phone", "phone": "phone",
    "screens": "screen", "screen": "screen",
    "books": "book", "book": "book",
    "media": "media", "data": "data",
    "whatsapp": "whatsapp", "youtube": "youtube", "tiktok": "tiktok",
    "instagram": "instagram", "facebook": "facebook", "reddit": "reddit",
    "spotify": "spotify", "android": "android", "apple": "apple",
    "google": "google", "nokia": "nokia", "garmin": "garmin",
    "eink": "eink", "kaios": "kaios", "wifi": "wifi", "gps": "gps",
    "offline": "offline", "online": "online",
    "detox": "detox", "detoxing": "detox", "dopamine": "dopamine",
    "minimalism": "minimalism", "minimalist": "minimalist",
    "sabbath": "sabbath", "wellbeing": "wellbeing", "burnout": "burnout",
    "mindfulness": "mindfulness", "introspection": "introspection",
    "boredom": "boredom", "nonstop": "nonstop",
    "bengaluru": "bengaluru", "bangalore": "bangalore",
    "india": "india", "america": "america", "mexico": "mexico", "delhi": "delhi",
}

# French high-frequency morphological irregulars & domain lemmas (for NLTK fallback)
FR_DOMAIN_LEMMA_MAP = {
    "réseaux": "réseau", "sociaux": "social", "sociales": "social", "sociale": "social",
    "numériques": "numérique", "écrans": "écran", "téléphones": "téléphone",
    "smartphones": "smartphone", "applications": "application", "notifications": "notification",
    "données": "donnée", "utilisateurs": "utilisateur", "utilisatrices": "utilisateur",
    "habitudes": "habitude", "livres": "livre", "vidéos": "vidéo", "heures": "heure",
    "jours": "jour", "journées": "journée", "semaines": "semaine", "mois": "mois",
    "temps": "temps", "yeux": "œil", "travaux": "travail", "journaux": "journal",
    "médias": "média", "algorithmes": "algorithme", "problèmes": "problème",
    "solutions": "solution", "personnes": "personne", "études": "étude",
    "recherches": "recherche", "résultats": "résultat", "effets": "effet",
    "mentale": "mental", "mentaux": "mental", "mentales": "mental",
    "physiques": "physique", "quotidienne": "quotidien", "quotidiens": "quotidien",
    "quotidiennes": "quotidien", "numérique": "numérique", "déconnexion": "déconnexion",
    "concentration": "concentration", "sommeil": "sommeil", "anxiété": "anxiété",
    "attention": "attention", "addiction": "addiction", "dépendance": "dépendance",
    "utilisant": "utiliser", "utilisé": "utiliser", "utilisent": "utiliser",
    "réduire": "réduire", "réduit": "réduire", "réduisant": "réduire",
    "passer": "passer", "passé": "passer", "passent": "passer",
    "regarder": "regarder", "regardant": "regarder", "regardent": "regarder",
    "lire": "lire", "lisant": "lire", "mieux": "mieux",
}

# Known high-value collocations boosted during PMI bigram detection
CURATED_BIGRAMS: Set[Tuple[str, str]] = {
    ("social", "media"), ("screen", "time"), ("digital", "detox"),
    ("mental", "health"), ("default", "mode"), ("mode", "network"),
    ("eye", "strain"), ("sleep", "quality"), ("short", "form"),
    ("long", "form"), ("dumb", "phone"), ("flip", "phone"),
    ("feature", "phone"), ("physical", "book"), ("audio", "book"),
    ("time", "limit"), ("app", "blocker"), ("device", "owner"),
    ("dopamine", "detox"), ("digital", "minimalism"), ("north", "america"),
    ("google", "map"), ("minimal", "phone"), ("mental", "clarity"),
    ("réseau", "social"), ("temps", "écran"), ("santé", "mental"),
    ("détox", "numérique"), ("sobriété", "numérique"),
    ("цифровой", "детокс"), ("социальный", "сеть"), ("экранный", "время"),
    ("кнопочный", "телефон"), ("ментальный", "здоровье"), ("цифровой", "минимализм"),
}

# Extra stop words per language
EN_EXTRA_STOPWORDS: Set[str] = {
    "be", "have", "do", "does", "did", "done", "would", "could", "should", "will",
    "shall", "can", "cannot", "may", "might", "must", "get", "go", "make", "take",
    "give", "come", "say", "tell", "see", "know", "want", "let", "put", "keep",
    "seem", "become", "leave", "call", "try", "ask", "need", "look",
    "really", "actually", "literally", "basically", "honestly", "definitely",
    "probably", "maybe", "perhaps", "simply", "totally", "completely", "absolutely",
    "mostly", "usually", "often", "sometimes", "always", "never", "ever", "already",
    "still", "yet", "also", "too", "very", "quite", "pretty", "rather", "almost",
    "just", "only", "even", "much", "many", "more", "most", "less", "least",
    "enough", "well", "good", "great", "nice", "awesome", "cool", "fine", "sure",
    "yes", "yeah", "yep", "nope", "okay", "hey", "hello", "lol", "lmao", "haha",
    "hahaha", "omg", "tbh", "imo", "imho", "btw", "fyi", "idk", "etc", "thank",
    "thanks", "please", "sorry", "welcome", "wow", "ugh", "bummer",
    "something", "anything", "everything", "nothing", "someone", "anyone",
    "everyone", "nobody", "somebody", "anybody", "everybody", "somewhere",
    "anywhere", "everywhere", "nowhere", "thing", "things", "stuff", "lot", "lots",
    "bit", "kind", "sort", "way", "one", "two", "three", "first", "second", "third",
    "last", "next", "other", "another", "same", "such", "own", "back", "now", "then",
    "here", "there", "today", "yesterday", "tomorrow", "ago", "else", "around",
    "away", "far", "near", "though", "although", "however", "instead", "anyway",
    "otherwise", "therefore", "thus", "hence", "furthermore", "moreover", "since",
    "while", "whilst", "whereas", "unless", "until", "without", "within", "across",
    "behind", "beside", "beyond", "toward", "towards", "upon", "onto", "into",
    "about", "above", "below", "between", "through", "during", "before", "after",
    "post", "comment", "edit", "deleted", "removed", "http", "https", "www", "com",
    "org", "net", "amp", "nbsp", "quot",
}

FR_EXTRA_STOPWORDS: Set[str] = {
    "être", "avoir", "faire", "dire", "aller", "voir", "savoir", "pouvoir", "falloir",
    "vouloir", "venir", "devoir", "prendre", "donner", "mettre", "plus", "moins",
    "très", "bien", "aussi", "tout", "tous", "toute", "toutes", "comme", "mais",
    "donc", "alors", "ainsi", "car", "dont", "où", "quand", "comment", "pourquoi",
    "parce", "puis", "encore", "déjà", "toujours", "jamais", "souvent", "parfois",
    "beaucoup", "peu", "trop", "assez", "rien", "chose", "choses", "fait", "faut",
    "peut", "peuvent", "sont", "était", "étaient", "être", "été", "avoir", "avez",
    "avons", "ont", "cet", "cette", "ces", "celui", "celle", "ceux", "celles",
    "chaque", "autre", "autres", "même", "mêmes", "tel", "telle", "tels", "telles",
    "quel", "quelle", "quels", "quelles", "sans", "avec", "dans", "pour", "chez",
    "entre", "après", "avant", "depuis", "pendant", "vers", "sous", "sur", "non",
    "oui", "merci", "bonjour", "salut", "vraiment", "juste", "seulement", "plutôt",
    "http", "https", "www", "com", "amp",
}

RU_EXTRA_STOPWORDS: Set[str] = {
    "быть", "мочь", "стать", "хотеть", "знать", "сказать", "говорить", "делать",
    "сделать", "иметь", "дать", "взять", "идти", "пойти", "видеть", "смотреть",
    "думать", "казаться", "нужно", "надо", "можно", "нельзя", "очень", "просто",
    "прямо", "вообще", "конечно", "наверное", "возможно", "кажется", "короче",
    "типа", "вроде", "кстати", "например", "поэтому", "потому", "однако", "зато",
    "хотя", "чтобы", "если", "когда", "тогда", "потом", "затем", "теперь", "сейчас",
    "всегда", "никогда", "иногда", "часто", "редко", "уже", "еще", "ещё", "только",
    "даже", "тоже", "также", "весь", "весьма", "сам", "самый", "свой", "наш", "ваш",
    "этот", "тот", "такой", "какой", "который", "каждый", "любой", "другой", "иной",
    "один", "два", "три", "первый", "второй", "много", "мало", "больше", "меньше",
    "лучше", "хуже", "хорошо", "плохо", "вещь", "дело", "раз", "год", "день",
    "привет", "спасибо", "пожалуйста", "ок", "ага", "угу", "лол",
    "http", "https", "www", "com", "amp",
}


class DictionaryLemmatizer:
    """
    Multi-language POS-aware dictionary lemmatizer (`en`, `fr`, `ru`).
    - English: spaCy `en_core_web_sm` -> NLTK `WordNetLemmatizer` + POS tagger.
    - French:  spaCy `fr_core_news_sm` -> French morphological lemmatizer + NLTK French stopwords.
    - Russian: `pymorphy3` (or spaCy `ru_core_news_sm`) + NLTK Russian stopwords.
    """

    def __init__(self, language: str = "en", prefer_spacy: bool = True) -> None:
        self.language: str = language if language in {"en", "fr", "ru"} else "en"
        self.backend: str = "uninitialized"
        self._nlp = None
        self._wnl = None
        self._wordnet = None
        self._pos_tag = None
        self._morph = None
        self._fr_stemmer = None
        self._stopwords: Set[str] = set()

        if self.language == "en":
            self._stopwords.update(EN_EXTRA_STOPWORDS)
            if prefer_spacy and self._try_init_spacy("en_core_web_sm"):
                return
            self._init_nltk_en()
        elif self.language == "fr":
            self._stopwords.update(FR_EXTRA_STOPWORDS)
            if prefer_spacy and self._try_init_spacy("fr_core_news_sm"):
                return
            self._init_nltk_fr()
        elif self.language == "ru":
            self._stopwords.update(RU_EXTRA_STOPWORDS)
            if self._try_init_pymorphy3():
                return
            if prefer_spacy and self._try_init_spacy("ru_core_news_sm"):
                return
            self._init_nltk_ru_fallback()

    def _try_init_spacy(self, model_name: str) -> bool:
        try:
            import spacy  # type: ignore

            try:
                self._nlp = spacy.load(model_name, disable=["ner", "parser"])
            except OSError:
                return False
            self._stopwords.update(w.lower() for w in self._nlp.Defaults.stop_words)
            self.backend = f"spacy ({model_name})"
            return True
        except Exception:
            return False

    def _ensure_nltk_resource(self, path: str, pkg: str) -> None:
        import nltk

        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(pkg, quiet=True)

    def _init_nltk_en(self) -> None:
        import nltk
        from nltk.corpus import stopwords as nltk_stopwords
        from nltk.corpus import wordnet
        from nltk.stem import WordNetLemmatizer

        for path, pkg in [
            ("corpora/wordnet", "wordnet"),
            ("corpora/omw-1.4", "omw-1.4"),
            ("taggers/averaged_perceptron_tagger_eng", "averaged_perceptron_tagger_eng"),
            ("corpora/stopwords", "stopwords"),
        ]:
            self._ensure_nltk_resource(path, pkg)

        self._wnl = WordNetLemmatizer()
        self._wordnet = wordnet
        self._pos_tag = nltk.pos_tag
        try:
            self._stopwords.update(w.lower() for w in nltk_stopwords.words("english"))
        except Exception:
            pass
        self._wnl.lemmatize("phones", wordnet.NOUN)
        self.backend = "nltk (WordNetLemmatizer + POS-tagger)"

    def _init_nltk_fr(self) -> None:
        from nltk.corpus import stopwords as nltk_stopwords
        from nltk.stem.snowball import SnowballStemmer

        self._ensure_nltk_resource("corpora/stopwords", "stopwords")
        try:
            self._stopwords.update(w.lower() for w in nltk_stopwords.words("french"))
        except Exception:
            pass
        self._fr_stemmer = SnowballStemmer("french")
        self.backend = "nltk (French Morphological Lemmatizer + Stopwords)"

    def _try_init_pymorphy3(self) -> bool:
        try:
            import pymorphy3  # type: ignore

            self._morph = pymorphy3.MorphAnalyzer()
            try:
                from nltk.corpus import stopwords as nltk_stopwords

                self._ensure_nltk_resource("corpora/stopwords", "stopwords")
                self._stopwords.update(w.lower() for w in nltk_stopwords.words("russian"))
            except Exception:
                pass
            # Warm up dictionary
            self._morph.parse("телефоны")
            self.backend = "pymorphy3 (Russian Morphological Dictionary)"
            return True
        except Exception:
            return False

    def _init_nltk_ru_fallback(self) -> None:
        from nltk.corpus import stopwords as nltk_stopwords

        self._ensure_nltk_resource("corpora/stopwords", "stopwords")
        try:
            self._stopwords.update(w.lower() for w in nltk_stopwords.words("russian"))
        except Exception:
            pass
        self.backend = "nltk (Russian Stopwords Fallback)"

    def _preprocess_raw(self, text: str) -> str:
        """Remove URLs, emails, HTML entities, numbers; handle language contractions/elisions."""
        if not text:
            return ""
        text = html.unescape(text)
        text = re.sub(r"\[([^\]]+)\]\(https?://[^\)]+\)", r"\1", text)
        text = re.sub(r"https?://\S+|www\.\S+", " ", text)
        text = re.sub(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", " ", text)
        text = re.sub(r"\bu/\w+", " ", text)
        text = re.sub(r"\br/(\w+)", r"\1", text)

        if self.language == "en":
            for pattern, repl in EN_CONTRACTIONS:
                text = pattern.sub(repl, text)
            for pattern, repl in COMPOUND_PATTERNS:
                text = pattern.sub(repl, text)
        elif self.language == "fr":
            text = FR_ELISIONS.sub(" ", text)

        text = re.sub(r"[0-9]+", " ", text)
        # Keep Latin + accented French letters + Cyrillic letters
        text = re.sub(r"[^A-Za-zÀ-ÖØ-öø-ÿœŒæÆ\u0400-\u04FF\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _wn_pos(self, treebank_tag: str) -> Optional[str]:
        if treebank_tag.startswith("N"):
            return self._wordnet.NOUN
        if treebank_tag.startswith("V"):
            return self._wordnet.VERB
        if treebank_tag.startswith("J"):
            return self._wordnet.ADJ
        if treebank_tag.startswith("R"):
            return self._wordnet.ADV
        return None

    @staticmethod
    def _lemmatize_fr_token(word: str) -> str:
        """Conservative French inflection normalizer producing clean readable dictionary lemmas."""
        if word in FR_DOMAIN_LEMMA_MAP:
            return FR_DOMAIN_LEMMA_MAP[word]
        if len(word) <= 3:
            return word
        # -eaux / -aux plurals
        if word.endswith("eaux") and len(word) > 5:
            return word[:-1]
        if word.endswith("aux") and len(word) > 5:
            return word[:-3] + "al"
        # Regular plural -s (preserve invariant endings like -is, -us, -os, -as, -ss, -temps)
        if word.endswith("s") and not word.endswith(("ss", "us", "is", "os", "as", "ps")) and len(word) > 4:
            return word[:-1]
        if word.endswith("x") and word.endswith(("eux", "oux", "aix")) and len(word) > 5:
            return word
        # Infinitive-safe participial normalization for common -ées / -és
        if word.endswith("ées") and len(word) > 5:
            return word[:-2]
        return word

    def tokenize_with_forms(
        self,
        text: str,
        extra_stopwords: Optional[Set[str]] = None,
    ) -> List[Tuple[str, str]]:
        """Return list of (canonical_lemma, original_surface_form) pairs."""
        cleaned = self._preprocess_raw(text)
        if not cleaned:
            return []

        stop_set = self._stopwords if not extra_stopwords else (self._stopwords | extra_stopwords)
        results: List[Tuple[str, str]] = []

        # Path A: spaCy pipeline (any language)
        if self._nlp is not None:
            doc = self._nlp(cleaned)
            allowed_pos = {"NOUN", "PROPN", "VERB", "ADJ", "ADV"}
            for tok in doc:
                low = tok.text.strip().lower()
                if len(low) < 3 or not low.isalpha():
                    continue
                if self.language == "en" and low in DOMAIN_LEMMA_MAP:
                    lemma = DOMAIN_LEMMA_MAP[low]
                else:
                    if tok.pos_ not in allowed_pos:
                        continue
                    lemma = tok.lemma_.lower().strip()
                    if self.language == "en" and lemma in DOMAIN_LEMMA_MAP:
                        lemma = DOMAIN_LEMMA_MAP[lemma]
                if len(lemma) < 3 or not lemma.isalpha():
                    continue
                if lemma in stop_set or low in stop_set:
                    continue
                results.append((lemma, low))
            return results

        # Path B: Russian pymorphy3 morphological dictionary lemmatizer
        if self.language == "ru" and self._morph is not None:
            allowed_ru_pos = {"NOUN", "VERB", "INFN", "ADJF", "ADJS", "ADVB", "PRTF", "PRTS", "GRND"}
            for raw in cleaned.split():
                low = raw.lower()
                if len(low) < 3 or not low.isalpha():
                    continue
                if low in stop_set:
                    continue
                parsed = self._morph.parse(low)[0]
                pos = parsed.tag.POS
                # Keep meaningful lexical POS (or foreign/Latin domain brands like youtube/reddit)
                if pos is not None and pos not in allowed_ru_pos:
                    continue
                lemma = parsed.normal_form.lower().replace("ё", "е")
                if len(lemma) < 3 or lemma in stop_set:
                    continue
                results.append((lemma, low))
            return results

        # Path C: French NLTK / morphological lemmatizer
        if self.language == "fr":
            for raw in cleaned.split():
                low = raw.lower()
                if len(low) < 3 or not low.isalpha():
                    continue
                if low in stop_set:
                    continue
                lemma = self._lemmatize_fr_token(low)
                if len(lemma) < 3 or lemma in stop_set:
                    continue
                results.append((lemma, low))
            return results

        # Path D: Russian fallback without pymorphy3
        if self.language == "ru":
            for raw in cleaned.split():
                low = raw.lower().replace("ё", "е")
                if len(low) >= 3 and low.isalpha() and low not in stop_set:
                    results.append((low, low))
            return results

        # Path E: English NLTK WordNetLemmatizer + POS tagger
        raw_tokens = [tok for tok in cleaned.split() if len(tok) >= 2 and tok.isalpha()]
        if not raw_tokens:
            return []

        tagged = self._pos_tag(raw_tokens)
        for raw, tag in tagged:
            low = raw.lower()
            if len(low) < 3:
                continue

            if low in DOMAIN_LEMMA_MAP:
                lemma = DOMAIN_LEMMA_MAP[low]
                if lemma not in stop_set:
                    results.append((lemma, low))
                continue

            wn_pos = self._wn_pos(tag)
            if wn_pos is None:
                continue

            lemma = self._wnl.lemmatize(low, pos=wn_pos)
            if lemma == low and wn_pos != self._wordnet.NOUN and low.endswith("s"):
                noun_lem = self._wnl.lemmatize(low, pos=self._wordnet.NOUN)
                if noun_lem != low:
                    lemma = noun_lem

            if lemma in DOMAIN_LEMMA_MAP:
                lemma = DOMAIN_LEMMA_MAP[lemma]

            if len(lemma) < 3 or not lemma.isalpha():
                continue
            if lemma in stop_set or low in stop_set:
                continue

            results.append((lemma, low))

        return results

    def tokenize(self, text: str, extra_stopwords: Optional[Set[str]] = None) -> List[str]:
        return [lem for lem, _ in self.tokenize_with_forms(text, extra_stopwords=extra_stopwords)]


# Per-language singleton cache
_LEMMATIZERS: Dict[str, DictionaryLemmatizer] = {}


def get_lemmatizer(language: str = "en") -> DictionaryLemmatizer:
    lang = language if language in {"en", "fr", "ru"} else "en"
    if lang not in _LEMMATIZERS:
        _LEMMATIZERS[lang] = DictionaryLemmatizer(language=lang, prefer_spacy=True)
    return _LEMMATIZERS[lang]


def get_available_lemmatizers() -> Dict[str, str]:
    return {lang: get_lemmatizer(lang).backend for lang in ("en", "fr", "ru")}


def tokenize(text: str, language: str = "en", extra_stopwords: Optional[Set[str]] = None) -> List[str]:
    return get_lemmatizer(language).tokenize(text, extra_stopwords=extra_stopwords)


# ---------------------------------------------------------------------------
# PMI-Based Bigram Collocation Detector
# ---------------------------------------------------------------------------
def apply_pmi_bigrams(
    segment_pairs_list: List[List[Tuple[str, str]]],
    extra_stopwords: Optional[Set[str]] = None,
) -> Tuple[List[List[Tuple[str, str]]], List[Dict[str, Any]]]:
    """
    Detect frequent meaningful adjacent lemma collocations using Pointwise Mutual
    Information (PMI) and minimum frequency thresholds, joining them as `w1_w2`
    before Reinert clustering.
    """
    unigram_counts: Counter = Counter()
    bigram_counts: Counter = Counter()
    total_tokens = 0

    for pairs in segment_pairs_list:
        lemmas = [lem for lem, _ in pairs]
        total_tokens += len(lemmas)
        unigram_counts.update(lemmas)
        for i in range(len(lemmas) - 1):
            w1, w2 = lemmas[i], lemmas[i + 1]
            if w1 != w2:
                bigram_counts[(w1, w2)] += 1

    if total_tokens < 20:
        return segment_pairs_list, []

    min_count = 3 if len(segment_pairs_list) >= 25 else 2
    min_pmi = 2.4
    stop_set = extra_stopwords or set()

    selected_bigrams: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for (w1, w2), c12 in bigram_counts.items():
        if c12 < min_count:
            continue
        joined = f"{w1}_{w2}"
        if joined in stop_set or w1 in stop_set or w2 in stop_set:
            continue
        c1 = unigram_counts[w1]
        c2 = unigram_counts[w2]
        pmi = math.log2((c12 * total_tokens) / max(c1 * c2, 1))
        if pmi >= min_pmi or ((w1, w2) in CURATED_BIGRAMS and c12 >= 2):
            selected_bigrams[(w1, w2)] = {
                "bigram": joined,
                "count": int(c12),
                "pmi": round(float(pmi), 2),
            }

    if not selected_bigrams:
        return segment_pairs_list, []

    merged_list: List[List[Tuple[str, str]]] = []
    for pairs in segment_pairs_list:
        out: List[Tuple[str, str]] = []
        i = 0
        n = len(pairs)
        while i < n:
            if i + 1 < n:
                pair_key = (pairs[i][0], pairs[i + 1][0])
                if pair_key in selected_bigrams:
                    joined_lem = f"{pair_key[0]}_{pair_key[1]}"
                    joined_surf = f"{pairs[i][1]} {pairs[i + 1][1]}"
                    out.append((joined_lem, joined_surf))
                    i += 2
                    continue
            out.append(pairs[i])
            i += 1
        merged_list.append(out)

    top_bigrams = sorted(selected_bigrams.values(), key=lambda b: (-b["count"], -b["pmi"]))[:30]
    return merged_list, top_bigrams


# ---------------------------------------------------------------------------
# Statistical Functions (Chi-Square, Exact p-value, CHD, AFC, MST, Specificity)
# ---------------------------------------------------------------------------
def calc_chi2(a: int, b: int, c: int, d: int) -> Tuple[float, bool, float]:
    """
    Compute 1-df Pearson Chi-square statistic, positive-association flag,
    and exact upper-tail p-value = erfc(sqrt(chi2 / 2)).
    """
    n = a + b + c + d
    if n == 0 or (a + b) == 0 or (c + d) == 0 or (a + c) == 0 or (b + d) == 0:
        return 0.0, False, 1.0
    numerator = n * ((a * d - b * c) ** 2)
    denominator = (a + b) * (c + d) * (a + c) * (b + d)
    if denominator == 0:
        return 0.0, False, 1.0
    chi2 = float(numerator / denominator)
    is_positive = (a / (a + b)) > ((a + c) / n)
    p_val = float(math.erfc(math.sqrt(max(chi2, 0.0) / 2.0)))
    return chi2, is_positive, p_val


def format_p_value(p_val: float) -> str:
    if p_val < 0.0001:
        return "< 0.0001"
    if p_val < 0.001:
        return "< 0.001"
    return f"{p_val:.4f}"


def compute_metadata_specificity(
    segments: List[Dict[str, Any]],
    active_words: Sequence[str],
    word_segment_count: Counter,
) -> Dict[str, Any]:
    """
    Compute sub-corpus χ² specificity scores (over-represented +χ² and
    under-represented -χ²) for every categorical metadata variable with >= 2 modalities.
    """
    n_segments = len(segments)
    if n_segments < 4 or not active_words:
        return {"variables": []}

    seg_lemma_sets = [set(s["lemmas"]) for s in segments]

    # Collect metadata variable -> modality -> segment indices
    var_to_mods: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: defaultdict(list))
    for idx, s in enumerate(segments):
        for mk, mv in s.get("meta", {}).items():
            if mk in {"id", "doc", "entry_id"}:
                continue
            val_str = str(mv).strip()
            if not val_str or val_str.lower() in {"na", "none", "nan"}:
                continue
            var_to_mods[mk][val_str].append(idx)

    variables_out: List[Dict[str, Any]] = []
    min_mod_segs = 3 if n_segments >= 30 else 2

    for var_name, mod_map in sorted(var_to_mods.items()):
        valid_mods = [
            (mv, idxs)
            for mv, idxs in mod_map.items()
            if len(idxs) >= min_mod_segs and len(idxs) < n_segments - 1
        ]
        # Need at least 2 groups to compare sub-corpora meaningfully
        if len(valid_mods) < 2:
            continue

        valid_mods.sort(key=lambda item: -len(item[1]))
        modalities_out: List[Dict[str, Any]] = []

        for mod_val, mod_indices in valid_mods[:12]:
            mod_size = len(mod_indices)
            other_size = n_segments - mod_size
            over_list: List[Dict[str, Any]] = []
            under_list: List[Dict[str, Any]] = []

            for w in active_words:
                tot_w = word_segment_count[w]
                if tot_w < 2:
                    continue
                a = sum(1 for idx in mod_indices if w in seg_lemma_sets[idx])
                b = mod_size - a
                c = tot_w - a
                d = other_size - c
                chi2, is_pos, p_val_num = calc_chi2(a, b, c, d)
                if chi2 < 1.2:
                    continue
                signed = round(chi2 if is_pos else -chi2, 2)
                entry = {
                    "word": w,
                    "signed_chi2": signed,
                    "chi2": round(chi2, 2),
                    "direction": "over" if is_pos else "under",
                    "freq_mod": int(a),
                    "freq_total": int(tot_w),
                    "pct_mod": round((a / max(mod_size, 1)) * 100.0, 1),
                    "pct_corpus": round((tot_w / max(n_segments, 1)) * 100.0, 1),
                    "p_value": format_p_value(p_val_num),
                    "p_value_num": round(p_val_num, 6),
                }
                if is_pos:
                    over_list.append(entry)
                else:
                    under_list.append(entry)

            over_list.sort(key=lambda x: -x["chi2"])
            under_list.sort(key=lambda x: -x["chi2"])

            modalities_out.append({
                "value": mod_val,
                "label": f"*{var_name}_{mod_val}",
                "segment_count": mod_size,
                "pct": round((mod_size / n_segments) * 100.0, 1),
                "over": over_list[:12],
                "under": under_list[:12],
            })

        if modalities_out:
            variables_out.append({
                "variable": var_name,
                "modalities": modalities_out,
            })

    return {"variables": variables_out}


def bisect_cluster(
    segment_indices: List[int],
    all_segments: List[Dict[str, Any]],
    min_word_freq: int = 2,
) -> Tuple[Optional[List[int]], Optional[List[int]]]:
    """Perform a Reinert-style SVD bipartition on the binary segment x lemma matrix."""
    if len(segment_indices) < 6:
        return None, None

    word_counts: Counter = Counter()
    for idx in segment_indices:
        for w in set(all_segments[idx]["lemmas"]):
            word_counts[w] += 1

    active_words = [w for w, c in word_counts.items() if c >= min_word_freq]
    if len(active_words) < 3:
        active_words = [w for w, c in word_counts.items() if c >= 1]
    if len(active_words) < 3:
        return None, None

    w2i = {w: i for i, w in enumerate(active_words)}
    n_seg = len(segment_indices)
    n_w = len(active_words)

    X = np.zeros((n_seg, n_w), dtype=float)
    for row, idx in enumerate(segment_indices):
        for w in set(all_segments[idx]["lemmas"]):
            if w in w2i:
                X[row, w2i[w]] = 1.0

    row_sums = X.sum(axis=1)
    valid_rows = np.where(row_sums > 0)[0]
    if len(valid_rows) < 6:
        return None, None

    X_sub = X[valid_rows, :]
    total = X_sub.sum()
    if total <= 0:
        return None, None

    P = X_sub / total
    r = P.sum(axis=1, keepdims=True)
    c = P.sum(axis=0, keepdims=True)

    r_inv = 1.0 / np.sqrt(np.maximum(r, 1e-12))
    c_inv = 1.0 / np.sqrt(np.maximum(c, 1e-12))

    S = r_inv * (P - r @ c) * c_inv
    try:
        U, _, _ = np.linalg.svd(S, full_matrices=False)
    except Exception:
        return None, None

    f1 = (r_inv * U[:, 0:1]).flatten()
    median_val = float(np.median(f1))

    group1 = [segment_indices[valid_rows[i]] for i in range(len(valid_rows)) if f1[i] <= median_val]
    group2 = [segment_indices[valid_rows[i]] for i in range(len(valid_rows)) if f1[i] > median_val]

    if len(group1) < 3 or len(group2) < 3:
        order = np.argsort(f1)
        mid = len(order) // 2
        group1 = [segment_indices[valid_rows[i]] for i in order[:mid]]
        group2 = [segment_indices[valid_rows[i]] for i in order[mid:]]

    valid_set = set(valid_rows.tolist())
    zero_rows = [segment_indices[i] for i in range(n_seg) if i not in valid_set]
    for z in zero_rows:
        if len(group1) <= len(group2):
            group1.append(z)
        else:
            group2.append(z)

    if len(group1) >= 3 and len(group2) >= 3:
        return group1, group2
    return None, None


def hierarchical_descendant_classification(
    segments: List[Dict[str, Any]],
    target_classes: int = 5,
) -> Tuple[List[List[int]], Dict[str, Any]]:
    """Build a binary Reinert CHD tree with exact leaf-to-class IDs (1..K)."""
    n_total = len(segments)
    root_indices = list(range(n_total))

    tree: Dict[str, Any] = {
        "id": "root",
        "name": f"Corpus ({n_total} UCEs)",
        "size": n_total,
        "pct": 100.0,
        "indices": root_indices,
    }

    leaves: List[Dict[str, Any]] = [tree]
    split_counter = 1
    min_split_size = 12 if n_total >= 40 else 6

    while len(leaves) < target_classes:
        candidates = sorted(leaves, key=lambda n: len(n["indices"]), reverse=True)
        split_done = False

        for chosen in candidates:
            if len(chosen["indices"]) < min_split_size:
                continue
            g1, g2 = bisect_cluster(chosen["indices"], segments)
            if g1 and g2:
                leaves.remove(chosen)
                chosen["split_step"] = split_counter
                split_counter += 1
                n1 = {
                    "id": f"node_{split_counter}_a",
                    "name": f"Branch {split_counter}A",
                    "size": len(g1),
                    "pct": round(len(g1) / max(n_total, 1) * 100.0, 1),
                    "indices": g1,
                }
                n2 = {
                    "id": f"node_{split_counter}_b",
                    "name": f"Branch {split_counter}B",
                    "size": len(g2),
                    "pct": round(len(g2) / max(n_total, 1) * 100.0, 1),
                    "indices": g2,
                }
                chosen["children"] = [n1, n2]
                leaves.extend([n1, n2])
                split_done = True
                break

        if not split_done:
            break

    ordered_leaves: List[Dict[str, Any]] = []

    def _collect_leaves(node: Dict[str, Any]) -> None:
        if "children" in node and node["children"]:
            for ch in node["children"]:
                _collect_leaves(ch)
        else:
            ordered_leaves.append(node)

    _collect_leaves(tree)

    for idx, leaf in enumerate(ordered_leaves, start=1):
        leaf["class_id"] = idx
        leaf["name"] = f"Class {idx}"

    final_clusters = [leaf["indices"] for leaf in ordered_leaves]
    return final_clusters, tree


def correspondence_analysis(
    contingency_table: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray, List[float], List[float]]:
    """Greenacre's Correspondence Analysis (AFC / CA) on (K classes x W active words)."""
    T = np.array(contingency_table, dtype=float)
    total = float(T.sum())
    if total == 0 or T.shape[0] < 2 or T.shape[1] < 2:
        return np.zeros((T.shape[0], 3)), np.zeros((T.shape[1], 3)), [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]

    P = T / total
    r = P.sum(axis=1, keepdims=True)
    c = P.sum(axis=0, keepdims=True)

    r_diag_inv = 1.0 / np.sqrt(np.maximum(r, 1e-12))
    c_diag_inv = 1.0 / np.sqrt(np.maximum(c, 1e-12))

    S = r_inv_mul = r_diag_inv * (P - r @ c) * c_diag_inv
    U, Sigma, Vt = np.linalg.svd(S, full_matrices=False)

    eigenvalues_all = (Sigma ** 2).tolist()
    total_inertia = sum(eigenvalues_all) if sum(eigenvalues_all) > 1e-12 else 1.0
    explained_all = [(eig / total_inertia) * 100.0 for eig in eigenvalues_all]

    n_dims = min(3, len(Sigma))
    F = (r_diag_inv * U[:, :n_dims]) * Sigma[:n_dims]
    G = (c_diag_inv.T * Vt.T[:, :n_dims]) * Sigma[:n_dims]

    if F.shape[1] < 3:
        F = np.hstack([F, np.zeros((F.shape[0], 3 - F.shape[1]))])
    if G.shape[1] < 3:
        G = np.hstack([G, np.zeros((G.shape[0], 3 - G.shape[1]))])

    eig_out = (eigenvalues_all + [0.0, 0.0, 0.0])[:3]
    exp_out = (explained_all + [0.0, 0.0, 0.0])[:3]
    return F, G, eig_out, exp_out


def kruskal_mst(nodes: Sequence[str], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Kruskal's Maximum Spanning Tree on the Similitude co-occurrence graph."""
    parent = {n: n for n in nodes}

    def find(i: str) -> str:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i: str, j: str) -> bool:
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj
            return True
        return False

    sorted_edges = sorted(edges, key=lambda e: e["weight"], reverse=True)
    mst_edges: List[Dict[str, Any]] = []
    for e in sorted_edges:
        if union(e["source"], e["target"]):
            e_copy = dict(e)
            e_copy["is_mst"] = True
            mst_edges.append(e_copy)
            if len(mst_edges) == len(nodes) - 1:
                break
    return mst_edges


# ---------------------------------------------------------------------------
# Document Parsers
# ---------------------------------------------------------------------------
def sanitize_meta_key(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", str(name).strip()).strip("_").lower()
    return cleaned[:28] or "var"


def sanitize_meta_val(val: Any) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9À-ÿ\u0400-\u04FF]+", "_", str(val).strip()).strip("_")
    return cleaned[:40] or "na"


def parse_iramuteq_txt(raw_text: str) -> List[Dict[str, Any]]:
    """Parse classic IRaMuTeQ .txt corpus (`**** *var_val`) or double-newline paragraphs."""
    docs: List[Dict[str, Any]] = []
    if "****" in raw_text:
        parts = raw_text.split("****")
        for idx, block in enumerate(parts[1:], start=1):
            lines = [ln for ln in block.strip().splitlines() if ln.strip()]
            if not lines:
                continue
            header = lines[0].strip()
            body = " ".join(lines[1:]).strip()
            if not body:
                continue
            meta: Dict[str, Any] = {}
            for tok in header.split():
                if tok.startswith("*") and len(tok) > 1:
                    kv = tok[1:].split("_", 1)
                    meta[kv[0]] = kv[1] if len(kv) == 2 else "true"
            docs.append({"id": str(meta.get("id", idx)), "meta": meta, "text": body})
    else:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", raw_text) if p.strip()]
        if len(paragraphs) < 4:
            paragraphs = [ln.strip() for ln in raw_text.splitlines() if len(ln.strip()) >= 15]
        for idx, p in enumerate(paragraphs, start=1):
            docs.append({"id": str(idx), "meta": {"doc": str(idx)}, "text": p})
    return docs


def parse_tabular_records(
    records: List[Dict[str, Any]],
    text_column: str,
    metadata_columns: Sequence[str],
) -> List[Dict[str, Any]]:
    """Convert raw CSV/Excel rows into IRaMuTeQ documents with sanitized metadata variables."""
    docs: List[Dict[str, Any]] = []
    for idx, row in enumerate(records, start=1):
        raw_val = row.get(text_column)
        if raw_val is None:
            continue
        body = str(raw_val).strip()
        if not body or body.lower() in {"nan", "none", "null"}:
            continue
        meta: Dict[str, str] = {"id": str(idx)}
        for col in metadata_columns:
            if col == text_column:
                continue
            v = row.get(col)
            if v is None:
                continue
            vs = str(v).strip()
            if not vs or vs.lower() in {"nan", "none", "null"}:
                continue
            meta[sanitize_meta_key(col)] = sanitize_meta_val(vs)
        docs.append({"id": str(idx), "meta": meta, "text": body})
    return docs


# ---------------------------------------------------------------------------
# Master IRaMuTeQ Analysis Pipeline
# ---------------------------------------------------------------------------
def process_corpus(
    docs: List[Dict[str, Any]],
    name: str = "Corpus",
    target_classes: int = 5,
    language: str = "en",
    detect_bigrams: bool = False,
    custom_stopwords: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    """Run the full multi-language, dictionary-lemmatized IRaMuTeQ analysis pipeline."""
    lang = language if language in {"en", "fr", "ru"} else "en"
    lemmatizer = get_lemmatizer(lang)
    custom_stop_list = sorted({str(w).strip().lower() for w in (custom_stopwords or []) if str(w).strip()})
    custom_stop_set: Set[str] = set(custom_stop_list)

    # 1. Segment documents into Elementary Context Units (UCEs ~30 words)
    raw_segments: List[Dict[str, Any]] = []
    raw_pairs_list: List[List[Tuple[str, str]]] = []
    total_candidate_segments = 0

    for doc_idx, doc in enumerate(docs):
        doc_id = str(doc.get("id", doc_idx + 1))
        meta = dict(doc.get("meta", {}))
        body = str(doc.get("text", "")).strip()
        if not body:
            continue

        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", body) if s.strip()]
        current_chunk: List[str] = []
        current_word_count = 0

        for sent in sentences:
            current_chunk.append(sent)
            current_word_count += len(sent.split())
            if current_word_count >= 30:
                total_candidate_segments += 1
                s_text = " ".join(current_chunk)
                pairs = lemmatizer.tokenize_with_forms(s_text, extra_stopwords=custom_stop_set)
                if len(pairs) >= 2:
                    raw_segments.append({"doc_id": doc_id, "meta": meta, "text": s_text})
                    raw_pairs_list.append(pairs)
                current_chunk = []
                current_word_count = 0

        if current_chunk:
            total_candidate_segments += 1
            s_text = " ".join(current_chunk)
            pairs = lemmatizer.tokenize_with_forms(s_text, extra_stopwords=custom_stop_set)
            if len(pairs) >= 2:
                raw_segments.append({"doc_id": doc_id, "meta": meta, "text": s_text})
                raw_pairs_list.append(pairs)

    # Short-document fallback
    if len(raw_segments) < 4:
        raw_segments = []
        raw_pairs_list = []
        total_candidate_segments = 0
        for doc_idx, doc in enumerate(docs):
            body = str(doc.get("text", "")).strip()
            if not body:
                continue
            total_candidate_segments += 1
            pairs = lemmatizer.tokenize_with_forms(body, extra_stopwords=custom_stop_set)
            if pairs:
                raw_segments.append({
                    "doc_id": str(doc.get("id", doc_idx + 1)),
                    "meta": dict(doc.get("meta", {})),
                    "text": body,
                })
                raw_pairs_list.append(pairs)

    if not raw_segments:
        raise ValueError("No analyzable lexical text segments could be extracted from this corpus.")

    # Optional PMI Bigram Collocation Detection
    detected_bigrams: List[Dict[str, Any]] = []
    if detect_bigrams:
        raw_pairs_list, detected_bigrams = apply_pmi_bigrams(raw_pairs_list, extra_stopwords=custom_stop_set)

    segments: List[Dict[str, Any]] = []
    lemma_surface_forms: Dict[str, Set[str]] = defaultdict(set)
    for seg_meta, pairs in zip(raw_segments, raw_pairs_list):
        lemmas = [lem for lem, _ in pairs if lem not in custom_stop_set]
        if not lemmas:
            continue
        for lem, surf in pairs:
            if lem not in custom_stop_set:
                lemma_surface_forms[lem].add(surf)
        segments.append({
            "id": len(segments) + 1,
            "doc_id": seg_meta["doc_id"],
            "meta": seg_meta["meta"],
            "text": seg_meta["text"],
            "lemmas": lemmas,
        })

    n_segments = len(segments)
    if n_segments == 0:
        raise ValueError("All segments became empty after filtering custom stopwords.")

    classified_pct = round(min(100.0, (n_segments / max(total_candidate_segments, n_segments)) * 100.0), 1)

    # 2. Vocabulary & Lexical Statistics
    word_freq: Counter = Counter()
    word_segment_count: Counter = Counter()
    total_tokens = 0

    for s in segments:
        total_tokens += len(s["lemmas"])
        for w in s["lemmas"]:
            word_freq[w] += 1
        for w in set(s["lemmas"]):
            word_segment_count[w] += 1

    unique_forms = len(word_freq)
    hapax = sum(1 for _, c in word_freq.items() if c == 1)
    hapax_pct = round((hapax / unique_forms * 100.0) if unique_forms > 0 else 0.0, 2)
    ttr = round((unique_forms / total_tokens * 100.0) if total_tokens > 0 else 0.0, 2)
    avg_words_per_uce = round(total_tokens / n_segments, 1) if n_segments > 0 else 0.0

    sorted_freqs = sorted(word_freq.items(), key=lambda x: (-x[1], x[0]))
    zipf_data = [
        {
            "rank": rank,
            "word": w,
            "freq": int(count),
            "log_rank": round(math.log10(rank), 3),
            "log_freq": round(math.log10(count), 3),
            "theoretical_zipf": round(sorted_freqs[0][1] / rank, 2),
        }
        for rank, (w, count) in enumerate(sorted_freqs[:80], start=1)
    ]

    lexical_stats = {
        "total_docs": len(docs),
        "total_segments": n_segments,
        "candidate_segments": max(total_candidate_segments, n_segments),
        "classified_pct": classified_pct,
        "total_tokens": total_tokens,
        "unique_forms": unique_forms,
        "hapax_count": hapax,
        "hapax_pct": hapax_pct,
        "type_token_ratio": ttr,
        "avg_words_per_uce": avg_words_per_uce,
        "lemmatizer_backend": lemmatizer.backend,
        "corpus_language": lang,
        "detect_bigrams": bool(detect_bigrams),
        "bigrams_count": len(detected_bigrams),
        "custom_stopwords": custom_stop_list,
    }

    # 3. Reinert Descending Hierarchical Classification (CHD)
    max_k = max(2, min(target_classes, n_segments // 8))
    classes_indices, dendrogram_tree = hierarchical_descendant_classification(
        segments, target_classes=max_k
    )
    k = len(classes_indices)

    # 4. Active Vocabulary & Exact Chi-Square Class Profiles
    min_seg_freq = 3 if n_segments >= 40 else 2
    active_words = [w for w, c in word_segment_count.items() if c >= min_seg_freq]
    if len(active_words) < 15:
        active_words = [w for w, _ in sorted_freqs[:60]]
    active_words.sort(key=lambda w: (-word_segment_count[w], w))
    w2idx = {w: i for i, w in enumerate(active_words)}

    contingency = np.zeros((k, len(active_words)), dtype=int)
    segment_to_class: Dict[int, int] = {}
    classes_info: List[Dict[str, Any]] = []
    chi2_table: List[Dict[str, Any]] = []

    seg_lemma_sets = [set(s["lemmas"]) for s in segments]
    word_best_class: Dict[str, Dict[str, Any]] = {}

    for cls_idx, c_indices in enumerate(classes_indices):
        cls_id = cls_idx + 1
        cls_set = set(c_indices)
        cls_size = len(c_indices)
        other_size = n_segments - cls_size

        for idx in c_indices:
            segment_to_class[idx] = cls_id

        for idx in c_indices:
            for w in segments[idx]["lemmas"]:
                if w in w2idx:
                    contingency[cls_idx, w2idx[w]] += 1

        word_chi_list: List[Dict[str, Any]] = []
        for w in active_words:
            a = sum(1 for idx in c_indices if w in seg_lemma_sets[idx])
            if a == 0:
                continue
            tot_w = word_segment_count[w]
            b = cls_size - a
            c = tot_w - a
            d = other_size - c
            chi2, pos, p_val_num = calc_chi2(a, b, c, d)
            if pos and chi2 >= 1.5:
                entry = {
                    "word": w,
                    "class_id": cls_id,
                    "chi2": round(chi2, 2),
                    "freq_class": int(a),
                    "freq_total": int(tot_w),
                    "pct_class": round((a / max(cls_size, 1)) * 100.0, 1),
                    "pct_corpus": round((tot_w / max(n_segments, 1)) * 100.0, 1),
                    "p_value": format_p_value(p_val_num),
                    "p_value_num": round(p_val_num, 6),
                }
                word_chi_list.append(entry)
                if w not in word_best_class or chi2 > word_best_class[w]["chi2"]:
                    word_best_class[w] = entry

        word_chi_list.sort(key=lambda x: (-x["chi2"], -x["freq_class"]))
        chi2_table.extend(word_chi_list[:60])

        meta_chi_list: List[Dict[str, Any]] = []
        all_modalities: Dict[str, List[int]] = defaultdict(lambda: [0, 0])
        for idx, s in enumerate(segments):
            in_cls = idx in cls_set
            for mk, mv in s["meta"].items():
                if mk == "id":
                    continue
                mod = f"*{mk}_{mv}"
                if in_cls:
                    all_modalities[mod][0] += 1
                all_modalities[mod][1] += 1

        for mod, (a, tot) in all_modalities.items():
            if tot >= 2:
                b = cls_size - a
                c = tot - a
                d = other_size - c
                chi2, pos, p_val_num = calc_chi2(a, b, c, d)
                if pos and chi2 >= 2.0:
                    meta_chi_list.append({
                        "modality": mod,
                        "chi2": round(chi2, 2),
                        "freq_class": int(a),
                        "freq_total": int(tot),
                        "pct_class": round((a / max(cls_size, 1)) * 100.0, 1),
                        "p_value": format_p_value(p_val_num),
                    })
        meta_chi_list.sort(key=lambda x: -x["chi2"])

        top_words_dict = {item["word"]: item["chi2"] for item in word_chi_list[:50]}
        scored_segments: List[Dict[str, Any]] = []
        for idx in c_indices:
            seg = segments[idx]
            seg_score = sum(top_words_dict.get(w, 0.0) for w in set(seg["lemmas"]))
            seg["score"] = round(float(seg_score), 2)
            scored_segments.append({
                "id": seg["id"],
                "doc_id": seg["doc_id"],
                "class_id": cls_id,
                "score": seg["score"],
                "text": seg["text"],
                "meta": seg["meta"],
                "lemmas": seg["lemmas"],
            })
        scored_segments.sort(key=lambda s: -s["score"])

        top3_words = [item["word"] for item in word_chi_list[:3]]
        class_label = " / ".join(top3_words).upper() if top3_words else f"CLASS {cls_id}"

        classes_info.append({
            "class_id": cls_id,
            "label": class_label,
            "size": cls_size,
            "pct": round((cls_size / n_segments) * 100.0, 1),
            "top_words": word_chi_list[:60],
            "top_metadata": meta_chi_list[:15],
            "top_segments": scored_segments[:25],
        })

    for s_idx, s in enumerate(segments):
        s["class_id"] = segment_to_class.get(s_idx, 1)
        if "score" not in s:
            s["score"] = 0.0

    chi2_table.sort(key=lambda x: (-x["chi2"], x["class_id"]))

    class_lookup = {c["class_id"]: c for c in classes_info}

    def format_tree_node(node: Dict[str, Any]) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "name": node.get("name", "Cluster"),
            "size": len(node.get("indices", [])),
            "pct": node.get("pct", 0.0),
        }
        if "class_id" in node:
            cid = node["class_id"]
            c_info = class_lookup.get(cid)
            out["class_id"] = cid
            if c_info:
                out["label"] = c_info["label"]
                out["pct"] = c_info["pct"]
                out["top_words"] = [
                    {"word": tw["word"], "chi2": tw["chi2"]}
                    for tw in c_info["top_words"][:6]
                ]
        if "children" in node and node["children"]:
            out["children"] = [format_tree_node(ch) for ch in node["children"]]
        return out

    dendrogram_json = format_tree_node(dendrogram_tree)

    # 5. Correspondence Factor Analysis (AFC / CA)
    class_coords, word_coords, eigenvalues, inertia_pct = correspondence_analysis(contingency)

    afc_classes = [
        {
            "class_id": c_info["class_id"],
            "label": c_info["label"],
            "size": c_info["size"],
            "pct": c_info["pct"],
            "f1": round(float(class_coords[cls_idx, 0]), 4),
            "f2": round(float(class_coords[cls_idx, 1]), 4),
            "f3": round(float(class_coords[cls_idx, 2]), 4),
        }
        for cls_idx, c_info in enumerate(classes_info)
    ]

    afc_words = []
    for w_idx, w in enumerate(active_words):
        best = word_best_class.get(w)
        if best:
            best_cls = best["class_id"]
            best_chi2 = best["chi2"]
            best_pval = best["p_value"]
            best_pval_num = best["p_value_num"]
        else:
            best_cls = int(np.argmax(contingency[:, w_idx])) + 1
            best_chi2 = 0.0
            best_pval = "1.0000"
            best_pval_num = 1.0

        afc_words.append({
            "word": w,
            "freq": int(word_freq[w]),
            "seg_freq": int(word_segment_count[w]),
            "class_id": best_cls,
            "chi2": best_chi2,
            "p_value": best_pval,
            "p_value_num": best_pval_num,
            "f1": round(float(word_coords[w_idx, 0]), 4),
            "f2": round(float(word_coords[w_idx, 1]), 4),
            "f3": round(float(word_coords[w_idx, 2]), 4),
        })

    afc_data = {
        "eigenvalues": [round(float(e), 4) for e in eigenvalues],
        "inertia_explained": [round(float(p), 2) for p in inertia_pct],
        "classes": afc_classes,
        "words": afc_words,
    }

    # 6. Similitude Co-occurrence Graph + Kruskal MST
    graph_vocab = active_words[:48]
    gv_set = set(graph_vocab)
    cooc_matrix: Dict[Tuple[str, str], int] = defaultdict(int)

    for s in segments:
        present = sorted(set(w for w in s["lemmas"] if w in gv_set))
        for i in range(len(present)):
            for j in range(i + 1, len(present)):
                cooc_matrix[(present[i], present[j])] += 1

    edges: List[Dict[str, Any]] = []
    min_cooc = 2 if n_segments >= 20 else 1
    for (w1, w2), cooc in cooc_matrix.items():
        if cooc >= min_cooc:
            n1 = word_segment_count[w1]
            n2 = word_segment_count[w2]
            jaccard = cooc / max(n1 + n2 - cooc, 1)
            cosine = cooc / max(math.sqrt(n1 * n2), 1e-9)
            edges.append({
                "source": w1,
                "target": w2,
                "cooc": int(cooc),
                "weight": round(float(jaccard), 4),
                "cosine": round(float(cosine), 4),
            })

    mst_edges = kruskal_mst(graph_vocab, edges)
    mst_pairs = set((e["source"], e["target"]) for e in mst_edges)
    for e in edges:
        e["is_mst"] = (e["source"], e["target"]) in mst_pairs

    graph_nodes = []
    for w in graph_vocab:
        best = word_best_class.get(w)
        graph_nodes.append({
            "id": w,
            "label": w,
            "freq": int(word_freq[w]),
            "seg_freq": int(word_segment_count[w]),
            "class_id": best["class_id"] if best else 1,
            "chi2": best["chi2"] if best else 0.0,
            "p_value": best["p_value"] if best else "1.0000",
        })

    similitude_data = {
        "nodes": graph_nodes,
        "edges": edges,
        "mst_count": len(mst_edges),
        "total_edges": len(edges),
    }

    # 7. Word Clouds
    wordcloud_overall = []
    for w, count in sorted_freqs[:80]:
        best = word_best_class.get(w)
        wordcloud_overall.append({
            "word": w,
            "freq": int(count),
            "class_id": best["class_id"] if best else 1,
            "chi2": best["chi2"] if best else 0.0,
            "p_value": best["p_value"] if best else "1.0000",
        })

    wordcloud_data = {
        "overall": wordcloud_overall,
        "classes": {
            str(c["class_id"]): [
                {
                    "word": tw["word"],
                    "freq": tw["freq_class"],
                    "freq_total": tw["freq_total"],
                    "chi2": tw["chi2"],
                    "p_value": tw["p_value"],
                }
                for tw in c["top_words"][:50]
            ]
            for c in classes_info
        },
    }

    # 8. Metadata Sub-Corpus Specificity Analysis (signed +/- χ²)
    specificity_data = compute_metadata_specificity(segments, active_words, word_segment_count)

    # 9. Lemma -> surface forms map
    active_set = set(active_words) | set(w for w, _ in sorted_freqs[:120])
    lemma_forms_out = {
        lem: sorted(forms)[:12]
        for lem, forms in lemma_surface_forms.items()
        if lem in active_set
    }

    return {
        "name": name,
        "lexical_stats": lexical_stats,
        "zipf_data": zipf_data,
        "classes": classes_info,
        "chi2_table": chi2_table,
        "dendrogram": dendrogram_json,
        "afc": afc_data,
        "similitude": similitude_data,
        "wordcloud": wordcloud_data,
        "specificity": specificity_data,
        "detected_bigrams": detected_bigrams,
        "lemma_forms": lemma_forms_out,
        "segments": [
            {
                "id": s["id"],
                "doc_id": s["doc_id"],
                "class_id": s["class_id"],
                "score": s["score"],
                "text": s["text"],
                "meta": s["meta"],
                "lemmas": list(dict.fromkeys(s["lemmas"])),
            }
            for s in segments
        ],
    }
