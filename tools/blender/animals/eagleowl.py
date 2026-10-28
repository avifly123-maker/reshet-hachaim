# אוח מדבר (Bubo ascalaphus) – a large sandy owl with orange eyes; built for now on the barn owl, in sand colours.
# Built on owl.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('owl', globals()); derive('owl', 'eagleowl')
GOLD, GREY, FACE, RIM, WHITE = srgb('#d6b27a'), srgb('#b49a72'), srgb('#e8d4ac'), srgb('#7a5a34'), srgb('#efe2c4')
SPEC = dict(SPEC, id='eagleowl', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=1.25)   # height and length stay at the relative's size: build-rigged.py scales them
