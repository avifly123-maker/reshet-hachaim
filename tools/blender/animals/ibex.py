# יעל נובי (Capra nubiana) – a stocky brown wild goat of the cliffs; built for now on the gazelle with darker colours (the big curved horns come with the v6 kit).
# Built on gazelle.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('gazelle', globals()); derive('gazelle', 'ibex')
FAWN, FAWN2, CHOC, WHITE = srgb('#b28a5c'), srgb('#93704a'), srgb('#4a3622'), srgb('#e8dcc8')
SPEC = dict(SPEC, id='ibex', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=1.05)   # height and length stay at the relative's size: build-rigged.py scales them
