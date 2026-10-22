import os, sys, wave, numpy as np, sherpa_onnx
# the ivrit.ai streaming model of מילים מפלסטלינה (Documents\\מילים מפלסטלינה\\model-he on Avi's PC, staged here)
D = os.environ.get("ASR_MODEL", "/mnt/user-data/uploads/Documents/מילים מפלסטלינה/model-he")
rec = sherpa_onnx.OnlineRecognizer.from_transducer(tokens=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tokens.txt'), encoder=D+'/encoder.int8.onnx', decoder=D+'/decoder.int8.onnx', joiner=D+'/joiner.int8.onnx', num_threads=4, sample_rate=16000, feature_dim=80, decoding_method='greedy_search')
def hear(path):
    with wave.open(path) as w: sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    s = rec.create_stream(); s.accept_waveform(sr, a); s.accept_waveform(sr, np.zeros(int(sr*2.0), np.float32)); s.input_finished()
    while rec.is_ready(s): rec.decode_stream(s)
    return rec.get_result(s)
if __name__ == '__main__':
    for p in sys.argv[1:]: print(p, '→', hear(p))
