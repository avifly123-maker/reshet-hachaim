# פסמון (Psammomys obesus) – a plump sandy rodent active by day, pale belly, no spines.
# Built on spinymouse.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('spinymouse', globals()); derive('spinymouse', 'psammomys')
BACK, BACK2, BELLY = srgb('#c99a62'), srgb('#a87a44'), srgb('#f2e6cc')
parts = [p for p in parts if p.tag != 'spine']
SPEC = dict(SPEC, id='psammomys', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=1.25)   # height and length stay at the relative's size: build-rigged.py scales them
