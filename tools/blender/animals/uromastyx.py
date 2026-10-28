# חרדון צב (Uromastyx aegyptia) – a big plant-eating lizard, sandy yellow with dark speckles, a thick spiny tail.
# Built on agama.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('agama', globals()); derive('agama', 'uromastyx')
OLIVE, DARK, PALE, BELLY, HEAD = srgb('#c9a24a'), srgb('#5a4424'), srgb('#e8cc78'), srgb('#e4d4a8'), srgb('#7a6440')
SPEC = dict(SPEC, id='uromastyx', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=1.45)   # height and length stay at the relative's size: build-rigged.py scales them
