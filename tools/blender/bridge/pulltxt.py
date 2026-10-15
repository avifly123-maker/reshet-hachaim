# newest Blender tool result: keys txt_<id> → art/rigged/<zone>/<id>.json (zone from the species lists)
import json,glob,os,sys
AMAZON={'leafcutter','orchidbee','morpho','hummingbird','dartfrog','toucan','macaw','sloth','agouti','howler','jaguar','harpy','capybara','tapir','fruitbat','anteater','kinkajou','coati'}
f=max(glob.glob('/root/.claude/projects/-home-claude/*/tool-results/mcp-remote-devices-Blender__execute_blender_code-*.txt'),key=os.path.getmtime)
r=json.load(open(f))['result']
for k,v in r.items():
    if k.startswith('txt_'):
        sid=k[4:]; z='amazon' if sid in AMAZON else 'grove'; os.makedirs(f'/home/claude/game/art/rigged/{z}',exist_ok=True)
        open(f'/home/claude/game/art/rigged/{z}/{sid}.json','w').write(v); print('wrote',z,sid,len(v))
