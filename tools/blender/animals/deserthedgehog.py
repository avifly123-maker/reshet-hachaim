# קיפוד מדבר (Paraechinus aethiopicus) – paler than the grove hedgehog, a white face, pale spines with dark bands.
# Built on hedgehog.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('hedgehog', globals()); derive('hedgehog', 'deserthedgehog')
SKIN, FUR, FACE, MASK, PAW, CREAM, BAND = srgb('#c9a982'), srgb('#e4d0ac'), srgb('#f4ecdc'), srgb('#8a6a4a'), srgb('#7a5a40'), srgb('#f4ecdc'), srgb('#6a5038')
SPEC = dict(SPEC, id='deserthedgehog', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=0.92)   # height and length stay at the relative's size: build-rigged.py scales them
