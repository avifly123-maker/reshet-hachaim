# The voice of רובו־דע (1.3.2): every guide line voiced in advance with the "shaul" Piper voice (Phonikud, a
# non-commercial licence: fine for Baba Da's free educational game), read from its nikud (plain, no effect since 22.10).
#   python3 tools/voice/make.py --model <shaul.onnx> [--only id,id] [--check]   → art/voice/<id>.ogg, src/data/voice.js
# A line whose beginners' words (k) differ from its words (f) gets two files: <id> (f, nikud restored by Nakdimon,
# Piper's diacritizer) and <id>.k (k, its own nikud). src/audio/voice.js plays <id>.k for beginners when it exists.
# Stress: Piper's rule-based G2P (piper.hebrew) with our stress rule (milra, with segolates, -ayim and -nu milel) and
# tools/voice/lexicon.tsv (word<TAB>ipa) for words it still gets wrong. --check runs each file through the ivrit.ai
# recognizer (the model of מילים מפלסטלינה) and prints what it heard.
import argparse, base64, hashlib, json, os, pathlib, re, subprocess, sys, wave
import numpy as np, onnxruntime as ort
from piper.phoneme_ids import phonemes_to_ids
from piper.hebrew import hebrew_ipa as H
from piper.phonemize_hebrew import HebrewPhonemizer

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'art' / 'voice'; OUT.mkdir(parents=True, exist_ok=True)
NIK = re.compile('[֑-ׇ]')
SR = 22050

# ---- stress: replace Piper's "two syllables with a final consonant = penultimate" rule
_orig = H._syllabify_to_ipa
def _stress(segs):
    ipa_plain = ''.join(''.join(s.onset) + s.nucleus + ''.join(s.coda) for s in segs)
    n = len(segs); idx = n - 1
    word = _stress.word or ''
    letters = re.sub('[^א-תְ-ׇ]', '', word).replace('\u05C1', '').replace('\u05C2', '')
    letters = re.sub('([ךת])ְ$', '\\1', letters)
    letters = re.sub('(?<!ו)\u05BC', '', letters)   # a dagesh sits after the vowel in NFC (טֶּבַע): it never changes the stress
    if n >= 2:
        last = letters[-3:]
        # segolates: the last vowel is a segol (not before a final ה), or a furtive patah under a final ח / ע after a segol
        if re.search('ֶ[א-ת]ּ?$', letters) and not letters.endswith('ה') and not re.search('[כה]ֶ[םן]$', letters): idx = n - 2   # not -כֶם / -הֶם
        elif re.search('ֶ[א-ת]ּ?ַ?[חע]ַ$', letters): idx = n - 2
        elif re.search('ֶ[א-ת]ּ?ַ[חע]$', letters): idx = n - 2        # טֶבַע, פֶּתַח, זֶרַע
        elif re.search('ַיִם$', letters): idx = n - 2                  # -ayim
        elif re.search('\u05B7[\u05D7\u05E2\u05D4\u05D0]\u05B7[\u05D0-\u05EA]\u05BC?$', letters): idx = n - 2   # יַעַר, נַעַר, שַׁעַר
        elif re.search('נוּ$', letters) or re.search('תּ?ִי$', letters): idx = n - 2   # -nu, -ti
    pieces = []
    for i, s in enumerate(segs):
        pieces.append(''.join(s.onset) + ('ˈ' if i == idx else '') + s.nucleus + ''.join(s.coda))
    return ''.join(pieces), []
_stress.word = None
H._syllabify_to_ipa = _stress
# holam haser (חֹשֶׁךְ, בֹּקֶר): Piper reads a holam only on a vav, and drops it on any other letter
_basic = H._map_basic_vowel
def _basic_holam(g):
    if g.base != H.VAV and g.has(H.HOLAM) and not g.any({H.QAMATS_QATAN, H.QUBUTZ, H.HIRIQ, H.TSERE, H.SEGOL, H.PATAH, H.QAMATS}): return 'o', True
    return _basic(g)
H._map_basic_vowel = _basic_holam
# an alef or ayin that carries its own vowel is a glottal stop (מַרְאָה maʁʔa, נִשְׁאַר niʃʔaʁ, לְאַט leʔat); Piper dropped
# it whenever the letter had a vowel, so "מראה" was read "mara" (25.10)
_cons = H._map_consonant
_VOWEL = re.compile('[\u05B1-\u05BB\u05C7]')
def _cons_glottal(base, marks, is_final, next_is_vowel):
    b = H.FINAL_FORM_BASE.get(base, base)
    if b in (H.ALEF, H.AYIN) and any(_VOWEL.match(m) for m in marks): return 'ʔ'
    return _cons(base, marks, is_final, next_is_vowel)
