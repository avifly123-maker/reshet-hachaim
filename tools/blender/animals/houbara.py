# חוברה (Chlamydotis) – a sandy ground bird with a black and white ruff on the neck; built for now on the partridge, larger.
# Built on chukar.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('chukar', globals()); derive('chukar', 'houbara')
GREY, BUFF, CHEST, RED, CREAM = srgb('#cdb084'), srgb('#dcc08e'), srgb('#efe6d4'), srgb('#6a5a44'), srgb('#f2e8d4')
SPEC = dict(SPEC, id='houbara', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=1.7)   # height and length stay at the relative's size: build-rigged.py scales them
