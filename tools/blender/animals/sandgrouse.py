# קטה (Pterocles) – a round sandy bird finely patterned in buff and cream, a short bill, no red.
# Built on chukar.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('chukar', globals()); derive('chukar', 'sandgrouse')
GREY, BUFF, CHEST, RED, CREAM = srgb('#c9ab7c'), srgb('#d9b47c'), srgb('#d4b07a'), srgb('#7a6a50'), srgb('#efe1c0')
SPEC = dict(SPEC, id='sandgrouse', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=0.9)   # height and length stay at the relative's size: build-rigged.py scales them
