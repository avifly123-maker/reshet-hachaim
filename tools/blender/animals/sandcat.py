# חתול החולות (Felis margarita) – a small pale sandy cat with faint markings and a broad face.
# Built on jaguar.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('jaguar', globals()); derive('jaguar', 'sandcat')
GOLD, GOLD2, TAN, BLACK, WHITE = srgb('#e2cc98'), srgb('#d0b680'), srgb('#c8a874'), srgb('#b89a6c'), srgb('#f4ece0')
SPEC = dict(SPEC, id='sandcat', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=0.36)   # height and length stay at the relative's size: build-rigged.py scales them
