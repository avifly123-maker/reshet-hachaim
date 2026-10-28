# צבי נגבי (Gazella dorcas) – smaller and paler than the mountain gazelle: sandy fawn back, a soft brown flank band, white belly, lyre-shaped horns.
# Built on gazelle.py (tools/blender/desert_kit.py): the same model and motion, desert colours, scaled by meta.scale.
base('gazelle', globals()); derive('gazelle', 'dorcas')
FAWN, FAWN2, CHOC = srgb('#d6a86e'), srgb('#c08f56'), srgb('#9a6a3c')
SPEC = dict(SPEC, id='dorcas', parts=parts)
SPEC['meta'] = dict(SPEC['meta'], scale=0.82)   # height and length stay at the relative's size: build-rigged.py scales them
