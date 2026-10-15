import sys,os,glob,json,base64
from PIL import Image
f=max(glob.glob('/root/.claude/projects/-home-claude/*/tool-results/mcp-remote-devices-Blender__execute_blender_code-*.txt'),key=os.path.getmtime)
r=json.load(open(f))['result']
ims=[Image.open(__import__('io').BytesIO(base64.b64decode(v))) for k,v in sorted(r.items()) if k.startswith('b64_')]
print({k:v for k,v in r.items() if not k.startswith(('b64_','txt_')) and k!='pad'})
if ims:
    sc=float(sys.argv[2]) if len(sys.argv)>2 else 0.5
    ims=[i.resize((int(i.width*sc),int(i.height*sc))) for i in ims]
    cols=min(3,len(ims)); rows=(len(ims)+cols-1)//cols
    s=Image.new('RGB',(ims[0].width*cols,ims[0].height*rows))
    for n,i in enumerate(ims): s.paste(i,((n%cols)*ims[0].width,(n//cols)*ims[0].height))
    s.save(sys.argv[1]); print('sheet',sys.argv[1])
