# דבורת הדבש (Apis mellifera) – golden-brown hairy thorax, amber abdomen with dark bands, big dark compound eyes,
# elbowed antennae, two pairs of clear wings that fold back over the abdomen, pollen baskets on the hind legs.
# One bee model for both zones: orchidbee.py is the same body in metallic green.
SPEC = bee_spec('honeybee', dict(head='#2c2016', thorax='#a8763c', thorax2='#6e4a24', abd='#d8952a', band='#2a1a0e', legs='#1e140c',
                                 wing='#aebcc6', vein='#3e342c', eye='#140e0a', pollen='#f0b030'),
                meta=dict(height=0.07, length=0.2, speeds={'fly': 3.0}, gripY={'perch': -0.021}, perchOffset=0.021,
                          map={'eat': 'perch', 'idle': 'perch', 'walk': 'perch', 'glide': 'fly'}))
