# The voice of רובו־דע (1.3.2): every guide line voiced in advance with the "shaul" Piper voice (Phonikud, a
# non-commercial licence: fine for Baba Da's free educational game), read from its nikud, with a robot colour.
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
    letters = re.sub('[^א-תְ-ׇ]', '', word)
    if n >= 2:
        last = letters[-3:]
        # segolates: the last vowel is a segol (not before a final ה), or a furtive patah under a final ח / ע after a segol
        if re.search('ֶ[א-ת]ּ?$', letters) and not letters.endswith('ה') : idx = n - 2
        elif re.search('ֶ[א-ת]ּ?ַ?[חע]ַ$', letters): idx = n - 2
        elif re.search('ַיִם$', letters): idx = n - 2                  # -ayim
        elif re.search('\u05B7[\u05D7\u05E2\u05D4\u05D0]\u05B7[\u05D0-\u05EA]\u05BC?$', letters): idx = n - 2   # יַעַר, נַעַר, שַׁעַר
        elif re.search('נוּ$', letters) or re.search('תּ?ִי$', letters): idx = n - 2   # -nu, -ti
    pieces = []
    for i, s in enumerate(segs):
        pieces.append(''.join(s.onset) + ('ˈ' if i == idx else '') + s.nucleus + ''.join(s.coda))
    return ''.join(pieces), []
_stress.word = None
H._syllabify_to_ipa = _stress
_word_to_ipa = H.hebrew_word_to_ipa
def word_ipa(w, lex):
    key = NIK.sub('', w)
    if w in lex: return lex[w]
    if key in lex: return lex[key]
    _stress.word = w
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
    return s

def robot(a):
    t = np.arange(len(a)) / SR
    y = a * (0.72 + 0.28 * np.sin(2 * np.pi * 58 * t))          # a soft electric buzz
    d = int(SR * 0.0055); z = y.copy(); z[d:] += 0.38 * y[:-d]   # a short metallic comb
    d2 = int(SR * 0.0115); z[d2:] += 0.18 * y[:-d2]
    return z

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
    for l in lines:
        if only and l['id'] not in only: continue
        f, k = (l.get('f') or '').strip(), (l.get('k') or '').strip()
        jobs = []
        same = NIK.sub('', k) == NIK.sub('', f)
        if same and k: jobs.append((l['id'], k))
        else:
            jobs.append((l['id'], f if NIK.search(f) else dia(f)))
            if k: jobs.append((l['id'] + '.k', k))
        for vid, text in jobs:
            h = hashlib.sha1((text + '|v3').encode()).hexdigest()[:12]
            path = OUT / (vid + '.ogg')
            if not o.force and man.get(vid, {}).get('h') == h and path.exists(): continue
            ipa = text_to_ipa(text, lex)
            wav = to_ogg(synth(sess, ipa), path)
            man[vid] = {'h': h, 'text': text, 'ipa': ipa}
            heard = hear(wav) if hear else ''
            if heard: man[vid]['heard'] = heard
            os.remove(wav)
            print(vid, '|', ipa, '|', heard)
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