H._map_consonant = _cons_glottal
# modern initial shva (25.10): Piper says every word-initial shva as "e" (קְלָף kelaf, שְׁנֵי ʃenej = "second", תְּמוּנָה
# temuna). In Israeli speech it is silent unless the letter is a prefix letter or a sonorant (בוכלמ ינר: בְּ- be-, מְבִיאִים
# mevi'im, לְמַעְלָה lemala), the next consonant is a guttural (שְׁאֵלָה ʃeʔela) or the same letter, or ת opens a plural verb
# (תְּנַסּוּ tenasu). The same after the article and the like (הַתְּמוּנָה hatmuna).
_resolve = H._resolve_sheva_and_qamats
_GUTT = set('ʔhχ')
def _resolve_modern(segs):
    cand = []
    for i in (0, 1):
        if i >= len(segs) - 1 or segs[i].nucleus != 'ə' or len(segs[i].onset) != 1: continue
        if i == 1 and not (segs[0].nucleus in ('a', 'e') and not segs[0].coda and segs[1].dagesh and ''.join(segs[0].onset) in ('h', 'ʃ', 'v', 'b', 'l', 'k', 'm')): continue
        c, nxt = segs[i].onset[0], (segs[i + 1].onset[:1] or [''])[0]
        letters = NIK.sub('', _resolve_modern.word or '')
        if i < len(letters) and letters[i] in 'בוכלמינר': continue
        if nxt in _GUTT or nxt == '' or nxt == c: continue
        if c == 't' and (_resolve_modern.word or '').endswith('וּ'): continue   # תְּנַסּוּ, תְּגַלּוּ
        cand.append(id(segs[i]))
    out = _resolve(segs)
    res = []
    i = 0
    while i < len(out):
        sg = out[i]
        if id(sg) in cand and sg.nucleus == 'e' and i + 1 < len(out) and not sg.coda:
            out[i + 1].onset[:0] = sg.onset; i += 1; continue   # the consonant joins the next syllable: klaf, ʃnej
        res.append(sg); i += 1
    return res
_resolve_modern.word = None
H._resolve_sheva_and_qamats = _resolve_modern
_word_to_ipa = H.hebrew_word_to_ipa
# a name with a prefix: the lexicon's reading of the name after the prefix's own sound (בְּאַמְזוֹנְס → be + amazonas)
PREFIX_IPA = {'ב': 'be', 'בא': 'ba', 'ל': 'le', 'לא': 'la', 'מ': 'me', 'מה': 'meha', 'ה': 'ha', 'ו': 've', 'וב': 'uv', 'ש': 'ʃe', 'כ': 'ke'}
NAMES = {'אמזונס': 'amazˈonas'}
def word_ipa(w, lex):
    key = NIK.sub('', w)
    if w in lex: return lex[w]
    if key in lex: return lex[key]
    for name, nipa in NAMES.items():
        if key.endswith(name):
            pre = key[:-len(name)]
            if pre == '': return nipa
            p = PREFIX_IPA.get(pre) or (pre.endswith('א') and PREFIX_IPA.get(pre[:-1]))
            if p:
                if len(pre) == 1 and re.match('.\u05BC?[\u05B7\u05B8]', w): p = p[:-1] + 'a'   # לָאָמָזוֹנָס: la-
                return p + nipa
    # -ָיו at the end is "av" (עָלָיו alav, אֵלָיו elav): the yod is silent
    w = re.sub('\u05B8\u05D9\u05D5$', '\u05B8\u05D5', w)
    _stress.word = w; _resolve_modern.word = w
    ipa = _word_to_ipa(w)
    # a furtive patah (פתח גנוב): a final ח / ע with patah after a long vowel is read "aχ" / "a", stressed before it
    if re.search('[\u05D7\u05E2]\u05B7$', w) and len(re.findall('[aeiou]', ipa)) >= 2:
        ipa = ipa.replace('ˈ', '')
        if ipa.endswith('χa'): ipa = ipa[:-2]; ipa = re.sub('([aeiou])(?!.*[aeiou])', 'ˈ\\1', ipa) + 'aχ'
        elif ipa.endswith('ʔa') or ipa.endswith('a'): ipa = re.sub('ʔ?a$', '', ipa); ipa = re.sub('([aeiou])(?!.*[aeiou])', 'ˈ\\1', ipa) + 'a'
    return ipa

def text_to_ipa(text, lex):
    text = text.replace('־', ' ').replace('–', ',').replace('"', '').replace('״', '')
    toks = re.findall(r'[א-ת֑-ׇ\']+|[,.!?;:]', text)
    out = []
    for t in toks:
        if re.match(r'[,.!?;:]', t): out.append({'!': '!', '?': '?', ';': ',', ':': ','}.get(t, t)); continue
        ipa = word_ipa(t, lex)
        if ipa: out.append(ipa)
    s = ''
    for t in out: s += (t if t in ',.!?' else ((' ' if s else '') + t))
    # 25.10: Piper's G2P writes ג as the Latin "g" (id 154), a symbol the shaul voice never learned: it mumbled every ג
    # (the recognizer heard 24% of the words with ג). The voice was trained on the IPA "ɡ" (U+0261, id 66).
    return s.replace('g', '\u0261')

