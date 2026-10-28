# קרקל (Caracal caracal) – a slender reddish-tan cat with no spots (the black ear tufts come with the v6 kit).
# Built on jaguar.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('jaguar', globals()); derive('jaguar', 'caracal')
GOLD, GOLD2, TAN, BLACK, WHITE = srgb('#cc8e52'), srgb('#bb7e44'), srgb('#a8703a'), srgb('#c08448'), srgb('#f2e8d8')
SPEC = dict(SPEC, id='caracal', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=0.62)   # height and length stay at the relative's size: build-rigged.py scales them
