# דבורת סחלבים (Euglossa) – the same bee as the honeybee (one model for both), coloured metallic green-blue,
# with a long tongue folded under the body; no pollen baskets (the males collect scents from orchids).
SPEC = bee_spec('orchidbee', dict(head='#1d6a4a', thorax='#24a36a', thorax2='#14604a', abd='#2bb38a', band='#1a6e8a', legs='#1a2a24',
                                  wing='#acc0c0', vein='#28342f', eye='#141c18', pollen=None),
                meta=dict(height=0.07, length=0.2, speeds={'fly': 3.0}, gripY={'perch': -0.021}, perchOffset=0.021,
                          map={'eat': 'perch', 'idle': 'perch', 'walk': 'perch', 'glide': 'fly'}))
