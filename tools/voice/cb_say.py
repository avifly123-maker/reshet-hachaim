# The second voice (קוּבִּי): Chatterbox Multilingual (MIT licence), run locally on this computer.
# usage: cb-env\Scripts\python.exe cb_say.py lines.json out_dir [ref.wav] [exaggeration] [cfg]
#   lines.json = [{ "id": "...", "text": "..." }]   writes out_dir\<id>.wav and out_dir\cb_say.log
import sys, os, json, time, traceback
src, out = sys.argv[1], sys.argv[2]
ref = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] not in ('', '-') else None
exa = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
cfg = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
os.makedirs(out, exist_ok=True)
log = open(os.path.join(out, 'cb_say.log'), 'a', encoding='utf-8')
def L(*a): log.write(' '.join(str(x) for x in a) + '\n'); log.flush()
try:
    t0 = time.time()
    import torch, torchaudio
    torch.set_num_threads(max(1, (os.cpu_count() or 4) - 2))   # gentle: leave two cores to the owner
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    m = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    L('loaded', round(time.time() - t0, 1), 's ref', ref)
    for it in json.load(open(src, encoding='utf-8')):
        t1 = time.time()
        kw = dict(language_id='he', exaggeration=exa, cfg_weight=cfg)
        if ref: kw['audio_prompt_path'] = ref
        wav = m.generate(it['text'], **kw)
        p = os.path.join(out, it['id'] + '.wav')
        torchaudio.save(p, wav, m.sr)
        L('ok', it['id'], round(time.time() - t1, 1), 's', round(wav.shape[-1] / m.sr, 1), 's audio')
    L('done', round(time.time() - t0, 1))
except Exception:
    L('ERROR', traceback.format_exc())