def robot(a):
    # 22.10 (Avi): the tremolo and comb sounded like a shaky voice, not a mechanical one: plain Shaul, no effect
    return a

def synth(sess, ipa, length=1.12):
    ids = phonemes_to_ids(list(ipa))
    a = sess.run(None, {'input': np.array([ids], np.int64), 'input_lengths': np.array([len(ids)], np.int64), 'scales': np.array([0.6, length, 0.75], np.float32)})[0].squeeze()
    a = robot(a.astype(np.float64))
    a = np.concatenate([np.zeros(int(SR * 0.08)), a, np.zeros(int(SR * 0.15))])
    return np.clip(a / max(1e-6, np.abs(a).max()) * 0.92, -1, 1)

def to_ogg(a, path):
    wav = str(path) + '.wav'
    with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '24000', '-c:a', 'libopus', '-b:a', '28k', '-application', 'voip', str(path)], check=True)
    return wav

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--model', required=True); ap.add_argument('--only', default=''); ap.add_argument('--check', action='store_true'); ap.add_argument('--force', action='store_true')
    o = ap.parse_args()
    lines = json.loads(subprocess.run(['node', str(ROOT / 'tools/voice/export-lines.mjs')], capture_output=True, text=True, cwd=ROOT, check=True).stdout)
    only = set(filter(None, o.only.split(',')))
    lex = {}
    lp = ROOT / 'tools/voice/lexicon.tsv'
    if lp.exists():
        for ln in lp.read_text().splitlines():
            if ln.strip() and not ln.startswith('#'): w, ipa = ln.split('\t')[:2]; lex[w.strip()] = ipa.strip()
    sess = ort.InferenceSession(o.model, providers=['CPUExecutionProvider'])
    dia = HebrewPhonemizer().diacritizer
    manifest_p = OUT / 'manifest.json'
    man = json.loads(manifest_p.read_text()) if manifest_p.exists() else {}
    hear = None
    if o.check:
        sys.path.insert(0, str(ROOT / 'tools/voice')); from asr import hear
    # 25.10: a line written without nikud is read with Nakdimon's nikud, which is sometimes wrong (לְמַדְתָּם for לְמַדְתֶּם,
    # מַרְוֶוה). Every word that the beginners' lines spell the same way takes its nikud from them instead, when they
    # give it one nikud only (those were written and checked by hand).
    forms = {}
    for l in lines:
        for t in (l.get('k') or '', l.get('f') or ''):
            if not NIK.search(t): continue
            for w in re.findall(r'[א-ת\u0591-\u05C7]+', t): forms.setdefault(NIK.sub('', w), set()).add(w)
    known = {b: next(iter(v)) for b, v in forms.items() if len(v) == 1}
    def dia_k(text):
        return re.sub(r'[א-ת\u0591-\u05C7]+', lambda m: known.get(NIK.sub('', m.group(0)), m.group(0)), dia(text))
    for l in lines:
        if only and l['id'] not in only: continue
        f, k = (l.get('f') or '').strip(), (l.get('k') or '').strip()
        jobs = []
        same = NIK.sub('', k) == NIK.sub('', f)
        if same and k: jobs.append((l['id'], k))
        else:
            jobs.append((l['id'], f if NIK.search(f) else dia_k(f)))
            if k: jobs.append((l['id'] + '.k', k))
        for vid, text in jobs:
            ipa = text_to_ipa(text, lex)
            h = hashlib.sha1((text + '|' + ipa + '|v5').encode()).hexdigest()[:12]   # a new reading rule re-voices the line
            path = OUT / (vid + '.ogg')
            if not o.force and man.get(vid, {}).get('h') == h and path.exists(): continue
            wav = to_ogg(synth(sess, ipa), path)
            man[vid] = {'h': h, 'text': text, 'ipa': ipa}
            heard = hear(wav) if hear else ''
            if heard: man[vid]['heard'] = heard
            os.remove(wav)
            print(vid, '|', ipa, '|', heard)
            manifest_p.write_text(json.dumps(man, ensure_ascii=False, indent=1))   # a killed run keeps what it made
    manifest_p.write_text(json.dumps(man, ensure_ascii=False, indent=1))
    # the asset module
    V = {}
    for p in sorted(OUT.glob('*.ogg')):
        V[p.stem] = 'data:audio/ogg;base64,' + base64.b64encode(p.read_bytes()).decode()
    js = ('// GENERATED by tools/voice/make.py from art/voice/ (the lines of רובו־דע, src/data/guide-lines.js) – do not edit.\n'
          '// Opus in Ogg, one file per line id (and <id>.k for the beginners\' words). The "shaul" voice of Phonikud, non-commercial.\n'
          f'export const VOICE = {json.dumps({k: {"src": v} for k, v in V.items()})};\n')
    (ROOT / 'src/data/voice.js').write_text(js)
    print('voice.js', len(V), 'files', round(len(js) / 1024), 'KB')

if __name__ == '__main__': main()
